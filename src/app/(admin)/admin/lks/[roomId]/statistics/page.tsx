"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    BarChart3, Users, Trophy, Target, TrendingUp, TrendingDown,
    AlertTriangle, CheckCircle2, XCircle, BookOpen, Lightbulb,
    ArrowLeft, Shield, Zap, Brain, Lock,
    Star, Clock, Award, ChevronDown, ChevronUp
} from "lucide-react";

// ══════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════
interface Participant {
    user_id: string;
    name: string;
    score: number;
    solved: number;
}

interface Challenge {
    id: string;
    title: string;
    points: number;
    difficulty: string;
    category: string;
}

interface Submission {
    user_id: string;
    challenge_id: string;
    is_correct: boolean;
}

interface CategoryStat {
    category: string;
    totalChallenges: number;
    totalSolves: number;
    avgSolveRate: number;
    avgAttempts: number;
    hardestUnsolved: string[];
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    recommendations: string[];
}

interface ParticipantDetail {
    participant: Participant;
    solvedChallenges: Challenge[];
    unsolvedChallenges: Challenge[];
    attemptedButFailed: Challenge[];
    neverAttempted: Challenge[];
    categoryBreakdown: Record<string, { solved: number; total: number }>;
    strongCategories: string[];
    weakCategories: string[];
    score: number;
    rank: number;
}

// ══════════════════════════════════════════════════════
// Category config
// ══════════════════════════════════════════════════════
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; border: string; tip: string }> = {
    "Web": { icon: <Shield className="w-4 h-4" />, color: "text-blue-400", border: "border-blue-500/30", tip: "Practice SQL injection, XSS, IDOR, and authentication bypass techniques." },
    "Crypto": { icon: <Lock className="w-4 h-4" />, color: "text-purple-400", border: "border-purple-500/30", tip: "Review RSA, AES, classical ciphers, and frequency analysis. Practice FactorDB and CrackStation." },
    "Pwn": { icon: <Zap className="w-4 h-4" />, color: "text-orange-400", border: "border-orange-500/30", tip: "Study buffer overflow, ret2libc, format strings, and use pwntools for automation." },
    "Reverse": { icon: <Brain className="w-4 h-4" />, color: "text-pink-400", border: "border-pink-500/30", tip: "Learn Ghidra, IDA Pro basics, and understand assembly language fundamentals." },
    "Forensics": { icon: <BarChart3 className="w-4 h-4" />, color: "text-green-400", border: "border-green-500/30", tip: "Practice with Volatility, Autopsy, Wireshark, and steganography tools like StegHide." },
    "OSINT": { icon: <Target className="w-4 h-4" />, color: "text-cyan-400", border: "border-cyan-500/30", tip: "Master Google dorking, Shodan, social media investigation, and WHOIS lookups." },
    "Misc": { icon: <Star className="w-4 h-4" />, color: "text-yellow-400", border: "border-yellow-500/30", tip: "These vary widely — practice lateral thinking and research skills." },
    "Network": { icon: <Shield className="w-4 h-4" />, color: "text-teal-400", border: "border-teal-500/30", tip: "Study TCP/IP, Wireshark packet analysis, and common network protocols." },
};
const DEFAULT_CAT = { icon: <BookOpen className="w-4 h-4" />, color: "text-slate-400", border: "border-slate-500/30", tip: "Study the fundamentals and practice regularly on platforms like PicoCTF and HackTheBox." };

function getCatConfig(cat: string) { return CATEGORY_CONFIG[cat] || DEFAULT_CAT; }

// ══════════════════════════════════════════════════════
// Score badge
// ══════════════════════════════════════════════════════
function ScoreBadge({ rate }: { rate: number }) {
    if (rate >= 0.8) return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">Excellent</span>;
    if (rate >= 0.6) return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">Good</span>;
    if (rate >= 0.4) return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Average</span>;
    if (rate >= 0.2) return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">Below Avg</span>;
    return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">Needs Work</span>;
}

