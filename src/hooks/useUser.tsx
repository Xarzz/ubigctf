"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    email: string;
    username: string;
    score: number;
    created_at: string;
    role?: string;
    type?: string;
}

interface UserContextType {
    user: User | null;
    profile: UserProfile | null;
    isLoaded: boolean;
    updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userAuth, setUserAuth] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Use a ref to track request status cleanly without triggering re-renders or suffering closure traps
    const isFetchingProfile = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const fetchProfile = async (userId: string) => {
            if (isFetchingProfile.current) return;
            isFetchingProfile.current = true;

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) {
                    console.error("Error fetching profile:", error.message);
                } else if (data && isMounted) {
                    setProfile(data as UserProfile);
                }
            } catch (err) {
                console.error("Unknown profile fetch error", err);
            } finally {
                if (isMounted) {
                    setIsLoaded(true);
                    isFetchingProfile.current = false;
                }
            }
        };

        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && isMounted) {
                setUserAuth(session.user);
                await fetchProfile(session.user.id);
            } else if (isMounted) {
                setIsLoaded(true);
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            if (session?.user) {
                setUserAuth(session.user);

                // Use the event type to determine if a hard re-fetch is truly needed
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    await fetchProfile(session.user.id);
                } else if (!isFetchingProfile.current) {
                    // For routine token refreshes (TOKEN_REFRESHED)
                    setIsLoaded(true);
                }
            } else {
                setUserAuth(null);
                setProfile(null);
                setIsLoaded(true);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!userAuth) return { error: new Error('No user logged in') };

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userAuth.id);

        if (!error) {
            setProfile(prev => prev ? { ...prev, ...updates } : null);
        }
        return { error };
    };

    return (
        <UserContext.Provider value={{
            user: userAuth,
            profile,
            isLoaded,
            updateProfile,
            signOut: async () => {
                try {
                    await supabase.auth.signOut();
                } catch (e) {
                    console.error("SignOut error:", e);
                } finally {
                    // Forcefully clear session data from browser storage regardless of network error
                    if (typeof window !== 'undefined') {
                        localStorage.clear();
                        sessionStorage.clear();
                    }
                    setUserAuth(null);
                    setProfile(null);
                }
            },
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
