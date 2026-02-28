"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import {
    ArrowLeft, Share2, Users, Target, Clock, Play,
    Copy, CheckCircle, MonitorPlay, Timer, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminRoomDetailPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params?.roomId as string;

    const [room, setRoom] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [challenges, setChallenges] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [codeCopied, setCodeCopied] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    // Check if timer is set (from localStorage, same key as countdown page)
    const [hasTimer, setHasTimer] = useState(false);

    useEffect(() => {
        if (!roomId) return;
        fetchRoomData();
    }, [roomId]);

    useEffect(() => {
        if (!room) return;
        // Check if a timer has been set for this room in localStorage
        const timerKey = `lks_timer_${room.room_code}`;
        const saved = localStorage.getItem(timerKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setHasTimer(!!parsed.durationSeconds);
            } catch {
                setHasTimer(false);
            }
        }
    }, [room]);

    const fetchRoomData = async () => {
        setIsLoading(true);
        try {
            // Fetch room details
            const { data: roomData, error: roomError } = await supabase
                .from('lks_rooms').select('*').eq('id', roomId).single();
            if (roomError || !roomData) {
                toast.error("Room not found");
                router.push('/admin/lks');
                return;
            }
            setRoom(roomData);

            // Fetch participants with profile info
            const { data: partData } = await supabase
                .from('lks_participants')
                .select('id, joined_at, profiles(username, email)')
                .eq('room_id', roomId)
                .order('joined_at', { ascending: true });
            setParticipants(partData || []);

            // Fetch challenges assigned to this room
            const { data: challData } = await supabase
                .from('lks_room_challenges')
                .select('challenge_id, challenges(title, difficulty, points, categories(name))')
                .eq('room_id', roomId);
            setChallenges(challData || []);
        } catch (err) {
            toast.error("Failed to load room data");
        } finally {
            setIsLoading(false);
        }
    };

    const canStart = participants.length >= 1 && hasTimer;

    const handleStart = async () => {
        if (!canStart) {
            if (!hasTimer) toast.error("Please set a timer first from the Projection screen");
            else toast.error("Need at least 1 participant to start");
            return;
        }
        setIsStarting(true);
        const { error } = await supabase.from('lks_rooms').update({ is_active: true }).eq('id', roomId);
        if (error) {
            toast.error("Failed to start simulation");
        } else {
            toast.success("Simulation started! Room is now live.");
            fetchRoomData();
        }
        setIsStarting(false);
    };

    const handleStop = async () => {
        const { error } = await supabase.from('lks_rooms').update({ is_active: false }).eq('id', roomId);
        if (!error) {
            toast.success("Simulation stopped");
            fetchRoomData();
        }
    };

    const copyCode = () => {
        if (!room) return;
        navigator.clipboard.writeText(room.room_code);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    const shareRoom = () => {
        if (!room) return;
        const url = `${window.location.origin}/lks`;
        navigator.clipboard.writeText(`Join the LKS Simulation!\nAccess Code: ${room.room_code}\nLink: ${url}`);
        toast.success("Share info copied to clipboard!");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!room) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link href="/admin/lks" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm w-fit">
                    <ArrowLeft className="w-4 h-4" /> Back to LKS Control Panel
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-white uppercase tracking-wide">{room.title}</h1>
                            <Badge className={room.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}>
                                {room.is_active ? "LIVE" : "OFFLINE"}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">Room ID: {roomId}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={copyCode} className="border-white/10 hover:bg-white/5 gap-2">
                            {codeCopied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            {codeCopied ? "Copied!" : "Copy Code"}
                        </Button>
                        <Button variant="outline" onClick={shareRoom} className="border-white/10 hover:bg-white/5 gap-2">
                            <Share2 className="w-4 h-4" /> Share
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => window.open(`/admin/countdown?room=${room.room_code}`, '_blank')}
                            className="border-white/10 hover:bg-white/5 gap-2"
                        >
                            <MonitorPlay className="w-4 h-4" /> Projection
                        </Button>
                        {room.is_active ? (
                            <Button onClick={handleStop} className="bg-red-600/80 hover:bg-red-600 text-white border-none gap-2 font-bold">
                                Stop Simulation
                            </Button>
                        ) : (
                            <Button
                                onClick={handleStart}
                                disabled={!canStart || isStarting}
                                title={!canStart ? (!hasTimer ? "Set a timer first via Projection screen" : "Need at least 1 participant") : "Start simulation"}
                                className={`gap-2 font-bold transition-all ${canStart ? 'bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'}`}
                            >
                                <Play className="w-4 h-4" />
                                {isStarting ? "Starting..." : "Start"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Start Requirements Banner */}
            {!room.is_active && (
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-mono ${participants.length >= 1 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                        <Users className="w-4 h-4" />
                        {participants.length >= 1 ? `${participants.length} player(s) joined ✓` : "Waiting for players to join..."}
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-mono ${hasTimer ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                        <Timer className="w-4 h-4" />
                        {hasTimer ? "Timer is configured ✓" : "Timer not set — open Projection screen to configure"}
                    </div>
                    {!canStart && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-zinc-800/50 border-zinc-700 text-zinc-400 text-sm font-mono">
                            <AlertTriangle className="w-4 h-4" />
                            Start button will activate when both conditions are met
                        </div>
                    )}
                </div>
            )}

            {/* Access Code */}
            <div className="bg-black/50 border border-primary/30 rounded-2xl p-6 flex items-center justify-between shadow-[0_0_30px_rgba(239,68,68,0.08)]">
                <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Room Access Code</p>
                    <p className="text-4xl font-black font-mono text-white tracking-[0.3em] drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">{room.room_code}</p>
                    <p className="text-xs text-muted-foreground mt-1">Share this code with participants to let them join at <span className="text-primary">/lks</span></p>
                </div>
                <button onClick={copyCode} className="p-4 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/30 transition-all">
                    {codeCopied ? <CheckCircle className="w-6 h-6 text-green-400" /> : <Copy className="w-6 h-6 text-muted-foreground" />}
                </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card/40 border border-border/40 rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20"><Users className="w-5 h-5 text-primary" /></div>
                    <div>
                        <p className="text-2xl font-black text-white">{participants.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Players</p>
                    </div>
                </div>
                <div className="bg-card/40 border border-border/40 rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20"><Target className="w-5 h-5 text-primary" /></div>
                    <div>
                        <p className="text-2xl font-black text-white">{challenges.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Challenges</p>
                    </div>
                </div>
                <div className="bg-card/40 border border-border/40 rounded-2xl p-5 flex items-center gap-4">
                    <div className={`p-3 rounded-xl border ${hasTimer ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                        <Clock className={`w-5 h-5 ${hasTimer ? 'text-green-400' : 'text-yellow-400'}`} />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white">{hasTimer ? "Set" : "Not Set"}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Timer</p>
                    </div>
                </div>
            </div>

            {/* Players List */}
            <div className="bg-card/30 border border-border/40 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-white text-lg">Participants</h2>
                    <Badge className="ml-auto bg-primary/20 text-primary border border-primary/30">{participants.length}</Badge>
                </div>
                {participants.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground font-mono text-sm">
                        No players have joined yet. Share the access code to get started.
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {participants.map((p, i) => {
                            const profile: any = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                            return (
                                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary font-mono">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{profile?.username || "Unknown"}</p>
                                            <p className="text-xs text-muted-foreground">{profile?.email || ""}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {new Date(p.joined_at).toLocaleTimeString()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Challenges List */}
            <div className="bg-card/30 border border-border/40 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-white text-lg">Assigned Challenges</h2>
                    <Badge className="ml-auto bg-primary/20 text-primary border border-primary/30">{challenges.length}</Badge>
                </div>
                {challenges.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground font-mono text-sm">
                        No challenges assigned. Go back and use Setup to assign challenges.
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {challenges.map((c: any) => {
                            const ch = Array.isArray(c.challenges) ? c.challenges[0] : c.challenges;
                            const cat: any = Array.isArray(ch?.categories) ? ch.categories[0] : ch?.categories;
                            const diff = ch?.difficulty || "Easy";
                            return (
                                <div key={c.challenge_id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-all">
                                    <div>
                                        <p className="font-bold text-white text-sm">{ch?.title || "Unknown"}</p>
                                        <p className="text-xs text-muted-foreground">{cat?.name || "Unknown"}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`text-xs ${diff === 'Easy' ? 'text-green-500 border-green-500/30' : diff === 'Medium' ? 'text-yellow-500 border-yellow-500/30' : diff === 'Hard' ? 'text-red-500 border-red-500/30' : 'text-purple-500 border-purple-500/30'}`}>
                                            {diff}
                                        </Badge>
                                        <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">{ch?.points} pts</Badge>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
