import { TerminalSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScoreboardLoading() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-5xl flex-1 flex flex-col justify-center animate-in fade-in duration-500">
            {/* Title Skeleton */}
            <div className="flex flex-col items-center justify-center text-center mb-12 mt-8">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl font-mono text-white/50 mb-6 flex items-center justify-center gap-3">
                    <Skeleton className="w-12 h-12 bg-white/10 rounded-full" />
                    <Skeleton className="h-10 w-64 bg-white/10" />
                </h1>
                <Skeleton className="w-24 h-1.5 bg-primary/40 rounded-full" />
            </div>

            {/* Board Skeleton */}
            <div className="relative z-10 bg-card/50 backdrop-blur-md rounded-xl border border-border/50 shadow-[0_0_30px_-5px_rgba(0,0,0,0.8)] min-h-[400px]">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 bg-black/40 text-muted-foreground font-bold uppercase text-sm tracking-wider">
                    <div className="col-span-2 text-center">Rank</div>
                    <div className="col-span-6">Name</div>
                    <div className="col-span-2 text-center text-primary">Score</div>
                    <div className="col-span-2 text-center">Solved</div>
                </div>

                {/* Loading Rows */}
                <div className="divide-y divide-border/30">
                    {[...Array(6)].map((_, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 p-4 items-center">
                            {/* Rank Column */}
                            <div className="col-span-2 flex justify-center items-center">
                                <Skeleton className="w-8 h-8 rounded-full bg-white/10" />
                            </div>

                            {/* Name Column */}
                            <div className="col-span-6 flex items-center gap-3">
                                <Skeleton className="w-6 h-6 rounded-full bg-white/10" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32 md:w-48 bg-white/5" />
                                    <Skeleton className="h-2 w-16 bg-white/5" />
                                </div>
                            </div>

                            {/* Score Column */}
                            <div className="col-span-2 flex justify-center items-center">
                                <Skeleton className="h-5 w-12 bg-primary/20" />
                            </div>

                            {/* Solved Column */}
                            <div className="col-span-2 flex justify-center items-center">
                                <Skeleton className="h-6 w-8 rounded-md bg-white/10 border border-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Background ambient glow */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none z-0" />
        </div>
    );
}
