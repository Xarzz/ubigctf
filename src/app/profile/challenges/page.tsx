"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit2, Trash2, Search, Target, CheckCircle2, XCircle, UploadCloud, X, Terminal, Shield, Flag, TerminalSquare, ExternalLink, Download, HelpCircle, Lock as LockIcon, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import useSWR from "swr";
import imageCompression from 'browser-image-compression';
import { useUser } from "@/hooks/useUser";

export default function MyChallengesPage() {
    const { user, profile, isLoaded } = useUser();

    // Extract data using SWR for automatic updates and caching
    const fetchChallenges = async () => {
        if (!user) return [];
        const { data, error } = await supabase
            .from('challenges')
            .select(`id, title, description, points, difficulty, flag, is_active, target_url, file_url, hints, categories (name)`)
            .eq('created_by', user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    };

    const fetchCategories = async () => {
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (error) throw error;
        return data || [];
    };

    const { data: challenges = [], mutate: mutateChallenges, isLoading } = useSWR(isLoaded && user ? ['my_challenges', user.id] : null, fetchChallenges);
    const { data: categories = [] } = useSWR('admin_categories', fetchCategories, {
        onSuccess: (data) => {
            if (data.length > 0 && !newChallenge.category_id) {
                setNewChallenge(prev => ({ ...prev, category_id: data[0].id }));
            }
        }
    });

    const [searchQuery, setSearchQuery] = useState("");

    // View State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewChallenge, setViewChallenge] = useState<any>(null);
    const [showHints, setShowHints] = useState<number>(0);

    // Edit Challenge State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);
    const [editChallenge, setEditChallenge] = useState({
        id: "",
        title: "",
        description: "",
        category_id: "",
        points: 50,
        difficulty: "Easy",
        flag: "",
        target_url: "",
        hints: [""],
    });

    const openEditModal = (c: any) => {
        let catId = (c.categories as any)?.id;
        if (!catId) {
            const foundCat = categories.find((cat: any) => cat.name === (c.categories as any)?.name);
            catId = foundCat ? foundCat.id : "";
        }
        setEditChallenge({
            id: c.id,
            title: c.title,
            description: c.description,
            category_id: catId,
            points: c.points,
            difficulty: c.difficulty,
            flag: c.flag,
            target_url: c.target_url || "",
            hints: Array.isArray(c.hints) && c.hints.length > 0 ? c.hints : [""],
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsEditSubmitting(true);
        try {
            const filteredHints = editChallenge.hints.filter(h => h.trim() !== "");
            const { error } = await supabase.from('challenges').update({
                title: editChallenge.title,
                description: editChallenge.description,
                category_id: editChallenge.category_id,
                points: Number(editChallenge.points),
                difficulty: editChallenge.difficulty,
                flag: editChallenge.flag,
                target_url: editChallenge.target_url,
                hints: filteredHints,
            }).eq('id', editChallenge.id).eq('created_by', user?.id);

            if (error) throw error;
            toast.success("Target updated successfully!");
            setIsEditModalOpen(false);
            mutateChallenges();
        } catch (error: any) {
            toast.error(error.message || "Failed to update mission target.");
        } finally {
            setIsEditSubmitting(false);
        }
    };

    const openViewModal = (c: any) => {
        setViewChallenge(c);
        setShowHints(0);
        setIsViewModalOpen(true);
    };

    // Add Challenge State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [newChallenge, setNewChallenge] = useState({
        title: "",
        description: "",
        category_id: "",
        points: 50,
        difficulty: "Easy",
        flag: "",
        target_url: "",
        hints: [""],
    });

    const toggleActive = async (id: string, currentState: boolean) => {
        const { error } = await supabase
            .from('challenges')
            .update({ is_active: !currentState })
            .eq('id', id)
            .eq('created_by', user?.id);

        if (!error) {
            toast.success(`Challenge ${!currentState ? 'activated' : 'deactivated'}!`);
            mutateChallenges();
        } else {
            toast.error(error.message);
        }
    };

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [challengeToDelete, setChallengeToDelete] = useState<string | null>(null);

    const promptDelete = (id: string) => {
        setChallengeToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!challengeToDelete || !user) return;

        const { error } = await supabase.from('challenges').delete().eq('id', challengeToDelete).eq('created_by', user.id);
        if (!error) {
            toast.success("Target permanently deleted from system.");
            mutateChallenges();
            setIsDeleteModalOpen(false);
            setChallengeToDelete(null);
        } else {
            toast.error(error.message);
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Filter out empty hints
            const filteredHints = newChallenge.hints.filter(h => h.trim() !== "");

            // Handle file upload
            let uploadedFileUrl = "";
            if (selectedFile) {
                let fileToUpload = selectedFile;

                // Compress if it's an image
                if (selectedFile.type.startsWith("image/")) {
                    toast.info("Compressing image payload...");
                    try {
                        const options = {
                            maxSizeMB: 1,
                            maxWidthOrHeight: 1280,
                            useWebWorker: true,
                            initialQuality: 0.8
                        };
                        fileToUpload = await imageCompression(selectedFile, options);
                    } catch (error) {
                        console.error("Compression Error:", error);
                        toast.error("Compression failed, uploading original image.");
                    }
                }

                const fileExt = fileToUpload.name.split('.').pop() || "bin";
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from("challenge_files").upload(fileName, fileToUpload);
                if (uploadError) throw new Error("File upload failed: " + uploadError.message);

                // Get public URL
                const { data: publicUrlData } = supabase.storage.from("challenge_files").getPublicUrl(fileName);
                uploadedFileUrl = publicUrlData.publicUrl;
            }

            const { error } = await supabase.from('challenges').insert([{
                title: newChallenge.title,
                description: newChallenge.description,
                category_id: newChallenge.category_id,
                points: Number(newChallenge.points),
                difficulty: newChallenge.difficulty,
                flag: newChallenge.flag,
                target_url: newChallenge.target_url,
                hints: filteredHints,
                file_url: uploadedFileUrl || null,
                created_by: user?.id,
                author: profile?.username || user?.email?.split('@')[0] || 'Unknown Hacker'
            }]);

            if (error) throw error;

            toast.success("New mission parameters deployed successfully!");
            setIsAddModalOpen(false);
            setNewChallenge({ title: "", description: "", category_id: categories[0]?.id || "", points: 50, difficulty: "Easy", flag: "", target_url: "", hints: [""] });
            setSelectedFile(null);
            mutateChallenges();
        } catch (error: any) {
            toast.error(error.message || "Failed to deploy mission target.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtered = challenges.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((c.categories as any)?.name && (c.categories as any).name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="container mx-auto px-4 max-w-7xl pt-10 pb-20">
            <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in-50 duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                            <Flag className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                            MY <span className="text-primary font-mono tracking-widest pl-2">MISSIONS</span>
                        </h1>
                        <p className="text-muted-foreground font-mono mt-1 text-sm">Create, deploy, and manage your contributed challenges.</p>
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

                        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="font-bold gap-2 bg-primary hover:bg-primary/80 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                    <Plus className="w-4 h-4" /> Deploy New
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-black/95 border-border/50 text-slate-200 border-t-2 border-t-primary shadow-[0_0_50px_rgba(239,68,68,0.2)] max-w-2xl w-[95vw] lg:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl">
                                <form onSubmit={handleAddSubmit} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                                    <DialogHeader className="shrink-0 p-6 pb-4 border-b border-white/10 bg-black/40">
                                        <DialogTitle className="text-2xl font-black font-mono text-white flex items-center gap-2">
                                            <Target className="w-6 h-6 text-primary" /> NEW MISSION TARGET
                                        </DialogTitle>
                                        <p className="text-sm text-muted-foreground font-mono mt-1">Configure mission parameters. Scroll down for extra settings.</p>
                                    </DialogHeader>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 focus:outline-none scroll-smooth">
                                        {/* Core Parameters */}
                                        <div className="space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                                            <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                                                <Terminal className="w-4 h-4" /> Core Parameters
                                            </h3>
                                            <div className="space-y-2">
                                                <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Target Name</label>
                                                <Input required placeholder="E.g. SQLi Vulnerability" className="bg-black/50 border-white/10" value={newChallenge.title} onChange={e => setNewChallenge({ ...newChallenge, title: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Category</label>
                                                    <select required className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary appearance-none" value={newChallenge.category_id} onChange={e => setNewChallenge({ ...newChallenge, category_id: e.target.value })}>
                                                        <option value="" disabled className="bg-black text-slate-500">Select category...</option>
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id} className="bg-black text-white">{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Difficulty</label>
                                                    <select required className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary appearance-none" value={newChallenge.difficulty} onChange={e => setNewChallenge({ ...newChallenge, difficulty: e.target.value })}>
                                                        <option value="Easy" className="bg-black text-green-400">Easy</option>
                                                        <option value="Medium" className="bg-black text-yellow-500">Medium</option>
                                                        <option value="Hard" className="bg-black text-red-500">Hard</option>
                                                        <option value="Insane" className="bg-black text-purple-500">Insane</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Briefing (Description) - Max 1500 chars</label>
                                                <textarea required rows={4} maxLength={1500} placeholder="Describe the mission details, hints, or instructions here..." className="flex w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono" value={newChallenge.description} onChange={e => setNewChallenge({ ...newChallenge, description: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Mission Objectives */}
                                        <div className="space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                                            <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                                                <Flag className="w-4 h-4" /> Mission Objectives
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Reward Points</label>
                                                    <Input required type="number" min={0} className="bg-black/50 border-white/10 font-mono text-green-400" value={newChallenge.points} onChange={e => setNewChallenge({ ...newChallenge, points: parseInt(e.target.value) || 0 })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Target URL (Optional)</label>
                                                    <Input placeholder="http://target.com" className="bg-black/50 border-white/10 font-mono" value={newChallenge.target_url} onChange={e => setNewChallenge({ ...newChallenge, target_url: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="space-y-2 bg-primary/5 p-4 rounded-lg border border-primary/20 mt-4">
                                                <label className="text-xs font-mono font-bold uppercase text-primary">Capture Flag Secret</label>
                                                <Input required placeholder="UbigCTF{...}" className="bg-black/50 border-primary/30 font-mono text-white focus-visible:ring-primary/50" value={newChallenge.flag} onChange={e => setNewChallenge({ ...newChallenge, flag: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Support & Assets */}
                                        <div className="space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                                            <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                                                <Shield className="w-4 h-4" /> Support & Assets
                                            </h3>

                                            <div className="space-y-3 pt-2">
                                                <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Progressive Hints</label>
                                                {newChallenge.hints.map((hint, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <Input
                                                            placeholder={`Hint level ${index + 1}...`}
                                                            className="bg-black/50 border-white/10 text-yellow-400 font-mono text-sm"
                                                            value={hint}
                                                            onChange={e => {
                                                                const newHints = [...newChallenge.hints];
                                                                newHints[index] = e.target.value;
                                                                setNewChallenge({ ...newChallenge, hints: newHints });
                                                            }}
                                                        />
                                                        {index > 0 && (
                                                            <Button type="button" variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 text-muted-foreground transition-all flex-shrink-0" onClick={() => {
                                                                setNewChallenge({ ...newChallenge, hints: newChallenge.hints.filter((_, i) => i !== index) });
                                                            }}>
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                <Button type="button" variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-xs text-muted-foreground" onClick={() => {
                                                    setNewChallenge({ ...newChallenge, hints: [...newChallenge.hints, ""] });
                                                }}>
                                                    <Plus className="w-3 h-3 mr-1" /> Add Hint Tier
                                                </Button>
                                            </div>

                                            <div className="space-y-2 border border-white/10 rounded-lg bg-black/40 p-3 mt-4">
                                                <label className="text-xs font-mono font-bold uppercase text-muted-foreground flex items-center gap-2 cursor-pointer pb-2">
                                                    <UploadCloud className="w-4 h-4" /> Attach Mission File (PDF, ZIP, PCAP)
                                                </label>
                                                <Input type="file" className="bg-transparent border-0 file:text-primary file:font-mono file:bg-white/5 file:border-white/10 file:border file:rounded-md file:px-3 file:py-1 cursor-pointer" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter className="p-6 pt-4 sm:justify-end gap-2 border-t border-white/10 bg-black/40 shrink-0">
                                        <Button type="button" variant="ghost" className="hover:bg-white/5" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                        <Button type="submit" disabled={isSubmitting} className="font-bold bg-primary hover:bg-primary/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                            {isSubmitting ? "Deploying..." : "Launch Target"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="w-full">
                    {isLoading ? (
                        <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
                            <Skeleton className="h-10 w-full bg-black/40 mb-2" />
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-4 py-2 opacity-50">
                                    <Skeleton className="h-24 w-full bg-white/5 rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-muted-foreground font-mono bg-card/30 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col items-center justify-center">
                                    <Target className="w-12 h-12 text-primary/30 mb-4" />
                                    <p>No active missions found in your profile.</p>
                                    <p className="text-xs mt-2 opacity-60">Deploy a new mission target to get started.</p>
                                </div>
                            ) : (
                                filtered.map((c) => (
                                    <Card key={c.id} className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_-5px_var(--primary)] border-border/50 bg-card/80 backdrop-blur-sm">
                                        <div className="absolute top-0 right-0 p-3 z-10">
                                            <button
                                                onClick={() => toggleActive(c.id, c.is_active)}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all hover:scale-105 shadow-md ${c.is_active
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-md'
                                                    : 'bg-red-500/20 text-red-500 border border-red-500/30 backdrop-blur-md'
                                                    }`}
                                                title={c.is_active ? "Toggle Offline" : "Toggle Active"}
                                            >
                                                {c.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {c.is_active ? "ACTIVE" : "OFFLINE"}
                                            </button>
                                        </div>

                                        <CardHeader className="pb-2 relative z-0 pt-8">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className={`
                                                ${c.difficulty === 'Easy' ? 'text-green-500 border-green-500 bg-green-500/10' :
                                                        c.difficulty === 'Medium' ? 'text-yellow-500 border-yellow-500 bg-yellow-500/10' :
                                                            c.difficulty === 'Hard' ? 'text-red-500 border-red-500 bg-red-500/10' :
                                                                'text-purple-500 border-purple-500 bg-purple-500/10'}
                                            `}>
                                                    {c.difficulty}
                                                </Badge>
                                                <Badge className="bg-primary/20 text-primary border-primary/30 font-bold px-3 py-1 shadow-[0_0_10px_rgba(239,68,68,0.2)] ml-auto mr-2">
                                                    {c.points} pts
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-xl group-hover:text-primary transition-colors cursor-pointer" onClick={() => openViewModal(c)}>{c.title}</CardTitle>
                                            <p className="text-sm font-mono text-muted-foreground mt-1">
                                                Category: <span className="text-primary/90 font-bold tracking-wide">{(c.categories as any)?.name || "Unknown"}</span>
                                            </p>
                                        </CardHeader>

                                        <CardContent className="relative z-0 pb-3">
                                            <CardDescription className="line-clamp-2 text-muted-foreground/80 text-xs">
                                                {c.description}
                                            </CardDescription>
                                        </CardContent>

                                        <CardFooter className="pt-2 pb-4 relative z-0 flex gap-2 border-t border-border/30 mt-auto">
                                            <Button variant="outline" className="flex-1 bg-black/50 border-white/10 hover:border-primary/50 hover:bg-primary/20 hover:text-white transition-all text-xs h-9" onClick={() => openViewModal(c)}>
                                                <Eye className="w-3.5 h-3.5 mr-2" /> Inspect
                                            </Button>
                                            <Button variant="outline" className="flex-1 bg-black/50 border-white/10 hover:border-primary/50 hover:bg-primary/20 hover:text-white transition-all text-xs h-9" onClick={() => openEditModal(c)}>
                                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Modify
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => promptDelete(c.id)} className="h-9 w-9 shrink-0 bg-black/50 border-white/10 hover:border-red-500 hover:bg-red-500/20 hover:text-red-400 transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* View Challenge Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden border-primary/20 bg-black/95 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(239,68,68,0.5)] sm:rounded-2xl">
                        {viewChallenge && (
                            <>
                                <DialogHeader className="shrink-0 p-6 pb-4 border-b border-white/10 bg-black/40">
                                    <DialogTitle className="flex items-center text-2xl gap-2 font-mono uppercase tracking-wider text-white">
                                        <TerminalSquare className="text-primary w-6 h-6" />
                                        {viewChallenge.title}
                                    </DialogTitle>
                                    <div className="flex gap-2 pt-2">
                                        <Badge variant="outline" className={`${viewChallenge.difficulty === 'Easy' ? 'text-green-500' : viewChallenge.difficulty === 'Medium' ? 'text-yellow-500' : viewChallenge.difficulty === 'Hard' ? 'text-red-500' : 'text-purple-500'}`}>
                                            {viewChallenge.difficulty}
                                        </Badge>
                                        <Badge className="bg-primary/20 text-primary border border-primary/30 font-bold px-3 py-1">
                                            {viewChallenge.points} pts
                                        </Badge>
                                        <Badge className="bg-zinc-800 text-zinc-300 border border-white/10 font-bold">
                                            {(viewChallenge.categories as any)?.name || "Unknown"}
                                        </Badge>
                                    </div>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6 focus:outline-none scroll-smooth custom-scrollbar">
                                    <div className="bg-secondary/50 p-4 rounded-md border border-border/50 text-muted-foreground/90 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                                        {viewChallenge.description}
                                    </div>

                                    {(viewChallenge.target_url || viewChallenge.file_url) && (
                                        <div className="flex flex-wrap gap-2">
                                            {viewChallenge.target_url && (
                                                <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/20 gap-2" onClick={() => window.open(viewChallenge.target_url, '_blank')}>
                                                    <ExternalLink className="w-4 h-4" /> Open Target
                                                </Button>
                                            )}
                                            {viewChallenge.file_url && (
                                                <Button variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20 gap-2" onClick={() => window.open(viewChallenge.file_url, '_blank')}>
                                                    <Download className="w-4 h-4" /> Download Material
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {viewChallenge.hints && viewChallenge.hints.length > 0 && (
                                        <div className="space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                                            <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                                                <HelpCircle className="w-4 h-4" /> Intelligence Briefing
                                            </h3>
                                            {viewChallenge.hints.map((hint: string, hIdx: number) => {
                                                const isUnlocked = showHints > hIdx;
                                                return (
                                                    <div key={hIdx} className="relative">
                                                        {!isUnlocked ? (
                                                            <Button variant="secondary" className="w-full justify-start text-muted-foreground border border-dashed border-white/20 hover:bg-white/10" onClick={() => setShowHints(hIdx + 1)}>
                                                                <LockIcon className="w-4 h-4 mr-2" /> Reveal Hint {hIdx + 1}
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

                                    <div className="space-y-2 bg-primary/5 p-4 rounded-lg border border-primary/20">
                                        <label className="text-xs font-mono font-bold uppercase text-primary flex items-center gap-2">
                                            <Flag className="w-3.5 h-3.5" /> Target Flag Payload
                                        </label>
                                        <div className="font-mono text-white tracking-widest bg-black/50 p-2 rounded border border-white/5 break-all">
                                            {viewChallenge.flag}
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="shrink-0 p-6 pt-4 sm:justify-end border-t border-white/10 bg-black/40">
                                    <Button type="button" variant="outline" className="hover:bg-white/5" onClick={() => setIsViewModalOpen(false)}>
                                        Close Preview
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Edit Challenge Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="bg-black/95 border-border/50 text-slate-200 border-t-2 border-t-primary shadow-[0_0_50px_rgba(239,68,68,0.2)] max-w-2xl w-[95vw] lg:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl">
                        <form onSubmit={handleEditSubmit} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                            <DialogHeader className="shrink-0 p-6 pb-4 border-b border-white/10 bg-black/40">
                                <DialogTitle className="text-2xl font-black font-mono text-white flex items-center gap-2">
                                    <Edit2 className="w-6 h-6 text-primary" /> MODIFY TARGET
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground font-mono mt-1">Update existing mission parameters.</p>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 focus:outline-none scroll-smooth">
                                {/* Core Parameters */}
                                <div className="space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Terminal className="w-4 h-4" /> Core Parameters
                                    </h3>
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Target Name</label>
                                        <Input required placeholder="E.g. SQLi Vulnerability" className="bg-black/50 border-white/10" value={editChallenge.title} onChange={e => setEditChallenge({ ...editChallenge, title: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Category</label>
                                            <select required className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary appearance-none" value={editChallenge.category_id} onChange={e => setEditChallenge({ ...editChallenge, category_id: e.target.value })}>
                                                <option value="" disabled className="bg-black text-slate-500">Select category...</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id} className="bg-black text-white">{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Difficulty</label>
                                            <select required className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary appearance-none" value={editChallenge.difficulty} onChange={e => setEditChallenge({ ...editChallenge, difficulty: e.target.value })}>
                                                <option value="Easy" className="bg-black text-green-400">Easy</option>
                                                <option value="Medium" className="bg-black text-yellow-500">Medium</option>
                                                <option value="Hard" className="bg-black text-red-500">Hard</option>
                                                <option value="Insane" className="bg-black text-purple-500">Insane</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Briefing (Description) - Max 1500 chars</label>
                                        <textarea required rows={4} maxLength={1500} placeholder="Describe the mission details, hints, or instructions here..." className="flex w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono" value={editChallenge.description} onChange={e => setEditChallenge({ ...editChallenge, description: e.target.value })} />
                                    </div>
                                </div>

                                {/* Mission Objectives */}
                                <div className="space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Flag className="w-4 h-4" /> Mission Objectives
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Reward Points</label>
                                            <Input required type="number" min={0} className="bg-black/50 border-white/10 font-mono text-green-400" value={editChallenge.points} onChange={e => setEditChallenge({ ...editChallenge, points: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Target URL (Optional)</label>
                                            <Input placeholder="http://target.com" className="bg-black/50 border-white/10 font-mono" value={editChallenge.target_url} onChange={e => setEditChallenge({ ...editChallenge, target_url: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2 bg-primary/5 p-4 rounded-lg border border-primary/20 mt-4">
                                        <label className="text-xs font-mono font-bold uppercase text-primary">Capture Flag Secret</label>
                                        <Input required placeholder="UbigCTF{...}" className="bg-black/50 border-primary/30 font-mono text-white focus-visible:ring-primary/50" value={editChallenge.flag} onChange={e => setEditChallenge({ ...editChallenge, flag: e.target.value })} />
                                    </div>
                                </div>

                                {/* Support & Assets */}
                                <div className="space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Shield className="w-4 h-4" /> Support & Assets
                                    </h3>

                                    <div className="space-y-3 pt-2">
                                        <label className="text-xs font-mono font-bold uppercase text-muted-foreground">Progressive Hints</label>
                                        {editChallenge.hints.map((hint, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input
                                                    placeholder={`Hint level ${index + 1}...`}
                                                    className="bg-black/50 border-white/10 text-yellow-400 font-mono text-sm"
                                                    value={hint}
                                                    onChange={e => {
                                                        const newHints = [...editChallenge.hints];
                                                        newHints[index] = e.target.value;
                                                        setEditChallenge({ ...editChallenge, hints: newHints });
                                                    }}
                                                />
                                                {index > 0 && (
                                                    <Button type="button" variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 text-muted-foreground transition-all flex-shrink-0" onClick={() => {
                                                        setEditChallenge({ ...editChallenge, hints: editChallenge.hints.filter((_, i) => i !== index) });
                                                    }}>
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-xs text-muted-foreground" onClick={() => {
                                            setEditChallenge({ ...editChallenge, hints: [...editChallenge.hints, ""] });
                                        }}>
                                            <Plus className="w-3 h-3 mr-1" /> Add Hint Tier
                                        </Button>
                                    </div>
                                    <div className="mt-4 p-3 border border-white/10 rounded-lg bg-black/40 text-xs font-mono text-muted-foreground">
                                        <UploadCloud className="w-4 h-4 inline mr-2" />
                                        File attachments must be re-uploaded or modified via database directly for now if needed.
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-6 pt-4 sm:justify-end gap-2 border-t border-white/10 bg-black/40 shrink-0">
                                <Button type="button" variant="ghost" className="hover:bg-white/5" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isEditSubmitting} className="font-bold bg-primary hover:bg-primary/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                    {isEditSubmitting ? "Updating..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent className="max-w-md bg-black/95 border-red-500/50 text-slate-200 shadow-[0_0_50px_rgba(239,68,68,0.4)] sm:rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black font-mono text-red-500 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" /> CONFIRM DELETION
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-2 text-slate-300 font-mono text-sm leading-relaxed">
                            Are you sure you want to completely destroy this mission target? This action is irreversible and will wipe all associated data.
                        </div>
                        <DialogFooter className="sm:justify-end gap-2 border-t border-white/10 pt-4 mt-2">
                            <Button type="button" variant="ghost" className="hover:bg-white/5" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button type="button" onClick={confirmDelete} className="font-bold bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                Yes, Destroy Target
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

