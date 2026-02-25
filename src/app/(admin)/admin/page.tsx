import { supabase } from "@/lib/supabase";
import { User, Flag, Target, Crosshair, Users, Activity } from "lucide-react";

import { Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

function DashboardSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card/50 backdrop-blur-md border border-border/40 p-6 rounded-2xl h-[140px] flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <Skeleton className="h-4 w-24 bg-white/10" />
                        <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
                    </div>
                    <Skeleton className="h-10 w-16 bg-white/10 mt-auto" />
                </div>
            ))}
        </div>
    );
}

async function DashboardMetrics() {
    // Analytics Metrics Fetching
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
    const { count: challengesCount } = await supabase.from('challenges').select('*', { count: 'exact', head: true });

    // Total Submissions vs Solved
    const { count: submissionsCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true });
    const { count: correctSubmissions } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('is_correct', true);

    const completionRate = submissionsCount && submissionsCount > 0
        ? Math.round(((correctSubmissions || 0) / submissionsCount) * 100)
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Players */}
            <div className="bg-card/50 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-white/20 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] group-hover:bg-primary/20 transition-all -translate-y-10 translate-x-10" />
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-muted-foreground uppercase font-semibold text-xs tracking-wider">Active Hackers</h3>
                    <div className="p-2 bg-secondary/50 rounded-lg">
                        <Users className="w-4 h-4 text-white" />
                    </div>
                </div>
                <div className="text-4xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    {usersCount || 0}
                </div>
            </div>

            {/* Challenges */}
            <div className="bg-card/50 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-white/20 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] group-hover:bg-primary/20 transition-all -translate-y-10 translate-x-10" />
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-muted-foreground uppercase font-semibold text-xs tracking-wider">Mission Targets</h3>
                    <div className="p-2 bg-secondary/50 rounded-lg">
                        <Target className="w-4 h-4 text-primary" />
                    </div>
                </div>
                <div className="text-4xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    {challengesCount || 0}
                </div>
            </div>

            {/* Total Submissions */}
            <div className="bg-card/50 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-white/20 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] group-hover:bg-primary/20 transition-all -translate-y-10 translate-x-10" />
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-muted-foreground uppercase font-semibold text-xs tracking-wider">Flag Submissions</h3>
                    <div className="p-2 bg-secondary/50 rounded-lg">
                        <Crosshair className="w-4 h-4 text-white" />
                    </div>
                </div>
                <div className="text-4xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    {submissionsCount || 0}
                </div>
            </div>

            {/* Completion Rate */}
            <div className="bg-card/50 backdrop-blur-md border border-border/40 p-6 rounded-2xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-primary/50 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] group-hover:bg-primary/30 transition-all -translate-y-10 translate-x-10" />
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-muted-foreground uppercase font-semibold text-xs tracking-wider">Breach Rate</h3>
                    <div className="p-2 bg-primary/20 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        <Flag className="w-4 h-4 text-primary" />
                    </div>
                </div>
                <div className="text-4xl font-black text-primary font-mono drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                    {completionRate}%
                </div>
                <div className="w-full bg-secondary h-1.5 mt-4 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${completionRate}%` }} />
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboardPage() {
    return (
        <div className="space-y-12 pb-20 animate-in slide-in-from-bottom-8 fade-in-50 duration-700">
            {/* Header Content */}
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-4">
                    <Activity className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" />
                    UBIG<span className="text-primary font-mono tracking-widest pl-2">SYSTEM.STATS</span>
                </h1>
                <p className="text-muted-foreground font-mono">Live telemetry from the UbigCTF backend</p>
            </div>

            <Suspense fallback={<DashboardSkeleton />}>
                <DashboardMetrics />
            </Suspense>

            {/* Advanced Analytics & Telemetry Layer */}
            <AnalyticsDashboard />
        </div>
    );
}

