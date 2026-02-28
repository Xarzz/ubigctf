"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Maximize, Minimize, Settings2, TerminalSquare, ShieldAlert, Trophy, Medal } from "lucide-react";
import { HackerText } from "@/components/HackerText";
import { supabase } from "@/lib/supabase";

export default function LKSCountdownPage() {
    const [hours, setHours] = useState(4);
    const [minutes, setMinutes] = useState(0);
    const [seconds, setSeconds] = useState(0);

    const [timeLeft, setTimeLeft] = useState(4 * 3600);
    const [initialTime, setInitialTime] = useState(4 * 3600);
    const [isRunning, setIsRunning] = useState(false);
    const [isConfiguring, setIsConfiguring] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Scoreboard logic
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [scoreboard, setScoreboard] = useState<any[]>([]);

    useEffect(() => {
        // Grab from URL safely in client component
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const rCode = params.get('room');
            if (rCode) {
                setRoomCode(rCode);
                // Fetch room ID to query scoreboard view
                supabase.from('lks_rooms').select('id').eq('room_code', rCode).single().then(({ data }) => {
                    if (data) setRoomId(data.id);
                });
            }
        }
    }, []);

    useEffect(() => {
        if (!roomId) return;

        const fetchScoreboard = async () => {
            const { data } = await supabase
                .from('lks_scoreboard')
                .select('*')
                .eq('room_id', roomId);

            if (data) {
                // sort by score DESC, then solved DESC
                const sorted = [...data].sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return b.solved - a.solved;
                });
                setScoreboard(sorted);
            }
        };

        fetchScoreboard();
        const scTimer = setInterval(fetchScoreboard, 3000);
        return () => clearInterval(scTimer);
    }, [roomId]);

    // Fullscreen behavior
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            if (containerRef.current?.requestFullscreen) {
                await containerRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    };

    // Timer behavior
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (timeLeft === 0) {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, timeLeft]);

    const handleStart = () => {
        if (timeLeft === 0) return;
        setIsRunning(true);
        setIsConfiguring(false);
    };

    const handlePause = () => {
        setIsRunning(false);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTimeLeft(initialTime);
    };

    const handleApplyConfig = () => {
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        if (totalSeconds === 0) return;
        setInitialTime(totalSeconds);
        setTimeLeft(totalSeconds);
        setIsConfiguring(false);
    };

    const formatTime = (time: number) => {
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        const s = time % 60;
        return {
            h: h.toString().padStart(2, "0"),
            m: m.toString().padStart(2, "0"),
            s: s.toString().padStart(2, "0")
        };
    };

    const { h, m, s } = formatTime(timeLeft);
    const progress = initialTime > 0 ? timeLeft / initialTime : 0;

    // Circular Progress Properties
    const radius = roomId ? 130 : 180; // smaller if side-by-side
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <div
            ref={containerRef}
            className={`w-full flex transition-all duration-700 bg-[#050505] 
                ${isFullscreen ? 'fixed inset-0 z-50 p-8' : 'relative min-h-[calc(100vh-100px)] rounded-2xl border border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.1)] overflow-hidden'}`}
        >
            {/* Background Cyber Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef44440a_1px,transparent_1px),linear-gradient(to_bottom,#ef44440a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

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

            {/* Config Overlay Toggle */}
            <button
                onClick={() => setIsConfiguring(!isConfiguring)}
                title="Timer Configuration"
                className="absolute top-8 right-24 p-3 bg-black/50 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all backdrop-blur-md z-20 group"
            >
                <Settings2 className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            </button>

            {/* Fullscreen Toggle */}
            <button
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                className="absolute top-8 right-8 p-3 bg-black/50 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all backdrop-blur-md z-20"
            >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            {/* Layout Wrapper depending on whether room code is provided */}
            <div className={`w-full flex flex-col md:flex-row items-center justify-center p-8 pt-32 h-full z-10 gap-16`}>

                {/* Scoreboard Left Panel (Only if Room is setup) */}
                {roomId && (
                    <div className="flex-1 w-full max-w-2xl bg-black/60 border border-primary/20 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)] backdrop-blur-xl h-[70vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-8 duration-700">
                        <div className="p-6 border-b border-white/10 bg-black/40 flex items-center justify-between shadow-[0_5px_15px_rgba(0,0,0,0.5)] z-10">
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <Trophy className="text-primary w-6 h-6" /> Live Rankings
                            </h2>
                            <div className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[10px] font-mono tracking-widest uppercase animate-pulse">
                                Live Feed
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar relative">
                            {scoreboard.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50">
                                    <ShieldAlert className="w-12 h-12 mb-4" />
                                    <span className="font-mono text-sm tracking-widest">NO PARTICIPANTS DATA YET</span>
                                </div>
                            ) : (
                                scoreboard.map((entry, index) => (
                                    <div key={entry.user_id} className={`flex items-center p-4 rounded-xl transition-all duration-300 ${index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : index === 1 ? 'bg-gray-300/10 border border-gray-400/30' : index === 2 ? 'bg-amber-700/10 border border-amber-700/30' : 'bg-white/5 border border-white/5'} hover:bg-white/10`}>
                                        <div className="w-10 h-10 flex items-center justify-center font-black text-xl shrink-0">
                                            {index === 0 ? <Medal className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" /> : index === 1 ? <Medal className="w-7 h-7 text-gray-400" /> : index === 2 ? <Medal className="w-6 h-6 text-amber-600" /> : <span className="text-muted-foreground">{index + 1}</span>}
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

                {/* Right Panel / Center Panel for Timer */}
                <div className={`flex flex-col items-center justify-center ${roomId ? 'flex-1' : ''}`}>

                    {/* Configuration Panel */}
                    {isConfiguring && (
                        <div className="absolute inset-x-0 mx-auto max-w-lg p-6 bg-black/80 backdrop-blur-xl border border-primary/40 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.3)] z-30 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300" style={{ top: roomId ? '10%' : '20%' }}>
                            <h3 className="text-primary font-mono text-sm tracking-widest mb-6 flex items-center gap-2 border-b border-primary/20 pb-4">
                                <Settings2 className="w-4 h-4" /> TIMER CONFIGURATION
                            </h3>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="flex flex-col gap-2 group">
                                    <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider group-focus-within:text-primary transition-colors">Hours</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={hours}
                                        onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                                        className="bg-black/50 border border-primary/30 rounded-lg p-3 text-white font-mono text-xl text-center focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 group">
                                    <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider group-focus-within:text-primary transition-colors">Minutes</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={minutes}
                                        onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                                        className="bg-black/50 border border-primary/30 rounded-lg p-3 text-white font-mono text-xl text-center focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 group">
                                    <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider group-focus-within:text-primary transition-colors">Seconds</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={seconds}
                                        onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
                                        className="bg-black/50 border border-primary/30 rounded-lg p-3 text-white font-mono text-xl text-center focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleApplyConfig}
                                className="w-full py-3 bg-primary/20 border border-primary/50 text-white font-mono uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] active:scale-[0.98]"
                            >
                                Apply / Initialize
                            </button>

                            <div className="mt-4 flex gap-2">
                                <button onClick={() => { setHours(4); setMinutes(0); setSeconds(0); }} className="flex-1 py-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors border border-border/40 rounded hover:border-primary/40 bg-white/5 hover:bg-primary/5">4H P-SET</button>
                                <button onClick={() => { setHours(2); setMinutes(0); setSeconds(0); }} className="flex-1 py-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors border border-border/40 rounded hover:border-primary/40 bg-white/5 hover:bg-primary/5">2H P-SET</button>
                                <button onClick={() => { setHours(1); setMinutes(0); setSeconds(0); }} className="flex-1 py-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors border border-border/40 rounded hover:border-primary/40 bg-white/5 hover:bg-primary/5">1H P-SET</button>
                            </div>
                        </div>
                    )}

                    {/* Timer SVG and Text */}
                    <div className="relative flex items-center justify-center scale-90 md:scale-100 transition-transform duration-500">
                        {/* SVG Progress Circle */}
                        <svg className={`${roomId ? 'w-[320px] h-[320px]' : 'w-[420px] h-[420px]'} -rotate-90 drop-shadow-[0_0_25px_rgba(239,68,68,0.3)] transition-all duration-700`}>
                            <circle
                                cx={roomId ? "160" : "210"}
                                cy={roomId ? "160" : "210"}
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-white/5"
                            />
                            <circle
                                cx={roomId ? "160" : "210"}
                                cy={roomId ? "160" : "210"}
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="text-primary transition-all duration-1000 ease-linear"
                                strokeLinecap="round"
                            />
                            {/* Inner decorative circle */}
                            <circle
                                cx={roomId ? "160" : "210"}
                                cy={roomId ? "160" : "210"}
                                r={radius - 16}
                                stroke="currentColor"
                                strokeWidth="1"
                                fill="transparent"
                                strokeDasharray="4 8"
                                className="text-white/20 animate-[spin_60s_linear_infinite]"
                            />
                            {/* Outer decorative circle */}
                            <circle
                                cx={roomId ? "160" : "210"}
                                cy={roomId ? "160" : "210"}
                                r={radius + 16}
                                stroke="currentColor"
                                strokeWidth="1"
                                fill="transparent"
                                strokeDasharray="1 12"
                                className="text-primary/40 animate-[spin_40s_linear_infinite_reverse]"
                            />
                        </svg>

                        {/* Time Display */}
                        <div className="absolute flex flex-col items-center justify-center">
                            <div className={`${roomId ? 'text-[4rem]' : 'text-[5.5rem]'} font-bold font-mono tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] leading-none flex items-center select-none transition-all duration-700`}>
                                <span className={`${roomId ? 'w-[80px]' : 'w-[110px]'} text-center tabular-nums`}>{h}</span>
                                <span className={`text-primary/70 pb-3 ${isRunning ? 'animate-pulse' : ''}`}>:</span>
                                <span className={`${roomId ? 'w-[80px]' : 'w-[110px]'} text-center tabular-nums`}>{m}</span>
                                <span className={`text-primary/70 pb-3 ${isRunning ? 'animate-pulse' : ''}`}>:</span>
                                <span className={`${roomId ? 'w-[80px]' : 'w-[110px]'} text-center tabular-nums text-primary`}>{s}</span>
                            </div>
                            <div className="mt-4 text-xs font-mono tracking-[0.4em] text-muted-foreground uppercase bg-black/40 px-4 py-1 rounded-full border border-white/5">
                                {isRunning ? <span className="text-primary animate-pulse">System Active</span> : 'System Standby'}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className={`flex items-center gap-6 mt-16 transition-all duration-500 ${isConfiguring ? 'opacity-20 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
                        <button
                            onClick={handleReset}
                            className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all hover:scale-110 active:scale-95 group"
                            title="Reset Timer"
                        >
                            <RotateCcw className="w-6 h-6 group-hover:-rotate-90 transition-transform duration-300" />
                        </button>

                        <button
                            onClick={isRunning ? handlePause : handleStart}
                            className={`p-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(239,68,68,0.2)] ${isRunning
                                ? 'bg-black/50 border-primary/50 text-white hover:bg-black/80 hover:border-primary'
                                : 'bg-primary border-primary text-black hover:bg-primary/90 hover:shadow-[0_0_50px_rgba(239,68,68,0.5)]'}`}
                            title={isRunning ? "Pause Timer" : "Start Timer"}
                        >
                            {isRunning ? <Pause className="w-8 h-8 fill-current text-primary" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>

                        <button
                            onClick={() => setIsConfiguring(true)}
                            className="p-4 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all hover:scale-110 active:scale-95"
                            title="Configure Timer"
                        >
                            <Settings2 className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Warning when time is running out */}
                    {timeLeft > 0 && timeLeft <= 300 && (
                        <div className="absolute bottom-8 left-0 right-0 mx-auto w-fit px-6 py-2 bg-primary/20 border border-primary/50 rounded-full text-primary text-sm font-mono tracking-widest animate-pulse flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] z-10 backdrop-blur-md">
                            <ShieldAlert className="w-4 h-4" />
                            CRITICAL: LESS THAN 5 MINUTES REMAINING
                        </div>
                    )}
                </div>
            </div>

            {/* Time Up Alert */}
            {timeLeft === 0 && !isConfiguring && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center animate-in fade-in z-40 backdrop-blur-sm pointer-events-none">
                    <div className="text-[10rem] font-black tracking-tighter text-primary drop-shadow-[0_0_100px_rgba(239,68,68,0.8)] animate-[pulse_1s_ease-in-out_infinite]">
                        TIME UP
                    </div>
                </div>
            )}
        </div>
    );
}