// Radial progress
function CircleProgress({ pct, size = 64, stroke = 5, color = "#ef4444" }: { pct: number; size?: number; stroke?: number; color?: string }) {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="transparent" className="text-white/5" />
            <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="transparent"
                strokeDasharray={circ} strokeDashoffset={circ - pct * circ} strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
    );
}

// ══════════════════════════════════════════════════════
// Main Statistics Page
// ══════════════════════════════════════════════════════
export default function RoomStatisticsPage() {
    const params = useParams();
    const router = useRouter();
    const roomDbId = params?.roomId as string;

    const [room, setRoom] = useState<any>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        if (!roomDbId) return;
        setIsLoading(true);
        const [roomRes, challRes, submRes, partRes] = await Promise.all([
            supabase.from("lks_rooms").select("*").eq("id", roomDbId).single(),
            supabase.from("lks_room_challenges").select("challenge_id, challenges(id, title, points, difficulty, categories(name))").eq("room_id", roomDbId),
            supabase.from("lks_submissions").select("user_id, challenge_id, is_correct").eq("room_id", roomDbId),
            supabase.from("lks_scoreboard").select("*").eq("room_id", roomDbId),
        ]);

        setRoom(roomRes.data);

        const challList: Challenge[] = (challRes.data || []).map((row: any) => ({
            id: row.challenges?.id || row.challenge_id,
            title: row.challenges?.title || "Unknown",
            points: row.challenges?.points || 0,
            difficulty: row.challenges?.difficulty || "Easy",
            category: row.challenges?.categories?.name || "Misc",
        }));
        setChallenges(challList);
        setSubmissions((submRes.data || []) as Submission[]);

        const partList: Participant[] = ([...(partRes.data || [])] as any[])
            .sort((a, b) => b.score !== a.score ? b.score - a.score : b.solved - a.solved)
            .map(p => ({ user_id: p.user_id, name: p.name, score: p.score, solved: p.solved }));
        setParticipants(partList);
        setIsLoading(false);
    }, [roomDbId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ─── Derived Statistics ───────────────────────────────────────────────────

    // Correct submissions per challenge
    const solveCountByChallenge: Record<string, number> = {};
    const totalAttemptsByChallenge: Record<string, number> = {};
    const correctSubmitters: Record<string, Set<string>> = {};

    for (const sub of submissions) {
        if (!totalAttemptsByChallenge[sub.challenge_id]) totalAttemptsByChallenge[sub.challenge_id] = 0;
        totalAttemptsByChallenge[sub.challenge_id]++;
        if (sub.is_correct) {
            solveCountByChallenge[sub.challenge_id] = (solveCountByChallenge[sub.challenge_id] || 0) + 1;
            if (!correctSubmitters[sub.challenge_id]) correctSubmitters[sub.challenge_id] = new Set();
            correctSubmitters[sub.challenge_id].add(sub.user_id);
        }
    }

    // Category stats
    const categoryMap: Record<string, Challenge[]> = {};
    for (const ch of challenges) {
        if (!categoryMap[ch.category]) categoryMap[ch.category] = [];
        categoryMap[ch.category].push(ch);
    }

    const categoryStats: CategoryStat[] = Object.entries(categoryMap).map(([cat, challs]) => {
        const totalSolves = challs.reduce((sum, ch) => sum + (solveCountByChallenge[ch.id] || 0), 0);
        const totalPossible = challs.length * Math.max(participants.length, 1);
        const avgSolveRate = totalPossible > 0 ? totalSolves / totalPossible : 0;
        const hardestUnsolved = challs
            .filter(ch => !solveCountByChallenge[ch.id])
            .sort((a, b) => b.points - a.points)
            .slice(0, 3)
            .map(ch => ch.title);

        const cfg = getCatConfig(cat);
        const recs: string[] = [];
        if (avgSolveRate < 0.3) recs.push(`Only ${Math.round(avgSolveRate * 100)}% solve rate — consider reviewing fundamentals`);
        if (hardestUnsolved.length > 0) recs.push(`Zero solves on: ${hardestUnsolved.join(", ")}`);
        recs.push(cfg.tip);

        return {
            category: cat, totalChallenges: challs.length, totalSolves, avgSolveRate,
            avgAttempts: challs.reduce((sum, ch) => sum + (totalAttemptsByChallenge[ch.id] || 0), 0) / Math.max(challs.length, 1),
            hardestUnsolved, icon: cfg.icon, color: cfg.color, borderColor: cfg.border, recommendations: recs,
        };
    }).sort((a, b) => a.avgSolveRate - b.avgSolveRate);

    // Per-participant detail
    const participantDetails: ParticipantDetail[] = participants.map((p, idx) => {
        const userSubs = submissions.filter(s => s.user_id === p.user_id);
        const correctIds = new Set(userSubs.filter(s => s.is_correct).map(s => s.challenge_id));
        const attemptedIds = new Set(userSubs.map(s => s.challenge_id));

        const solved = challenges.filter(ch => correctIds.has(ch.id));
        const unsolved = challenges.filter(ch => !correctIds.has(ch.id));
        const attemptedFailed = unsolved.filter(ch => attemptedIds.has(ch.id));
        const neverAttempted = unsolved.filter(ch => !attemptedIds.has(ch.id));

        const catBreakdown: Record<string, { solved: number; total: number }> = {};
        for (const cat of Object.keys(categoryMap)) {
            const catChalls = categoryMap[cat];
            catBreakdown[cat] = {
                solved: catChalls.filter(ch => correctIds.has(ch.id)).length,
                total: catChalls.length,
            };
        }
        const strong = Object.entries(catBreakdown).filter(([, v]) => v.total > 0 && v.solved / v.total >= 0.7).map(([k]) => k);
        const weak = Object.entries(catBreakdown).filter(([, v]) => v.total > 0 && v.solved / v.total < 0.3).map(([k]) => k);

        return { participant: p, solvedChallenges: solved, unsolvedChallenges: unsolved, attemptedButFailed: attemptedFailed, neverAttempted, categoryBreakdown: catBreakdown, strongCategories: strong, weakCategories: weak, score: p.score, rank: idx + 1 };
    });

    // Overall stats
    const totalPossibleSolves = challenges.length * Math.max(participants.length, 1);
    const totalActualSolves = Object.values(solveCountByChallenge).reduce((a, b) => a + b, 0);
    const overallSolveRate = totalPossibleSolves > 0 ? totalActualSolves / totalPossibleSolves : 0;

    const hardestChallenge = challenges.reduce((prev, ch) => (solveCountByChallenge[ch.id] || 0) < (solveCountByChallenge[prev?.id] || Infinity) ? ch : prev, challenges[0]);
    const easiestChallenge = challenges.reduce((prev, ch) => (solveCountByChallenge[ch.id] || 0) > (solveCountByChallenge[prev?.id] || -Infinity) ? ch : prev, challenges[0]);

    // ─── UI ───────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="flex items-center gap-3 text-primary font-mono text-sm animate-pulse">
                    <BarChart3 className="w-5 h-5 animate-pulse" /> Compiling statistics...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Grid bg */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#ef44440a_1px,transparent_1px),linear-gradient(to_bottom,#ef44440a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-10">

                {/* ── Page Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
                    <div>
                        <p className="text-primary font-mono text-xs uppercase tracking-[0.4em] mb-1">LKS Simulation</p>
                        <h1 className="text-4xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            Statistics & <span className="text-primary">Evaluation</span>
                        </h1>
                        {room && <p className="text-muted-foreground font-mono text-sm mt-1">Room: <span className="text-white font-bold">{room.title}</span> · Code: <span className="text-primary font-bold">{room.room_code}</span></p>}
                    </div>
                    <button onClick={() => router.push(`/admin/lks/${roomDbId}`)}
                        className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all font-mono text-sm uppercase tracking-widest shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Room
                    </button>
                </div>

                {challenges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center border-t border-white/5 mt-4">
                        <Target className="w-16 h-16 text-primary/30 mb-6" />
                        <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-3">No Challenges Assigned</h2>
                        <p className="text-muted-foreground font-mono text-sm mb-8 max-w-md">
                            It looks like this room does not have any challenges mapped to it yet. Please assign challenges before viewing statistics.
                        </p>
                        <button onClick={() => router.push(`/admin/lks/${roomDbId}`)}
                            className="flex items-center gap-2 px-8 py-4 bg-primary/20 border border-primary/50 text-primary rounded-xl hover:bg-primary hover:text-white hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all font-mono font-bold text-sm uppercase tracking-widest"
                        >
                            <Target className="w-5 h-5" /> Go to Room to Choose Challenges
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ── Overview Cards ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Participants", value: participants.length, icon: <Users className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                                { label: "Challenges", value: challenges.length, icon: <Target className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
                                { label: "Overall Solve Rate", value: `${Math.round(overallSolveRate * 100)}%`, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
                                { label: "Total Solves", value: totalActualSolves, icon: <Trophy className="w-5 h-5" />, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
                            ].map(card => (
                                <div key={card.label} className={`rounded-2xl border p-5 ${card.bg} backdrop-blur-sm`}>
                                    <div className={`flex items-center gap-2 mb-3 ${card.color}`}>{card.icon}<span className="text-xs font-mono uppercase tracking-widest">{card.label}</span></div>
                                    <div className={`text-4xl font-black tabular-nums ${card.color}`}>{card.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* ── Category Analysis ── */}
                        <section>
                            <div className="flex items-center gap-3 mb-5">
                                <BarChart3 className="w-6 h-6 text-primary" />
                                <h2 className="text-2xl font-black uppercase tracking-widest text-white">Category Analysis</h2>
                                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">— weakest first</span>
                            </div>
                            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {categoryStats.map(cat => {
                                    const cfg = getCatConfig(cat.category);
                                    const pct = cat.avgSolveRate;
                                    const progressColor = pct >= 0.7 ? "#22c55e" : pct >= 0.4 ? "#eab308" : "#ef4444";
                                    return (
                                        <div key={cat.category} className={`bg-black/60 border ${cat.borderColor} rounded-2xl p-5 backdrop-blur-sm`}>
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={cat.color}>{cat.icon}</span>
                                                    <h3 className={`font-black text-lg uppercase tracking-wide ${cat.color}`}>{cat.category}</h3>
                                                </div>
                                                <div className="relative w-14 h-14">
                                                    <CircleProgress pct={pct} size={56} stroke={4} color={progressColor} />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-[11px] font-bold font-mono text-white">{Math.round(pct * 100)}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Solve bar */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1.5">
                                                    <span>{cat.totalSolves} total solves</span>
                                                    <span>{cat.totalChallenges} challenges</span>
                                                </div>
                                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct * 100}%`, backgroundColor: progressColor }} />
                                                </div>
                                            </div>

                                            {/* Badge */}
                                            <div className="mb-3"><ScoreBadge rate={pct} /></div>

                                            {/* Unsolved highlights */}
                                            {cat.hardestUnsolved.length > 0 && (
                                                <div className="mb-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                                                    <p className="text-[9px] font-mono text-red-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                        <XCircle className="w-3 h-3" /> Zero solves
                                                    </p>
                                                    {cat.hardestUnsolved.map(t => (
                                                        <p key={t} className="text-xs text-white/70 font-mono leading-relaxed">• {t}</p>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Recommendations */}
                                            <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                                                <p className="text-[9px] font-mono text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                    <Lightbulb className="w-3 h-3" /> Recommendations
                                                </p>
                                                {cat.recommendations.map((rec, i) => (
                                                    <p key={i} className="text-xs text-white/60 font-mono leading-relaxed">• {rec}</p>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* ── Challenge Difficulty Breakdown ── */}
                        <section>
                            <div className="flex items-center gap-3 mb-5">
                                <Target className="w-6 h-6 text-primary" />
                                <h2 className="text-2xl font-black uppercase tracking-widest text-white">Challenge Breakdown</h2>
                            </div>
                            <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-5 py-3 border-b border-white/5">
                                    <span>Challenge</span><span>Category</span><span>Difficulty</span><span>Solves</span><span>Solve Rate</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {challenges
                                        .sort((a, b) => (solveCountByChallenge[b.id] || 0) - (solveCountByChallenge[a.id] || 0))
                                        .map(ch => {
                                            const solves = solveCountByChallenge[ch.id] || 0;
                                            const rate = participants.length > 0 ? solves / participants.length : 0;
                                            const diffColor = ch.difficulty === "Hard" ? "text-red-400" : ch.difficulty === "Medium" ? "text-yellow-400" : "text-green-400";
                                            return (
                                                <div key={ch.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] items-center px-5 py-3.5 border-b border-white/5 last:border-none hover:bg-white/5 transition-colors">
                                                    <span className="text-white font-medium text-sm truncate pr-2">{ch.title}</span>
                                                    <span className={`text-xs font-mono ${getCatConfig(ch.category).color}`}>{ch.category}</span>
                                                    <span className={`text-xs font-mono ${diffColor}`}>{ch.difficulty}</span>
                                                    <span className="text-white font-mono">{solves}/{participants.length}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, backgroundColor: rate >= 0.6 ? "#22c55e" : rate >= 0.3 ? "#eab308" : "#ef4444" }} />
                                                        </div>
                                                        <span className="text-xs font-mono text-muted-foreground w-10 text-right">{Math.round(rate * 100)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Notable challenges */}
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                {hardestChallenge && (
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                                        <TrendingDown className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-1">Hardest Challenge (Least Solved)</p>
                                            <p className="text-white font-bold">{hardestChallenge.title}</p>
                                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{solveCountByChallenge[hardestChallenge.id] || 0} solve(s) · {hardestChallenge.category} · {hardestChallenge.difficulty}</p>
                                        </div>
                                    </div>
                                )}
                                {easiestChallenge && (
                                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                                        <TrendingUp className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-mono text-green-400 uppercase tracking-widest mb-1">Easiest Challenge (Most Solved)</p>
                                            <p className="text-white font-bold">{easiestChallenge.title}</p>
                                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{solveCountByChallenge[easiestChallenge.id] || 0} solve(s) · {easiestChallenge.category} · {easiestChallenge.difficulty}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── Per-Participant Evaluation ── */}
                        <section>
                            <div className="flex items-center gap-3 mb-5">
                                <Users className="w-6 h-6 text-primary" />
                                <h2 className="text-2xl font-black uppercase tracking-widest text-white">Individual Evaluation</h2>
                            </div>
                            <div className="space-y-4">
                                {participantDetails.map(detail => {
                                    const isExpanded = expandedParticipant === detail.participant.user_id;
                                    const solveRate = challenges.length > 0 ? detail.solvedChallenges.length / challenges.length : 0;
                                    const rankColors: Record<number, string> = { 1: "text-yellow-400", 2: "text-gray-300", 3: "text-amber-500" };
                                    const rankColor = rankColors[detail.rank] || "text-muted-foreground";

                                    return (
                                        <div key={detail.participant.user_id} className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden">
                                            {/* Participant header — always visible */}
                                            <button
                                                className="w-full flex items-center gap-5 px-6 py-5 hover:bg-white/5 transition-colors text-left"
                                                onClick={() => setExpandedParticipant(isExpanded ? null : detail.participant.user_id)}
                                            >
                                                {/* Rank */}
                                                <div className={`w-10 text-center font-black text-xl font-mono ${rankColor}`}>
                                                    {detail.rank <= 3 ? ["🥇", "🥈", "🥉"][detail.rank - 1] : `#${detail.rank}`}
                                                </div>

                                                {/* Name + badges */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-white font-bold text-lg truncate">{detail.participant.name}</span>
                                                        {detail.strongCategories.map(c => (
                                                            <span key={c} className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${getCatConfig(c).border} ${getCatConfig(c).color}`}>✓ {c}</span>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-xs font-mono text-muted-foreground">
                                                        <span>{detail.solvedChallenges.length}/{challenges.length} solved</span>
                                                        <span>{detail.participant.score} pts</span>
                                                        {detail.weakCategories.length > 0 && (
                                                            <span className="text-orange-400">⚠ Weak: {detail.weakCategories.join(", ")}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Mini progress */}
                                                <div className="shrink-0 flex items-center gap-4 md:gap-6">
                                                    <div className="hidden md:block">
                                                        <div className="text-[10px] text-muted-foreground font-mono uppercase mb-1 text-right">Solve Rate</div>
                                                        <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${solveRate * 100}%`, backgroundColor: solveRate >= 0.7 ? "#22c55e" : solveRate >= 0.4 ? "#eab308" : "#ef4444" }} />
                                                        </div>
                                                        <div className="text-xs text-right font-mono mt-0.5">{Math.round(solveRate * 100)}%</div>
                                                    </div>
                                                    <ScoreBadge rate={solveRate} />
                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                                </div>
                                            </button>

                                            {/* Expanded detail */}
                                            {isExpanded && (
                                                <div className="border-t border-white/10 p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    {/* Category breakdown */}
                                                    <div>
                                                        <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-3">Category Performance</p>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            {Object.entries(detail.categoryBreakdown).map(([cat, data]) => {
                                                                const rate = data.total > 0 ? data.solved / data.total : 0;
                                                                const cfg = getCatConfig(cat);
                                                                return (
                                                                    <div key={cat} className={`bg-black/40 border ${cfg.border} rounded-xl p-3`}>
                                                                        <div className={`flex items-center gap-1.5 mb-2 ${cfg.color}`}>
                                                                            {cfg.icon}<span className="text-[10px] font-mono uppercase tracking-widest">{cat}</span>
                                                                        </div>
                                                                        <div className="text-white font-bold text-lg">{data.solved}<span className="text-muted-foreground font-normal text-xs">/{data.total}</span></div>
                                                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
                                                                            <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, backgroundColor: rate >= 0.7 ? "#22c55e" : rate >= 0.4 ? "#eab308" : "#ef4444" }} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Attempted but failed */}
                                                    {detail.attemptedButFailed.length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] font-mono text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                                <AlertTriangle className="w-3 h-3" /> Attempted But Not Solved — Needs Follow-up
                                                            </p>
                                                            <div className="grid md:grid-cols-2 gap-2">
                                                                {detail.attemptedButFailed.map(ch => (
                                                                    <div key={ch.id} className="flex items-center justify-between bg-orange-500/5 border border-orange-500/15 rounded-xl px-4 py-2.5">
                                                                        <div>
                                                                            <span className="text-white text-sm font-medium">{ch.title}</span>
                                                                            <span className={`text-[9px] font-mono ml-2 ${getCatConfig(ch.category).color}`}>{ch.category}</span>
                                                                        </div>
                                                                        <span className="text-orange-400 font-mono text-xs font-bold">{ch.points}pts</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Never attempted */}
                                                    {detail.neverAttempted.length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                                <XCircle className="w-3 h-3" /> Never Attempted — Unexplored Areas
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {detail.neverAttempted.map(ch => (
                                                                    <span key={ch.id} className="text-xs font-mono px-3 py-1.5 bg-red-500/5 border border-red-500/15 rounded-lg text-white/70 flex items-center gap-1.5">
                                                                        <span className={getCatConfig(ch.category).color}>●</span>{ch.title}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Solved */}
                                                    {detail.solvedChallenges.length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] font-mono text-green-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                                <CheckCircle2 className="w-3 h-3" /> Successfully Solved
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {detail.solvedChallenges.map(ch => (
                                                                    <span key={ch.id} className="text-xs font-mono px-3 py-1.5 bg-green-500/5 border border-green-500/15 rounded-lg text-white/80 flex items-center gap-1.5">
                                                                        <CheckCircle2 className="w-3 h-3 text-green-400" />{ch.title}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Personal recommendations */}
                                                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
                                                        <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                            <Lightbulb className="w-3 h-3" /> Personal Evaluation & Recommendations
                                                        </p>
                                                        <ul className="space-y-2">
                                                            {detail.strongCategories.length > 0 && (
                                                                <li className="text-sm text-white/80 font-mono">
                                                                    <span className="text-green-400">✓ Strengths:</span> Strong performance in <span className="text-white font-bold">{detail.strongCategories.join(", ")}</span>. Keep developing these areas.
                                                                </li>
                                                            )}
                                                            {detail.weakCategories.length > 0 && (
                                                                <li className="text-sm text-white/80 font-mono">
                                                                    <span className="text-orange-400">⚠ Focus Areas:</span> Low performance in <span className="text-white font-bold">{detail.weakCategories.join(", ")}</span>.
                                                                    {detail.weakCategories.map(cat => ` ${getCatConfig(cat).tip}`).join(" ")}
                                                                </li>
                                                            )}
                                                            {detail.neverAttempted.length > 0 && (
                                                                <li className="text-sm text-white/80 font-mono">
                                                                    <span className="text-red-400">✗ Unexplored:</span> {detail.neverAttempted.length} challenges were never attempted. Broaden exploration in future sessions.
                                                                </li>
                                                            )}
                                                            {detail.attemptedButFailed.length > 0 && (
                                                                <li className="text-sm text-white/80 font-mono">
                                                                    <span className="text-yellow-400">→ Near Misses:</span> {detail.attemptedButFailed.length} challenges were attempted but not solved. Review writeups and problem approaches post-event.
                                                                </li>
                                                            )}
                                                            {solveRate >= 0.8 && (
                                                                <li className="text-sm text-white/80 font-mono">
                                                                    <span className="text-primary">★ Excellent:</span> Outstanding performance! Consider trying harder competitions like national/international CTF events.
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* ── Summary for Admin Delivery ── */}
                        <section className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Award className="w-6 h-6 text-primary" />
                                <h2 className="text-2xl font-black uppercase tracking-widest text-white">Admin Delivery Summary</h2>
                                <span className="text-xs font-mono text-muted-foreground">— talking points for participants</span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* What to emphasize */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-mono text-primary uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> Positive Takeaways
                                    </h3>
                                    <ul className="space-y-2">
                                        {categoryStats.filter(c => c.avgSolveRate >= 0.5).slice(0, 3).map(cat => (
                                            <li key={cat.category} className="flex items-start gap-2 text-sm text-white/80 font-mono">
                                                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                                                <span><span className="text-white font-bold">{cat.category}</span>: {Math.round(cat.avgSolveRate * 100)}% solve rate — participants showed good understanding</span>
                                            </li>
                                        ))}
                                        {participants.length > 0 && (
                                            <li className="flex items-start gap-2 text-sm text-white/80 font-mono">
                                                <Trophy className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                                                <span>Champion: <span className="text-white font-bold">{participants[0]?.name}</span> with <span className="text-primary font-bold">{participants[0]?.score} pts</span></span>
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                {/* What to improve */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-mono text-red-400 uppercase tracking-widest flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Areas to Address
                                    </h3>
                                    <ul className="space-y-2">
                                        {categoryStats.filter(c => c.avgSolveRate < 0.3).slice(0, 3).map(cat => (
                                            <li key={cat.category} className="flex items-start gap-2 text-sm text-white/80 font-mono">
                                                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                                <span><span className="text-white font-bold">{cat.category}</span> ({Math.round(cat.avgSolveRate * 100)}%): {getCatConfig(cat.category).tip}</span>
                                            </li>
                                        ))}
                                        {totalActualSolves === 0 && (
                                            <li className="text-sm text-red-400/80 font-mono">No challenges solved — consider starting with beginner-level CTF platforms before advancing.</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {/* Overall recommendation */}
                            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                                <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <Lightbulb className="w-3 h-3" /> Recommended Next Steps for All Participants
                                </p>
                                <div className="grid md:grid-cols-3 gap-3 text-xs font-mono text-white/70">
                                    <div className="flex items-start gap-2"><Clock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" /><span>Practice 30 min/day on PicoCTF, HackTheBox, or CTFtime</span></div>
                                    <div className="flex items-start gap-2"><BookOpen className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" /><span>Read writeups from top CTF teams on CTFtime after each event</span></div>
                                    <div className="flex items-start gap-2"><Users className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" /><span>Form study groups focused on weak categories identified above</span></div>
                                </div>
                            </div>
                        </section>
                    </>
                )}

            </div>
        </div>
    );
}
