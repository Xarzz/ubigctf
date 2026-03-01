"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Maximize, Minimize, Settings2, TerminalSquare, ShieldAlert, Trophy, Medal, Timer, ExternalLink, LogOut } from "lucide-react";
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

    // ─── 5-second preparation countdown ─────────────────────────────────────
    const [prepCountdown, setPrepCountdown] = useState<number | null>(null); // null = not shown
    const [prepDone, setPrepDone] = useState(false);

    // ─── Navigation away → floating mini panel + exit warning ────────────────
    const [isMinimized, setIsMinimized] = useState(false);
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
            if (data) {
                setScoreboard([...data].sort((a, b) => b.score !== a.score ? b.score - a.score : b.solved - a.solved));
            }
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
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen?.();
        } else {
            await document.exitFullscreen?.();
        }
    };

    // Load persisted timer
    useEffect(() => {
        const key = `lks_timer_${roomCode || "global"}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const data = JSON.parse(saved);

                // If we saved durationSeconds from admin room page, use that
                if (data.durationSeconds && !data.initialTime) {
                    setInitialTime(data.durationSeconds);
                    setTimeLeft(data.durationSeconds);
                    setIsConfiguring(false);
                } else {
                    setInitialTime(data.initialTime || 4 * 3600);
                    setIsConfiguring(data.isConfiguring ?? true);
                    if (data.isRunning && data.endTime) {
                        endTimeRef.current = data.endTime;
                        const remaining = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
                        setTimeLeft(remaining);
                        setIsRunning(remaining > 0);
                        if (remaining > 0) setPrepDone(true); // already started
                    } else {
                        setTimeLeft(data.timeLeft || data.durationSeconds || 4 * 3600);
                        setIsRunning(false);
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
        localStorage.setItem(key, JSON.stringify({
            timeLeft, initialTime, isRunning,
            endTime: endTimeRef.current, isConfiguring,
            durationSeconds: initialTime,
        }));
    }, [roomCode, isPersistedLoaded, timeLeft, initialTime, isRunning, isConfiguring]);

    // Timer countdown logic
    useEffect(() => {
        if (isRunning) {
            if (!endTimeRef.current) {
                endTimeRef.current = Date.now() + (timeLeft * 1000);
            }
            timerRef.current = setInterval(() => {
                if (!endTimeRef.current) return;
                const remaining = Math.max(0, Math.floor((endTimeRef.current - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    setIsRunning(false);
                    endTimeRef.current = null;
                    if (timerRef.current) clearInterval(timerRef.current);
                }
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning]);

    // ─── 5-second preparation countdown logic ─────────────────────────────────
    const startPrepCountdown = useCallback(async () => {
        // First: set room active in DB
        if (roomDbId) {
            await supabase.from("lks_rooms").update({ is_active: true }).eq("id", roomDbId);
        }
        // Begin prep countdown from 5
        setPrepCountdown(5);
    }, [roomDbId]);

    useEffect(() => {
        if (prepCountdown === null) return;
        if (prepCountdown <= 0) {
            // Prep done → start the actual simulation timer
            setPrepCountdown(null);
            setPrepDone(true);
            endTimeRef.current = Date.now() + (timeLeft * 1000);
            setIsRunning(true);
            setIsConfiguring(false);
            return;
        }
        const t = setTimeout(() => setPrepCountdown(p => (p ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [prepCountdown, timeLeft]);

    const handleStart = () => {
        if (timeLeft === 0) return;
        startPrepCountdown();
    };

    const handlePause = () => {
        setIsRunning(false);
        endTimeRef.current = null;
    };

    const handleReset = () => {
        setIsRunning(false);
        setPrepDone(false);
        setPrepCountdown(null);
        setTimeLeft(initialTime);
        endTimeRef.current = null;
    };

    const handleApplyConfig = () => {
        const total = (hours * 3600) + (minutes * 60) + seconds;
        if (total === 0) return;
        setInitialTime(total);
        setTimeLeft(total);
        setIsRunning(false);
        setPrepDone(false);
        setPrepCountdown(null);
        setIsConfiguring(false);
        endTimeRef.current = null;
    };

    const formatTime = (time: number) => {
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        const s = time % 60;
        return { h: String(h).padStart(2, "0"), m: String(m).padStart(2, "0"), s: String(s).padStart(2, "0") };
    };

    const { h, m, s } = formatTime(timeLeft);
    const progress = initialTime > 0 ? timeLeft / initialTime : 0;
    const radius = roomId ? 130 : 180;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - progress * circumference;

    // ─── Exit warning handlers ────────────────────────────────────────────────
    const handleExitConfirm = async () => {
        setShowExitWarning(false);
        if (exitTarget === "logout") {
            await supabase.auth.signOut();
            window.location.href = "/login";
        } else if (exitTarget === "user-board") {
            window.location.href = "/challenges";
        }
        setExitTarget(null);
    };

    // Format miniTimer
    const miniTime = `${h}:${m}:${s}`;

    return (
        <div ref={containerRef}
            className={`w-full flex transition-all duration-700 bg-[#050505]
                ${isFullscreen ? "fixed inset-0 z-50 p-8" : "relative min-h-[calc(100vh-100px)] rounded-2xl border border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.1)] overflow-hidden"}`}
        >
            {/* Background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef44440a_1px,transparent_1px),linear-gradient(to_bottom,#ef44440a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

            {/* ── PREPARATION COUNTDOWN OVERLAY ─────────────────────────────── */}
            {prepCountdown !== null && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="absolute w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                    <div className="relative z-10 text-center">
                        <p className="text-primary font-mono text-sm uppercase tracking-[0.4em] mb-4 animate-pulse">
                            Simulation Starting In
                        </p>
                        <div
                            key={prepCountdown}
                            className="text-[14rem] font-black text-white leading-none tabular-nums drop-shadow-[0_0_80px_rgba(239,68,68,0.9)] animate-in zoom-in-75 fade-in duration-300"
                        >
                            {prepCountdown}
                        </div>
                        <p className="text-muted-foreground font-mono text-sm mt-4 tracking-widest uppercase">
                            Timer will auto-start after countdown
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
            <div className="absolute top-8 right-8 flex items-center gap-2 z-20">
                {/* Switch to User Board */}
                <button
                    onClick={() => { setExitTarget("user-board"); setShowExitWarning(true); }}
                    title="Switch to User Board"
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-black/50 border border-white/10 text-muted-foreground rounded-lg hover:bg-white/5 hover:text-white hover:border-white/20 transition-all backdrop-blur-md text-xs font-mono uppercase tracking-widest"
                >
                    <ExternalLink className="w-4 h-4" /> User Board
                </button>
                {/* Logout */}
                <button
                    onClick={() => { setExitTarget("logout"); setShowExitWarning(true); }}
                    title="Log Out"
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

            {/* Layout */}
            <div className="w-full flex flex-col md:flex-row items-center justify-center p-8 pt-32 h-full z-10 gap-16">

                {/* Scoreboard */}
                {roomId && (
                    <div className="flex-1 w-full max-w-2xl bg-black/60 border border-primary/20 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)] backdrop-blur-xl h-[70vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-8 duration-700">
                        <div className="p-6 border-b border-white/10 bg-black/40 flex items-center justify-between shadow-[0_5px_15px_rgba(0,0,0,0.5)] z-10">
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <Trophy className="text-primary w-6 h-6" /> Live Rankings
                            </h2>
                            <div className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[10px] font-mono tracking-widest uppercase animate-pulse">Live Feed</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar relative">
                            {scoreboard.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50">
                                    <ShieldAlert className="w-12 h-12 mb-4" />
                                    <span className="font-mono text-sm tracking-widest">NO PARTICIPANTS DATA YET</span>
                                </div>
                            ) : (
                                scoreboard.map((entry, i) => (
                                    <div key={entry.user_id} className={`flex items-center p-4 rounded-xl transition-all duration-300 ${i === 0 ? "bg-yellow-500/10 border border-yellow-500/30" : i === 1 ? "bg-gray-300/10 border border-gray-400/30" : i === 2 ? "bg-amber-700/10 border border-amber-700/30" : "bg-white/5 border border-white/5"} hover:bg-white/10`}>
                                        <div className="w-10 h-10 flex items-center justify-center font-black text-xl shrink-0">
                                            {i === 0 ? <Medal className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" /> : i === 1 ? <Medal className="w-7 h-7 text-gray-400" /> : i === 2 ? <Medal className="w-6 h-6 text-amber-600" /> : <span className="text-muted-foreground">{i + 1}</span>}
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <div className="font-bold text-white tracking-wide truncate">{entry.name}</div>
                                        </div>
                                        <div className="flex gap-6 items-center">
                                            <div className="text-right">
                                                <div className="text-[10px] text-muted-foreground font-mono uppercase">Captured</div>
                                                <div className="font-mono text-white text-lg">{entry.solved}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-primary/70 font-mono uppercase">Points</div>
                                                <div className="font-mono text-primary font-bold text-xl">{entry.score}</div>
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
                                        <input type="number" min="0" max={max} value={val}
                                            onChange={e => setter(parseInt(e.target.value) || 0)}
                                            className="bg-black/50 border border-primary/30 rounded-lg p-3 text-white font-mono text-xl text-center focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all" />
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleApplyConfig} className="w-full py-3 bg-primary/20 border border-primary/50 text-white font-mono uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] active:scale-[0.98]">
                                Apply / Initialize
                            </button>
                            <div className="mt-4 flex gap-2">
                                {[[4, 0], [2, 0], [1, 0]].map(([h, m]) => (
                                    <button key={h} onClick={() => { setHours(h); setMinutes(m); setSeconds(0); }}
                                        className="flex-1 py-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors border border-border/40 rounded hover:border-primary/40 bg-white/5 hover:bg-primary/5">{h}H P-SET</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timer Circle */}
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
                        <button onClick={handleReset} className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all hover:scale-110 active:scale-95 group" title="Reset Timer">
                            <RotateCcw className="w-6 h-6 group-hover:-rotate-90 transition-transform duration-300" />
                        </button>
                        <button
                            onClick={isRunning ? handlePause : (prepDone ? (() => { endTimeRef.current = Date.now() + (timeLeft * 1000); setIsRunning(true); }) : handleStart)}
                            disabled={prepCountdown !== null}
                            className={`p-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(239,68,68,0.2)] ${isRunning ? "bg-black/50 border-primary/50 text-white hover:bg-black/80 hover:border-primary" : "bg-primary border-primary text-black hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(239,68,68,0.5)]"}`}
                            title={isRunning ? "Pause Timer" : "Start Timer"}
                        >
                            {isRunning ? <Pause className="w-8 h-8 fill-current text-primary" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>
                        <button onClick={() => setIsConfiguring(true)} className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all hover:scale-110 active:scale-95" title="Configure Timer">
                            <Settings2 className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Warning: low time */}
                    {timeLeft > 0 && timeLeft <= 300 && isRunning && (
                        <div className="absolute bottom-8 left-0 right-0 mx-auto w-fit px-6 py-2 bg-primary/20 border border-primary/50 rounded-full text-primary text-sm font-mono tracking-widest animate-pulse flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] z-10 backdrop-blur-md">
                            <ShieldAlert className="w-4 h-4" /> CRITICAL: LESS THAN 5 MINUTES REMAINING
                        </div>
                    )}
                </div>
            </div>

            {/* Time Up Alert */}
            {timeLeft === 0 && !isConfiguring && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center animate-in fade-in z-40 backdrop-blur-sm pointer-events-none">
                    <div className="text-[10rem] font-black tracking-tighter text-primary drop-shadow-[0_0_100px_rgba(239,68,68,0.8)] animate-[pulse_1s_ease-in-out_infinite]">TIME UP</div>
                </div>
            )}

            {/* ── Exit Warning Dialog ────────────────────────────────────────── */}
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
