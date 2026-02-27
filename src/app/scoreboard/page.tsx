"use client";

import { Trophy, Medal, Shield, User, Users, TerminalSquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";

interface LeaderboardEntry {
    id: string;
    rank: number;
    name: string;
    score: number;
    solved: number;
    type: "user" | "team";
}

const fetchLeaderboard = async () => {
    const { data, error } = await supabase
        .from('leaderboard')
        .select('*');

    if (error) throw error;

    return data ? data.map((p, idx) => ({
        id: p.id,
        rank: idx + 1,
        name: p.name || 'Anonymous Hacker',
        score: p.score || 0,
        solved: p.solved || 0,
        type: (p.type as "user" | "team") || 'user'
    })) : [];
};

export default function ScoreboardPage() {
    const { data: leaderboard = [], isLoading } = useSWR('public_leaderboard', fetchLeaderboard, {
        refreshInterval: 3000, // Real-time polling every 3 seconds
        revalidateOnFocus: true
    });

    return (
        <div className="container mx-auto px-4 py-16 max-w-5xl flex-1 flex flex-col justify-center">
            <div className="flex flex-col items-center justify-center text-center mb-12 mt-8">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl font-mono text-white drop-shadow-[0_2px_10px_rgba(239,68,68,0.5)] mb-6">
                    Top <span className="text-primary tracking-widest uppercase shadow-red-500">Solvers</span>
                </h1>
                <div className="w-24 h-1.5 bg-primary/80 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            </div>

            <div className="relative z-10 bg-card/50 backdrop-blur-md rounded-xl border border-border/50 shadow-[0_0_30px_-5px_rgba(0,0,0,0.8)] min-h-[400px]">

                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 bg-black/40 text-muted-foreground font-bold uppercase text-sm tracking-wider">
                    <div className="col-span-2 text-center">Rank</div>
                    <div className="col-span-6">Name</div>
                    <div className="col-span-2 text-center text-primary">Score</div>
                    <div className="col-span-2 text-center">Solved</div>
                </div>

                <div className="divide-y divide-border/30">
                    {isLoading && leaderboard.length === 0 ? (
                        <div className="p-16 flex flex-col items-center justify-center text-primary/50 font-mono gap-4 animate-pulse">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            Loading live rankings...
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground font-mono">
                            No hackers on the board yet. First blood is waiting!
                        </div>
                    ) : (
                        leaderboard.map((entry, idx) => (
                            <div
                                key={entry.id}
                                className={`grid grid-cols-12 gap-4 p-4 items-center transition-all hover:bg-white/[0.02] ${idx === 0 ? "bg-primary/10 border-l-4 border-l-primary" :
                                    idx === 1 ? "bg-primary/5 border-l-4 border-l-gray-300" :
                                        idx === 2 ? "bg-primary/5 border-l-4 border-l-amber-600" : ""
                                    }`}
                            >
                                <div className="col-span-2 flex justify-center items-center">
                                    {idx === 0 ? <Trophy className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" /> :
                                        idx === 1 ? <Medal className="w-6 h-6 text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.8)]" /> :
                                            idx === 2 ? <Medal className="w-6 h-6 text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]" /> :
                                                <span className="text-lg font-mono font-bold text-muted-foreground">{entry.rank}</span>}
                                </div>
                                <div className="col-span-6 font-medium text-lg flex items-center gap-3">
                                    {entry.type === "team" ? (
                                        <Users className={`w-5 h-5 ${idx < 3 ? 'text-primary' : 'text-muted-foreground/50'}`} />
                                    ) : (
                                        <User className={`w-5 h-5 ${idx < 3 ? 'text-primary' : 'text-muted-foreground/50'}`} />
                                    )}
                                    <div className="flex flex-col">
                                        <span>{entry.name}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">
                                            {entry.type}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-2 text-center font-mono font-bold text-xl text-primary drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]">
                                    {entry.score}
                                </div>
                                <div className="col-span-2 text-center font-mono text-muted-foreground">
                                    <Badge variant="outline" className="border-border/50 bg-black/50">{entry.solved}</Badge>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Background ambient glow */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none z-0" />
        </div>
    );
}
