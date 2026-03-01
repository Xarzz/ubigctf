"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Target, Clock, Loader2, Lock, ShieldOff, Timer as TimerIcon, LogOut, ArrowLeft } from "lucide-react";
import { LKSChallengeBoard } from "@/components/LKSChallengeBoard";
import { toast } from "sonner";
import { LKSExitWarning } from "@/components/LKSExitWarning";

export default function LKSRoomPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const code = (params?.roomCode as string)?.toUpperCase();

    const [room, setRoom] = useState<any>(null);
    const [isLoadingRoom, setIsLoadingRoom] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [isKicked, setIsKicked] = useState(false);

    // ─── 5-sec preparation overlay ────────────────────────────────────────────
    const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
    const [prepComplete, setPrepComplete] = useState(false);
    const prevActiveRef = useRef<boolean | null>(null);

    // ─── Live timer synced from localStorage ─────────────────────────────────
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const liveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ─── Exit warning for leave / logout ─────────────────────────────────────
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [exitAction, setExitAction] = useState<"leave" | "logout">("leave");

    const roomRef = useRef<any>(null);
    const userRef = useRef<any>(null);
    const wasKickedRef = useRef(false);

    useEffect(() => { roomRef.current = room; }, [room]);
    useEffect(() => { userRef.current = user; }, [user]);

    const fetchRoom = useCallback(async () => {
        if (!code) return;
        const { data } = await supabase.from("lks_rooms").select("*").eq("room_code", code).maybeSingle();
        if (!data) { setNotFound(true); } else { setRoom(data); }
        setIsLoadingRoom(false);
    }, [code]);

    // ─── Realtime: room status changes ────────────────────────────────────────
    useEffect(() => {
        if (!code) return;
        fetchRoom();
        const channel = supabase
            .channel(`lks_room_status_${code}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "lks_rooms", filter: `room_code=eq.${code}` },
                (payload) => {
                    if (payload.eventType === "UPDATE") {
                        const newRoom = payload.new as any;
                        // Detect when room becomes active for the first time → prep countdown
                        if (newRoom.is_active && prevActiveRef.current === false) {
                            setPrepCountdown(5);
                        }
                        prevActiveRef.current = newRoom.is_active;
                        setRoom(newRoom);
                    } else if (payload.eventType === "DELETE") {
                        setNotFound(true);
                        setRoom(null);
                    }
                })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [code, fetchRoom]);

    // Track previous active state
    useEffect(() => {
        if (room !== null) {
            prevActiveRef.current = room.is_active;
        }
    }, [room?.is_active]);

    // ─── 5-second preparation countdown logic ─────────────────────────────────
    useEffect(() => {
        if (prepCountdown === null) return;
        if (prepCountdown <= 0) {
            setPrepCountdown(null);
            setPrepComplete(true);
            return;
        }
        const t = setTimeout(() => setPrepCountdown(p => (p ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [prepCountdown]);

    // ─── Live timer from localStorage (synced with admin countdown page) ──────
    useEffect(() => {
        const syncTimer = () => {
            if (!code) return;
            const key = `lks_timer_${code}`;
            try {
                const saved = localStorage.getItem(key);
                if (!saved) return;
                const data = JSON.parse(saved);
                if (data.isRunning && data.endTime) {
                    const remaining = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
                    setTimeLeft(remaining);
                } else if (data.timeLeft != null) {
                    setTimeLeft(data.timeLeft);
                }
            } catch { }
        };
        syncTimer();
        liveTimerRef.current = setInterval(syncTimer, 1000);
        return () => { if (liveTimerRef.current) clearInterval(liveTimerRef.current); };
    }, [code]);

    // ─── Kick detection ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!room?.id || !user?.id) return;
        const channel = supabase
            .channel(`lks_participant_kick_${room.id}_${user.id}`)
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "lks_participants", filter: `room_id=eq.${room.id}` },
                (payload) => {
                    const deleted = payload.old as any;
                    if (deleted?.user_id === user.id) {
                        wasKickedRef.current = true;
                        setIsKicked(true);
                        toast.error("You have been removed from this room by the admin.", { duration: 6000, id: "kicked" });
                        setTimeout(() => router.push("/lks"), 3000);
                    }
                })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [room?.id, user?.id, router]);

    // ─── Auto-leave on tab close ──────────────────────────────────────────────
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (wasKickedRef.current) return;
            const r = roomRef.current;
            const u = userRef.current;
            if (!r?.id || !u?.id) return;
            navigator.sendBeacon("/api/lks/leave", new Blob([JSON.stringify({ roomId: r.id, userId: u.id })], { type: "application/json" }));
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    // ─── Exit warning handlers ────────────────────────────────────────────────
    const handleExitConfirm = async () => {
        setShowExitWarning(false);
        if (exitAction === "leave") {
            const r = roomRef.current;
            const u = userRef.current;
            if (r?.id && u?.id) {
                navigator.sendBeacon("/api/lks/leave", new Blob([JSON.stringify({ roomId: r.id, userId: u.id })], { type: "application/json" }));
            }
            router.push("/lks");
        } else {
            await supabase.auth.signOut();
            window.location.href = "/login";
        }
    };

    // ─── Auth check ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (isLoaded && !user) router.push(`/login?redirect=/lks`);
    }, [isLoaded, user, router]);

    // Format timeLeft
    const formatTime = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    if (!isLoaded || isLoadingRoom) {
        return (
            <div className="flex-1 flex items-center justify-center py-24">
                <div className="flex items-center gap-3 text-primary font-mono text-sm animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading room...
                </div>
            </div>
        );
    }

    if (isKicked) {
        return (
            <div className="flex-1 flex items-center justify-center py-24 text-center">
                <div className="space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
                        <ShieldOff className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-2xl font-black text-white uppercase tracking-widest">Removed from Room</p>
                    <p className="text-muted-foreground font-mono text-sm">You have been kicked by the administrator. Redirecting...</p>
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

    // ═══════════════════════════════════════════════════
    // WAITING ROOM
    // ═══════════════════════════════════════════════════
    if (!room.is_active) {
        return (
            <div className="container mx-auto px-4 max-w-7xl flex-1 pb-20">
                <div className="mb-6 mt-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-5 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Clock className="w-6 h-6 text-yellow-500" />
                            <h1 className="text-3xl font-black tracking-tight text-white uppercase">{room.title}</h1>
                        </div>
                        <p className="text-muted-foreground font-mono text-sm">
                            Access Code: <span className="text-primary font-bold">{room.room_code}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { setExitAction("leave"); setShowExitWarning(true); }}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-muted-foreground border border-white/10 rounded-lg hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Leave Room
                        </button>
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 font-mono text-sm tracking-widest animate-pulse">
                            <Clock className="w-4 h-4" /> WAITING FOR ADMIN TO START
                        </div>
                    </div>
                </div>

                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-sm text-blue-300 font-mono">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                    <p>
                        You can browse the challenges below to prepare, but <span className="text-white font-bold">flag submission is locked</span> until the admin starts the simulation.
                        A 5-second countdown will appear when the simulation begins.
                    </p>
                </div>

                <LKSChallengeBoard roomId={room.id} roomCode={room.room_code} roomIsActive={false} />

                <LKSExitWarning
                    isOpen={showExitWarning}
                    onClose={() => setShowExitWarning(false)}
                    onStay={() => setShowExitWarning(false)}
                    onConfirm={handleExitConfirm}
                    title="Leave Waiting Room?"
                    confirmLabel="Leave Room"
                    message="You'll be removed from this room. You can rejoin later using the room code before the simulation ends."
                    variant="warning"
                />
            </div>
        );
    }

    // ═══════════════════════════════════════════════════
    // ACTIVE SIMULATION — with 5-sec prep overlay
    // ═══════════════════════════════════════════════════
    return (
        <div className="container mx-auto px-4 max-w-7xl flex-1">

            {/* ── 5-second preparation overlay ── */}
            {prepCountdown !== null && (
                <div className="fixed inset-0 z-[9990] flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="absolute w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                    <div className="relative z-10 text-center">
                        <p className="text-primary font-mono text-sm uppercase tracking-[0.4em] mb-4 animate-pulse">
                            Simulation Starting
                        </p>
                        <div
                            key={prepCountdown}
                            className="text-[14rem] font-black text-white leading-none tabular-nums drop-shadow-[0_0_80px_rgba(239,68,68,0.9)] animate-in zoom-in-75 fade-in duration-300"
                        >
                            {prepCountdown}
                        </div>
                        <p className="text-muted-foreground font-mono text-sm mt-4 tracking-widest uppercase">
                            Get ready — challenges unlock in {prepCountdown}s
                        </p>
                        <div className="mt-5 flex justify-center gap-1.5">
                            {[4, 3, 2, 1, 0].map(i => (
                                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${prepCountdown > i ? "bg-primary scale-125 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-white/20"}`} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
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

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Timer display — synced from admin countdown page */}
                    {timeLeft !== null && timeLeft > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-primary/30 rounded-xl font-mono tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                            <TimerIcon className={`w-4 h-4 ${timeLeft <= 300 ? "text-red-400 animate-pulse" : "text-primary"}`} />
                            <span className={`text-lg font-bold tabular-nums ${timeLeft <= 300 ? "text-red-400" : "text-white"}`}>
                                {formatTime(timeLeft)}
                            </span>
                            {timeLeft <= 300 && (
                                <span className="text-[10px] text-red-400 font-mono uppercase tracking-widest animate-pulse ml-1">
                                    &lt; 5min!
                                </span>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <button
                        onClick={() => { setExitAction("logout"); setShowExitWarning(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-red-400/70 border border-red-500/20 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 transition-all"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                    <button
                        onClick={() => { setExitAction("leave"); setShowExitWarning(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-muted-foreground border border-white/10 rounded-lg hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Leave Room
                    </button>

                    <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary font-mono text-sm tracking-widest animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        SIMULATION ACTIVE
                    </div>
                </div>
            </div>

            {/* Only render challenge board after prep is done (or if already active before user joined) */}
            <div className={`relative z-10 transition-all duration-500 ${prepCountdown !== null ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                <LKSChallengeBoard roomId={room.id} roomCode={room.room_code} roomIsActive={room.is_active} />
            </div>

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none z-0" />

            {/* Exit warning */}
            <LKSExitWarning
                isOpen={showExitWarning}
                onClose={() => setShowExitWarning(false)}
                onStay={() => setShowExitWarning(false)}
                onConfirm={handleExitConfirm}
                title={exitAction === "logout" ? "Log Out?" : "Leave Simulation?"}
                confirmLabel={exitAction === "logout" ? "Log Out" : "Leave Room"}
                message={exitAction === "logout"
                    ? "Logging out during an active simulation will remove you from the room and stop your progress tracking."
                    : "Leaving will remove you from the simulation. Your existing submissions are saved, but you won't be able to rejoin without the room code."}
                note="This action cannot be undone."
                variant="danger"
            />
        </div>
    );
}
