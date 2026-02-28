"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import {
    ArrowLeft, Share2, Users, Target, Clock, Play,
    Copy, CheckCircle, Timer, AlertTriangle, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

    // Timer state
    const [hasTimer, setHasTimer] = useState(false);
    const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
    const [timerHours, setTimerHours] = useState("1");
    const [timerMinutes, setTimerMinutes] = useState("30");
    const [timerSeconds, setTimerSeconds] = useState("0");

    // Check localStorage for this room's timer
    const checkTimer = useCallback((roomCode?: string) => {
        const code = roomCode || room?.room_code;
        if (!code) return;
        try {
            const timerKey = `lks_timer_${code}`;
            const saved = localStorage.getItem(timerKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                setHasTimer(!!parsed.durationSeconds);
            } else {
                setHasTimer(false);
            }
        } catch {
            setHasTimer(false);
        }
    }, [room]);

    // Re-check timer when window regains focus (user might have set it elsewhere)
    useEffect(() => {
        const onFocus = () => checkTimer();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [checkTimer]);

    useEffect(() => {
        if (!roomId) return;
        fetchRoomData();
        // Poll every 5s so participant list updates in real-time without refresh
        const interval = setInterval(fetchRoomData, 5000);
        return () => clearInterval(interval);
    }, [roomId]);

    useEffect(() => {
        if (room?.room_code) checkTimer(room.room_code);
    }, [room]);

    const fetchRoomData = async () => {
        try {
            const { data: roomData, error: roomError } = await supabase
                .from('lks_rooms').select('*').eq('id', roomId).single();
            if (roomError || !roomData) {
                toast.error("Room not found");
                router.push('/admin/lks');
                return;
            }
            setRoom(roomData);

            // Use user_id (no id column in lks_participants)
            // Fetch scoreboard for names (view bypasses profiles RLS)
            const [partRes, scoreRes, challRes] = await Promise.all([
                supabase
                    .from('lks_participants')
                    .select('user_id, joined_at')
                    .eq('room_id', roomId)
                    .order('joined_at', { ascending: true }),
                supabase
                    .from('lks_scoreboard')
                    .select('user_id, name')
                    .eq('room_id', roomId),
                supabase
                    .from('lks_room_challenges')
                    .select('challenge_id, challenges(title, difficulty, points, categories(name))')
                    .eq('room_id', roomId)
            ]);

            // Merge participant list with names from scoreboard
            const nameMap = new Map((scoreRes.data || []).map((s: any) => [s.user_id, s.name]));
            const enriched = (partRes.data || []).map((p: any) => ({
                ...p,
                username: nameMap.get(p.user_id) || `Player ${p.user_id.slice(0, 6)}`,
            }));
            setParticipants(enriched);
            setChallenges(challRes.data || []);
        } catch {
            toast.error("Failed to load room data");
        } finally {
            setIsLoading(false);
        }
    };

    const canStart = participants.length >= 1 && hasTimer;

    const handleSetTimer = () => {
        if (!room) return;
        const hours = parseInt(timerHours) || 0;
        const minutes = parseInt(timerMinutes) || 0;
        const secs = parseInt(timerSeconds) || 0;
        const totalSeconds = (hours * 3600) + (minutes * 60) + secs;
        if (totalSeconds <= 0) return toast.error("Please set a valid duration");

        // Save to localStorage — countdown page reads this key
        const timerKey = `lks_timer_${room.room_code}`;
        localStorage.setItem(timerKey, JSON.stringify({
            timeLeft: totalSeconds,
            initialTime: totalSeconds,
            isRunning: false,
            endTime: null,
            isConfiguring: false,
            durationSeconds: totalSeconds
        }));
        setHasTimer(true);
        setIsTimerModalOpen(false);
        toast.success(`Timer set: ${hours}h ${minutes}m ${secs}s`);
    };

    const handleStart = () => {
        if (!canStart || !room) return;
        // Just navigate to projection — Play button there will set is_active and start timer
        window.location.href = `/admin/countdown?room=${room.room_code}`;
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
                        <p className="text-sm text-muted-foreground font-mono">Code: <span className="text-white font-bold">{room.room_code}</span></p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={copyCode} className="border-white/10 hover:bg-white/5 gap-2">
                            {codeCopied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            {codeCopied ? "Copied!" : "Copy Code"}
                        </Button>
                        <Button variant="outline" onClick={shareRoom} className="border-white/10 hover:bg-white/5 gap-2">
                            <Share2 className="w-4 h-4" /> Share
                        </Button>
                        {!room.is_active && (
                            <Button variant="outline" onClick={() => setIsTimerModalOpen(true)} className="border-white/10 hover:bg-white/5 gap-2">
                                <Timer className="w-4 h-4" />
                                {hasTimer ? "Edit Timer" : "Set Timer"}
                            </Button>
                        )}
                        {room.is_active ? (
                            <Button onClick={handleStop} className="bg-red-600/80 hover:bg-red-600 text-white border-none gap-2 font-bold">
                                Stop Simulation
                            </Button>
                        ) : (
                            <Button
                                onClick={handleStart}
                                disabled={!canStart || isStarting}
                                title={!canStart ? (!hasTimer ? "Set a timer first" : "Need at least 1 participant") : "Start simulation"}
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
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-mono ${participants.length >= 1 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                        <Users className="w-4 h-4" />
                        {participants.length >= 1 ? `${participants.length} player(s) joined ✓` : "Waiting for players to join..."}
                    </div>
                    <div
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-mono cursor-pointer transition-all ${hasTimer ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:border-yellow-400'}`}
                        onClick={() => !hasTimer && setIsTimerModalOpen(true)}
                    >
                        <Timer className="w-4 h-4" />
                        {hasTimer ? "Timer configured ✓" : "Timer not set — click to set"}
                    </div>
                    {!canStart && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-zinc-800/50 border-zinc-700 text-zinc-400 text-sm font-mono">
                            <AlertTriangle className="w-4 h-4" />
                            Start button activates when both conditions are met
                        </div>
                    )}
                </div>
            )}

            {/* Access Code */}
            <div className="bg-black/50 border border-primary/30 rounded-2xl p-6 flex items-center justify-between shadow-[0_0_30px_rgba(239,68,68,0.08)]">
                <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Room Access Code</p>
                    <p className="text-4xl font-black font-mono text-white tracking-[0.3em] drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">{room.room_code}</p>
                    <p className="text-xs text-muted-foreground mt-1">Share this code with participants → <span className="text-primary">/lks</span></p>
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
                <button
                    onClick={() => setIsTimerModalOpen(true)}
                    className={`bg-card/40 border rounded-2xl p-5 flex items-center gap-4 w-full text-left transition-all ${hasTimer ? 'border-green-500/20 hover:border-green-500/40' : 'border-yellow-500/20 hover:border-yellow-500/40'}`}
                >
                    <div className={`p-3 rounded-xl border ${hasTimer ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                        <Clock className={`w-5 h-5 ${hasTimer ? 'text-green-400' : 'text-yellow-400'}`} />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white">{hasTimer ? "Set ✓" : "Not Set"}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Timer {!hasTimer && "— click to set"}</p>
                    </div>
                </button>
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
                            return (
                                <div key={p.user_id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary font-mono">{i + 1}</div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{p.username}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{p.user_id.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground">{new Date(p.joined_at).toLocaleTimeString()}</span>
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
                                        <Badge variant="outline" className={`text-xs ${diff === 'Easy' ? 'text-green-500 border-green-500/30' : diff === 'Medium' ? 'text-yellow-500 border-yellow-500/30' : diff === 'Hard' ? 'text-red-500 border-red-500/30' : 'text-purple-500 border-purple-500/30'}`}>{diff}</Badge>
                                        <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">{ch?.points} pts</Badge>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Set Timer Dialog */}
            <Dialog open={isTimerModalOpen} onOpenChange={setIsTimerModalOpen}>
                <DialogContent className="sm:max-w-sm bg-black/95 border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <DialogHeader>
                        <DialogTitle className="text-white text-xl font-mono uppercase tracking-widest flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-primary" /> Set Timer
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground font-mono">Define the simulation duration. The timer starts automatically when you click <span className="text-primary font-bold">Start</span>.</p>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs uppercase font-mono tracking-widest text-primary">Hours</label>
                                <Input type="number" min="0" max="12" value={timerHours} onChange={e => setTimerHours(e.target.value)} className="bg-black/50 border-primary/30 font-mono text-center text-xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs uppercase font-mono tracking-widest text-primary">Minutes</label>
                                <Input type="number" min="0" max="59" value={timerMinutes} onChange={e => setTimerMinutes(e.target.value)} className="bg-black/50 border-primary/30 font-mono text-center text-xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs uppercase font-mono tracking-widest text-primary">Seconds</label>
                                <Input type="number" min="0" max="59" value={timerSeconds} onChange={e => setTimerSeconds(e.target.value)} className="bg-black/50 border-primary/30 font-mono text-center text-xl" />
                            </div>
                        </div>
                        <div className="text-center text-2xl font-black font-mono text-white py-2">
                            {String(parseInt(timerHours) || 0).padStart(2, '0')}:{String(parseInt(timerMinutes) || 0).padStart(2, '0')}:{String(parseInt(timerSeconds) || 0).padStart(2, '0')}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsTimerModalOpen(false)} className="hover:text-red-400">Cancel</Button>
                        <Button onClick={handleSetTimer} className="bg-primary text-white hover:bg-primary/90 font-bold">
                            Confirm Timer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
