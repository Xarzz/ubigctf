"use client";

import { useLKSSession } from "@/hooks/useLKSSession";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Show a warning banner if the user is currently in an LKS simulation (waiting or active).
 * Use this on: challenges page, profile/challenges page, etc.
 */
export function LKSWarningBanner({ context = "challenge" }: { context?: "challenge" | "submit" }) {
    const { isInLKS, isActive, isWaiting, roomCode, roomTitle } = useLKSSession();

    if (!isInLKS) return null;

    if (isActive) {
        return (
            <div className="flex items-start gap-3 px-4 py-3 bg-primary/10 border border-primary/30 rounded-xl text-sm font-mono text-primary mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 animate-pulse" />
                <div className="flex-1">
                    <span className="font-bold text-white">LKS Simulation Active</span>
                    <span className="text-muted-foreground ml-2">
                        — You're in an active simulation. {context === "submit" ? "Flag submissions" : "Regular challenges"} are locked.
                    </span>
                </div>
                <Link
                    href={`/lks/${roomCode}`}
                    className="flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
                >
                    Go to Simulation <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        );
    }

    if (isWaiting) {
        return (
            <div className="flex items-start gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm font-mono text-yellow-300 mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                    <span className="font-bold text-white">LKS Room Joined</span>
                    <span className="text-yellow-300/70 ml-2">
                        — Waiting for <span className="text-white font-bold">{roomTitle}</span> to start.{" "}
                        {context === "submit"
                            ? "You can't submit flags here until the simulation ends."
                            : "You're free to browse, but you'll be redirected when it starts."}
                    </span>
                </div>
                <Link
                    href={`/lks/${roomCode}`}
                    className="flex items-center gap-1 text-yellow-400 hover:underline whitespace-nowrap"
                >
                    View Room <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        );
    }

    return null;
}
