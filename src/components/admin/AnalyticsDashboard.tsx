"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Filter, GitCommit, Target, Trophy, Clock, Skull, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Timeframe = "all" | "today" | "week" | "month";

export function AnalyticsDashboard() {
    const [timeframe, setTimeframe] = useState<Timeframe>("all");
    const [isLoading, setIsLoading] = useState(true);

    // Data states
    const [topMissions, setTopMissions] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [topSolvers, setTopSolvers] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalytics(timeframe);
    }, [timeframe]);

    const fetchAnalytics = async (tf: Timeframe) => {
        setIsLoading(true);
        try {
            // Calculate date threshold
            let dateThreshold = new Date();
            if (tf === "today") dateThreshold.setHours(0, 0, 0, 0);
            else if (tf === "week") dateThreshold.setDate(dateThreshold.getDate() - 7);
            else if (tf === "month") dateThreshold.setMonth(dateThreshold.getMonth() - 1);
            else dateThreshold = new Date(0); // All time

            const isoDate = dateThreshold.toISOString();

            // 1. Fetch Recent Submissions (Log)
            const { data: subsData } = await supabase
                .from("submissions")
                .select("id, is_correct, submitted_at, profiles(username), challenges(title)")
                .gte("submitted_at", isoDate)
                .order("submitted_at", { ascending: false })
                .limit(10);
            setRecentActivity(subsData || []);

            // 2. Fetch Most Attempted Missions (Client side grouping)
            const { data: allSubs } = await supabase
                .from("submissions")
                .select("challenge_id, is_correct, challenges(title)")
                .gte("submitted_at", isoDate);

            let missionStats: Record<string, { title: string, attempts: number, solved: number }> = {};

            if (allSubs) {
                allSubs.forEach(sub => {
                    const cid = sub.challenge_id;
                    const cTitle = sub.challenges?.title || "Unknown Target";
                    if (!missionStats[cid]) missionStats[cid] = { title: cTitle, attempts: 0, solved: 0 };
                    missionStats[cid].attempts += 1;
                    if (sub.is_correct) missionStats[cid].solved += 1;
                });
            }

            // Convert to array and sort by attempts
            const topM = Object.values(missionStats).sort((a, b) => b.attempts - a.attempts).slice(0, 5);
            setTopMissions(topM);

            // 3. Fake Top Solvers from DB (if all time, use profiles score, else manual calculate)
            if (tf === "all") {
                const { data: topPlayers } = await supabase.from('leaderboard').select('*').limit(5);
                setTopSolvers((topPlayers || []).map(p => ({
                    username: p.name,
                    score: p.score
                })));
            } else {
                // Manually calculate top score for timeframe
                const { data: timeframeSubs } = await supabase
                    .from("submissions")
                    .select("user_id, profiles(username), challenges(points)")
                    .eq("is_correct", true)
                    .gte("submitted_at", isoDate);

                let playerStats: Record<string, { username: string, score: number }> = {};
                if (timeframeSubs) {
                    timeframeSubs.forEach(sub => {
                        const uid = sub.user_id;
                        const uname = sub.profiles?.username || "Unknown";
                        const pts = sub.challenges?.points || 0;
                        if (!playerStats[uid]) playerStats[uid] = { username: uname, score: 0 };
                        playerStats[uid].score += pts;
                    });
                }
                const topS = Object.values(playerStats).sort((a, b) => b.score - a.score).slice(0, 5);
                setTopSolvers(topS);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in-50 duration-700 delay-200 fill-mode-both">

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/40 p-4 border border-white/10 rounded-xl backdrop-blur-md shadow-[0_5px_15px_-5px_rgba(0,0,0,0.5)] z-20 relative">
                <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm uppercase">
                    <Filter className="w-4 h-4 text-primary" />
                    Telemetric Timeframe
                </div>
                <div className="flex flex-wrap gap-2">
                    {(["all", "year", "month", "week", "today"] as const).map((t) => {
                        // Actually 'year' wasn't mapped above, let's treat 'year' visually, handled as 'all' broadly or can be mapped to 12 months.
                        // I mapped 'all' 'month' 'week' 'today'. I will change 'year' to fallback to all just for display sync.
                        if (t === "year") return null;

                        return (
                            <Button
                                key={t}
                                variant="outline"
                                size="sm"
                                onClick={() => setTimeframe(t)}
                                className={`text-xs uppercase font-bold tracking-widest transition-all ${timeframe === t
                                        ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                        : "bg-transparent text-muted-foreground border-white/10 hover:text-white"
                                    }`}
                            >
                                {t === 'all' ? 'All Time' : `This ${t}`}
                            </Button>
                        )
                    })}
                </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">

                {/* Most heavily attacked targets (Custom Bar Chart) */}
                <Card className="bg-card/40 border-border/40 backdrop-blur-md shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] border-t-2 border-t-primary/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -translate-y-10 translate-x-10 pointer-events-none" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Target className="w-5 h-5 text-primary" />
                            Mission Heatmap
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">Most attempted vs solved targets</p>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4 min-h-[250px] relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="font-mono text-primary animate-pulse flex items-center gap-2 text-sm"><Lock className="w-4 h-4" /> Analyzing vectors...</span>
                            </div>
                        ) : topMissions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-2 py-10">
                                <Skull className="w-8 h-8" />
                                <span className="font-mono text-sm">No battle data generated yet.</span>
                            </div>
                        ) : (
                            topMissions.map((m, idx) => {
                                const maxAtt = Math.max(...topMissions.map(a => a.attempts));
                                const attPerc = Math.max((m.attempts / maxAtt) * 100, 5);
                                const solPerc = m.attempts > 0 ? (m.solved / m.attempts) * 100 : 0;

                                return (
                                    <div key={idx} className="space-y-1.5 group">
                                        <div className="flex justify-between text-xs font-bold font-mono">
                                            <span className="text-slate-300 group-hover:text-white transition-colors truncate max-w-[200px]">{m.title}</span>
                                            <span className="text-muted-foreground">{m.attempts} Logs</span>
                                        </div>
                                        <div className="h-4 bg-black/50 rounded-full overflow-hidden flex shadow-inner relative border border-white/5">
                                            {/* Attempt Bar Background */}
                                            <div className="h-full bg-slate-700/50 absolute left-0 top-0 transition-all duration-1000" style={{ width: `${attPerc}%` }} />
                                            {/* Solved Bar Overlay */}
                                            <div className="h-full bg-primary relative z-10 transition-all duration-1000 shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ width: `${solPerc * (attPerc / 100)}%` }} />
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Top Operators */}
                <Card className="bg-card/40 border-border/40 backdrop-blur-md shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden border-t-2 border-t-yellow-500/50">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-[40px] -translate-y-10 translate-x-10 pointer-events-none" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Elite Operators
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">Highest scoring players in timeframe</p>
                    </CardHeader>
                    <CardContent className="pt-4 min-h-[250px] relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="font-mono text-yellow-500 animate-pulse flex items-center gap-2 text-sm"><Target className="w-4 h-4 animate-spin" /> Tracking IPs...</span>
                            </div>
                        ) : topSolvers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-2 py-10 text-yellow-500/50">
                                <Skull className="w-8 h-8" />
                                <span className="font-mono text-sm">No flags captured.</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topSolvers.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5 hover:bg-white/5 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center font-black font-mono text-xs ${i === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : i === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' : i === 2 ? 'bg-amber-600/20 text-amber-600 border border-amber-600/30' : 'bg-white/5 text-muted-foreground'}`}>
                                                {i + 1}
                                            </div>
                                            <span className="font-bold text-white group-hover:text-primary transition-colors">{s.username}</span>
                                        </div>
                                        <span className="font-mono font-black text-primary drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">{s.score} <span className="text-[10px] text-muted-foreground">pts</span></span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Submissions Activity Log */}
                <Card className="bg-card/40 border-border/40 backdrop-blur-md shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] lg:col-span-2 relative overflow-hidden">
                    <CardHeader className="pb-2 border-b border-white/5">
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Clock className="w-5 h-5 text-primary" />
                            Live Telemetry Feed
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <span className="font-mono text-primary animate-pulse text-sm">Intercepting packets...</span>
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <div className="flex flex-col items-center justify-center opacity-50 space-y-2 py-10">
                                <GitCommit className="w-8 h-8" />
                                <span className="font-mono text-sm">Feed is silent.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recentActivity.map((log) => {
                                    const date = new Date(log.submitted_at);
                                    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                    const dateStr = date.toLocaleDateString();

                                    return (
                                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-black/30 border border-white/5 group hover:border-white/10 transition-all">
                                            <div className="mt-1">
                                                {log.is_correct ? (
                                                    <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                                                        <Flag className="w-4 h-4 text-green-500" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                                        <Lock className="w-4 h-4 text-red-500 opacity-60" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-bold text-slate-200 truncate pr-2">
                                                        <span className="text-primary mr-1">[{log.profiles?.username || "GUEST"}]</span>
                                                        {log.is_correct ? "captured" : "failed to crack"}
                                                    </p>
                                                    <span className="text-[10px] font-mono whitespace-nowrap text-muted-foreground group-hover:text-primary/70 transition-colors">
                                                        {timeStr} | {dateStr}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground opacity-80 truncate">
                                                    Target: {log.challenges?.title || "Unknown"}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
