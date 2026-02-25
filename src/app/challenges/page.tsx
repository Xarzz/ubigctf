import { ChallengeBoard } from "@/components/ChallengeBoard";
import { TerminalSquare } from "lucide-react";

export default function ChallengesPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="relative">
                {/* Ambient Background Glow for the Board */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />

                {/* The Main Board Component */}
                <div className="relative z-10 w-full max-w-6xl mx-auto">
                    <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-4">
                        <h1 className="text-3xl font-extrabold flex items-center gap-3">
                            <TerminalSquare className="w-8 h-8 text-primary" />
                            Challenges
                        </h1>
                    </div>
                    <ChallengeBoard />
                </div>
            </div>
        </div>
    );
}
