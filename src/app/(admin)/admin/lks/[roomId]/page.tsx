"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import {
    ArrowLeft, Share2, Users, Target, Clock, Play,
    Copy, CheckCircle, Timer, AlertTriangle, Settings2,
    UserX, Wifi, WifiOff, Zap, Plus, Search
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

    // Setup challenges state
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [allChallenges, setAllChallenges] = useState<any[]>([]);
    const [searchChall, setSearchChall] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");

    const categoriesList = ["All", ...Array.from(new Set(allChallenges.map(c => c.category)))];

    // Kick player state
    const [kickTarget, setKickTarget] = useState<any>(null);
    const [isKicking, setIsKicking] = useState(false);

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

    // Re-check timer when window regains focus
    useEffect(() => {
        const onFocus = () => checkTimer();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [checkTimer]);

    useEffect(() => {
        if (!roomId) return;
        fetchRoomData();
        fetchGlobalChallenges();
    }, [roomId]);

    const fetchGlobalChallenges = async () => {
        const { data, error } = await supabase.from('challenges').select('id, title, categories(name), difficulty, points').order('created_at', { ascending: false });
        if (data) {
            setAllChallenges(data.map((c: any) => ({
                ...c,
                category: c.categories?.name || "Unknown"
            })));
        }
    };

    useEffect(() => {
        if (room?.room_code) checkTimer(room.room_code);
    }, [room]);

    // ─── Supabase Realtime: participants table ────────────────────────────────
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`admin_room_participants_${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "lks_participants",
                    filter: `room_id=eq.${roomId}`,
                },
                async (payload) => {
                    if (payload.eventType === "INSERT") {
                        // New player joined — enrich with name from scoreboard
                        const newPart = payload.new as any;
                        const { data: scoreData } = await supabase
                            .from("lks_scoreboard")
                            .select("user_id, name")
                            .eq("room_id", roomId)
                            .eq("user_id", newPart.user_id)
                            .maybeSingle();

                        const enriched = {
                            ...newPart,
                            username: scoreData?.name || `Player ${newPart.user_id.slice(0, 6)}`,
                        };
                        setParticipants((prev) => {
                            // Avoid duplicates
                            if (prev.find((p) => p.user_id === newPart.user_id)) return prev;
                            return [...prev, enriched].sort(
                                (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
                            );
                        });
                        toast.info(`🟢 ${enriched.username} joined the room`, { duration: 3000 });
                    } else if (payload.eventType === "DELETE") {
                        const removed = payload.old as any;
                        setParticipants((prev) => {
                            const leaving = prev.find((p) => p.user_id === removed.user_id);
                            if (leaving) {
                                toast.info(`🔴 ${leaving.username} left the room`, { duration: 3000 });
                            }
                            return prev.filter((p) => p.user_id !== removed.user_id);
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    // ─── Supabase Realtime: room status (LIVE / OFFLINE) ──────────────────────
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`admin_room_status_${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "lks_rooms",
                    filter: `id=eq.${roomId}`,
                },
                (payload) => {
                    setRoom(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

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

    const toggleChallengeMapping = async (challengeId: string) => {
        if (!room) return;
        const isCurrentlyMapped = challenges.some((c: any) => c.challenge_id === challengeId);

        if (isCurrentlyMapped) {
            // Remove
            await supabase.from('lks_room_challenges').delete().match({ room_id: room.id, challenge_id: challengeId });
            setChallenges(prev => prev.filter(c => c.challenge_id !== challengeId));
        } else {
            // Add
            await supabase.from('lks_room_challenges').insert([{ room_id: room.id, challenge_id: challengeId }]);
            // Fetch single mapped challenge to add to state directly
            const { data } = await supabase.from('lks_room_challenges').select('challenge_id, challenges(title, difficulty, points, categories(name))').eq('room_id', room.id).eq('challenge_id', challengeId).single();
            if (data) setChallenges(prev => [...prev, data]);
        }
    };

    // ─── Kick Player ───────────────────────────────────────────────────────────
    const handleKickPlayer = async () => {
        if (!kickTarget || !roomId) return;
        setIsKicking(true);
        try {
            const { error } = await supabase
                .from("lks_participants")
                .delete()
                .match({ room_id: roomId, user_id: kickTarget.user_id });

            if (error) throw error;
            toast.success(`${kickTarget.username} has been kicked from the room.`);
            setKickTarget(null);
            // Realtime will auto-update the list
        } catch (e: any) {
            toast.error("Failed to kick player: " + e.message);
        } finally {
            setIsKicking(false);
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
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-mono cursor-pointer transition-all hover:bg-white/5 ${hasTimer ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:border-yellow-400'}`}
                        onClick={() => setIsTimerModalOpen(true)}
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
                <button
                    onClick={() => setIsSetupOpen(true)}
                    className="bg-card/40 border border-border/40 hover:border-primary/30 hover:bg-white/[0.02] rounded-2xl p-5 flex items-center gap-4 text-left transition-all group"
                >
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 group-hover:border-primary/40 transition-all"><Target className="w-5 h-5 text-primary" /></div>
                    <div>
                        <p className="text-2xl font-black text-white">{challenges.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Challenges — click to edit</p>
                    </div>
                </button>
                <button
                    onClick={() => setIsTimerModalOpen(true)}
                    className={`bg-card/40 border rounded-2xl p-5 flex items-center gap-4 w-full text-left transition-all ${hasTimer ? 'border-green-500/20 hover:border-green-500/40' : 'border-yellow-500/20 hover:border-yellow-500/40'}`}
                >
                    <div className={`p-3 rounded-xl border ${hasTimer ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                        <Clock className={`w-5 h-5 ${hasTimer ? 'text-green-400' : 'text-yellow-400'}`} />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white">{hasTimer ? "Set ✓" : "Not Set"}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Timer {hasTimer ? "— click to edit" : "— click to set"}</p>
                    </div>
                </button>
            </div>

            {/* Players List — Realtime */}
            <div className="bg-card/30 border border-border/40 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-white text-lg">Participants</h2>
                    {/* Realtime indicator */}
                    <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <Zap className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest">Live</span>
                    </div>
                    <Badge className="ml-auto bg-primary/20 text-primary border border-primary/30">{participants.length}</Badge>
                </div>
                {participants.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground font-mono text-sm">
                        No players have joined yet. Share the access code to get started.
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {participants.map((p, i) => (
                            <div key={p.user_id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary font-mono">{i + 1}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-white text-sm">{p.username}</p>
                                            {/* Online status dot */}
                                            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] inline-block" title="Online" />
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono">{p.user_id.slice(0, 8)}...</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-muted-foreground">{new Date(p.joined_at).toLocaleTimeString()}</span>
                                    {/* Kick button */}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setKickTarget(p)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-red-400 hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/30"
                                        title={`Kick ${p.username}`}
                                    >
                                        <UserX className="w-3.5 h-3.5 mr-1" />
                                        <span className="text-xs">Kick</span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Challenges List */}
            <div className="bg-card/30 border border-border/40 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        <h2 className="font-bold text-white text-lg">Assigned Challenges</h2>
                        <Badge className="ml-2 bg-primary/20 text-primary border border-primary/30">{challenges.length}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setIsSetupOpen(true)} className="border-white/10 hover:border-primary/50 hover:bg-primary/20 hover:text-white transition-all text-xs h-8">
                        Edit Challenges
                    </Button>
                </div>
                {challenges.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center">
                        <Target className="w-12 h-12 text-primary/30 mb-4" />
                        <p className="text-muted-foreground font-mono text-sm mb-4">No challenges assigned to this room yet.</p>
                        <Button onClick={() => setIsSetupOpen(true)} className="bg-primary/20 text-primary hover:bg-primary hover:text-white border border-primary/50 font-bold uppercase tracking-widest text-xs">
                            <Plus className="w-4 h-4 mr-2" /> Choose Challenges
                        </Button>
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

            {/* Kick Confirmation Dialog */}
            <Dialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
                <DialogContent className="sm:max-w-sm bg-black/95 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                    <DialogHeader>
                        <DialogTitle className="text-white text-xl font-mono uppercase tracking-widest flex items-center gap-2">
                            <UserX className="w-5 h-5 text-red-400" /> Kick Player
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <p className="text-sm text-muted-foreground font-mono">
                            Are you sure you want to remove <span className="text-white font-bold">{kickTarget?.username}</span> from this room?
                        </p>
                        <p className="text-xs text-red-400/70 font-mono bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                            ⚠ This will immediately disconnect them from the simulation. They can rejoin using the room code.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setKickTarget(null)} className="hover:text-white" disabled={isKicking}>Cancel</Button>
                        <Button
                            onClick={handleKickPlayer}
                            disabled={isKicking}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] gap-2"
                        >
                            <UserX className="w-4 h-4" />
                            {isKicking ? "Kicking..." : "Kick Player"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

            {/* Setup Challenges Dialog */}
            <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
                <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col bg-black/95 border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <DialogHeader className="shrink-0 pb-4 border-b border-white/10">
                        <DialogTitle className="text-white text-xl font-mono uppercase tracking-widest flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" /> Assign Challenges
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">Select which global challenges should be injected into [{room?.room_code}]</p>
                    </DialogHeader>
                    <div className="py-2 shrink-0 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input value={searchChall} onChange={e => setSearchChall(e.target.value)} placeholder="Search global tasks..." className="pl-9 bg-black/50 border-white/10" />
                        </div>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary w-[160px]"
                        >
                            {categoriesList.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {allChallenges
                            .filter(c => c.title.toLowerCase().includes(searchChall.toLowerCase()))
                            .filter(c => filterCategory === "All" || c.category === filterCategory)
                            .map(challenge => {
                                const isSelected = challenges.some((c: any) => c.challenge_id === challenge.id);
                                return (
                                    <div key={challenge.id} onClick={() => toggleChallengeMapping(challenge.id)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-primary/10 border-primary/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                        <div className="flex flex-col gap-1 w-full mr-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white tracking-wide">{challenge.title}</span>
                                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-white/20 text-muted-foreground">{challenge.difficulty}</Badge>
                                            </div>
                                            <span className="text-xs font-mono text-primary/70">{challenge.category} &bull; {challenge.points} pts</span>
                                        </div>
                                        <div className="shrink-0">
                                            {isSelected ? (
                                                <CheckCircle className="w-5 h-5 text-primary drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-white/20" />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                    <DialogFooter className="shrink-0 pt-4 border-t border-white/10">
                        <Button className="w-full bg-primary text-white hover:bg-primary/90 font-bold uppercase tracking-widest text-xs" onClick={() => setIsSetupOpen(false)}>Done Choosing Challenges</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
