import { ShieldCheck, Flag, Users, AlertTriangle } from "lucide-react";

export default function RulesPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl flex-1 flex flex-col justify-center">
            <div className="flex flex-col items-center justify-center text-center mb-12 mt-8">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl font-mono text-white drop-shadow-[0_2px_10px_rgba(239,68,68,0.5)] mb-6">
                    Rules of <span className="text-primary tracking-widest uppercase shadow-red-500">Engagement</span>
                </h1>
                <div className="w-24 h-1.5 bg-primary/80 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            </div>

            <div className="space-y-8 relative z-10">
                <div className="bg-card/80 border border-border/50 p-6 rounded-lg backdrop-blur-sm shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] hover:border-primary/50 transition-colors duration-300">
                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-4 text-white">
                        <Flag className="w-6 h-6 text-primary" />
                        Flag Format
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                        All flags follow the standard format: <span className="font-mono bg-black/50 px-2 py-1 rounded text-primary">UbigCTF&#123;...&#125;</span>. Wait until you find this exact format, or format your discovered secret into it. Flags are case-sensitive and must be submitted exactly as found.
                    </p>
                </div>

                <div className="bg-card/80 border border-border/50 p-6 rounded-lg backdrop-blur-sm shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] hover:border-primary/50 transition-colors duration-300">
                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-4 text-white">
                        <AlertTriangle className="w-6 h-6 text-primary" />
                        Prohibited Actions
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>Do not attack the infrastructure (no DDoS, brute-forcing the login page, or automated scanning tools).</li>
                        <li>Do not attempt to disrupt the experience for other players.</li>
                        <li>Do not brute-force the flag submissions.</li>
                        <li>Sharing flags, write-ups, or direct solutions during the competition is strictly forbidden.</li>
                    </ul>
                </div>

                <div className="bg-card/80 border border-border/50 p-6 rounded-lg backdrop-blur-sm shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] hover:border-primary/50 transition-colors duration-300">
                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-4 text-white">
                        <Users className="w-6 h-6 text-primary" />
                        Mentoring & Collaboration
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                        While sharing flags is not allowed, we highly encourage discussing concepts, tools, and methodologies with your mentors and peers. The goal of UbigCTF is to learn and improve your skills.
                    </p>
                </div>

                <div className="bg-card/80 border border-border/50 p-6 rounded-lg backdrop-blur-sm shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] hover:border-primary/50 transition-colors duration-300">
                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-4 text-white">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                        Fair Play
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                        By participating in this CTF, you agree to play fair. If you find a bug in the scoring system or the CTF platform itself, please report it to the admins—do not exploit it for points.
                    </p>
                </div>
            </div>

            {/* Background ambient glow */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none z-0" />
        </div>
    );
}
