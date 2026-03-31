"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Network, Bot, Activity, RotateCcw } from "lucide-react";
import mermaid from "mermaid";

interface AIAssistantProps {
    nodes: any[];
    stats: any;
}

export function AIAssistant({ nodes, stats }: AIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [diagram, setDiagram] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [loadingMsg, setLoadingMsg] = useState("Analyzing Repository Logic Patterns...");

    useEffect(() => {
        if (diagram && isOpen && !isLoading) {
            try {
                mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
                // We delay to wait for React to render the .mermaid div before calling contentLoaded
                setTimeout(() => mermaid.contentLoaded(), 100);
            } catch (e) {
                console.error("Mermaid initialization error", e);
            }
        }
    }, [diagram, isOpen, isLoading]);

    const handleGenerate = async (isRetry = false, previousDiagram: string | null = null, errorMsg: string | null = null, force = false) => {
        setIsOpen(true);
        if (diagram && !isRetry && !force) return;

        if (force) {
            localStorage.removeItem('documind-ai-flow');
            setDiagram(null);
        }

        setIsLoading(true);
        setLoadingMsg(isRetry ? "Correcting diagram syntax..." : "Analyzing Repository Logic Patterns...");
        try {
            if (!isRetry) {
                const cached = localStorage.getItem('documind-ai-flow');
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
                errorMsg: errorMsg
            } : {
                context: `Current Repository Analysis summary: ${JSON.stringify(context)}`
            };

            const res = await fetch("/api/global-flow", {
                method: "POST",
                body: JSON.stringify(body),
            });
            const data = await res.json();
            
            if (data.error) {
                console.error("API returned error:", data.error);
                setDiagram(`sequenceDiagram\n  participant Error\n  Note over Error: ${data.error.replace(/\n/g, ' ')}`);
                setIsLoading(false);
                return;
            }
            
            const newDiagram = data.diagram || "sequenceDiagram\n  Note over Root: Error parsing system flow";
            
            // Validate the diagram syntax directly
            try {
                // If it contains ``` anywhere, strip it just in case
                const cleanDiag = newDiagram.replace(/```mermaid/g, '').replace(/```/g, '').trim();
                await mermaid.parse(cleanDiag);
                setDiagram(cleanDiag);
                
                // Only cache if it's a real diagram, not a placeholder/error
                if (!cleanDiag.includes('participant Error') && !cleanDiag.includes('Note over Error') && !cleanDiag.includes('Note over System')) {
                    localStorage.setItem('documind-ai-flow', cleanDiag);
                }
                setIsLoading(false);
            } catch (parseError: any) {
                const msg = parseError?.message || parseError?.str || "Syntax Error";
                if (!isRetry) {
                    // Try one self-correction attempt
                    console.warn("Mermaid Syntax Error Detected! Asking AI to autocorrect...");
                    handleGenerate(true, newDiagram, msg);
                } else {
                    // Fail gracefully after one retry
                    console.error("Self-correction failed:", msg);
                    const cleanError = msg?.split(':')[0]?.substring(0, 50) || 'Invalid Diagram';
                    setDiagram(`sequenceDiagram\n  participant Error\n  Note over Error: Syntax Error: ${cleanError}`);
                    setIsLoading(false);
                }
            }
            
        } catch (e) {
            console.error(e);
            setDiagram("sequenceDiagram\n  participant Error\n  Note over Error: Could not connect to Neural Engine");
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Full-view Overlay for the Diagram */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 bg-background-primary flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-background-secondary">
                            <div className="flex items-center gap-3">
                                <Network className="w-5 h-5 text-accent-primary" />
                                <span className="text-sm font-bold uppercase tracking-widest text-text-primary">Global AI Flow Analysis</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => handleGenerate(false, null, null, true)} 
                                    disabled={isLoading}
                                    title="Regenerate Flow"
                                    className="text-text-secondary hover:text-accent-primary transition-colors disabled:opacity-30"
                                >
                                    <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Rendering Area */}
                        <div className="flex-1 overflow-auto p-8 relative flex items-start justify-center custom-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center gap-4 h-full">
                                    <div className="relative h-16 w-16">
                                        <div className="absolute inset-0 rounded-full border-2 border-accent-primary/20" />
                                        <div className="absolute inset-0 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
                                        <Activity className="absolute inset-0 m-auto h-6 w-6 text-accent-primary animate-pulse" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-accent-primary animate-pulse">
                                        {loadingMsg}
                                    </span>
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

            {/* Floating Toggle Button */}
            <div className={`fixed bottom-8 right-8 z-50 transition-opacity duration-300 ${isOpen && isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isOpen ? () => setIsOpen(false) : () => handleGenerate()}
                    className={`relative px-6 py-4 rounded-full flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs
                        shadow-[0_0_20px_rgba(0,242,255,0.3)] border border-accent-primary/20 bg-background-primary group overflow-hidden
                        ${isOpen ? 'ring-2 ring-accent-primary' : ''}`}
                >
                    <div className="absolute inset-0 bg-accent-primary/5 group-hover:bg-accent-primary/10 transition-colors" />

                    <motion.div
                        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                            background: "radial-gradient(ellipse at center, rgba(0, 242, 255, 0.4) 0%, transparent 70%)",
                        }}
                        animate={{
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />

                    <div className="relative z-10 text-accent-primary flex items-center gap-2 drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]">
                        {isOpen ? (
                            <>
                                <X className="w-4 h-4" />
                                <span>Close System Flow</span>
                            </>
                        ) : (
                            <>
                                <Bot className="w-4 h-4" />
                                <span>Generate AI Flow</span>
                            </>
                        )}
                    </div>
                </motion.button>
            </div>
        </>
    );
}
