"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Activity, Flag, TerminalSquare, Timer } from "lucide-react";
import Link from "next/link";
import React, { useEffect } from 'react';
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile, isLoaded, signOut } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoaded) {
            if (!user) {
                toast.error("Unauthenticated. Please login.");
                router.replace("/login");
            } else if (profile?.role !== "admin") {
                toast.error("Unauthorized: Admin access only.");
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

    const navLink = (href: string, exact: boolean, icon: React.ReactNode, label: string) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
            <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}>
                {icon}{label}
            </Link>
        );
    };

    return (
        <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border/40 bg-black/40 backdrop-blur-xl flex flex-col pt-6 z-20 shadow-[10px_0_30px_-10px_rgba(239,68,68,0.1)]">
                {/* Brand */}
                <div className="px-8 mb-7 mt-4">
                    <h2 className="text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">UBIG<span className="text-primary">ADMIN</span></h2>
                    <span className="text-[11px] text-primary font-mono uppercase tracking-widest leading-none">Command Center</span>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navLink("/admin", true, <Activity className="w-5 h-5" />, "Dashboard")}
                    {navLink("/admin/challenges", true, <Flag className="w-5 h-5" />, "Challenges Manager")}
                    {navLink("/admin/lks", false, <Timer className="w-5 h-5" />, "LKS Control Panel")}
                </nav>

                <div className="px-4 pb-4 border-t border-border/40 pt-4">
                    <button
                        onClick={async () => { await signOut(); router.push('/login'); }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative scroll-smooth">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef44440a_1px,transparent_1px),linear-gradient(to_bottom,#ef44440a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
                <div className="relative z-10 p-8 pt-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
