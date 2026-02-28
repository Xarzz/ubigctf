"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Flag, CheckCircle, Lock, Monitor, Shield, FileSearch, Code, EyeOff, TerminalSquare, ChevronLeft, ChevronRight, Search, Filter, Users, Download, ExternalLink, HelpCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import useSWR from "swr";

const getCategoryIcon = (category: string) => {
    switch (category) {
        case "Web Exploitation":
            return <Monitor className="w-4 h-4 mr-1" />;
        case "Cryptography":
            return <Lock className="w-4 h-4 mr-1" />;
        case "Binary":
            return <TerminalSquare className="w-4 h-4 mr-1" />;
        case "Forensics":
            return <FileSearch className="w-4 h-4 mr-1" />;
        case "Reverse Engineering":
            return <Code className="w-4 h-4 mr-1" />;
        default:
            return <Shield className="w-4 h-4 mr-1" />;
    }
};

const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
        case "Easy":
            return "text-green-500 border-green-500 bg-green-500/10";
        case "Medium":
            return "text-yellow-500 border-yellow-500 bg-yellow-500/10";
        case "Hard":
            return "text-red-500 border-red-500 bg-red-500/10";
        default:
            return "text-gray-500";
    }
};

interface LKSChallengeBoardProps {
    roomId: string;
    roomCode: string;
}

