"use client";

import { Mail, Bug, Briefcase, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl flex-1 flex flex-col justify-center">
            <div className="flex flex-col items-center justify-center text-center mb-12 mt-8">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl font-mono text-white drop-shadow-[0_2px_10px_rgba(239,68,68,0.5)] mb-6">
                    Get In <span className="text-primary tracking-widest uppercase shadow-red-500">Touch</span>
                </h1>
                <div className="w-24 h-1.5 bg-primary/80 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            </div>

            <div className="grid md:grid-cols-2 gap-8 relative z-10">

                {/* Left Col: Contact Info */}
                <div className="space-y-6">
                    <p className="text-muted-foreground leading-relaxed text-lg mb-8">
                        Whether you found a vulnerability in our platform, want to discuss a partnership, or have a general inquiry, we are here for you.
                    </p>

                    <div className="flex items-start gap-4 p-4 rounded-lg bg-card/40 border border-border/30 hover:border-primary/40 transition-colors">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Bug className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">Report a Bug</h3>
                            <p className="text-muted-foreground mb-2">Found an issue during the CTF?</p>
                            <a href="mailto:security@ubig.co.id" className="text-primary hover:underline flex items-center gap-1 font-mono">
                                security@ubig.co.id <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-lg bg-card/40 border border-border/30 hover:border-primary/40 transition-colors">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Briefcase className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">Partnerships</h3>
                            <p className="text-muted-foreground mb-2">Want to sponsor or collaborate?</p>
                            <a href="mailto:contact@ubig.co.id" className="text-primary hover:underline flex items-center gap-1 font-mono">
                                contact@ubig.co.id <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-lg bg-card/40 border border-border/30 hover:border-primary/40 transition-colors">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">Office</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                PT Global Data Inspirasi (Datareka) / UBIG<br />
                                Malang, Indonesia
                            </p>
                        </div>
                    </div>

                </div>

                {/* Right Col: Contact Form (Visual Only for now) */}
                <div className="bg-card/60 border border-border/50 p-6 rounded-xl backdrop-blur-sm shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)]">
                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-white">
                        <Mail className="w-6 h-6 text-primary" />
                        Send a Message
                    </h2>

                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Name</label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                className="w-full bg-black/50 border border-border/50 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Email</label>
                            <input
                                type="email"
                                placeholder="john@example.com"
                                className="w-full bg-black/50 border border-border/50 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Subject</label>
                            <select className="w-full bg-black/50 border border-border/50 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none">
                                <option>Bug Report / Vulnerability</option>
                                <option>Partnership / Sponsorship</option>
                                <option>General Inquiry</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Message</label>
                            <textarea
                                rows={4}
                                placeholder="Provide details here..."
                                className="w-full bg-black/50 border border-border/50 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                            ></textarea>
                        </div>

                        <Button type="button" className="w-full bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(239,68,68,0.4)] mt-2">
                            Submit Message
                        </Button>
                    </form>
                </div>

            </div>

            {/* Background ambient glow */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none z-0" />
        </div>
    );
}
