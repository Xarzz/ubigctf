"use client";

import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert, Activity, Users, Flag, TerminalSquare, Timer } from "lucide-react";
import Link from "next/link";
import React, { useEffect } from 'react';
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile, isLoaded } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoaded) {
            if (!user) {
                toast.error("Unauthenticated. Please login.");
                router.replace("/login");
            } else if (profile?.role !== "admin") {
                toast.error("Unauthorized: Strict Admin Clearance Required.");
                router.replace("/challenges");
            }
        }
    }, [isLoaded, user, profile, router]);

    if (!isLoaded || profile?.role !== "admin") {
        return (
            <div className="w-full min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="animate-pulse flex items-center gap-3 text-primary font-mono text-sm tracking-widest uppercase">
                    <TerminalSquare className="w-5 h-5 animate-spin" />
                    Checking Clearance...
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-border/40 bg-black/40 backdrop-blur-xl flex flex-col pt-6 z-20 shadow-[10px_0_30px_-10px_rgba(239,68,68,0.1)]">
                <div className="px-10 mb-8 mt-4">
                    <h2 className="text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">UBIG<span className="text-primary">ADMIN</span></h2>
                    <span className="text-[12px] text-primary font-mono uppercase tracking-widest leading-none">Command Center</span>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <Link href="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${pathname === '/admin' ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}>
                        <Activity className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <Link href="/admin/challenges" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${pathname === '/admin/challenges' ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}>
                        <Flag className="w-5 h-5" />
                        Challenges Manager
                    </Link>
                    <Link href="/admin/lks" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${pathname.startsWith('/admin/lks') ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}>
                        <Timer className="w-5 h-5" />
                        LKS Control Panel
                    </Link>
                </nav>

                <div className="p-6 border-t border-border/40">
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                        <ShieldAlert className="w-4 h-4 text-primary" />
                        RESTRICTED ACCESS
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative scroll-smooth">
                {/* Visual grid behind content */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef44440a_1px,transparent_1px),linear-gradient(to_bottom,#ef44440a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

                <div className="relative z-10 p-8 pt-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
