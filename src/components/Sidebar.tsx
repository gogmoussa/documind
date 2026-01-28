import { Database, FileCode, Folder, Hash } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";

interface SidebarProps {
    nodes: any[];
    onNodeClick: (e: any, node: any) => void;
}

export function Sidebar({ nodes, onNodeClick }: SidebarProps) {
    // React Flow 'default' type is used for files if type is undefined
    const files = nodes
        .filter(n => n.type === 'file' || n.type === 'group' || !n.type)
        .sort((a, b) => (a.data.label || "").localeCompare(b.data.label || ""));

    return (
        <aside className="w-72 border-r border-border-subtle bg-background-secondary/50 flex flex-col z-10 backdrop-blur-sm">
            <div className="p-4 border-b border-border-subtle">
                <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                    <Database className="h-3 w-3 text-accent-primary" />
                    Project Index
                </h2>
                <div className="mt-2 text-[10px] text-text-secondary flex justify-between">
                    <span>{nodes.length} Items</span>
                    <span>HEAD: MAIN</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <div className="space-y-0.5">
                    {files.length > 0 ? files.map((node, i) => (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            key={node.id}
                            onClick={(e) => onNodeClick(e, node)}
                            className="group flex items-center gap-2 text-[11px] text-text-secondary hover:text-text-primary cursor-pointer transition-all px-3 py-2 rounded hover:bg-white/5 border border-transparent hover:border-white/5"
                        >
                            {node.type === 'group' ? (
                                <Folder className="h-3 w-3 shrink-0 text-accent-secondary group-hover:text-accent-primary transition-colors" />
                            ) : (
                                <FileCode className="h-3 w-3 shrink-0 group-hover:text-accent-primary transition-colors" />
                            )}
                            <span className="truncate flex-1 font-mono">{node.data.label}</span>
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

            <div className="p-3 border-t border-border-subtle text-[9px] text-text-secondary text-center uppercase tracking-wider opacity-50">
                System Ready
            </div>
        </aside>
    );
}
