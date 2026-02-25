"use client";

import { User, Mail, Shield, Award, TerminalSquare, Flag, LogOut, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const { user, profile, updateProfile, signOut, isLoaded } = useUser();
    const router = useRouter();
    const [nicknameInput, setNicknameInput] = useState("");

    // Initialize nickname input whenever profile is loaded
    useEffect(() => {
        if (profile?.username) {
            setNicknameInput(profile.username);
        }
    }, [profile]);

    // Simple safeguard redirect if missing
    useEffect(() => {
        if (isLoaded && !user) {
            router.push("/login"); // Optional: bounce unauthorized people
        }
    }, [isLoaded, user, router]);

    const handleSaveNickname = async () => {
        if (!nicknameInput.trim()) {
            toast.error("Alias cannot be blank");
            return;
        }

        const { error } = await updateProfile({ username: nicknameInput });
        if (error) {
            toast.error("Failed to update nickname. Maybe it's taken?");
        } else {
            toast.success("Alias successfully updated!");
        }
    };

    const handleSignOut = async () => {
        await signOut();
        // Force a hard reload to clear all React state and SWR caches completely
        window.location.href = "/login";
    };

    if (!isLoaded || !user) {
        return (
            <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center bg-[#050505] text-slate-200 overflow-hidden font-sans pb-20 pt-10">
                {/* Ambient Background Gradient */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[140px] animate-pulse" />
                    <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[140px] animate-pulse" />
                </div>

                <div className="container mx-auto px-4 max-w-5xl relative z-10 w-full animate-pulse">
                    {/* Skeleton Header Board */}
                    <div className="flex flex-col md:flex-row items-center gap-8 bg-[#0a0a0c]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden mb-8">
                        {/* Skeleton Avatar */}
                        <div className="relative z-10 shrink-0">
                            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border border-white/5 bg-white/5" />
                        </div>

                        {/* Skeleton Info */}
                        <div className="flex-1 text-center md:text-left z-10 space-y-4 w-full flex flex-col items-center md:items-start">
                            <div className="h-10 w-48 bg-white/10 rounded-lg" />
                            <div className="h-5 w-64 bg-white/5 rounded-lg" />
                        </div>

                        {/* Skeleton Points Banner */}
                        <div className="flex flex-row gap-3 md:gap-4 z-10 mt-4 md:mt-0 justify-center">
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 md:p-6 min-w-[140px] h-28" />
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 md:p-6 min-w-[120px] h-28" />
                        </div>
                    </div>

                    {/* Skeleton Grid Content */}
                    <div className="grid md:grid-cols-2 gap-8 relative z-10">
                        <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 rounded-3xl h-[400px]" />
                        <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 rounded-3xl h-[400px]" />
                    </div>
                </div>
            </div>
        );
    }

    const displayName = profile?.username || user.email?.split("@")[0] || "Anonymous";

    return (
        <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center bg-[#050505] text-slate-200 overflow-hidden font-sans pb-20 pt-10">
            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[140px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[140px]" />
            </div>

            <div className="container mx-auto px-4 max-w-5xl relative z-10">

                {/* --- Profile Header Board --- */}
                <div className="flex flex-col md:flex-row items-center gap-8 bg-[#0a0a0c]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden mb-8">
                    {/* Decorative glow inside card */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                    {/* Avatar System */}
                    <div className="relative z-10 shrink-0">
                        <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border border-primary/30 bg-gradient-to-br from-black to-slate-900 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.15)] ring-4 ring-[#050505]">
                            <User className="w-16 h-16 text-slate-500" />
                        </div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-extrabold uppercase tracking-wider px-4 py-1.5 rounded-full border-4 border-[#0a0a0c] shadow-lg shadow-primary/30 whitespace-nowrap">
                            Rank #12
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left z-10 space-y-2 min-w-0">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center justify-center md:justify-start gap-3 drop-shadow-sm min-w-0">
                            <span className="truncate" title={displayName}>{displayName}</span>
                            <Shield className="w-7 h-7 flex-shrink-0 text-primary drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                        </h1>
                        <p className="text-slate-400 flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 text-sm md:text-base font-medium min-w-0">
                            <span className="flex items-center justify-center md:justify-start gap-2 truncate min-w-0 max-w-full">
                                <Mail className="w-4 h-4 flex-shrink-0 text-slate-500" />
                                <span className="truncate">{user.email}</span>
                            </span>
                        </p>
                    </div>

                    {/* Highly Visible Points Banner */}
                    <div className="flex flex-row gap-3 md:gap-4 z-10 mt-4 md:mt-0 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 justify-center shrink-0">
                        <div className="bg-gradient-to-b from-[#111] to-[#0a0a0c] border border-primary/30 rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center min-w-[140px] shadow-[0_8px_30px_rgba(239,68,68,0.15)] relative overflow-hidden group hover:border-primary/50 transition-colors">
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

                            <span className="text-[10px] md:text-xs text-primary font-bold uppercase tracking-[0.2em] mb-1 relative z-10">Total Score</span>
                            <span className="text-4xl md:text-5xl font-black text-white font-mono tracking-tighter relative z-10 drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                                {profile?.score || 0}<span className="text-base md:text-lg text-primary/80 ml-1 font-sans tracking-normal font-bold">pts</span>
                            </span>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center min-w-[120px] shadow-lg">
                            <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Solved</span>
                            <span className="text-4xl md:text-5xl font-black text-white font-mono tracking-tighter">
                                0
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- Grid Content --- */}
                <div className="grid md:grid-cols-2 gap-8 relative z-10">

                    {/* Recent Achievements */}
                    <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-white/[0.02] px-8 py-6">
                            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-primary" />
                                Recent Breakthroughs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-4">
                            {[
                                { title: "Inspect Element", category: "Web Exploitation", pts: 100, icon: TerminalSquare },
                                { title: "Base64 Basic", category: "Cryptography", pts: 150, icon: Flag },
                                { title: "Cookie Monster", category: "Web Exploitation", pts: 200, icon: Shield },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-4 rounded-2xl border border-white/5 group">
                                    <div className="bg-primary/10 p-3 rounded-xl text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all shadow-[0_0_10px_rgba(239,68,68,0)] group-hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-white text-sm group-hover:text-primary transition-colors">{item.title}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono font-bold">
                                            +{item.pts}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Account Settings */}
                    <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col">
                        <CardHeader className="border-b border-white/5 bg-white/[0.02] px-8 py-6">
                            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-slate-400" />
                                Account Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8 flex-1">
                            {/* Nickname Form */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">
                                    Hacker Alias
                                </label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={nicknameInput}
                                            onChange={(e) => setNicknameInput(e.target.value)}
                                            placeholder="Set your custom alias"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono placeholder:text-slate-600"
                                        />
                                    </div>
                                    <Button onClick={handleSaveNickname} className="bg-white/10 text-white hover:bg-white/20 border border-white/10 rounded-xl font-bold px-6">
                                        Save
                                    </Button>
                                </div>
                                <p className="text-[11px] text-slate-500">How you appear to other hackers on the leaderboard.</p>
                            </div>

                            <hr className="border-white/5" />

                            {/* Password Update / Signout */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">
                                    Session Control
                                </label>
                                <Button
                                    onClick={handleSignOut}
                                    className="w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 rounded-xl font-bold mt-2 transition-all flex items-center justify-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Terminate Session (Logout)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
