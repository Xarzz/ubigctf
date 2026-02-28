"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { Target, Shield, LogIn, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { HackerText } from "@/components/HackerText";

export default function LKSJoinPage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [roomCode, setRoomCode] = useState("");
    const [isJoining, setIsJoining] = useState(false);

    if (isLoaded && !user) {
        router.push("/login?redirect=/lks");
        return null;
    }

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = roomCode.trim().toUpperCase();

        if (!code) {
            toast.error("Please enter a Room Code");
            return;
        }

        if (!user) return;

        setIsJoining(true);

        try {
            // 1. Check if room exists and is active
            const { data: room, error: roomErr } = await supabase
                .from('lks_rooms')
                .select('id, is_active')
                .eq('room_code', code)
                .single();

            if (roomErr || !room) {
                toast.error("Invalid Room Code. Mission aborted.");
                setIsJoining(false);
                return;
            }

            if (!room.is_active) {
                toast.error("This Simulation Room is currently offline or hasn't started yet.");
                setIsJoining(false);
                return;
            }

            // 2. Register participant (ignore error if already joined, assuming RLS allows or we use Upsert policy)
            // But since we didn't setup an upsert in SQL, we can just try to insert, if it fails due to unique constraint, we just ignore it.
            const { error: partErr } = await supabase
                .from('lks_participants')
                .insert([{ room_id: room.id, user_id: user.id }]);

            if (partErr && partErr.code !== '23505') { // 23505 is typical postgres unique violation
                console.error("Participant registration error:", partErr);
                // We don't fail just because of this, they might already be in.
            }

            // 3. Redirect to room
            toast.success("Connection Established. Entering Simulation...");
            router.push(`/lks/${code}`);

        } catch (error) {
            console.error("Join error:", error);
            toast.error("A network disruption occurred. Try again.");
            setIsJoining(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16 max-w-lg flex-1 flex flex-col justify-center">
            <div className="flex flex-col items-center justify-center text-center mb-10 w-full animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="bg-primary/5 p-4 rounded-full mb-6 border border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <Shield className="w-12 h-12 text-primary drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight font-mono uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                    LKS <span className="text-primary">Simulation</span>
                </h1>
                <p className="text-muted-foreground font-mono text-sm max-w-sm mt-2">
                    <HackerText text="Enter authorization code to join an isolated CTF environment." speed={20} delay={300} />
                </p>
            </div>

            <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-border/50 p-8 shadow-[0_0_30px_-5px_var(--primary)] animate-in slide-in-from-bottom-8 fade-in duration-700 delay-150">
                <form onSubmit={handleJoin} className="space-y-6">
                    <div className="space-y-2 relative">
                        <label htmlFor="roomCode" className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <Target className="w-4 h-4" /> Room Access Code
                        </label>
                        <Input
                            id="roomCode"
                            placeholder="e.g. LKS-CYBER-99"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            className="bg-black/80 border-primary/30 h-14 text-center font-mono text-xl tracking-widest text-white uppercase focus-visible:ring-primary focus-visible:border-primary shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]"
                            maxLength={20}
                            disabled={isJoining}
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isJoining || !roomCode.trim() || !user}
                        className="w-full h-14 bg-primary text-white hover:bg-primary/90 font-bold tracking-widest uppercase shadow-[0_4px_14px_0_rgba(239,68,68,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2 text-lg"
                    >
                        {isJoining ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> Authenticating...
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" /> Join Room
                            </>
                        )}
                    </Button>
                </form>
            </div>

            {/* Ambient Background Glow */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-[-1]" />
        </div>
    );
}
