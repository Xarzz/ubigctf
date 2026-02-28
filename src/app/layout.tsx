import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { NavBar } from "@/components/navbar";
import { UserProvider } from "@/hooks/useUser";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UbigCTF",
  description: "Mini CTF Platform for Mentoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <UserProvider>
          {/* Global Dark Grid Background */}
          <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-[-2]"></div>
          <div className="fixed inset-0 bg-gradient-to-b from-black/20 via-background to-background pointer-events-none z-[-1]" />

          <NavBar />

          <main className="flex-1 relative z-10 w-full flex flex-col">
            {children}
          </main>

          <footer className="border-t border-border/40 bg-background/95 backdrop-blur z-10 mt-auto">
            <div className="container mx-auto flex h-16 items-center px-4 justify-center">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} UbigCTF
              </p>
            </div>
          </footer>
          <Toaster />
        </UserProvider>
      </body>
    </html>
  );
}