export function LKSChallengeBoard({ roomId, roomCode }: LKSChallengeBoardProps) {
    const { user, isLoaded } = useUser();
    const router = useRouter();

    // SWR Fetcher for LKS Challenges
    const fetchLKSChallengesData = async () => {
        try {
            // Fetch challenges linked to this room
            const { data: roomChallsReq, error: rcErr } = await supabase
                .from('lks_room_challenges')
                .select('challenge_id')
                .eq('room_id', roomId);

            if (rcErr) throw rcErr;

            const allowedIds = (roomChallsReq || []).map(r => r.challenge_id);
            if (allowedIds.length === 0) return [];

            const [challengesRes, solvesRes] = await Promise.all([
                supabase
                    .from('challenges')
                    .select(`id, title, description, points, difficulty, flag, is_active, target_url, file_url, hints, created_at, categories (name), author`)
                    .in('id', allowedIds)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('lks_submissions')
                    .select('challenge_id')
                    .eq('room_id', roomId)
                    .eq('is_correct', true)
            ]);

            if (challengesRes.error) {
                console.error("Supabase Challenges Error:", challengesRes.error);
                throw challengesRes.error;
            }

            const solvesMap = new Map<string, number>();
            if (solvesRes.data) {
                for (const sub of solvesRes.data) {
                    solvesMap.set(sub.challenge_id, (solvesMap.get(sub.challenge_id) || 0) + 1);
                }
            }

            return (challengesRes.data || []).map(c => ({
                id: c.id,
                title: c.title,
                description: c.description,
                category: (c.categories as any)?.name || "Unknown",
                points: c.points,
                difficulty: c.difficulty,
                flag: c.flag,
                createdAt: c.created_at,
                target_url: c.target_url,
                file_url: c.file_url,
                hints: c.hints || [],
                author: c.author || 'System',
                solves: solvesMap.get(c.id) || 0
            }));
        } catch (e: any) {
            console.error("fetchLKSChallenges caught an error:", e);
            throw e;
        }
    };

    const fetchUserLKSSubmissions = async (keyArgs: any[]) => {
        const userId = keyArgs[1];
        if (!userId) return new Set<string>();
        const { data } = await supabase
            .from('lks_submissions')
            .select('challenge_id')
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .eq('is_correct', true);
        return new Set((data || []).map(s => s.challenge_id));
    };

    const { data: challengesBase = [], mutate: mutateChallenges, isLoading: isLoadingChallenges } = useSWR(
        ['lks_challenges', roomId],
        fetchLKSChallengesData,
        { refreshInterval: 60000, revalidateOnFocus: false }
    );

    const { data: userLKSSolvedSet = new Set(), mutate: mutateUserSubs, isLoading: isLoadingSubs } = useSWR(
        user?.id ? ['lks_user_submissions', user.id, roomId] : null,
        fetchUserLKSSubmissions,
        { refreshInterval: 60000, revalidateOnFocus: false }
    );

    // Merge data locally
    const challenges = challengesBase.map(c => ({
        ...c,
        solved: userLKSSolvedSet.has(c.id)
    }));

    const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
    const [flagInput, setFlagInput] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showHints, setShowHints] = useState<number>(0);

    const categories = Array.from(new Set(challenges.map(c => c.category)));
    const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState<"All" | "Easy" | "Medium" | "Hard" | "Insane">("All");

    const activeCategory = categories.length > 0 ? categories[activeCategoryIndex] : "Loading...";

    const nextCategory = () => setActiveCategoryIndex((prev) => (prev + 1) % categories.length);
    const prevCategory = () => setActiveCategoryIndex((prev) => (prev - 1 + categories.length) % categories.length);

    const handleOpenDialog = (c: any) => {
        setSelectedChallenge(c);
        setFlagInput("");
        setShowHints(0);
        setIsDialogOpen(true);
    };

    const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

    const handleSubmitFlag = async () => {
        if (!selectedChallenge || !user || isSubmittingFlag) return;
        setIsSubmittingFlag(true);

        const cleanInput = flagInput.trim();
        const cleanDbFlag = (selectedChallenge.flag || "").trim();
        const isCorrect = cleanInput === cleanDbFlag;

        try {
            // Important: Insert to lks_submissions instead of general submissions!
            const { error: insertError } = await supabase.from('lks_submissions').insert([{
                room_id: roomId,
                user_id: user.id,
                challenge_id: selectedChallenge.id,
                is_correct: isCorrect,
                submitted_flag: cleanInput
            }]);

            if (insertError && insertError.code !== '23505') {
                throw new Error(insertError.message || "Database insert failed");
            }

            if (isCorrect) {
                toast.success("Correct Flag! Target Captured for simulation.");
                setSelectedChallenge((prev: any) => ({ ...prev, solved: true }));
                try {
                    mutateUserSubs((prev: any) => new Set([...Array.from(prev || []), selectedChallenge.id]), { revalidate: false }).catch(() => { });
                    mutateChallenges((prev: any) => {
                        return prev?.map((c: any) => c.id === selectedChallenge.id ? { ...c, solves: (c.solves || 0) + 1 } : c);
                    }, { revalidate: false }).catch(() => { });
                } catch (e) { }
            } else {
                toast.error("Incorrect flag. Try harder!");
                setFlagInput("");
            }
        } catch (error: any) {
            console.error("Submission Error:", error);
            toast.error(error?.message || "Telemetry error: Could not verify flag.");
            setFlagInput("");
        } finally {
            setIsSubmittingFlag(false);
        }
    };

    const filteredAndSortedChallenges = challenges
        .filter(c => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchSearch = c.title.toLowerCase().includes(query) ||
                    c.category.toLowerCase().includes(query) ||
                    c.description.toLowerCase().includes(query);
                if (!matchSearch) return false;
            } else {
                if (c.category !== activeCategory) return false;
            }
            if (difficultyFilter !== "All" && c.difficulty !== difficultyFilter) {
                return false;
            }
            return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="space-y-12 pb-20">
            {(isLoadingChallenges && challengesBase.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                    <TerminalSquare className="w-12 h-12 text-primary/30 mb-4 animate-pulse duration-1000" />
                    <p className="text-primary/50 font-mono tracking-widest text-sm uppercase">Loading LKS Intel...</p>
                </div>
            ) : challenges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-700">
                    <div className="bg-primary/5 p-6 rounded-full mb-6 border border-primary/10 shadow-[0_0_30px_rgba(239,68,68,0.1)] relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                        <Shield className="w-16 h-16 text-primary/50 relative z-10" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight font-mono uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                        No Targets Allocated
                    </h2>
                    <p className="text-muted-foreground/80 max-w-md mx-auto text-center bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-sm leading-relaxed">
                        The administrator hasn't assigned any challenges to this simulation room yet.
                    </p>
                </div>
            ) : categories.length > 0 && (
                <section className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-4 border-b border-border/40 pb-4 justify-between">
                        <div className="flex items-center gap-4 justify-center w-full md:w-auto">
                            <Button variant="ghost" size="icon" onClick={prevCategory} className="hover:text-primary hover:bg-primary/20 rounded-full h-10 w-10 border border-primary/20 bg-background/50 shadow-[0_0_10px_rgba(239,68,68,0.1)] transition-all">
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center justify-center shadow-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)] min-w-[200px] md:min-w-[320px] text-center">
                                {getCategoryIcon(activeCategory as string)} <span className="ml-2 uppercase tracking-wide truncate">{activeCategory}</span>
                            </h2>
                            <Button variant="ghost" size="icon" onClick={nextCategory} className="hover:text-primary hover:bg-primary/20 rounded-full h-10 w-10 border border-primary/20 bg-background/50 shadow-[0_0_10px_rgba(239,68,68,0.1)] transition-all">
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search LKS challenges..."
                                    className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/50"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="border-border/50 bg-background/50 gap-2 min-w-[110px] justify-between">
                                        <div className="flex items-center gap-1">
                                            <Filter className="w-4 h-4 text-muted-foreground" />
                                            <span>{difficultyFilter}</span>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-black/95 border-border/50 text-white shadow-[0_4px_20px_-5px_rgba(239,68,68,0.3)] backdrop-blur-xl">
                                    <DropdownMenuItem onClick={() => setDifficultyFilter("All")} className="hover:bg-primary/20 hover:text-white cursor-pointer transition-colors focus:bg-primary/20">All Difficulties</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDifficultyFilter("Easy")} className="hover:bg-primary/20 hover:text-green-400 cursor-pointer transition-colors focus:bg-primary/20 text-green-500">Easy</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDifficultyFilter("Medium")} className="hover:bg-primary/20 hover:text-yellow-400 cursor-pointer transition-colors focus:bg-primary/20 text-yellow-500">Medium</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDifficultyFilter("Hard")} className="hover:bg-primary/20 hover:text-red-400 cursor-pointer transition-colors focus:bg-primary/20 text-red-500">Hard</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDifficultyFilter("Insane")} className="hover:bg-primary/20 hover:text-purple-400 cursor-pointer transition-colors focus:bg-primary/20 text-purple-500">Insane</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="relative">
                        {isLoaded && !user && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/40 backdrop-blur-md rounded-2xl border border-white/5 p-6 text-center min-h-[400px]">
                                <div className="bg-primary/10 p-4 rounded-full mb-4 border border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                                    <Lock className="w-10 h-10 text-primary" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Access Restricted</h3>
                                <p className="text-muted-foreground mb-6 max-w-sm">
                                    You must initialize a session to inspect challenge details and submit flags.
                                </p>
                                <Button onClick={() => router.push('/login')} className="bg-primary text-white hover:bg-primary/90 font-bold px-8 py-6 rounded-xl shadow-[0_4px_14px_0_rgba(239,68,68,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.5)] transition-all">
                                    Authenticate Now
                                </Button>
                            </div>
                        )}

                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-8 fade-in duration-500 ${isLoaded && !user ? 'opacity-30 pointer-events-none select-none blur-[4px]' : ''}`} key={`${activeCategory}-${difficultyFilter}-${searchQuery}`}>
                            {filteredAndSortedChallenges.map(challenge => (
                                <Card
                                    key={challenge.id}
                                    className={`group relative overflow-hidden flex flex-col gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_var(--primary)] ${challenge.solved ? "border-primary/50 bg-card/50" : "border-border/50 bg-card/80 backdrop-blur-sm"
                                        }`}
                                >
                                    <CardHeader className="pb-2 relative z-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className={`${getDifficultyColor(challenge.difficulty)}`}>
                                                {challenge.difficulty}
                                            </Badge>
                                            <Badge className="bg-primary/20 text-primary border-primary/30 font-bold px-3 py-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                {challenge.points} pts
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-start gap-2">
                                            <span className="flex-1">{challenge.title}</span>
                                            {challenge.solved && (
                                                <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded border border-primary/30 shrink-0">
                                                    <CheckCircle className="w-3.5 h-3.5 text-primary drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                                                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Solved</span>
                                                </div>
                                            )}
                                        </CardTitle>
                                        <p className="text-sm font-mono text-muted-foreground mt-1">
                                            Created by <span className="text-primary/90 font-bold tracking-wide">@{challenge.author}</span>
                                        </p>
                                    </CardHeader>

                                    <CardContent className="relative z-0 pb-2">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium bg-secondary/50 w-fit px-2 py-1 rounded-md mb-2 border border-border/40">
                                            <Users className="w-3.5 h-3.5" />
                                            {challenge.solves} Solves
                                        </div>
                                        <CardDescription className="line-clamp-2 text-muted-foreground/80">
                                            {challenge.description}
                                        </CardDescription>
                                    </CardContent>

                                    <CardFooter className="pt-2 relative z-0">
                                        <Button
                                            className="w-full bg-secondary hover:bg-primary text-secondary-foreground hover:text-white transition-all shadow-[0_4px_14px_0_rgba(239,68,68,0.1)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)]"
                                            onClick={() => handleOpenDialog(challenge)}
                                        >
                                            View Challenge
                                        </Button>
                                    </CardFooter>

                                    <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-primary/50 w-0 group-hover:w-full transition-all duration-500"></div>
                                </Card>
                            ))}
                        </div>
                    </div>
                    {filteredAndSortedChallenges.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-secondary/20 rounded-lg border border-border/40">
                            <Search className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium text-white/70">No challenges found</p>
                            <p className="text-sm">Try adjusting your filters or search query.</p>
                        </div>
                    )}
                </section>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden border-primary/20 bg-black/95 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)] sm:rounded-2xl">
                    {selectedChallenge && (
                        <>
                            <DialogHeader className="shrink-0 p-6 pb-4 border-b border-white/10 bg-black/40">
                                <DialogTitle className="flex items-center text-2xl gap-2 font-mono uppercase tracking-wider text-white">
                                    <TerminalSquare className="text-primary w-6 h-6" />
                                    {selectedChallenge.title}
                                </DialogTitle>
                                <div className="flex gap-2 pt-2">
                                    <Badge variant="outline" className={`${getDifficultyColor(selectedChallenge.difficulty)}`}>
                                        {selectedChallenge.difficulty}
                                    </Badge>
                                    <Badge className="bg-primary/20 text-primary border border-primary/30">
                                        {selectedChallenge.points} pts
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 focus:outline-none scroll-smooth">
                                <div className="bg-secondary/50 p-4 rounded-md border border-border/50 text-muted-foreground/90 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words break-all">
                                    {selectedChallenge.description}
                                </div>

                                {(selectedChallenge.target_url || selectedChallenge.file_url) && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedChallenge.target_url && (
                                            <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/20 gap-2" onClick={() => window.open(selectedChallenge.target_url, '_blank')}>
                                                <ExternalLink className="w-4 h-4" /> Open Target
                                            </Button>
                                        )}
                                        {selectedChallenge.file_url && (
                                            <Button variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20 gap-2" onClick={() => window.open(selectedChallenge.file_url, '_blank')}>
                                                <Download className="w-4 h-4" /> Download Material
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {selectedChallenge.hints && selectedChallenge.hints.length > 0 && (
                                    <div className="space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                                            <HelpCircle className="w-4 h-4" /> Intelligence Briefing
                                        </h3>
                                        {selectedChallenge.hints.map((hint: string, hIdx: number) => {
                                            const isUnlocked = showHints > hIdx;
                                            return (
                                                <div key={hIdx} className="relative">
                                                    {!isUnlocked ? (
                                                        <Button variant="secondary" className="w-full justify-start text-muted-foreground border border-dashed border-white/20 hover:bg-white/10" onClick={() => setShowHints(hIdx + 1)}>
                                                            <Lock className="w-4 h-4 mr-2" /> Unlock Hint {hIdx + 1}
                                                        </Button>
                                                    ) : (
                                                        <div className="p-3 bg-black/50 border border-yellow-500/30 text-yellow-500/80 font-mono text-sm rounded-md shadow-[inset_0_0_10px_rgba(234,179,8,0.05)]">
                                                            <span className="font-bold text-yellow-500 mr-2">Hint {hIdx + 1}:</span> {hint}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="space-y-3 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                                    {selectedChallenge.solved ? (
                                        <div className="flex flex-col items-center justify-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                            <CheckCircle className="w-8 h-8 text-green-500 mb-2 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                            <p className="text-green-400 font-bold uppercase tracking-widest text-sm drop-shadow-sm">Target Captured</p>
                                        </div>
                                    ) : (
                                        <>
                                            <label htmlFor="flag" className="text-sm font-semibold flex items-center text-gray-300">
                                                <Flag className="w-4 h-4 mr-2 text-primary" />
                                                Submit Flag Payload
                                            </label>
                                            <Input
                                                id="flag"
                                                placeholder="UbigCTF{...}"
                                                value={flagInput}
                                                onChange={(e) => setFlagInput(e.target.value)}
                                                className="bg-black border-primary/30 focus-visible:ring-primary focus-visible:border-primary text-green-400 font-mono"
                                                onKeyDown={(e) => e.key === "Enter" && handleSubmitFlag()}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="shrink-0 p-6 pt-4 sm:justify-end border-t border-white/10 bg-black/40">
                                {selectedChallenge.solved ? (
                                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="hover:bg-white/5">Close</Button>
                                ) : (
                                    <Button type="button" disabled={isSubmittingFlag} onClick={handleSubmitFlag} className="bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(239,68,68,0.4)] font-bold">
                                        {isSubmittingFlag ? "Submitting..." : "Submit"}
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
