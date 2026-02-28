"use client";

import { useLKSSession } from "@/hooks/useLKSSession";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Show a warning banner ONLY when the LKS simulation is actively running.
 * No banner during waiting state — user is free to browse.
 */
export function LKSWarningBanner({ context = "challenge" }: { context?: "challenge" | "submit" }) {
    const { isActive, roomCode } = useLKSSession();

    if (!isActive) return null;

    return (
        <div className="flex items-start gap-3 px-4 py-3 bg-primary/10 border border-primary/30 rounded-xl text-sm font-mono mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-primary animate-pulse" />
            <div className="flex-1">
                <span className="font-bold text-white">LKS Simulation Active</span>
                <span className="text-muted-foreground ml-2">
                    {context === "submit"
                        ? "— Flag submissions and challenge access are locked during the simulation."
                        : "— Challenge creation is locked. Focus on your simulation!"}
                </span>
            </div>
            <Link
                href={`/lks/${roomCode}`}
                className="flex items-center gap-1 text-primary hover:underline whitespace-nowrap text-xs"
            >
                Go to Simulation <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </div>
    );
}
