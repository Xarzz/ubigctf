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

export function ChallengeBoard() {
    const { user, isLoaded } = useUser();
    const router = useRouter();

    // SWR Fetcher
    const fetchChallenges = async () => {
        // Fetch active challenges
        const { data: challengesData, error: cErr } = await supabase
            .from('challenges')
            .select(`id, title, description, points, difficulty, flag, is_active, target_url, file_url, hints, created_at, categories (name)`)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (cErr) throw cErr;

        let solvedSet = new Set<string>();

        if (user) {
            const { data: subsReq } = await supabase
                .from('submissions')
                .select('challenge_id')
                .eq('user_id', user.id)
                .eq('is_correct', true);

            if (subsReq) {
                subsReq.forEach(s => solvedSet.add(s.challenge_id));
            }
        }

        return (challengesData || []).map(c => ({
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
            solved: solvedSet.has(c.id),
            solves: 0
        }));
    };

    const { data: challenges = [], mutate: mutateChallenges, isLoading: isLoadingChallenges } = useSWR(
        isLoaded ? ['public_challenges', user?.id] : null,
        fetchChallenges,
        { refreshInterval: 60000 } // Auto refetch every minute
    );

    const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
    const [flagInput, setFlagInput] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showHints, setShowHints] = useState<number>(0);

    const categories = Array.from(new Set(challenges.map(c => c.category)));
    const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState<"All" | "Easy" | "Medium" | "Hard" | "Insane">("All");

    const activeCategory = categories.length > 0 ? categories[activeCategoryIndex] : "Loading...";

    const nextCategory = () => {
        setActiveCategoryIndex((prev) => (prev + 1) % categories.length);
    };

    const prevCategory = () => {
        setActiveCategoryIndex((prev) => (prev - 1 + categories.length) % categories.length);
    };

    const handleOpenDialog = (c: any) => {
        setSelectedChallenge(c);
        setFlagInput("");
        setShowHints(0);
        setIsDialogOpen(true);
    };

    const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

    const handleSubmitFlag = async () => {
        if (!selectedChallenge || !user) return;
        setIsSubmittingFlag(true);

        const isCorrect = flagInput.trim() === selectedChallenge.flag;

        try {
            // Log submission to database
            await supabase.from('submissions').insert([{
                user_id: user.id,
                challenge_id: selectedChallenge.id,
                is_correct: isCorrect,
                submitted_flag: flagInput.trim()
            }]);

            if (isCorrect) {
                toast.success("Correct Flag! You have captured the target.");
                mutateChallenges(); // Instantly update board without refresh
                setIsDialogOpen(false);
            } else {
                toast.error("Incorrect flag. Try harder!");
            }
        } catch (error) {
            toast.error("Telemetry error: Could not verify flag.");
        } finally {
            setIsSubmittingFlag(false);
        }
    };

    const filteredAndSortedChallenges = challenges
        .filter(c => {
            // Pencarian universal (bisa mencari category, judul, deskripsi)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchSearch = c.title.toLowerCase().includes(query) ||
                    c.category.toLowerCase().includes(query) ||
                    c.description.toLowerCase().includes(query);
                if (!matchSearch) return false;
            } else {
                // Jika tidak ada pencarian, gunakan filter kategori dari carousel
                if (c.category !== activeCategory) return false;
            }

            // Filter Difficulty
            if (difficultyFilter !== "All" && c.difficulty !== difficultyFilter) {
                return false;
            }

            return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="space-y-12 pb-20">
            {challenges.length === 0 && !isLoadingChallenges ? (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-700">
                    <div className="bg-primary/5 p-6 rounded-full mb-6 border border-primary/10 shadow-[0_0_30px_rgba(239,68,68,0.1)] relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                        <TerminalSquare className="w-16 h-16 text-primary/50 relative z-10" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight font-mono uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                        No Targets Available
                    </h2>
                    <p className="text-muted-foreground/80 max-w-md mx-auto text-center bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-sm leading-relaxed">
                        The operation board is currently empty. Standby for new mission briefings from command.
                    </p>
                </div>
            ) : categories.length > 0 && (
                <section className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-4 border-b border-border/40 pb-4 justify-between">
                        <div className="flex items-center gap-4 justify-center w-full md:w-auto">
                            <Button variant="ghost" size="icon" onClick={prevCategory} className="hover:text-primary hover:bg-primary/20 rounded-full h-10 w-10 border border-primary/20 bg-background/50 shadow-[0_0_10px_rgba(239,68,68,0.1)] transition-all transform active:scale-95 flex-shrink-0">
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center justify-center shadow-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)] min-w-[200px] md:min-w-[320px] text-center">
                                {getCategoryIcon(activeCategory as string)} <span className="ml-2 uppercase tracking-wide truncate">{activeCategory}</span>
                            </h2>
                            <Button variant="ghost" size="icon" onClick={nextCategory} className="hover:text-primary hover:bg-primary/20 rounded-full h-10 w-10 border border-primary/20 bg-background/50 shadow-[0_0_10px_rgba(239,68,68,0.1)] transition-all transform active:scale-95 flex-shrink-0">
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search challenges..."
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
                                    You must initialize a session to inspect challenge details, access target links, and submit flags.
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
                                    className={`group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_var(--primary)] ${challenge.solved ? "border-primary/50 bg-card/50" : "border-border/50 bg-card/80 backdrop-blur-sm"
                                        }`}
                                >
                                    {/* Solved Overlay */}
                                    {challenge.solved && (
                                        <div className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center backdrop-blur-[2px]">
                                            <CheckCircle className="w-16 h-16 text-primary mb-2 animate-bounce" />
                                            <span className="text-lg font-bold text-primary uppercase tracking-widest shadow-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,1)]">Solved</span>
                                        </div>
                                    )}

                                    <CardHeader className="pb-3 relative z-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="outline" className={`${getDifficultyColor(challenge.difficulty)}`}>
                                                {challenge.difficulty}
                                            </Badge>
                                            <Badge className="bg-primary/20 text-primary border-primary/30 font-bold px-3 py-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                {challenge.points} pts
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{challenge.title}</CardTitle>
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

                                    {/* Red accent bar on hover */}
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

            {/* Challenge Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md border-primary/20 bg-black/95 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)]">
                    {selectedChallenge && (
                        <>
                            <DialogHeader>
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

                            <div className="py-6 space-y-6">
                                <div className="bg-secondary/50 p-4 rounded-md border border-border/50 text-muted-foreground/90 font-mono text-sm leading-relaxed whitespace-pre-wrap">
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
                                    <div className="space-y-2">
                                        {selectedChallenge.hints.map((hint: string, hIdx: number) => {
                                            const isUnlocked = showHints > hIdx;
                                            return (
                                                <div key={hIdx} className="relative">
                                                    {!isUnlocked ? (
                                                        <Button variant="secondary" className="w-full justify-start text-muted-foreground border border-dashed border-white/20" onClick={() => setShowHints(hIdx + 1)}>
                                                            <HelpCircle className="w-4 h-4 mr-2" /> Unlock Hint {hIdx + 1}
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

                                <div className="space-y-3">
                                    <label htmlFor="flag" className="text-sm font-semibold flex items-center text-gray-300">
                                        <Flag className="w-4 h-4 mr-2 text-primary" />
                                        Submit Flag
                                    </label>
                                    <Input
                                        id="flag"
                                        placeholder="UbigCTF{...}"
                                        value={flagInput}
                                        onChange={(e) => setFlagInput(e.target.value)}
                                        className="bg-black border-primary/30 focus-visible:ring-primary focus-visible:border-primary text-green-400 font-mono"
                                        onKeyDown={(e) => e.key === "Enter" && handleSubmitFlag()}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="sm:justify-between border-t border-border/40 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="hover:bg-red-500/10 hover:text-red-400">
                                    Close
                                </Button>
                                <Button type="button" disabled={isSubmittingFlag || selectedChallenge.solved} onClick={handleSubmitFlag} className="bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                    {isSubmittingFlag ? "Verifying..." : selectedChallenge.solved ? "Already Captured" : "Submit"}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
