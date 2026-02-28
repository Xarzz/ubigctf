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
    // ─── Eagerly boot user from localStorage cache for instant first-render ───
    // Supabase stores the session under a key like `sb-<project>-auth-token`.
    // Reading it synchronously avoids a full network round-trip before we know
    // whether the user is logged in, eliminating the "must refresh to see data" bug.
    const getInitialUser = (): { user: User | null; isLoaded: boolean } => {
        if (typeof window === 'undefined') return { user: null, isLoaded: false };
        try {
            const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
            if (storageKey) {
                const raw = localStorage.getItem(storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const sessionUser = parsed?.user ?? parsed?.session?.user ?? null;
                    if (sessionUser) return { user: sessionUser as User, isLoaded: false }; // profile still loading
                }
            }
        } catch {
            // silent - storage may be blocked
        }
        return { user: null, isLoaded: false };
    };

    const { user: cachedUser } = getInitialUser();

    const [userAuth, setUserAuth] = useState<User | null>(cachedUser);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    // If we already found a user from cache, we know they're logged in but profile
    // still needs loading. If no cached user, we can mark isLoaded true immediately.
    const [isLoaded, setIsLoaded] = useState(!cachedUser);

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
                    .maybeSingle();
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
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    // Invalid/expired refresh token — sign out silently
                    console.warn("Session invalid, clearing:", error.message);
                    await supabase.auth.signOut().catch(() => { });
                    if (isMounted) {
                        setUserAuth(null);
                        setProfile(null);
                        setIsLoaded(true);
                    }
                    return;
                }
                if (session?.user && isMounted) {
                    setUserAuth(session.user);
                    await fetchProfile(session.user.id);
                } else if (isMounted) {
                    setUserAuth(null);
                    setProfile(null);
                    setIsLoaded(true);
                }
            } catch (err: any) {
                console.warn("Session init error:", err?.message);
                if (isMounted) {
                    setUserAuth(null);
                    setProfile(null);
                    setIsLoaded(true);
                }
            }
        };

        // Always validate the session — even if we had a cached user,
        // the refresh token might be stale. Profile fetch runs in parallel.
        if (cachedUser) {
            fetchProfile(cachedUser.id); // parallel for instant UI
        }
        initSession(); // always validate / refresh token

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            if (session?.user) {
                setUserAuth(session.user);
                if (event === 'SIGNED_IN') {
                    // Full re-fetch on explicit login
                    isFetchingProfile.current = false;
                    await fetchProfile(session.user.id);
                } else if (!isFetchingProfile.current) {
                    setIsLoaded(true);
                }
            } else if (event === 'SIGNED_OUT') {
                setUserAuth(null);
                setProfile(null);
                setIsLoaded(true);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
