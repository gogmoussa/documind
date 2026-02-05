import { Activity, Code, FileText, Layers, X, Copy, Check, GitBranch, Zap, ShieldCheck, Box } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import mermaid from "mermaid";
import { FileData, SummaryData } from "@/types";

interface DocumentationPanelProps {
    selectedFile: FileData;
    summaryData: SummaryData | null;
    isSummarizing: boolean;
    onClose: () => void;
}

export function DocumentationPanel({ selectedFile, summaryData, isSummarizing, onClose }: DocumentationPanelProps) {
    const [activeTab, setActiveTab] = useState<"insight" | "code" | "diagram">("insight");
    const [copied, setCopied] = useState(false);

    // Initialize mermaid
    useEffect(() => {
        if (activeTab === "diagram" && summaryData?.diagram) {
            mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
            setTimeout(() => {
                mermaid.contentLoaded();
            }, 100);
        }
    }, [activeTab, summaryData]);

    const handleCopy = () => {
        if (!summaryData?.content) return;
        navigator.clipboard.writeText(summaryData.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!selectedFile) return null;

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-[500px] border-l border-border-subtle bg-background-secondary/95 backdrop-blur-2xl z-30 shadow-[-20px_0_100px_rgba(0,0,0,0.7)] flex flex-col"
        >
            {/* Header */}
            <div className="flex flex-col border-b border-border-subtle bg-background-primary/50">
                <div className="flex items-center justify-between p-4 pb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="p-1.5 bg-accent-primary/10 rounded border border-accent-primary/20">
                            <FileText className="h-4 w-4 text-accent-primary" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <h2 className="text-sm font-bold font-display truncate text-text-primary custom-scrollbar w-full" title={selectedFile.label}>
                                {selectedFile.label}
                            </h2>
                            <span className="text-[10px] text-text-secondary truncate font-mono opacity-70">
                                {selectedFile.id.split('/').slice(-3).join('/')}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-text-secondary hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-4 gap-6 text-[10px] font-bold tracking-wider uppercase border-b border-transparent">
                    <button
                        type="button"
                        onClick={() => setActiveTab("insight")}
                        className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "insight" ? "border-accent-primary text-accent-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                    >
                        <Activity className="h-3 w-3" /> Insight
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("code")}
                        className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "code" ? "border-accent-primary text-accent-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                    >
                        <Code className="h-3 w-3" /> Source
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("diagram")}
                        className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "diagram" ? "border-accent-primary text-accent-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                    >
                        <GitBranch className="h-3 w-3" /> Flow
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-background-primary/30 relative">
                {isSummarizing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="relative h-12 w-12">
                            <div className="absolute inset-0 rounded-full border-2 border-accent-primary/20" />
                            <div className="absolute inset-0 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
                            <Activity className="absolute inset-0 m-auto h-5 w-5 text-accent-primary animate-pulse" />
                        </div>
                        <span className="text-[10px] text-accent-primary font-bold uppercase tracking-widest animate-pulse">
                            Neural Analysis Active...
                        </span>
                    </div>
                ) : summaryData ? (
                    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Insight Panel */}
                        {activeTab === "insight" && (
                            <>
                                {/* Auto-detected Metrics */}
                                {selectedFile.data && (
                                    <section className="bg-background-secondary/50 p-4 rounded-lg border border-border-subtle mb-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                                                <Code className="h-3 w-3" /> Static Analysis
                                            </h3>
                                            {selectedFile.data.complexity !== undefined && (
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${selectedFile.data.complexity > 20 ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                    selectedFile.data.complexity > 10 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                        'bg-green-500/10 text-green-500 border border-green-500/20'
                                                    }`}>
                                                    <Zap className="h-3 w-3" /> Complexity: {selectedFile.data.complexity}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex flex-col">
                                                <span className="text-text-secondary text-[10px]">LOC</span>
                                                <span className="font-mono text-text-primary">{selectedFile.data.loc}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-text-secondary text-[10px]">Exports</span>
                                                <span className="font-mono text-text-primary">{selectedFile.data.exportCount}</span>
                                            </div>
                                            <div className="flex flex-col opacity-70">
                                                <span className="text-text-secondary text-[10px]">Functions</span>
                                                <span className="font-mono text-text-primary">{selectedFile.data.functions?.length || 0}</span>
                                            </div>
                                            <div className="flex flex-col opacity-70">
                                                <span className="text-text-secondary text-[10px]">Classes</span>
                                                <span className="font-mono text-text-primary">{selectedFile.data.classes?.length || 0}</span>
                                            </div>
                                            <div className="flex flex-col opacity-70">
                                                <span className="text-text-secondary text-[10px]">Coupling</span>
                                                <span className="font-mono text-text-primary">{selectedFile.data.dependencyCount || 0} imports</span>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* Purpose & Role Block */}
                                <section className="relative group p-4 rounded-lg bg-white/5 border border-white/5 shadow-inner">
                                    <div className="absolute -left-2 top-4 bottom-4 w-1 bg-gradient-to-b from-accent-primary to-transparent opacity-50 rounded-full" />

                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                                            <Layers className="h-3 w-3" /> Architecture Role
                                        </h3>
                                        <span className="px-2 py-0.5 bg-accent-primary/20 text-accent-primary rounded text-[10px] font-bold flex items-center gap-1 border border-accent-primary/30">
                                            <ShieldCheck className="h-3 w-3" /> {summaryData.architectureRole}
                                        </span>
                                    </div>

                                    <p className="text-sm leading-relaxed text-text-primary font-medium mb-4 italic text-opacity-90">
                                        &quot;{summaryData.purpose}&quot;
                                    </p>

                                    {summaryData.designPatterns && summaryData.designPatterns.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                                            {summaryData.designPatterns.map((pattern, idx) => (
                                                <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[9px] font-bold">
                                                    <Box className="h-2.5 w-2.5" /> {pattern}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {summaryData.technicalDebt && (
                                    <section className="bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-2">
                                            <Activity className="h-3 w-3" /> Technical Debt Observation
                                        </h3>
                                        <p className="text-[11px] text-red-200/70 leading-relaxed italic">
                                            {summaryData.technicalDebt}
                                        </p>
                                    </section>
                                )}

                                {/* Responsibilities */}
                                <section>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">
                                        Architectural Responsibilities
                                    </h3>
                                    <div className="grid gap-2">
                                        {summaryData.responsibilities.map((resp: string, i: number) => (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded bg-background-secondary border border-border-subtle hover:border-accent-primary/50 transition-colors">
                                                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(0,242,255,0.8)] shrink-0" />
                                                <span className="text-xs text-text-secondary leading-relaxed">{resp}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Relationships */}
                                {summaryData.relationships && (
                                    <section>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">
                                            System Relationships
                                        </h3>
                                        <div className="text-xs text-text-secondary bg-background-secondary p-3 rounded border border-border-subtle font-mono">
                                            {summaryData.relationships}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}

                        {activeTab === "code" && (
                            <div className="relative group">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="absolute right-2 top-2 p-2 bg-black/50 hover:bg-accent-primary rounded text-white transition-all z-10 opacity-0 group-hover:opacity-100"
                                >
                                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </button>
                                <pre className="text-[10px] font-mono leading-relaxed text-blue-100 bg-[#0d0d0d] p-4 rounded-lg overflow-x-auto border border-border-subtle shadow-inner tab-4">
                                    <code>{summaryData.content || "// No content available"}</code>
                                </pre>
                            </div>
                        )}

                        {activeTab === "diagram" && (
                            <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg border border-white/5 min-h-[300px]">
                                {/* Mermaid rendering would go here. For now we use the text */}
                                <div className="mermaid text-center opacity-80" key={activeTab}>
                                    {summaryData.diagram || "graph TD\n  No --> Diagram"}
                                </div>
                                <p className="mt-4 text-[10px] text-text-secondary italic text-center">
                                    *Diagram auto-generated by Neural Engine
                                </p>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                        <FileText className="h-8 w-8 text-text-secondary" />
                        <p className="text-xs">Select a file to analyze</p>
                    </div>
                )}
            </div>

            {/* Footer Status */}
            <div className="p-3 border-t border-border-subtle bg-background-secondary/80 text-[9px] flex justify-between items-center text-text-secondary font-mono">
                <span>
                    SIZE: {selectedFile ? (selectedFile.fileSize / 1024).toFixed(1) : 0} KB
                </span>
                <span className="opacity-50">
                    HASH: {selectedFile ? selectedFile.hash.substring(0, 8) : "N/A"}
                </span>
            </div>
        </motion.div>
    );
}
