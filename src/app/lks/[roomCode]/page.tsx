import { notFound, redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TerminalSquare, ShieldAlert } from "lucide-react";
import { LKSChallengeBoard } from "@/components/LKSChallengeBoard";

// Disables static generation, forces to always fetch current room state
export const revalidate = 0;

export default async function LKSRoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
    const resolvedParams = await params;
    const code = resolvedParams.roomCode.toUpperCase();

    // Fetch basic room details
    const { data: room, error } = await supabase
        .from('lks_rooms')
        .select('*')
        .eq('room_code', code)
        .single();

    if (error || !room) {
        notFound();
    }

    if (!room.is_active) {
        return (
            <div className="container mx-auto px-4 py-24 max-w-lg text-center flex-1 flex flex-col justify-center">
                <div className="bg-red-500/10 p-6 rounded-full mx-auto mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <ShieldAlert className="w-16 h-16 text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-widest">Room Offline</h1>
                <p className="text-muted-foreground font-mono">This simulation room has been deactivated or hasn't started yet.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl flex-1 mt-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <TerminalSquare className="w-6 h-6 text-primary" />
                        <h1 className="text-3xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                            {room.title}
                        </h1>
                    </div>
                    <p className="text-muted-foreground font-mono text-sm">
                        LKS Simulation Workspace | Access Code: <span className="text-primary font-bold">{room.room_code}</span>
                    </p>
                </div>
                <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary font-mono text-sm tracking-widest animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    SIMULATION ACTIVE
                </div>
            </div>

            {/* In a real competition, we could embed the LKS Scoreboard as a side panel here, 
                or in a separate tab. For now, the user sees the Board. */}
            <div className="relative z-10">
                <LKSChallengeBoard roomId={room.id} roomCode={room.room_code} />
            </div>

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none z-0" />
        </div>
    );
}
