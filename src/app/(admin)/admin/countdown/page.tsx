"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Maximize, Minimize, Settings2, TerminalSquare, ShieldAlert, Trophy, Medal, Timer, ExternalLink, LogOut, Square, ArrowLeft, BarChart3, Crown, Star } from "lucide-react";
import { HackerText } from "@/components/HackerText";
import { supabase } from "@/lib/supabase";
import { LKSExitWarning } from "@/components/LKSExitWarning";

export default function LKSCountdownPage() {
    const [hours, setHours] = useState(4);
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);

    const [timeLeft, setTimeLeft] = useState(4 * 3600);
    const [initialTime, setInitialTime] = useState(4 * 3600);
    const [isRunning, setIsRunning] = useState(false);
    const [isConfiguring, setIsConfiguring] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // ─── 5-second preparation countdown ──────────────────────────────────────
    const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
    const [prepDone, setPrepDone] = useState(false);

    // ─── End Simulation + Winner overlay ─────────────────────────────────────
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
    const [finalScoreboard, setFinalScoreboard] = useState<any[]>([]);

    // ─── Navigation exit warning ──────────────────────────────────────────────
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [exitTarget, setExitTarget] = useState<null | "logout" | "user-board">(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const endTimeRef = useRef<number | null>(null);

    // Scoreboard
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [roomDbId, setRoomDbId] = useState<string | null>(null);
    const [scoreboard, setScoreboard] = useState<any[]>([]);
    const [isPersistedLoaded, setIsPersistedLoaded] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const rCode = params.get("room");
            if (rCode) {
                setRoomCode(rCode);
                supabase.from("lks_rooms").select("id").eq("room_code", rCode).single().then(({ data }) => {
                    if (data) { setRoomId(data.id); setRoomDbId(data.id); }
                });
            }
        }
    }, []);

    useEffect(() => {
        if (!roomId) return;
        const fetchScoreboard = async () => {
            const { data } = await supabase.from("lks_scoreboard").select("*").eq("room_id", roomId);
            if (data) setScoreboard([...data].sort((a, b) => b.score !== a.score ? b.score - a.score : b.solved - a.solved));
        };
        fetchScoreboard();
        const scTimer = setInterval(fetchScoreboard, 3000);
        return () => clearInterval(scTimer);
    }, [roomId]);

    // Fullscreen
    useEffect(() => {
        const h = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", h);
        return () => document.removeEventListener("fullscreenchange", h);
    }, []);
    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) await containerRef.current?.requestFullscreen?.();
        else await document.exitFullscreen?.();
    };

    // Load persisted timer
    useEffect(() => {
        const key = `lks_timer_${roomCode || "global"}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.durationSeconds && !data.initialTime) {
                    setInitialTime(data.durationSeconds); setTimeLeft(data.durationSeconds); setIsConfiguring(false);
                } else {
                    setInitialTime(data.initialTime || 4 * 3600);
                    setIsConfiguring(data.isConfiguring ?? true);
                    if (data.isRunning && data.endTime) {
                        endTimeRef.current = data.endTime;
                        const remaining = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
                        setTimeLeft(remaining);
                        setIsRunning(remaining > 0);
                        if (remaining > 0) setPrepDone(true);
                    } else {
                        setTimeLeft(data.timeLeft || data.durationSeconds || 4 * 3600);
                    }
                }
            } catch { }
        }
        setIsPersistedLoaded(true);
    }, [roomCode]);

    // Save timer state
    useEffect(() => {
        if (!isPersistedLoaded) return;
        const key = `lks_timer_${roomCode || "global"}`;
        localStorage.setItem(key, JSON.stringify({ timeLeft, initialTime, isRunning, endTime: endTimeRef.current, isConfiguring, durationSeconds: initialTime }));
    }, [roomCode, isPersistedLoaded, timeLeft, initialTime, isRunning, isConfiguring]);

    // Timer logic
    useEffect(() => {
        if (isRunning) {
            if (!endTimeRef.current) endTimeRef.current = Date.now() + (timeLeft * 1000);
            timerRef.current = setInterval(() => {
                if (!endTimeRef.current) return;
                const remaining = Math.max(0, Math.floor((endTimeRef.current - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) { setIsRunning(false); endTimeRef.current = null; if (timerRef.current) clearInterval(timerRef.current); }
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning]);

    // ─── Prep countdown → auto-start timer ───────────────────────────────────
    const startPrepCountdown = useCallback(async () => {
        if (roomDbId) await supabase.from("lks_rooms").update({ is_active: true }).eq("id", roomDbId);
        setPrepCountdown(5);
    }, [roomDbId]);

    useEffect(() => {
        if (prepCountdown === null) return;
        if (prepCountdown <= 0) {
            setPrepCountdown(null); setPrepDone(true);
            endTimeRef.current = Date.now() + (timeLeft * 1000);
            setIsRunning(true); setIsConfiguring(false); return;
        }
        const t = setTimeout(() => setPrepCountdown(p => (p ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [prepCountdown, timeLeft]);

    const handleStart = () => { if (timeLeft === 0) return; startPrepCountdown(); };
    const handlePause = () => { setIsRunning(false); endTimeRef.current = null; };
    const handleReset = () => { setIsRunning(false); setPrepDone(false); setPrepCountdown(null); setTimeLeft(initialTime); endTimeRef.current = null; };
    const handleApplyConfig = () => {
        const total = (hours * 3600) + (minutes * 60) + seconds;
        if (total === 0) return;
        setInitialTime(total); setTimeLeft(total); setIsRunning(false); setPrepDone(false); setPrepCountdown(null); setIsConfiguring(false); endTimeRef.current = null;
    };

    // ─── End Simulation ───────────────────────────────────────────────────────
    const handleEndSimulation = async () => {
        setShowEndConfirm(false);
        setIsRunning(false);
        endTimeRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        if (roomDbId) await supabase.from("lks_rooms").update({ is_active: false }).eq("id", roomDbId);
        setFinalScoreboard([...scoreboard]);
        setShowWinnerOverlay(true);
        if (roomCode) localStorage.removeItem(`lks_timer_${roomCode}`);
    };

    // ─── Exit warning ─────────────────────────────────────────────────────────
    const handleExitConfirm = async () => {
        setShowExitWarning(false);
        if (exitTarget === "logout") { await supabase.auth.signOut(); window.location.href = "/login"; }
        else if (exitTarget === "user-board") { window.location.href = "/challenges"; }
        setExitTarget(null);
    };

    const formatTime = (time: number) => {
        const h = Math.floor(time / 3600), m = Math.floor((time % 3600) / 60), s = time % 60;
        return { h: String(h).padStart(2, "0"), m: String(m).padStart(2, "0"), s: String(s).padStart(2, "0") };
    };
    const { h, m, s } = formatTime(timeLeft);
    const progress = initialTime > 0 ? timeLeft / initialTime : 0;
    const radius = roomId ? 130 : 180;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - progress * circumference;

    // ─── Medal colours ────────────────────────────────────────────────────────
    const podiumColors = [
        { bg: "bg-yellow-500/15", border: "border-yellow-500/40", text: "text-yellow-400", glow: "shadow-[0_0_30px_rgba(234,179,8,0.4)]", label: "1st", icon: <Crown className="w-8 h-8 text-yellow-400" /> },
        { bg: "bg-gray-300/10", border: "border-gray-400/30", text: "text-gray-300", glow: "shadow-[0_0_20px_rgba(156,163,175,0.2)]", label: "2nd", icon: <Medal className="w-7 h-7 text-gray-300" /> },
        { bg: "bg-amber-700/15", border: "border-amber-600/40", text: "text-amber-500", glow: "shadow-[0_0_20px_rgba(217,119,6,0.3)]", label: "3rd", icon: <Medal className="w-6 h-6 text-amber-500" /> },
    ];

    return (
        <div ref={containerRef}
            className={`w-full flex transition-all duration-700 bg-[#050505]
                ${isFullscreen ? "fixed inset-0 z-50 p-8" : "relative min-h-[calc(100vh-100px)] rounded-2xl border border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.1)] overflow-hidden"}`}
        >
            {/* Background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef44440a_1px,transparent_1px),linear-gradient(to_bottom,#ef44440a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

            {/* ── PREPARATION COUNTDOWN OVERLAY ── */}
            {prepCountdown !== null && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="absolute w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                    <div className="relative z-10 text-center">
                        <p className="text-primary font-mono text-sm uppercase tracking-[0.4em] mb-4 animate-pulse">Simulation Starting In</p>
                        <div key={prepCountdown} className="text-[14rem] font-black text-white leading-none tabular-nums drop-shadow-[0_0_80px_rgba(239,68,68,0.9)] animate-in zoom-in-75 fade-in duration-300">{prepCountdown}</div>
                        <p className="text-muted-foreground font-mono text-sm mt-4 tracking-widest uppercase">Timer will auto-start after countdown</p>
                        <div className="mt-5 flex justify-center gap-1.5">
                            {[4, 3, 2, 1, 0].map(i => (
                                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${prepCountdown > i ? "bg-primary scale-125 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-white/20"}`} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── WINNER OVERLAY ── */}
            {showWinnerOverlay && (
                <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/97 backdrop-blur-2xl animate-in fade-in duration-500">
                    {/* Animated background */}
                    <div className="absolute w-[700px] h-[700px] bg-yellow-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
                    <div className="absolute w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" style={{ animationDelay: "0.5s" }} />

                    <div className="relative z-10 w-full max-w-4xl px-4">
                        {/* Title */}
                        <div className="text-center mb-10 animate-in slide-in-from-top-4 fade-in duration-700">
                            <p className="text-primary font-mono text-xs uppercase tracking-[0.5em] mb-3 animate-pulse">Simulation Ended</p>
                            <h1 className="text-6xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]">
                                Final <span className="text-yellow-400">Results</span>
                            </h1>
                            <div className="flex justify-center mt-3 gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                                ))}
                            </div>
                        </div>

                        {/* Podium — top 3 */}
                        {finalScoreboard.length > 0 && (
                            <div className="flex items-end justify-center gap-4 mb-8 animate-in slide-in-from-bottom-6 fade-in duration-700 delay-200">
                                {/* 2nd place */}
                                {finalScoreboard[1] && (
                                    <div className={`flex-1 max-w-[220px] rounded-2xl border p-5 text-center ${podiumColors[1].bg} ${podiumColors[1].border} ${podiumColors[1].glow} h-48 flex flex-col justify-end pb-6`}>
                                        <div className="flex justify-center mb-2">{podiumColors[1].icon}</div>
                                        <div className={`text-xs font-mono uppercase tracking-widest mb-1 ${podiumColors[1].text}`}>{podiumColors[1].label}</div>
                                        <div className="font-black text-white text-lg truncate">{finalScoreboard[1].name}</div>
                                        <div className={`font-mono font-bold text-sm mt-1 ${podiumColors[1].text}`}>{finalScoreboard[1].score} pts</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{finalScoreboard[1].solved} flags</div>
                                    </div>
                                )}
                                {/* 1st place — taller */}
                                <div className={`flex-1 max-w-[260px] rounded-2xl border p-5 text-center ${podiumColors[0].bg} ${podiumColors[0].border} ${podiumColors[0].glow} h-64 flex flex-col justify-end pb-6`}>
                                    <div className="flex justify-center mb-2">{podiumColors[0].icon}</div>
                                    <div className={`text-xs font-mono uppercase tracking-widest mb-1 ${podiumColors[0].text} animate-pulse`}>{podiumColors[0].label} — Champion</div>
                                    <div className="font-black text-white text-2xl truncate drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{finalScoreboard[0].name}</div>
                                    <div className={`font-mono font-bold text-xl mt-1 ${podiumColors[0].text}`}>{finalScoreboard[0].score} pts</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{finalScoreboard[0].solved} flags captured</div>
                                </div>
                                {/* 3rd place */}
                                {finalScoreboard[2] && (
                                    <div className={`flex-1 max-w-[220px] rounded-2xl border p-5 text-center ${podiumColors[2].bg} ${podiumColors[2].border} ${podiumColors[2].glow} h-40 flex flex-col justify-end pb-6`}>
                                        <div className="flex justify-center mb-2">{podiumColors[2].icon}</div>
                                        <div className={`text-xs font-mono uppercase tracking-widest mb-1 ${podiumColors[2].text}`}>{podiumColors[2].label}</div>
                                        <div className="font-black text-white text-lg truncate">{finalScoreboard[2].name}</div>
                                        <div className={`font-mono font-bold text-sm mt-1 ${podiumColors[2].text}`}>{finalScoreboard[2].score} pts</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{finalScoreboard[2].solved} flags</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Full Leaderboard summary */}
                        {finalScoreboard.length > 3 && (
                            <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden mb-6 animate-in fade-in duration-700 delay-300">
                                <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-mono uppercase tracking-widest text-white">Full Rankings</span>
                                </div>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                    {finalScoreboard.slice(3).map((entry, i) => (
                                        <div key={entry.user_id} className="flex items-center gap-4 px-5 py-2.5 border-b border-white/5 last:border-none hover:bg-white/5 transition-colors">
                                            <span className="w-6 text-muted-foreground font-mono text-xs text-center">{i + 4}</span>
                                            <span className="flex-1 text-white font-medium text-sm truncate">{entry.name}</span>
                                            <span className="font-mono text-sm text-white">{entry.solved} flags</span>
                                            <span className="font-mono font-bold text-primary text-sm w-16 text-right">{entry.score} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3 justify-center animate-in fade-in duration-700 delay-500">
                            <button
                                onClick={() => window.location.href = "/admin/lks"}
                                className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/15 transition-all font-mono text-sm uppercase tracking-widest"
                            >
                                <ArrowLeft className="w-4 h-4" /> Control Panel
                            </button>
                            {roomDbId && (
                                <button
                                    onClick={() => window.open(`/admin/lks/${roomDbId}/statistics`, "_blank")}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary/20 border border-primary/50 text-primary rounded-xl hover:bg-primary hover:text-white hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all font-mono font-bold text-sm uppercase tracking-widest"
                                >
                                    <BarChart3 className="w-4 h-4" /> View Statistics
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header left */}
            <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
                <div className="p-2 bg-primary/20 rounded-lg border border-primary/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                    <TerminalSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        LKS <span className="text-primary">SIMULATION</span> {roomCode && `| ROOM: ${roomCode}`}
                    </span>
                    <span className="text-[10px] text-primary font-mono uppercase tracking-widest leading-none">
                        <HackerText text="CybSec Operation Control" speed={30} delay={500} />
                    </span>
                </div>
            </div>

            {/* Top-right controls */}
            <div className="absolute top-8 right-8 flex items-center gap-2 z-[100] flex-wrap justify-end">
                {/* End Simulation */}
                {(!isConfiguring && !showWinnerOverlay) && (
                    <button onClick={() => setShowEndConfirm(true)} title="End Simulation"
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] transition-all backdrop-blur-md text-xs font-mono uppercase tracking-widest font-bold animate-pulse hover:animate-none"
                    >
                        <Square className="w-4 h-4 fill-current" /> End Simulation
                    </button>
                )}
                {/* Switch to User Board */}
                <button onClick={() => { setExitTarget("user-board"); setShowExitWarning(true); }} title="Switch to User Board"
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-black/50 border border-white/10 text-muted-foreground rounded-lg hover:bg-white/5 hover:text-white hover:border-white/20 transition-all backdrop-blur-md text-xs font-mono uppercase tracking-widest"
                >
                    <ExternalLink className="w-4 h-4" /> User Board
                </button>
                {/* Logout */}
                <button onClick={() => { setExitTarget("logout"); setShowExitWarning(true); }} title="Log Out"
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-black/50 border border-red-500/20 text-red-400/70 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 transition-all backdrop-blur-md text-xs font-mono uppercase tracking-widest"
                >
                    <LogOut className="w-4 h-4" /> Logout
                </button>
                {/* Config */}
                <button onClick={() => setIsConfiguring(!isConfiguring)} title="Timer Configuration"
                    className="p-3 bg-black/50 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all backdrop-blur-md group"
                >
                    <Settings2 className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                </button>
                {/* Fullscreen */}
                <button onClick={toggleFullscreen} title="Toggle Fullscreen"
                    className="p-3 bg-black/50 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all backdrop-blur-md"
                >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
            </div>

            {/* Main layout */}
            <div className="w-full flex flex-col md:flex-row items-center justify-center p-8 pt-32 h-full z-10 gap-16">

                {/* Scoreboard panel */}
                {roomId && (
                    <div className="flex-1 w-full max-w-2xl bg-black/60 border border-primary/20 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)] backdrop-blur-xl h-[70vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-8 duration-700">
                        {/* Scoreboard header */}
                        <div className="p-5 border-b border-white/10 bg-black/40 flex items-center justify-between shadow-[0_5px_15px_rgba(0,0,0,0.5)] z-10 flex-wrap gap-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <Trophy className="text-primary w-5 h-5" /> Live Rankings
                            </h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => window.location.href = "/admin/lks"}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-white/10 rounded-lg hover:bg-white/5 hover:text-white transition-all"
                                >
                                    <ArrowLeft className="w-3 h-3" /> Control Panel
                                </button>
                                <button onClick={() => window.open(`/admin/lks/${roomDbId}/statistics`, "_blank")}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-primary border border-primary/30 rounded-lg hover:bg-primary/10 hover:border-primary/60 transition-all"
                                >
                                    <BarChart3 className="w-3 h-3" /> Statistics
                                </button>
                                <div className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[10px] font-mono tracking-widest uppercase animate-pulse">Live</div>
                            </div>
                        </div>
                        {/* Scoreboard rows */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 custom-scrollbar relative">
                            {scoreboard.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50">
                                    <ShieldAlert className="w-12 h-12 mb-4" />
                                    <span className="font-mono text-sm tracking-widest">NO PARTICIPANTS DATA YET</span>
                                </div>
                            ) : (
                                scoreboard.map((entry, i) => (
                                    <div key={entry.user_id} className={`flex items-center p-4 rounded-xl transition-all duration-300 ${i === 0 ? "bg-yellow-500/10 border border-yellow-500/30" : i === 1 ? "bg-gray-300/10 border border-gray-400/30" : i === 2 ? "bg-amber-700/10 border border-amber-700/30" : "bg-white/5 border border-white/5"} hover:bg-white/10`}>
                                        <div className="w-9 h-9 flex items-center justify-center font-black text-lg shrink-0">
                                            {i === 0 ? <Medal className="w-7 h-7 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" /> : i === 1 ? <Medal className="w-6 h-6 text-gray-400" /> : i === 2 ? <Medal className="w-5 h-5 text-amber-600" /> : <span className="text-muted-foreground text-sm">{i + 1}</span>}
                                        </div>
                                        <div className="ml-3 flex-1 truncate">
                                            <div className="font-bold text-white tracking-wide truncate text-sm">{entry.name}</div>
                                        </div>
                                        <div className="flex gap-5 items-center">
                                            <div className="text-right">
                                                <div className="text-[9px] text-muted-foreground font-mono uppercase">Captured</div>
                                                <div className="font-mono text-white">{entry.solved}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] text-primary/70 font-mono uppercase">Points</div>
                                                <div className="font-mono text-primary font-bold text-lg">{entry.score}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Timer side */}
                <div className={`flex flex-col items-center justify-center ${roomId ? "flex-1" : ""}`}>

                    {/* Config Panel */}
                    {isConfiguring && (
                        <div className="absolute inset-x-0 mx-auto max-w-lg p-6 bg-black/80 backdrop-blur-xl border border-primary/40 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.3)] z-30 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300" style={{ top: roomId ? "10%" : "20%" }}>
                            <h3 className="text-primary font-mono text-sm tracking-widest mb-6 flex items-center gap-2 border-b border-primary/20 pb-4">
                                <Settings2 className="w-4 h-4" /> TIMER CONFIGURATION
                            </h3>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                {[["Hours", hours, setHours, 23], ["Minutes", minutes, setMinutes, 59], ["Seconds", seconds, setSeconds, 59]].map(([label, val, setter, max]: any) => (
                                    <div key={label} className="flex flex-col gap-2 group">
                                        <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider group-focus-within:text-primary transition-colors">{label}</label>
                                        <input type="number" min="0" max={max} value={val} onChange={e => setter(parseInt(e.target.value) || 0)}
                                            className="bg-black/50 border border-primary/30 rounded-lg p-3 text-white font-mono text-xl text-center focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all" />
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleApplyConfig} className="w-full py-3 bg-primary/20 border border-primary/50 text-white font-mono uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] active:scale-[0.98]">
                                Apply / Initialize
                            </button>
                            <div className="mt-4 flex gap-2">
                                {[[4, 0], [2, 0], [1, 0]].map(([hh]) => (
                                    <button key={hh} onClick={() => { setHours(hh); setMinutes(0); setSeconds(0); }}
                                        className="flex-1 py-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors border border-border/40 rounded hover:border-primary/40 bg-white/5 hover:bg-primary/5">{hh}H P-SET</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timer SVG circle */}
                    <div className="relative flex items-center justify-center scale-90 md:scale-100 transition-transform duration-500">
                        <svg className={`${roomId ? "w-[320px] h-[320px]" : "w-[420px] h-[420px]"} -rotate-90 drop-shadow-[0_0_25px_rgba(239,68,68,0.3)] transition-all duration-700`}>
                            <circle cx={roomId ? "160" : "210"} cy={roomId ? "160" : "210"} r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                            <circle cx={roomId ? "160" : "210"} cy={roomId ? "160" : "210"} r={radius} stroke="currentColor" strokeWidth="8" fill="transparent"
                                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                className="text-primary transition-all duration-1000 ease-linear" strokeLinecap="round" />
                            <circle cx={roomId ? "160" : "210"} cy={roomId ? "160" : "210"} r={radius - 16} stroke="currentColor" strokeWidth="1" fill="transparent"
                                strokeDasharray="4 8" className="text-white/20 animate-[spin_60s_linear_infinite]" />
                            <circle cx={roomId ? "160" : "210"} cy={roomId ? "160" : "210"} r={radius + 16} stroke="currentColor" strokeWidth="1" fill="transparent"
                                strokeDasharray="1 12" className="text-primary/40 animate-[spin_40s_linear_infinite_reverse]" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <div className={`${roomId ? "text-[4rem]" : "text-[5.5rem]"} font-bold font-mono tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] leading-none flex items-center select-none transition-all duration-700`}>
                                <span className={`${roomId ? "w-[80px]" : "w-[110px]"} text-center tabular-nums`}>{h}</span>
                                <span className={`text-primary/70 pb-3 ${isRunning ? "animate-pulse" : ""}`}>:</span>
                                <span className={`${roomId ? "w-[80px]" : "w-[110px]"} text-center tabular-nums`}>{m}</span>
                                <span className={`text-primary/70 pb-3 ${isRunning ? "animate-pulse" : ""}`}>:</span>
                                <span className={`${roomId ? "w-[80px]" : "w-[110px]"} text-center tabular-nums text-primary`}>{s}</span>
                            </div>
                            <div className="mt-4 text-xs font-mono tracking-[0.4em] text-muted-foreground uppercase bg-black/40 px-4 py-1 rounded-full border border-white/5">
                                {isRunning ? <span className="text-primary animate-pulse">System Active</span> : "System Standby"}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className={`flex items-center gap-6 mt-16 transition-all duration-500 ${isConfiguring ? "opacity-20 pointer-events-none scale-95" : "opacity-100 scale-100"}`}>
                        <button onClick={handleReset} className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all hover:scale-110 active:scale-95 group" title="Reset">
                            <RotateCcw className="w-6 h-6 group-hover:-rotate-90 transition-transform duration-300" />
                        </button>
                        <button
                            onClick={isRunning ? handlePause : (prepDone ? () => { endTimeRef.current = Date.now() + (timeLeft * 1000); setIsRunning(true); } : handleStart)}
                            disabled={prepCountdown !== null}
                            className={`p-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(239,68,68,0.2)] ${isRunning ? "bg-black/50 border-primary/50 text-white hover:bg-black/80 hover:border-primary" : "bg-primary border-primary text-black hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(239,68,68,0.5)]"}`}
                            title={isRunning ? "Pause" : "Start"}
                        >
                            {isRunning ? <Pause className="w-8 h-8 fill-current text-primary" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>
                        <button onClick={() => setIsConfiguring(true)} className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all hover:scale-110 active:scale-95" title="Config">
                            <Settings2 className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Low time warning */}
                    {timeLeft > 0 && timeLeft <= 300 && isRunning && (
                        <div className="absolute bottom-8 left-0 right-0 mx-auto w-fit px-6 py-2 bg-primary/20 border border-primary/50 rounded-full text-primary text-sm font-mono tracking-widest animate-pulse flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] z-10 backdrop-blur-md">
                            <ShieldAlert className="w-4 h-4" /> CRITICAL: LESS THAN 5 MINUTES REMAINING
                        </div>
                    )}
                </div>
            </div>

            {/* Time Up */}
            {timeLeft === 0 && !isConfiguring && !showWinnerOverlay && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center animate-in fade-in z-40 backdrop-blur-sm pointer-events-none">
                    <div className="text-[10rem] font-black tracking-tighter text-primary drop-shadow-[0_0_100px_rgba(239,68,68,0.8)] animate-[pulse_1s_ease-in-out_infinite]">TIME UP</div>
                </div>
            )}

            {/* ── End Simulation Confirmation ── */}
            <LKSExitWarning
                isOpen={showEndConfirm}
                onClose={() => setShowEndConfirm(false)}
                onStay={() => setShowEndConfirm(false)}
                onConfirm={handleEndSimulation}
                title="End Simulation?"
                confirmLabel="End Simulation"
                message="This will stop the timer, mark the room as inactive, and display the final results podium. Participants will no longer be able to submit flags."
                note="This action cannot be undone. Make sure the simulation time is truly over."
                variant="danger"
            />

            {/* ── Exit Warning ── */}
            <LKSExitWarning
                isOpen={showExitWarning}
                onClose={() => setShowExitWarning(false)}
                onStay={() => setShowExitWarning(false)}
                onConfirm={handleExitConfirm}
                title={exitTarget === "logout" ? "Log Out?" : "Switch to User Board?"}
                confirmLabel={exitTarget === "logout" ? "Log Out" : "Switch View"}
                message={exitTarget === "logout"
                    ? "You're currently managing an active simulation. Logging out will leave the timer running but unattended."
                    : "You'll be taken to the regular user challenge board. The simulation will continue running in the background."}
                note={exitTarget === "logout" ? "Participants can still solve challenges but the timer won't be monitored." : undefined}
                variant={exitTarget === "logout" ? "danger" : "warning"}
            />
        </div>
    );
}
