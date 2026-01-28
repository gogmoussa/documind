import { Database, FileCode, Folder, Hash, ArrowUpDown, Layers as LayersIcon } from "lucide-react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { motion } from "framer-motion";

interface SidebarProps {
    nodes: any[];
    onNodeClick: (e: any, node: any) => void;
}

type SortOption = "name" | "type" | "size";

export function Sidebar({ nodes, onNodeClick }: SidebarProps) {
    const [sortBy, setSortBy] = useState<SortOption>("name");
    const [groupByType, setGroupByType] = useState(false);

    // React Flow 'default' type is used for files if type is undefined
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
        <aside className="w-72 border-r border-border-subtle bg-background-secondary/50 flex flex-col z-10 backdrop-blur-sm">
            <div className="p-4 border-b border-border-subtle bg-background-primary/30">
                <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 mb-3">
                    <Database className="h-3 w-3 text-accent-primary" />
                    Project Index
                </h2>

                {/* Controls */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex bg-white/5 rounded p-0.5 border border-white/5">
                        {(["name", "type", "size"] as SortOption[]).map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setSortBy(opt)}
                                className={`px-2 py-1 text-[9px] uppercase font-bold rounded transition-colors ${sortBy === opt ? "bg-accent-primary text-background-primary" : "text-text-secondary hover:text-white"}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-2 text-[10px] text-text-secondary flex justify-between">
                    <span>{nodes.length} Items</span>
                    <span className="opacity-50 tracking-wider font-mono">{sortBy.toUpperCase()} SORT</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <div className="space-y-0.5">
                    {processedFiles.length > 0 ? processedFiles.map((node, i) => (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.005 }} // Faster stagger
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
                                {sortBy === 'size' && node.type !== 'group' && (
                                    <span className="text-[8px] opacity-40 font-mono">{(node.data.fileSize / 1024).toFixed(1)} KB</span>
                                )}
                            </div>

                            {node.type !== 'group' && (
                                <span className="text-[9px] opacity-0 group-hover:opacity-50 text-accent-primary transform translate-x-2 group-hover:translate-x-0 transition-all">
                                    VIEW
                                </span>
                            )}
                        </motion.div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-30">
                            <Hash className="h-8 w-8 mb-2" />
                            <p className="text-[10px] italic">Index Empty</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-3 border-t border-border-subtle text-[9px] text-text-secondary text-center uppercase tracking-wider opacity-50 bg-background-primary/30">
                System Ready
            </div>
        </aside>
    );
}
