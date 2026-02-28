"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { useRouter, usePathname } from 'next/navigation';

interface LKSSessionType {
    roomCode: string | null;
    roomId: string | null;
    roomTitle: string | null;
    isWaiting: boolean;   // joined but not yet started
    isActive: boolean;    // simulation running
    isInLKS: boolean;     // any participation state
    clearLKSSession: () => void;
}

const LKSSessionContext = createContext<LKSSessionType>({
    roomCode: null,
    roomId: null,
    roomTitle: null,
    isWaiting: false,
    isActive: false,
    isInLKS: false,
    clearLKSSession: () => { },
});

export function LKSSessionProvider({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [roomTitle, setRoomTitle] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);

    // Countdown overlay state
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdownNum, setCountdownNum] = useState(3);
    const [isLocked, setIsLocked] = useState(false); // nav locked during simulation

    const wasActiveRef = useRef(false);
    const roomCodeRef = useRef<string | null>(null);

    const clearLKSSession = useCallback(() => {
        setRoomCode(null);
        setRoomId(null);
        setRoomTitle(null);
        setIsActive(false);
        setIsWaiting(false);
        setIsLocked(false);
        wasActiveRef.current = false;
        roomCodeRef.current = null;
    }, []);

    const checkLKSStatus = useCallback(async () => {
        if (!user?.id) return;
        try {
            // Find the most recent LKS participation for this user
            const { data } = await supabase
                .from('lks_participants')
                .select('room_id, joined_at, lks_rooms(id, room_code, title, is_active)')
                .eq('user_id', user.id)
                .order('joined_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!data || !data.lks_rooms) {
                clearLKSSession();
                return;
            }

            const room: any = Array.isArray(data.lks_rooms) ? data.lks_rooms[0] : data.lks_rooms;
            setRoomCode(room.room_code);
            setRoomId(room.id);
            setRoomTitle(room.title);
            roomCodeRef.current = room.room_code;

            if (room.is_active) {
                setIsActive(true);
                setIsWaiting(false);

                // First time detecting active → trigger countdown
                if (!wasActiveRef.current) {
                    wasActiveRef.current = true;
                    const onLKSPage = pathname?.startsWith('/lks/');
                    if (!onLKSPage) {
                        setShowCountdown(true);
                    } else {
                        // Already on LKS page, just lock nav
                        setIsLocked(true);
                    }
                }
            } else {
                setIsActive(false);
                setIsWaiting(true);
                wasActiveRef.current = false;
                setIsLocked(false);
            }
        } catch (e) {
            // silently fail — do not clear session on transient errors
        }
    }, [user?.id, pathname, clearLKSSession]);

    // Poll every 3 seconds when user is logged in
    useEffect(() => {
        if (!user?.id) {
            clearLKSSession();
            return;
        }
        checkLKSStatus();
        const interval = setInterval(checkLKSStatus, 3000);
        return () => clearInterval(interval);
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Countdown → redirect logic
    useEffect(() => {
        if (!showCountdown) return;
        let count = 3;
        setCountdownNum(3);

        const interval = setInterval(() => {
            count--;
            setCountdownNum(count);
            if (count <= 0) {
                clearInterval(interval);
                setTimeout(() => {
                    setShowCountdown(false);
                    setIsLocked(true);
                    if (roomCodeRef.current) {
                        router.push(`/lks/${roomCodeRef.current}`);
                    }
                }, 400);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [showCountdown]); // eslint-disable-line react-hooks/exhaustive-deps

    // Navigation lock: redirect back to LKS if on wrong page during active simulation
    useEffect(() => {
        if (!isLocked || !roomCodeRef.current) return;
        const onLKSPage = pathname?.startsWith(`/lks/${roomCodeRef.current}`);
        if (!onLKSPage) {
            router.replace(`/lks/${roomCodeRef.current}`);
        }
    }, [pathname, isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <LKSSessionContext.Provider value={{
            roomCode, roomId, roomTitle,
            isWaiting, isActive,
            isInLKS: isActive || isWaiting,
            clearLKSSession,
        }}>
            {children}

            {/* === Countdown Overlay: appears on ANY page when admin presses Play === */}
            {showCountdown && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
                    {/* Ambient glow */}
                    <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                    <div className="absolute w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

                    <div className="relative text-center z-10">
                        <p className="text-primary font-mono text-sm uppercase tracking-[0.4em] mb-6 animate-pulse">
                            LKS Simulation Starting
                        </p>
                        <div
                            key={countdownNum}
                            className="text-[14rem] font-black text-white leading-none tabular-nums drop-shadow-[0_0_80px_rgba(239,68,68,0.9)] animate-in zoom-in-75 fade-in duration-300"
                        >
                            {countdownNum}
                        </div>
                        <p className="text-muted-foreground font-mono text-sm mt-6 tracking-widest">
                            Redirecting to simulation room...
                        </p>
                        <div className="mt-6 flex justify-center gap-1">
                            {[2, 1, 0].map(i => (
                                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${countdownNum > i ? 'bg-primary scale-125 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white/20'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* === Lock Overlay: shown when simulation active and user on wrong page === */}
            {isLocked && !pathname?.startsWith(`/lks/`) && !showCountdown && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-xl">
                    <div className="text-center animate-in zoom-in-95 fade-in duration-300">
                        <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
                        <p className="text-white font-black text-xl uppercase tracking-widest">Returning to Simulation</p>
                        <p className="text-primary/70 font-mono text-sm mt-2">Navigation is locked during active simulation</p>
                    </div>
                </div>
            )}
        </LKSSessionContext.Provider>
    );
}

export function useLKSSession() {
    return useContext(LKSSessionContext);
}
