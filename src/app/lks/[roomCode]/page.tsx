import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Target, Clock } from "lucide-react";
import { LKSChallengeBoard } from "@/components/LKSChallengeBoard";

export const revalidate = 0;

export default async function LKSRoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
    const resolvedParams = await params;
    const code = resolvedParams.roomCode.toUpperCase();

    const { data: room, error } = await supabase
        .from('lks_rooms')
        .select('*')
        .eq('room_code', code)
        .single();

    if (error || !room) {
        notFound();
    }

    // Room exists but simulation hasn't started — show waiting screen
    if (!room.is_active) {
        return (
            <div className="container mx-auto px-4 py-24 max-w-lg text-center flex-1 flex flex-col justify-center">
                <div className="bg-primary/5 p-6 rounded-full mx-auto mb-6 border border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-pulse">
                    <Clock className="w-16 h-16 text-primary/70" />
                </div>
                <h1 className="text-3xl font-black text-white mb-3 uppercase tracking-widest">Waiting to Start</h1>
                <p className="text-muted-foreground font-mono text-sm mb-2">
                    Room <span className="text-primary font-bold">{room.room_code}</span> — <span className="text-white font-semibold">{room.title}</span>
                </p>
                <p className="text-muted-foreground font-mono text-sm">
                    The administrator hasn't started the simulation yet. Please wait — the page will update once the timer begins.
                </p>
                {/* Auto-refresh every 5 seconds to detect when admin starts */}
                <meta httpEquiv="refresh" content="5" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 max-w-7xl flex-1">
            <div className="mb-6 mt-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-5 relative z-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Target className="w-6 h-6 text-primary" />
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

            <div className="relative z-10">
                <LKSChallengeBoard roomId={room.id} roomCode={room.room_code} roomIsActive={room.is_active} />
            </div>

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none z-0" />
        </div>
    );
}
