"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, X, LogIn, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LKSFloatingRoomProps {
    roomCode: string;
    roomTitle: string;
    isActive: boolean;
    onLeave: () => void; // callback to clear LKS session after confirm
}

export function LKSFloatingRoom({ roomCode, roomTitle, isActive, onLeave }: LKSFloatingRoomProps) {
    const router = useRouter();
    const [isMinimized, setIsMinimized] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    const handleReturnToRoom = () => {
        router.push(`/lks/${roomCode}`);
    };

    const handleConfirmLeave = () => {
        onLeave();
        setShowLeaveConfirm(false);
    };

    return (
        <>
            {/* ── Floating Mini Panel ── */}
            <div
                className={`fixed bottom-6 right-6 z-[9990] transition-all duration-300 ease-in-out ${isMinimized ? "w-56" : "w-72"}`}
            >
                <div className={`rounded-2xl border ${isActive ? "border-primary/50 shadow-[0_0_30px_rgba(239,68,68,0.25)]" : "border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)]"} bg-black/90 backdrop-blur-xl overflow-hidden`}>

                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 py-3 ${isActive ? "bg-primary/10 border-b border-primary/20" : "bg-yellow-500/10 border-b border-yellow-500/20"}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            {/* Pulsing status dot */}
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-primary shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" : "bg-yellow-400 animate-pulse"}`} />
                            <span className="text-[11px] font-mono font-bold uppercase tracking-widest truncate text-white">
                                {isActive ? "LIVE SIMULATION" : "WAITING ROOM"}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => setIsMinimized(p => !p)}
                                className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                                title={isMinimized ? "Expand" : "Minimize"}
                            >
                                {isMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            <button
                                onClick={() => setShowLeaveConfirm(true)}
                                className="p-1 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                                title="Leave room"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Body — hidden when minimized */}
                    {!isMinimized && (
                        <div className="p-4 space-y-3">
                            <div>
                                <p className="text-white font-bold text-sm truncate">{roomTitle}</p>
                                <p className={`text-xs font-mono mt-0.5 ${isActive ? "text-primary" : "text-yellow-400"}`}>
                                    Code: <span className="font-bold tracking-widest">{roomCode}</span>
                                </p>
                            </div>

                            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                                {isActive
                                    ? "Simulation in progress. Return to continue solving challenges."
                                    : "Waiting for admin to start. You'll be notified automatically."}
                            </p>

                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className={`flex-1 h-8 text-xs font-bold gap-1.5 ${isActive ? "bg-primary hover:bg-primary/90 shadow-[0_0_12px_rgba(239,68,68,0.4)]" : "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"}`}
                                    onClick={handleReturnToRoom}
                                >
                                    <LogIn className="w-3 h-3" />
                                    Return to Room
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Leave Confirmation Dialog ── */}
            {showLeaveConfirm && (
                <div className="fixed inset-0 z-[9995] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLeaveConfirm(false)} />
                    <div className="relative z-10 bg-black/95 border border-red-500/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-[0_0_40px_rgba(239,68,68,0.3)] animate-in zoom-in-95 fade-in duration-200">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-black text-lg uppercase tracking-wide">Leave Room?</h3>
                                <p className="text-muted-foreground text-sm font-mono mt-0.5">
                                    {isActive ? "Simulation is still running!" : "You're still registered in this room."}
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-300 font-mono leading-relaxed mb-5 bg-white/[0.03] border border-white/5 rounded-xl p-3">
                            {isActive
                                ? "Leaving will remove you from the simulation. Your progress and submissions will be kept, but you won't be able to rejoin without the access code."
                                : "Leaving will remove you from the waiting room. You can rejoin anytime using the room code before the simulation ends."}
                        </p>

                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                className="flex-1 hover:bg-white/5 border border-white/10"
                                onClick={() => setShowLeaveConfirm(false)}
                            >
                                Stay in Room
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                onClick={handleConfirmLeave}
                            >
                                Leave Room
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ─── Blocked Action Warning Dialog ─────────────────────────────────────────
   Use this when user tries to do something blocked (logout, normal challenges)
   while in an LKS session.
─────────────────────────────────────────────────────────────────────────────*/
interface LKSBlockedWarningProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToRoom: () => void;
    roomCode: string;
    actionLabel?: string; // e.g. "Log Out", "Submit a flag"
}

export function LKSBlockedWarning({ isOpen, onClose, onGoToRoom, roomCode, actionLabel = "do this" }: LKSBlockedWarningProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9996] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 bg-black/95 border border-yellow-500/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-[0_0_40px_rgba(234,179,8,0.2)] animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-lg uppercase tracking-wide">Action Blocked</h3>
                        <p className="text-yellow-400/80 text-sm font-mono mt-0.5">LKS Simulation Active</p>
                    </div>
                </div>

                <p className="text-sm text-slate-300 font-mono leading-relaxed mb-5 bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    You can't <span className="text-white font-bold">{actionLabel}</span> while in an active LKS simulation room.
                    Please return to your room or leave it first.
                </p>

                <p className="text-xs text-muted-foreground font-mono mb-4">
                    Room code: <span className="text-primary font-bold">{roomCode}</span>
                </p>

                <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1 hover:bg-white/5 border border-white/10" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] gap-1.5"
                        onClick={onGoToRoom}
                    >
                        <LogIn className="w-3.5 h-3.5" />
                        Go to Room
                    </Button>
                </div>
            </div>
        </div>
    );
}
