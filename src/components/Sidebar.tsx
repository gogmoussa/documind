import { Database, FileCode, Folder, Hash, ArrowUpDown, Layers as LayersIcon, Activity, Zap, ShieldCheck, Box, Code } from "lucide-react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RepositoryStats } from "@/types";

interface SidebarProps {
    nodes: any[];
    onNodeClick: (e: any, node: any) => void;
    stats?: RepositoryStats | null;
}

type SortOption = "name" | "type" | "size";

export function Sidebar({ nodes, onNodeClick, stats }: SidebarProps) {
    const [activeTab, setActiveTab] = useState<"exploration" | "pulse">("exploration");
    const [sortBy, setSortBy] = useState<SortOption>("name");
    const [groupByType, setGroupByType] = useState(false);

    const processedFiles = useMemo(() => {
        let files = nodes.filter(n => n.type === 'file' || n.type === 'group' || !n.type);

        // Sorting Logic
        files.sort((a, b) => {
            if (sortBy === "name") return (a.data.label || "").localeCompare(b.data.label || "");
            if (sortBy === "size") return (b.data.fileSize || 0) - (a.data.fileSize || 0);
            if (sortBy === "type") {
                const extA = a.data.label?.split('.').pop() || "";
                const extB = b.data.label?.split('.').pop() || "";
                return extA.localeCompare(extB);
            }
            return 0;
        });

        // Grouping Logic (Flat vs Type Grouped)
        if (groupByType) {
            // This is a UI-only group for the list, not changing the graph structure
            // We just sort by type heavily here to simulate visual grouping or return a structured object?
            // For simplicity in this list view, let's just ensure they are sorted by type first
            files.sort((a, b) => {
                const typeA = a.type === 'group' ? 'FOLDER' : (a.data.label?.split('.').pop() || "FILE");
                const typeB = b.type === 'group' ? 'FOLDER' : (b.data.label?.split('.').pop() || "FILE");
                return typeA.localeCompare(typeB);
            });
        }

        return files;
    }, [nodes, sortBy, groupByType]);

    return (
        <aside className="w-80 border-r border-border-subtle bg-background-secondary/50 flex flex-col z-10 backdrop-blur-sm shadow-2xl">
            <div className="p-4 border-b border-border-subtle bg-background-primary/30">
                <div className="flex gap-4 mb-5 border-b border-white/5">
                    <button
                        onClick={() => setActiveTab("exploration")}
                        className={`text-[10px] font-bold uppercase tracking-widest pb-3 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'exploration' ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    >
                        <Database className="h-3 w-3" /> Exploration
                    </button>
                    <button
                        onClick={() => setActiveTab("pulse")}
                        className={`text-[10px] font-bold uppercase tracking-widest pb-3 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'pulse' ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    >
                        <Activity className="h-3 w-3" /> Pulse
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === "exploration" ? (
                        <motion.div
                            key="exploration-controls"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter">Sort By:</span>
                                <div className="flex bg-white/5 rounded p-0.5 border border-white/5">
                                    {(["name", "type", "size"] as SortOption[]).map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setSortBy(opt)}
                                            className={`px-2 py-1 text-[8px] uppercase font-bold rounded transition-colors ${sortBy === opt ? "bg-accent-primary text-background-primary shadow-sm" : "text-text-secondary hover:text-white"}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="pulse-header"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-between"
                        >
                            <span className="text-[10px] text-accent-primary font-bold uppercase tracking-widest animate-pulse flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3" /> System Integrity: Stable
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <AnimatePresence mode="wait">
                    {activeTab === "exploration" ? (
                        <motion.div
                            key="file-list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-0.5"
                        >
                            {processedFiles.length > 0 ? processedFiles.map((node, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.002 }}
                                    key={node.id}
                                    onClick={(e) => onNodeClick(e, node)}
                                    className="group flex items-center gap-2 text-[11px] text-text-secondary hover:text-text-primary cursor-pointer transition-all px-3 py-2 rounded hover:bg-white/5 border border-transparent hover:border-white/5"
                                >
                                    {node.type === 'group' ? (
                                        <Folder className="h-3 w-3 shrink-0 text-accent-secondary group-hover:text-accent-primary transition-colors" />
                                    ) : (
                                        <FileCode className="h-3 w-3 shrink-0 group-hover:text-accent-primary transition-colors" />
                                    )}
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        <span className="truncate font-mono">{node.data.label}</span>
                                    </div>
                                    <span className="text-[8px] opacity-0 group-hover:opacity-40 font-mono">{(node.data.fileSize / 1024).toFixed(0)}K</span>
                                </motion.div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                    <Code className="h-8 w-8 mb-2" />
                                    <p className="text-[10px] italic">No active scan results.</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="pulse-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-3 space-y-6"
                        >
                            {stats ? (
                                <>
                                    {/* High Level Metrics */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <span className="text-[8px] text-text-secondary uppercase font-bold opacity-50">Total LOC</span>
                                            <p className="text-xl font-bold text-accent-primary font-mono">{stats.totalLoc.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                            <span className="text-[8px] text-text-secondary uppercase font-bold opacity-50">Avg Complexity</span>
                                            <p className="text-xl font-bold text-yellow-500 font-mono">{stats.averageComplexity.toFixed(1)}</p>
                                        </div>
                                    </div>

                                    {/* Top Hotspots */}
                                    <section className="space-y-3">
                                        <h3 className="text-[9px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                                            <Zap className="h-3 w-3 text-red-500" /> Complexity Hotspots
                                        </h3>
                                        <div className="space-y-1.5">
                                            {stats.topComplexFiles.map((f, i) => (
                                                <div
                                                    key={i}
                                                    onClick={(e) => {
                                                        const node = nodes.find(n => n.id === f.id);
                                                        if (node) onNodeClick(e, node);
                                                    }}
                                                    className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg border border-white/5 hover:border-red-500/30 cursor-pointer transition-colors group"
                                                >
                                                    <span className="text-[10px] font-mono text-text-primary truncate max-w-[150px]">{f.name}</span>
                                                    <span className="text-[10px] font-bold text-red-400 group-hover:scale-110 transition-transform">{f.score}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Layer Distribution */}
                                    <section className="space-y-4">
                                        <h3 className="text-[9px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                                            <LayersIcon className="h-3 w-3 text-accent-primary" /> Architecture Ratio
                                        </h3>
                                        <div className="space-y-4">
                                            {Object.entries(stats.layerBreakdown).map(([layer, count], i) => (
                                                <div key={i} className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-text-primary font-bold opacity-80">{layer}</span>
                                                        <span className="text-text-secondary opacity-60">{count} modules</span>
                                                    </div>
                                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(count / stats.totalFiles) * 100}%` }}
                                                            className="h-full bg-accent-primary shadow-[0_0_8px_rgba(0,242,255,0.4)]"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </>
                            ) : (
                                <div className="flex flex-col h-60 items-center justify-center text-text-secondary text-[10px] italic opacity-30 gap-3">
                                    <Activity className="h-8 w-8 animate-pulse" />
                                    No scan data available.
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-3 border-t border-border-subtle text-[9px] text-text-secondary text-center uppercase tracking-wider opacity-50 bg-background-primary/30">
                System Ready
            </div>
        </aside>
    );
}
