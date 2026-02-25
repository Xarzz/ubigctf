"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit2, Trash2, Search, Target, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminChallengesPage() {
    const [challenges, setChallenges] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            const { data, error } = await supabase
                .from('challenges')
                .select(`
                    id, title, description, points, difficulty, flag, is_active, 
                    categories (name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChallenges(data || []);
        } catch (error: any) {
            toast.error("Failed to load challenges: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleActive = async (id: string, currentState: boolean) => {
        const { error } = await supabase
            .from('challenges')
            .update({ is_active: !currentState })
            .eq('id', id);

        if (!error) {
            toast.success(`Challenge ${!currentState ? 'activated' : 'deactivated'}!`);
            fetchChallenges();
        } else {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to completely destroy this challenge? This action is irreversible.")) return;

        const { error } = await supabase.from('challenges').delete().eq('id', id);
        if (!error) {
            toast.success("Target permanently deleted from system.");
            fetchChallenges();
        } else {
            toast.error(error.message);
        }
    };

    const filtered = challenges.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.categories?.name && c.categories.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in-50 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                        <Target className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        MISSION <span className="text-primary font-mono tracking-widest pl-2">CONTROL</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 text-sm">Deploy, configure, and monitor CTF challenges</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by name..."
                            className="bg-black/50 border-border/50 pl-10"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {/* Empty shell button for creating new challenges */}
                    <Button className="font-bold gap-2">
                        <Plus className="w-4 h-4" /> Deploy New
                    </Button>
                </div>
            </div>

            <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)]">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-10 w-full bg-black/40 mb-2" />
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4 py-2 opacity-50">
                                <Skeleton className="h-6 flex-1 bg-white/5" />
                                <Skeleton className="h-6 w-[100px] bg-white/5" />
                                <Skeleton className="h-6 w-[80px] bg-white/5" />
                                <Skeleton className="h-6 w-[60px] bg-white/5" />
                                <Skeleton className="h-8 w-[100px] rounded-full bg-white/5" />
                                <Skeleton className="h-8 w-[80px] rounded-md bg-white/5" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <table className="w-full text-sm text-left relative">
                        <thead className="text-xs uppercase bg-black/50 text-muted-foreground border-b border-white/5 font-mono">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-widest">Target Title</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Category</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Difficulty</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Points</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Status</th>
                                <th className="px-6 py-4 font-bold tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-mono">
                                        No active missions found in the mainframe.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((c) => (
                                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">
                                            {c.title}
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {c.categories?.name || "Unknown"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${c.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400' :
                                                c.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                                    c.difficulty === 'Hard' ? 'bg-red-500/10 text-red-500' :
                                                        'bg-purple-500/10 text-purple-400'
                                                }`}>
                                                {c.difficulty}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-primary drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                                            {c.points}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleActive(c.id, c.is_active)}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 ${c.is_active
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                    }`}
                                            >
                                                {c.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                {c.is_active ? "ACTIVE" : "OFFLINE"}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-black/50 border-white/10 hover:border-primary/50 hover:bg-primary/20 hover:text-white transition-all">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 bg-black/50 border-white/10 hover:border-red-500 hover:bg-red-500/20 hover:text-red-400 transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

