import { TerminalSquare } from "lucide-react";

export default function AdminLoading() {
    return (
        <div className="w-full h-[60vh] flex flex-col items-center justify-center">
            <div className="relative flex flex-col items-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full blur-[40px] animate-pulse" />
                <div className="relative z-10 w-16 h-16 border-2 border-white/5 border-t-primary border-r-primary rounded-xl animate-[spin_1s_linear_infinite] flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <div className="w-10 h-10 border-2 border-white/5 border-b-primary border-l-primary rounded-lg animate-[spin_1.5s_ease-in-out_infinite_reverse]" />
                </div>
                <div className="mt-8 flex items-center gap-3">
                    <TerminalSquare className="w-5 h-5 text-primary animate-pulse" />
                    <span className="font-mono font-bold tracking-[0.2em] text-white uppercase text-sm drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                        Connecting to Mainframe...
                    </span>
                    <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                    </span>
                </div>
            </div>
        </div>
    );
}
