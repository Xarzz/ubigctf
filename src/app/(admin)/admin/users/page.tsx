"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Users, ShieldAlert, Award, AlertTriangle, Shield, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('score', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) {
            toast.error("Failed to fetch user profiles.");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAdmin = async (id: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';

        if (newRole === 'admin') {
            if (!confirm("WARNING: Are you sure you want to grant full admin rights to this player?")) return;
        } else {
            if (!confirm("Revoke admin rights? This user will become a standard player.")) return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', id);

        if (!error) {
            toast.success(`User role updated to ${newRole.toUpperCase()}.`);
            fetchUsers();
        } else {
            toast.error(error.message);
        }
    };

    const filtered = users.filter(u =>
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in-50 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        PLAYER <span className="text-primary font-mono tracking-widest pl-2">INTEL</span>
                    </h1>
                    <p className="text-muted-foreground font-mono mt-1 text-sm">Monitor hackers, manage access, and track scores.</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Find by username or email..."
                            className="bg-black/50 border-border/50 pl-10 focus-visible:ring-primary/50"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)]">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-10 w-full bg-black/40 mb-2" />
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4 py-2 opacity-50">
                                <Skeleton className="h-6 w-[50px] bg-white/5 mx-4" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-[150px] bg-white/5" />
                                    <Skeleton className="h-4 w-[200px] bg-white/5" />
                                </div>
                                <Skeleton className="h-6 w-[80px] bg-white/5" />
                                <Skeleton className="h-6 w-[60px] bg-white/5" />
                                <Skeleton className="h-8 w-[100px] rounded-md bg-white/5" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <table className="w-full text-sm text-left relative">
                        <thead className="text-xs uppercase bg-black/50 text-muted-foreground border-b border-white/5 font-mono">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-widest text-center">Rank</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Identity</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Score</th>
                                <th className="px-6 py-4 font-bold tracking-widest">Clearance</th>
                                <th className="px-6 py-4 font-bold tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-mono flex flex-col items-center">
                                        <AlertTriangle className="w-8 h-8 mb-4 text-yellow-500/50" />
                                        No players match your search pattern.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((u, index) => (
                                    <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors group ${u.role === 'admin' ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}>
                                        <td className="px-6 py-4 font-mono font-bold text-center text-muted-foreground">
                                            #{index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white group-hover:text-primary transition-colors text-lg flex items-center gap-2">
                                                {u.role === 'admin' ? <Shield className="w-4 h-4 text-primary" /> : <Terminal className="w-4 h-4 text-slate-500" />}
                                                {u.username || "Anonymous"}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono opacity-60 mt-1">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xl text-primary font-black drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                                            <div className="flex items-center gap-2">
                                                <Award className="w-4 h-4 text-muted-foreground" />
                                                {u.score || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.role === 'admin' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/20 text-primary border border-primary/30 text-[10px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                    <ShieldAlert className="w-3 h-3" /> ROOT
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold tracking-widest uppercase">
                                                    GUEST
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleAdmin(u.id, u.role || 'user')}
                                                className={`font-mono text-[10px] uppercase font-bold transition-all ${u.role === 'admin'
                                                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                                                    : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:text-primary shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                                                    }`}
                                            >
                                                {u.role === 'admin' ? "Revoke Root" : "Grant Root"}
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

