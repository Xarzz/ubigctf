"use client";

import Link from "next/link";
import { useState } from "react";
import { Terminal, Lock, Mail, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error(error.message || "Invalid credentials");
                return;
            }

            toast.success("Authentication successful");
            router.push("/challenges"); // Or wherever you route after login
        } catch (err: any) {
            toast.error("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/challenges`,
            },
        });

        if (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-[#050505] text-slate-200 overflow-hidden font-sans">
            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-slate-800/40 rounded-full blur-[140px]" />
            </div>

            <div className="container mx-auto px-4 py-8 relative z-10 flex justify-center">
                <div className="w-full max-w-md bg-[#0a0a0c]/80 border border-white/10 p-10 rounded-3xl backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-white/20 hover:shadow-primary/5">

                    <div className="flex flex-col items-center justify-center mb-10 text-center">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 mb-5 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <Terminal className="h-7 w-7 text-primary" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                            Ubig<span className="text-primary">CTF</span>
                        </h1>
                        <p className="text-slate-400 text-sm">Welcome back to the terminal</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div className="space-y-1.5 group">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 group-focus-within:text-primary transition-colors">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="hacker@ubig.co.id"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 group">
                            <div className="flex items-center justify-between pl-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-focus-within:text-primary transition-colors">
                                    Password
                                </label>
                                <Link href="/forgot-password" className="text-xs font-medium text-slate-500 hover:text-primary transition-colors">
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative">
                                <KeyRound className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono tracking-widest placeholder:tracking-normal placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <Button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 h-12 rounded-xl font-bold tracking-wide transition-all mt-4 group"
                        >
                            {loading ? "LOADING..." : (
                                <>
                                    ACCESS SYSTEM
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 flex items-center justify-center space-x-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Or continue with</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleGoogleLogin}
                            type="button"
                            className="w-full flex items-center justify-center px-4 py-3 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm font-semibold text-white group"
                        >
                            <svg className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.993 10.993 0 0 0 1 12c0 1.76.42 3.42 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>
                    </div>

                    <div className="text-center mt-8">
                        <p className="text-sm text-slate-400 font-medium">
                            New to UbigCTF?{" "}
                            <Link href="/register" className="text-primary hover:text-primary/80 transition-colors font-bold border-b border-primary/30 hover:border-primary">
                                Create Identity
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
