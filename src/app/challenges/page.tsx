import { ChallengeBoard } from "@/components/ChallengeBoard";
import { TerminalSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getInitialChallenges() {
    try {
        const fetchPromise = Promise.all([
            supabase
                .from('challenges')
                .select(`id, title, description, points, difficulty, flag, is_active, target_url, file_url, hints, created_at, categories (name), author`)
                .eq('is_active', true)
                .order('created_at', { ascending: false }),
            supabase
                .from('submissions')
                .select('challenge_id')
                .eq('is_correct', true)
        ]);

        // Max 4 seconds for SSR fetch. Prevent Next.js 504 Server Timeout.
        // If it fails or times out, client-side SWR will seamlessly fallback to fetching it.
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SSR_TIMEOUT')), 4000)
        );

        const [challengesRes, solvesRes] = await Promise.race([fetchPromise, timeoutPromise]) as any;

        const solvesMap = new Map<string, number>();
        if (solvesRes?.data) {
            for (const sub of solvesRes.data) {
                solvesMap.set(sub.challenge_id, (solvesMap.get(sub.challenge_id) || 0) + 1);
            }
        }

        return (challengesRes.data || []).map((c: any) => ({
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
    } catch {
        return [];
    }
}

export default async function ChallengesPage() {
    const initialChallenges = await getInitialChallenges();

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
                    <ChallengeBoard initialChallenges={initialChallenges} />
                </div>
            </div>
        </div>
    );
}
