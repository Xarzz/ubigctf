"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { ShieldAlert, Plus, TerminalSquare, Search, Lock, MonitorPlay, Trash2, CheckCircle, Flag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function AdminLKSDashboard() {
    const { user } = useUser();
    const [rooms, setRooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Create Room State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newCode, setNewCode] = useState("");

    // Setup challenges state
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [allChallenges, setAllChallenges] = useState<any[]>([]);
    const [roomChallenges, setRoomChallenges] = useState<Set<string>>(new Set());
    const [searchChall, setSearchChall] = useState("");

    const fetchRooms = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('lks_rooms')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error && data) {
            setRooms(data);
        }
        setIsLoading(false);
    };

    const fetchGlobalChallenges = async () => {
        const { data, error } = await supabase.from('challenges').select('id, title, categories(name), difficulty, points').order('created_at', { ascending: false });
        if (error) {
            console.error("Error fetching global challenges:", error);
            toast.error("Failed to load global challenges");
            return;
        }
        if (data) {
            setAllChallenges(data.map((c: any) => ({
                ...c,
                category: c.categories?.name || "Unknown"
            })));
        }
    };

    useEffect(() => {
        fetchRooms();
        fetchGlobalChallenges();
    }, []);

    const handleCreateRoom = async () => {
        if (!newTitle || !newCode) return toast.error("Title and Code are required");

        try {
            const { error } = await supabase.from('lks_rooms').insert([{
                title: newTitle,
                room_code: newCode.toUpperCase(),
                created_by: user?.id,
                is_active: false
            }]);

            if (error) throw error;
            toast.success("Room created successfully");
            setIsCreateOpen(false);
            setNewTitle("");
            setNewCode("");
            fetchRooms();
        } catch (e: any) {
            toast.error(e.message || "Failed to create room");
        }
    };

    const handleToggleActive = async (roomId: string, currentStatus: boolean) => {
        const { error } = await supabase.from('lks_rooms').update({ is_active: !currentStatus }).eq('id', roomId);
        if (error) return toast.error("Failed to update status");
        toast.success(currentStatus ? "Room taken offline" : "Room is now Live");
        fetchRooms();
    };

    const handleDeleteRoom = async (roomId: string) => {
        if (!confirm("Are you sure? This will delete all participant data and submissions for this room!")) return;
        const { error } = await supabase.from('lks_rooms').delete().eq('id', roomId);
        if (error) return toast.error("Failed to delete room");
        toast.success("Room terminated");
        fetchRooms();
    };

    const openSetup = async (room: any) => {
        setSelectedRoom(room);
        const { data } = await supabase.from('lks_room_challenges').select('challenge_id').eq('room_id', room.id);
        const ids = new Set((data || []).map(d => d.challenge_id));
        setRoomChallenges(ids);
        setIsSetupOpen(true);
    };

    const toggleChallengeMapping = async (challengeId: string) => {
        if (!selectedRoom) return;
        const isCurrentlyMapped = roomChallenges.has(challengeId);

        if (isCurrentlyMapped) {
            // Remove
            await supabase.from('lks_room_challenges').delete().match({ room_id: selectedRoom.id, challenge_id: challengeId });
            setRoomChallenges(prev => {
                const next = new Set(prev);
                next.delete(challengeId);
                return next;
            });
        } else {
            // Add
            await supabase.from('lks_room_challenges').insert([{ room_id: selectedRoom.id, challenge_id: challengeId }]);
            setRoomChallenges(prev => {
                const next = new Set(prev);
                next.add(challengeId);
                return next;
            });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <TerminalSquare className="text-primary w-8 h-8" />
                        LKS Control Panel
                    </h1>
                    <p className="text-muted-foreground font-mono mt-2 text-sm">Manage Isolated Simulation Rooms and Timer projections.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-white hover:bg-primary/90 gap-2 font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all">
                    <Plus className="w-4 h-4" /> Create New Room
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-12 flex justify-center"><TerminalSquare className="w-8 h-8 animate-spin text-primary/50" /></div>
                ) : rooms.length === 0 ? (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground bg-black/40 border border-white/5 rounded-2xl">
                        <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                        <p>No LKS Simulation Rooms found.</p>
                    </div>
                ) : (
                    rooms.map(room => (
                        <div key={room.id} className={`bg-card/40 backdrop-blur-md rounded-2xl border p-6 flex flex-col gap-4 relative overflow-hidden group transition-all duration-300 ${room.is_active ? 'border-primary/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-border/50'}`}>
                            {room.is_active && (
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 blur-2xl rounded-full" />
                            )}
                            <div className="flex justify-between items-start z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-wide">{room.title}</h3>
                                    <p className="text-sm font-mono text-primary mt-1 flex items-center gap-2">
                                        <Lock className="w-3 h-3" /> Code: <span className="font-bold">{room.room_code}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs uppercase font-mono tracking-widest text-muted-foreground">{room.is_active ? 'Online' : 'Offline'}</span>
                                    <input
                                        type="checkbox"
                                        checked={room.is_active}
                                        onChange={() => handleToggleActive(room.id, room.is_active)}
                                        className="w-12 h-6 rounded-full appearance-none bg-black/50 border border-primary/30 checked:bg-primary checked:border-primary transition-colors cursor-pointer relative checked:before:translate-x-6 before:content-[''] before:absolute before:top-[2px] before:left-[2px] before:w-5 before:h-5 before:bg-white before:rounded-full before:transition-transform shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto pt-4 border-t border-white/5 z-10">
                                <Button size="sm" variant="outline" onClick={() => openSetup(room)} className="flex-1 hover:bg-primary/20 hover:text-white border-white/10 hover:border-primary/30">
                                    <Flag className="w-4 h-4 mr-2" /> Setup
                                </Button>
                                {/* We will route this to the Projection screen */}
                                <Button size="sm" className="flex-1 bg-white/10 hover:bg-primary text-white border-none shadow-none hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all" onClick={() => window.open(`/admin/countdown?room=${room.room_code}`, '_blank')}>
                                    <MonitorPlay className="w-4 h-4 mr-2" /> Project
                                </Button>
                                <Button size="icon" variant="destructive" onClick={() => handleDeleteRoom(room.id)} className="shrink-0 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border-none">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Room Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-md bg-black/95 border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <DialogHeader>
                        <DialogTitle className="text-white text-xl font-mono uppercase tracking-widest flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" /> Initialize Room
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-mono tracking-widest text-primary">Simulation Title</label>
                            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Simulasi LKS Nasional 2026" className="bg-black/50 border-primary/30" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-mono tracking-widest text-primary">Room Access Code</label>
                            <Input value={newCode} onChange={e => setNewCode(e.target.value.replace(/\s+/g, '').toUpperCase())} placeholder="e.g. LKS-CYBER-99" className="bg-black/50 border-primary/30 font-mono text-lg tracking-widest uppercase" maxLength={20} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="hover:text-red-400">Cancel</Button>
                        <Button onClick={handleCreateRoom} className="bg-primary text-white hover:bg-primary/90 font-bold">Deploy Room</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Setup Challenges Dialog */}
            <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
                <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col bg-black/95 border-primary/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <DialogHeader className="shrink-0 pb-4 border-b border-white/10">
                        <DialogTitle className="text-white text-xl font-mono uppercase tracking-widest flex items-center gap-2">
                            <Flag className="w-5 h-5 text-primary" /> Assign Challenges
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">Select which global challenges should be injected into [{selectedRoom?.room_code}]</p>
                    </DialogHeader>
                    <div className="py-2 shrink-0 relative">
                        <Search className="absolute left-3 top-5 w-4 h-4 text-muted-foreground" />
                        <Input value={searchChall} onChange={e => setSearchChall(e.target.value)} placeholder="Search global tasks..." className="pl-9 bg-black/50 border-white/10" />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {allChallenges.filter(c => c.title.toLowerCase().includes(searchChall.toLowerCase())).map(challenge => {
                            const isSelected = roomChallenges.has(challenge.id);
                            return (
                                <div key={challenge.id} onClick={() => toggleChallengeMapping(challenge.id)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-primary/10 border-primary/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                    <div className="flex flex-col gap-1 w-full mr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white tracking-wide">{challenge.title}</span>
                                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-white/20 text-muted-foreground">{challenge.difficulty}</Badge>
                                        </div>
                                        <span className="text-xs font-mono text-primary/70">{challenge.category} &bull; {challenge.points} pts</span>
                                    </div>
                                    <div className="shrink-0">
                                        {isSelected ? (
                                            <CheckCircle className="w-5 h-5 text-primary drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border-2 border-white/20" />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <DialogFooter className="shrink-0 pt-4 border-t border-white/10">
                        <Button className="w-full bg-primary text-white hover:bg-primary/90 font-bold" onClick={() => setIsSetupOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
