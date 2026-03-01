"use client";

import { LogIn, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Unified exit/action warning popup — used everywhere (admin & user) when
 * someone tries to leave, logout, or switch views during an active LKS simulation.
 */
export interface LKSExitWarningProps {
    isOpen: boolean;
    onClose: () => void;
    /** Primary action: stay / go back to room, or cancel */
    onStay: () => void;
    /** Destructive action: proceed anyway */
    onConfirm: () => void;
    /** Label for the destructive action button, e.g. "Log Out", "Leave Room" */
    confirmLabel?: string;
    /** Headline, e.g. "Leave Room?", "Log Out?" */
    title?: string;
    /** Body text describing what will happen */
    message?: string;
    /** Warning note (smaller sub-text) */
    note?: string;
    /** "danger" (red, for leave/logout) | "warning" (yellow, for nav) */
    variant?: "danger" | "warning";
}

export function LKSExitWarning({
    isOpen,
    onClose,
    onStay,
    onConfirm,
    confirmLabel = "Proceed Anyway",
    title = "Are you sure?",
    message = "A simulation is currently active. Proceeding may interrupt your session.",
    note,
    variant = "danger",
}: LKSExitWarningProps) {
    if (!isOpen) return null;

    const isDanger = variant === "danger";

    return (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative z-10 bg-black/95 border ${isDanger ? "border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.25)]" : "border-yellow-500/40 shadow-[0_0_50px_rgba(234,179,8,0.2)]"} rounded-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 fade-in duration-200`}
            >
                {/* Icon + title */}
                <div className="flex items-start gap-4 mb-5">
                    <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDanger ? "bg-red-500/10 border border-red-500/30" : "bg-yellow-500/10 border border-yellow-500/30"}`}
                    >
                        <AlertTriangle className={`w-6 h-6 ${isDanger ? "text-red-400" : "text-yellow-400"}`} />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-xl uppercase tracking-wide leading-tight">
                            {title}
                        </h3>
                        <p className={`text-sm font-mono mt-0.5 ${isDanger ? "text-red-400/80" : "text-yellow-400/80"}`}>
                            LKS Simulation Active
                        </p>
                    </div>
                </div>

                {/* Body */}
                <p className="text-sm text-slate-300 font-mono leading-relaxed bg-white/[0.03] border border-white/5 rounded-xl p-4 mb-4">
                    {message}
                </p>

                {/* Note */}
                {note && (
                    <p className={`text-xs font-mono mb-5 px-3 py-2 rounded-lg border ${isDanger ? "text-red-400/70 border-red-500/20 bg-red-500/5" : "text-yellow-400/70 border-yellow-500/20 bg-yellow-500/5"}`}>
                        ⚠ {note}
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        className="flex-1 border border-white/10 hover:bg-white/5 hover:text-white"
                        onClick={onStay}
                    >
                        <LogIn className="w-3.5 h-3.5 mr-1.5" />
                        Stay in Room
                    </Button>
                    <Button
                        className={`flex-1 font-bold ${isDanger ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "bg-yellow-600 hover:bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]"}`}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
