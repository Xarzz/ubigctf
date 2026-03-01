"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Target, LogIn, ChevronUp, ChevronDown, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LKSExitWarning } from "@/components/LKSExitWarning";

interface LKSFloatingRoomProps {
    roomCode: string;
    roomTitle: string;
    isActive: boolean;
    onLeave: () => void;
}

export function LKSFloatingRoom({ roomCode, roomTitle, isActive, onLeave }: LKSFloatingRoomProps) {
    const router = useRouter();
    const [isMinimized, setIsMinimized] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    // ─── Live timer synced from localStorage ─────────────────────────────────
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const syncTimer = () => {
            if (!roomCode) return;
            try {
                const key = `lks_timer_${roomCode}`;
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
        timerIntervalRef.current = setInterval(syncTimer, 1000);
        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, [roomCode]);

    const formatTime = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const isLowTime = timeLeft !== null && timeLeft > 0 && timeLeft <= 300;

    return (
        <>
            {/* ── Floating Mini Panel ── */}
            <div className={`fixed bottom-6 right-6 z-[9990] transition-all duration-300 ease-in-out ${isMinimized ? "w-60" : "w-72"}`}>
                <div className={`rounded-2xl border ${isActive ? isLowTime ? "border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.4)]" : "border-primary/50 shadow-[0_0_30px_rgba(239,68,68,0.25)]" : "border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)]"} bg-black/90 backdrop-blur-xl overflow-hidden`}>

                    {/* Header */}
                    <div className={`flex items-center justify-between px-3 py-2.5 ${isActive ? isLowTime ? "bg-red-500/15 border-b border-red-500/30" : "bg-primary/10 border-b border-primary/20" : "bg-yellow-500/10 border-b border-yellow-500/20"}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? isLowTime ? "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-primary shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-yellow-400"} animate-pulse`} />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest truncate text-white">
                                {isActive ? isLowTime ? "⚠ TIME CRITICAL" : "LIVE SIMULATION" : "WAITING ROOM"}
                            </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => setIsMinimized(p => !p)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                                {isMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            <button onClick={() => setShowLeaveConfirm(true)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors text-xs font-mono px-2">
                                Leave
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    {!isMinimized && (
                        <div className="p-3 space-y-3">
                            {/* Room info */}
                            <div>
                                <p className="text-white font-bold text-sm truncate">{roomTitle}</p>
                                <p className={`text-xs font-mono mt-0.5 ${isActive ? "text-primary" : "text-yellow-400"}`}>
                                    Code: <span className="font-bold tracking-widest">{roomCode}</span>
                                </p>
                            </div>

                            {/* Timer (only when active and timer data available) */}
                            {isActive && timeLeft !== null && timeLeft > 0 && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono ${isLowTime ? "bg-red-500/10 border border-red-500/30" : "bg-black/40 border border-white/5"}`}>
                                    <Timer className={`w-3.5 h-3.5 ${isLowTime ? "text-red-400 animate-pulse" : "text-primary"}`} />
                                    <span className={`text-lg font-bold tabular-nums tracking-wider ${isLowTime ? "text-red-400" : "text-white"}`}>
                                        {formatTime(timeLeft)}
                                    </span>
                                    {isLowTime && <span className="text-[9px] text-red-400 font-mono uppercase tracking-widest animate-pulse ml-auto">&lt;5m!</span>}
                                </div>
                            )}

                            {!isActive && (
                                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                                    Waiting for admin to start the simulation.
                                </p>
                            )}

                            <Button
                                size="sm"
                                className={`w-full h-8 text-xs font-bold gap-1.5 ${isActive ? isLowTime ? "bg-red-600 hover:bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]" : "bg-primary hover:bg-primary/90 shadow-[0_0_12px_rgba(239,68,68,0.4)]" : "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"}`}
                                onClick={() => router.push(`/lks/${roomCode}`)}
                            >
                                <LogIn className="w-3 h-3" />
                                Return to Room
                            </Button>
                        </div>
                    )}

                    {/* Minimized timer pill */}
                    {isMinimized && isActive && timeLeft !== null && timeLeft > 0 && (
                        <div className={`px-3 py-1.5 flex items-center gap-2 ${isLowTime ? "bg-red-500/5" : ""}`}>
                            <Timer className={`w-3 h-3 ${isLowTime ? "text-red-400 animate-pulse" : "text-primary"}`} />
                            <span className={`text-sm font-bold font-mono tabular-nums ${isLowTime ? "text-red-400" : "text-white"}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Leave Confirmation using unified LKSExitWarning ── */}
            <LKSExitWarning
                isOpen={showLeaveConfirm}
                onClose={() => setShowLeaveConfirm(false)}
                onStay={() => setShowLeaveConfirm(false)}
                onConfirm={onLeave}
                title={isActive ? "Leave Simulation?" : "Leave Waiting Room?"}
                confirmLabel="Leave Room"
                message={isActive
                    ? "Leaving will remove you from the active simulation. Your existing submissions are saved, but you won't be able to rejoin without the room code."
                    : "Leaving will remove you from the waiting room. You can rejoin anytime using the room code before the simulation ends."
                }
                note={isActive ? "This action cannot be undone." : undefined}
                variant={isActive ? "danger" : "warning"}
            />
        </>
    );
}
