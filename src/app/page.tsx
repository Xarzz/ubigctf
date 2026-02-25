import Link from "next/link";
import { TerminalSquare, ArrowRight } from "lucide-react";
import { CyberNetwork } from "@/components/CyberNetwork";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] relative overflow-hidden">
      {/* Interactive Node Network Animation */}
      <CyberNetwork />

      {/* Background glow for home */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50 z-[-1]" />

      <div className="flex flex-col items-center justify-center text-center mt-8 z-10 w-full max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-sans text-white drop-shadow-[0_2px_10px_rgba(239,68,68,0.5)] mb-6 flex flex-wrap justify-center items-baseline gap-x-5 leading-tight">
          <span>Welcome to</span> <span className="text-primary font-mono tracking-widest uppercase shadow-red-500 animate-typing">UbigCTF</span>
        </h1>

        {/* Separator Line */}
        <div className="w-24 h-1.5 bg-primary/80 rounded-full mb-8 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />

        <p className="max-w-[42rem] mx-auto leading-normal text-slate-300 sm:text-lg sm:leading-8 mb-10 font-medium tracking-wide">
          A minimalist, interactive capture the flag platform designed for mentoring. Test your skills in Web Exploitation, Cryptography, Binary, and Forensics.
        </p>

        <div className="mt-8 flex items-center justify-center">
          <Link
            href="/challenges"
            className="group flex items-center gap-3 text-slate-400 hover:text-white transition-all text-lg lg:text-xl font-mono border-b-2 border-transparent hover:border-primary pb-1"
          >
            <TerminalSquare className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="tracking-[0.1em] font-bold group-hover:text-shadow-sm">
              [ OPEN_CHALLENGES ]
            </span>
            <span className="w-2.5 h-5 bg-primary animate-pulse opacity-0 group-hover:opacity-100 transition-opacity ml-1"></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
