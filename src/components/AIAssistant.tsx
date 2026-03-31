"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Network, Bot, Activity, RotateCcw, Share2, ChevronUp, ShieldAlert } from "lucide-react";
import mermaid from "mermaid";

interface AIAssistantProps {
    nodes: any[];
    stats: any;
}

type AIMode = 'flow' | 'sequence' | 'er' | 'security';

export function AIAssistant({ nodes, stats }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeMode, setActiveMode] = useState<AIMode>('flow');
    const [diagram, setDiagram] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState("Analyzing Repository Logic Patterns...");

    // Caching keys based on mode
    const getCacheKey = (mode: AIMode) => `documind-ai-${mode}`;

    useEffect(() => {
        if (diagram && isOpen && !isLoading) {
            try {
                mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
                setTimeout(() => mermaid.contentLoaded(), 100);
            } catch (e) {
                console.error("Mermaid initialization error", e);
            }
        }
    }, [diagram, isOpen, isLoading]);

    const handleGenerate = async (
        mode: AIMode = 'flow', 
        isRetry = false, 
        previousDiagram: string | null = null, 
        errorMsg: string | null = null, 
        force = false
    ) => {
        setIsOpen(true);
        setIsMenuOpen(false);
        setActiveMode(mode);
        
        const cacheKey = getCacheKey(mode);
        
        if (diagram && !isRetry && !force && mode === activeMode) return;

        if (force || mode !== activeMode) {
            setDiagram(null);
            if (force) localStorage.removeItem(cacheKey);
        }

        setIsLoading(true);
        setLoadingMsg(isRetry ? "Correcting diagram syntax..." : `Generating ${mode} model...`);
        
        try {
            if (!isRetry && !force) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    setDiagram(cached);
                    setIsLoading(false);
                    return;
                }
            }

            const context = {
                fileCount: nodes.length,
                stats: stats,
                activeNodes: nodes.slice(0, 30).map(n => ({ id: n.id, label: n.data?.label, role: n.data?.architectureRole })),
            };

            const body = isRetry ? {
                failedDiagram: previousDiagram,
                errorMsg: errorMsg,
                mode: mode
            } : {
                context: `Current Repository Analysis summary: ${JSON.stringify(context)}`,
                mode: mode
            };

            const res = await fetch("/api/global-flow", {
                method: "POST",
                body: JSON.stringify(body),
            });
            const data = await res.json();
            
            if (data.error) {
                setDiagram(`sequenceDiagram\n  participant Error\n  Note over Error: ${data.error}`);
                setIsLoading(false);
                return;
            }
            
            const newDiagram = data.diagram || "sequenceDiagram\n  Note over Root: Error parsing system flow";
            
            try {
                const cleanDiag = newDiagram.replace(/```mermaid/g, '').replace(/```/g, '').trim();
                await mermaid.parse(cleanDiag);
                setDiagram(cleanDiag);
                
                if (!cleanDiag.includes('participant Error') && !cleanDiag.includes('Note over Error')) {
                    localStorage.setItem(cacheKey, cleanDiag);
                }
                setIsLoading(false);
            } catch (parseError: any) {
                const msg = parseError?.message || "Syntax Error";
                if (!isRetry) {
                    handleGenerate(mode, true, newDiagram, msg);
                } else {
                    const cleanError = msg?.split(':')[0]?.substring(0, 50) || 'Invalid Diagram';
                    setDiagram(`sequenceDiagram\n  participant Error\n  Note over Error: Syntax Error: ${cleanError}`);
                    setIsLoading(false);
                }
            }
        } catch (e) {
            setDiagram("sequenceDiagram\n  participant Error\n  Note over Error: Connection Error");
            setIsLoading(false);
        }
    };

    const modes = [
        { id: 'flow' as AIMode, label: 'Architecture Map', icon: Network, desc: 'High-level system topology and data flow.' },
        { id: 'sequence' as AIMode, label: 'Execution Flow', icon: Activity, desc: 'Detailed step-by-step logic execution sequence.' },
        { id: 'er' as AIMode, label: 'Entity Relations', icon: Share2, desc: 'Structural relationship between data models.' },
        { id: 'security' as AIMode, label: 'Security & Risk', icon: ShieldAlert, desc: 'AI audit of technical debt and security hotspots.' },
    ];

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 bg-background-primary flex flex-col overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-background-secondary">
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const ModeIcon = modes.find(m => m.id === activeMode)?.icon || Network;
                                    return <ModeIcon className="w-5 h-5 text-accent-primary" />;
                                })()}
                                <span className="text-sm font-bold uppercase tracking-widest text-text-primary">
                                    {modes.find(m => m.id === activeMode)?.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => handleGenerate(activeMode, false, null, null, true)} 
                                    disabled={isLoading} title="Regenerate"
                                    className="text-text-secondary hover:text-accent-primary transition-colors disabled:opacity-30"
                                >
                                    <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-8 flex items-start justify-center custom-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center gap-4 h-full">
                                    <div className="relative h-16 w-16">
                                        <div className="absolute inset-0 rounded-full border-2 border-accent-primary/20" />
                                        <div className="absolute inset-0 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
                                        <Activity className="absolute inset-0 m-auto h-6 w-6 text-accent-primary animate-pulse" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-accent-primary animate-pulse">{loadingMsg}</span>
                                </div>
                            ) : (
                                <div className="min-w-full flex justify-center pb-32">
                                    <div className="mermaid text-center opacity-90 p-8 w-full max-w-7xl bg-white/5 rounded-xl border border-white/10" key={diagram}>
                                        {diagram}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="bg-background-secondary/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl w-64 mb-2 overflow-hidden"
                        >
                            {modes.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => handleGenerate(m.id)}
                                    className="w-full flex flex-col gap-1 p-3 hover:bg-white/5 rounded-xl transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-accent-primary/10 rounded-lg group-hover:bg-accent-primary/20 transition-colors">
                                            <m.icon className="w-4 h-4 text-accent-primary" />
                                        </div>
                                        <span className="text-xs font-bold text-text-primary uppercase tracking-tighter">{m.label}</span>
                                    </div>
                                    <p className="text-[10px] text-text-secondary leading-tight pl-11">{m.desc}</p>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`relative px-6 py-4 rounded-full flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs
                        shadow-[0_0_20px_rgba(0,242,255,0.3)] border border-accent-primary/20 bg-background-primary group overflow-hidden
                        ${isMenuOpen ? 'ring-2 ring-accent-primary' : ''}`}
                >
                    <div className="relative z-10 text-accent-primary flex items-center gap-2 drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]">
                        <Bot className="w-4 h-4" />
                        <span>Architectural Intelligence</span>
                        <ChevronUp className={`w-4 h-4 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </div>
                </motion.button>
            </div>
        </>
    );
}
