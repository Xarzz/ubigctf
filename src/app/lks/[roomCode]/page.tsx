"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Target, Clock, Loader2, Lock } from "lucide-react";
import { LKSChallengeBoard } from "@/components/LKSChallengeBoard";

export default function LKSRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const code = (params?.roomCode as string)?.toUpperCase();

    const [room, setRoom] = useState<any>(null);
    const [isLoadingRoom, setIsLoadingRoom] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const fetchRoom = useCallback(async () => {
        if (!code) return;
        const { data } = await supabase
            .from('lks_rooms')
            .select('*')
            .eq('room_code', code)
            .maybeSingle();

        if (!data) {
            setNotFound(true);
        } else {
            setRoom(data);
        }
        setIsLoadingRoom(false);
    }, [code]);

    useEffect(() => {
        fetchRoom();
        // Poll every 4s so waiting room detects when simulation starts
        const interval = setInterval(fetchRoom, 4000);
        return () => clearInterval(interval);
    }, [fetchRoom]);

    // Auth check
    useEffect(() => {
        if (isLoaded && !user) {
            router.push(`/login?redirect=/lks`);
        }
    }, [isLoaded, user, router]);

    if (!isLoaded || isLoadingRoom) {
        return (
            <div className="flex-1 flex items-center justify-center py-24">
                <div className="flex items-center gap-3 text-primary font-mono text-sm animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading room...
                </div>
            </div>
        );
    }

    if (notFound || !room) {
        return (
            <div className="flex-1 flex items-center justify-center py-24 text-center">
                <div>
                    <p className="text-2xl font-black text-white uppercase tracking-widest mb-2">Room Not Found</p>
                    <p className="text-muted-foreground font-mono text-sm">The room code you entered doesn't exist.</p>
                </div>
            </div>
        );
    }

    // Waiting room — simulation not started yet
    if (!room.is_active) {
        return (
            <div className="container mx-auto px-4 max-w-7xl flex-1 pb-20">
                {/* Header */}
                <div className="mb-6 mt-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-5 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Clock className="w-6 h-6 text-yellow-500" />
                            <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                                {room.title}
                            </h1>
                        </div>
                        <p className="text-muted-foreground font-mono text-sm">
                            Access Code: <span className="text-primary font-bold">{room.room_code}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 font-mono text-sm tracking-widest animate-pulse">
                        <Clock className="w-4 h-4" /> WAITING FOR ADMIN TO START
                    </div>
                </div>

                {/* Info banner */}
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-sm text-blue-300 font-mono">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                    <p>
                        You can browse the challenges below to prepare, but <span className="text-white font-bold">flag submission is locked</span> until the admin starts the simulation.
                        You're free to explore other pages while waiting — a countdown will appear here and redirect you automatically when the simulation begins.
                    </p>
                </div>

                {/* Challenge preview (locked) */}
                <LKSChallengeBoard roomId={room.id} roomCode={room.room_code} roomIsActive={false} />
            </div>
        );
    }

    // Active simulation
    return (
        <div className="container mx-auto px-4 max-w-7xl flex-1">
            <div className="mb-6 mt-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-5 relative z-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Target className="w-6 h-6 text-primary" />
                        <h1 className="text-3xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                            {room.title}
                        </h1>
                    </div>
                    <p className="text-muted-foreground font-mono text-sm">
                        LKS Simulation | Access Code: <span className="text-primary font-bold">{room.room_code}</span>
                    </p>
                </div>
                <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary font-mono text-sm tracking-widest animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    SIMULATION ACTIVE
                </div>
            </div>

            <div className="relative z-10">
                <LKSChallengeBoard roomId={room.id} roomCode={room.room_code} roomIsActive={room.is_active} />
            </div>

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none z-0" />
        </div>
    );
}
