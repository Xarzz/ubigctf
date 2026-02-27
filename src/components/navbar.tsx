"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, UserCircle, User, LogIn, UserPlus, Phone, LogOut, Flag, ChevronDown } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function NavBar() {
    const pathname = usePathname();
    const { user, profile, isLoaded, signOut } = useUser();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isChallengesDropdownOpen, setIsChallengesDropdownOpen] = useState(false);

    // Safely parse display name
    const displayName = profile?.username || user?.email?.split("@")[0] || "";
    const shortName = displayName.split(" ")[0]; // Get first name for navbar
    const displayNavbarName = shortName.length > 10 ? `${shortName.substring(0, 10)}...` : shortName;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center px-4">
                <Link href="/" className="flex items-center space-x-2 transition-opacity hover:opacity-80">
                    <Terminal className="h-6 w-6 text-primary" />
                    <span className="font-bold text-xl uppercase tracking-wider text-foreground animate-typing">
                        Ubig<span className="text-primary">CTF</span>
                    </span>
                </Link>
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        {!pathname.startsWith("/admin") && (
                            <>
                                <Link
                                    href="/"
                                    className={`transition-colors hover:text-white ${pathname === "/" ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "text-muted-foreground"
                                        }`}
                                >
                                    Home
                                </Link>
                                <div
                                    className="relative flex items-center h-16"
                                    onMouseEnter={() => setIsChallengesDropdownOpen(true)}
                                    onMouseLeave={() => setIsChallengesDropdownOpen(false)}
                                >
                                    <Link
                                        href="/challenges"
                                        className={`transition-colors hover:text-white flex items-center pr-1 ${pathname.startsWith("/challenges") || pathname === "/profile/challenges" ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "text-muted-foreground"}`}
                                    >
                                        Challenges
                                    </Link>
                                    <DropdownMenu open={isChallengesDropdownOpen} onOpenChange={setIsChallengesDropdownOpen} modal={false}>
                                        <DropdownMenuTrigger className={`focus:outline-none transition-colors hover:text-white flex items-center py-2 ${pathname.startsWith("/challenges") || pathname === "/profile/challenges" ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "text-muted-foreground"}`}>
                                            <ChevronDown className="w-4 h-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 bg-black/90 border-border/50 text-white backdrop-blur-xl shadow-[0_4px_30px_-5px_rgba(239,68,68,0.3)] mt-2">
                                            <DropdownMenuItem asChild className="hover:bg-primary/20 hover:text-white cursor-pointer transition-colors focus:bg-primary/20">
                                                <Link href="/challenges" className="flex items-center w-full">
                                                    <Terminal className="mr-2 h-4 w-4 text-primary" />
                                                    <span>Challenge Board</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            {user && (
                                                <DropdownMenuItem asChild className="hover:bg-primary/20 hover:text-white cursor-pointer transition-colors focus:bg-primary/20">
                                                    <Link href="/profile/challenges" className="flex items-center w-full">
                                                        <Flag className="mr-2 h-4 w-4 text-primary" />
                                                        <span>My Challenges</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <Link
                                    href="/scoreboard"
                                    className={`transition-colors hover:text-white ${pathname === "/scoreboard" ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "text-muted-foreground"
                                        }`}
                                >
                                    Scoreboard
                                </Link>
                                <Link
                                    href="/rules"
                                    className={`transition-colors hover:text-white ${pathname === "/rules" ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "text-muted-foreground"
                                        }`}
                                >
                                    Rules
                                </Link>
                            </>
                        )}

                        {/* Dropdown Menu for Profile, Login, Register, Contact */}
                        <div className="flex items-center">
                            <div
                                className="relative flex items-center h-16 gap-3 pl-3"
                                onMouseEnter={() => setIsDropdownOpen(true)}
                                onMouseLeave={() => setIsDropdownOpen(false)}
                            >
                                {isLoaded && user && (
                                    <span className="text-sm font-semibold font-mono text-primary hidden md:inline-block cursor-default" title={shortName}>
                                        {displayNavbarName}
                                    </span>
                                )}
                                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
                                    <DropdownMenuTrigger className="focus:outline-none flex items-center justify-center rounded-full border border-border/50 bg-black/50 p-1 hover:border-primary/50 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                        <UserCircle className={`h-6 w-6 ${['/profile', '/login', '/register', '/contact'].includes(pathname) ? "text-primary" : "text-muted-foreground"}`} />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 bg-black/90 border-border/50 text-white backdrop-blur-xl shadow-[0_4px_30px_-5px_rgba(239,68,68,0.3)] mt-2">
                                        <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Account Menu</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-border/40" />

                                        {user ? (
                                            <>
                                                {profile?.role === 'admin' && (
                                                    <DropdownMenuItem asChild className="hover:bg-primary/20 hover:text-white cursor-pointer transition-colors focus:bg-primary/20">
                                                        {pathname.startsWith("/admin") ? (
                                                            <Link href="/challenges" className="flex items-center w-full">
                                                                <Terminal className="mr-2 h-4 w-4 text-primary" />
                                                                <span>User Board</span>
                                                            </Link>
                                                        ) : (
                                                            <Link href="/admin" className="flex items-center w-full">
                                                                <Terminal className="mr-2 h-4 w-4 text-primary" />
                                                                <span>Admin Board</span>
                                                            </Link>
                                                        )}
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem asChild className="hover:bg-primary/20 hover:text-white cursor-pointer transition-colors focus:bg-primary/20">
                                                    <Link href="/profile" className="flex items-center w-full">
                                                        <User className="mr-2 h-4 w-4 text-primary" />
                                                        <span>My Profile</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    asChild
                                                    onSelect={async () => {
                                                        await signOut();
                                                        window.location.href = '/login';
                                                    }}
                                                    className="hover:bg-red-500/20 hover:text-red-400 cursor-pointer transition-colors focus:bg-red-500/20"
                                                >
                                                    <button className="flex items-center w-full text-left">
                                                        <LogOut className="mr-2 h-4 w-4 text-red-500" />
                                                        <span>Log Out</span>
                                                    </button>
                                                </DropdownMenuItem>
                                            </>
                                        ) : (
                                            <>
                                                <DropdownMenuItem asChild className="hover:bg-primary/20 hover:text-white cursor-pointer transition-colors focus:bg-primary/20">
                                                    <Link href="/login" className="flex items-center w-full">
                                                        <LogIn className="mr-2 h-4 w-4 text-primary" />
                                                        <span>Login</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild className="hover:bg-primary/20 hover:text-white cursor-pointer transition-colors focus:bg-primary/20">
                                                    <Link href="/register" className="flex items-center w-full">
                                                        <UserPlus className="mr-2 h-4 w-4 text-primary" />
                                                        <span>Register</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            </>
                                        )}

                                        <DropdownMenuSeparator className="bg-border/40" />

                                        <DropdownMenuItem asChild className="hover:bg-primary/20 hover:text-white cursor-pointer transition-colors focus:bg-primary/20">
                                            <Link href="/contact" className="flex items-center w-full">
                                                <Phone className="mr-2 h-4 w-4 text-primary" />
                                                <span>Contact Support</span>
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}
