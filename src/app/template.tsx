"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { TerminalSquare } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

function TemplateInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isHome = pathname === "/";

    const [isLoading, setIsLoading] = useState(false);
    const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
    const prevPathRef = useRef<string | null>(null);

    useEffect(() => {
        const currentPath = pathname + searchParams.toString();

        // On very first mount, just register the path. No loading overlay needed.
        if (prevPathRef.current === null) {
            prevPathRef.current = currentPath;
            return;
        }

        // Skip if path didn't actually change (e.g. same-page re-renders)
        if (prevPathRef.current === currentPath) return;
        prevPathRef.current = currentPath;

        // Skip loading overlay on home page
        if (isHome) return;

        // Clear any pending timers from a previous navigation
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

        // Immediately show loader for any navigation
        setIsLoading(true);

        // Use double-rAF to ensure we're past the browser paint cycle,
        // then add a small minimum display time so it doesn't just flash.
        const raf1 = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                hideTimerRef.current = setTimeout(() => {
                    setIsLoading(false);
                }, 350); // minimum 350ms visible, prevents jarring flash for fast pages
            });
        });

        return () => {
            cancelAnimationFrame(raf1);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, [pathname, searchParams, isHome]);

    return (
        <>
            {/* Full Screen Loading Overlay — only shown during navigation transitions */}
            <div
                className={`fixed inset-0 min-h-screen bg-[#050505] z-[99999] flex flex-col items-center justify-center pointer-events-none transition-all duration-500 ease-in-out ${isLoading ? "opacity-100" : "opacity-0 invisible"
                    }`}
            >
                <div className={`relative flex flex-col items-center transition-all duration-300 transform ${isLoading ? "scale-100 translate-y-0" : "scale-90 translate-y-4"}`}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-[40px] animate-pulse" />
                    <div className="relative z-10 w-16 h-16 border-4 border-white/10 border-t-primary rounded-xl animate-[spin_1s_linear_infinite] flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        <div className="w-8 h-8 border-4 border-white/5 border-b-primary rounded-lg animate-[spin_0.8s_ease-in-out_infinite_reverse]" />
                    </div>
                    <div className="mt-8 flex items-center gap-3">
                        <TerminalSquare className="w-5 h-5 text-primary animate-pulse" />
                        <span className="font-mono font-bold tracking-[0.3em] text-white uppercase text-sm drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                            Loading...
                        </span>
                    </div>
                </div>
            </div>

            {/* Application Content */}
            <div className={`flex-1 flex flex-col w-full transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}>
                {children}
            </div>
        </>
    );
}

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={null}>
            <TemplateInner>{children}</TemplateInner>
        </Suspense>
    );
}
