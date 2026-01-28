import { Background, Controls, Panel, ReactFlow, useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { NodeData } from "@/types";

interface VisualMapProps {
    nodes: any[]; // React Flow nodes are complex to type strictly without dragging in generic hell, keeping any[] for flow nodes is often pragmatic but I'll try to be broader if I can.
    edges: any[];
    onNodesChange: any;
    onEdgesChange: any;
    onNodeClick: (e: any, node: any) => void;
    isScanning: boolean;
    scanPercent: number;
    scanStep: string;
    error: string | null;
}

export function VisualMap({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    isScanning,
    scanPercent,
    scanStep,
    error
}: VisualMapProps) {
    const { fitView } = useReactFlow();

    // Auto-fit when nodes change significantly (e.g. after scan)
    useEffect(() => {
        if (nodes.length > 0 && !isScanning) {
            setTimeout(() => fitView({ padding: 0.1, duration: 800 }), 100);
        }
    }, [nodes.length, isScanning, fitView]);

    return (
        <div className="relative flex-1 bg-background-primary overflow-hidden h-full">
            {nodes.length > 0 && !isScanning ? (
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    fitView
                    minZoom={0.1}
                    maxZoom={4}
                    className="bg-background-primary"
                >
                    <Background color="#242426" gap={32} size={1} />
                    <Controls className="bg-background-secondary border-border-subtle fill-text-primary" />
                    <Panel position="top-right">
                        <div className="rounded border border-border-subtle bg-background-secondary/80 p-2 backdrop-blur-sm text-[10px] text-text-secondary uppercase font-bold flex items-center gap-2 shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                            {nodes.length} Objects Live
                        </div>
                    </Panel>
                </ReactFlow>
            ) : (
                <div className="flex h-full items-center justify-center p-12 relative">
                    {/* Background Grid Accent */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent-primary/5 to-transparent pointer-events-none" />

                    <div className="text-center w-full max-w-md relative z-10">
                        {isScanning ? (
                            <div className="space-y-8">
                                <div className="relative mx-auto h-40 w-40">
                                    <motion.div
                                        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 rounded-full border-2 border-dashed border-accent-secondary opacity-30"
                                    />
                                    <motion.div
                                        animate={{ rotate: -180 }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-4 rounded-full border-t-2 border-accent-primary shadow-[0_0_15px_#00f2ff]"
                                    />

                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className="text-3xl font-bold font-display text-accent-primary tracking-tighter">{scanPercent}%</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="mb-2 font-display text-sm font-bold text-text-primary uppercase tracking-[0.2em]">{scanStep}</h3>
                                    <div className="h-0.5 w-64 mx-auto bg-white/10 overflow-hidden">
                                        <motion.div
                                            className="h-full bg-accent-primary shadow-[0_0_10px_#00f2ff]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${scanPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                    <Activity className={`h-8 w-8 ${error ? "text-red-500" : "text-text-secondary"}`} />
                                </div>

                                <div className="space-y-2">
                                    <h3 className={`font-display text-xl font-bold uppercase tracking-widest ${error ? "text-red-500" : "text-text-primary"}`}>
                                        {error ? "System Error" : "System Idle"}
                                    </h3>
                                    <p className="text-sm text-text-secondary max-w-xs mx-auto leading-relaxed">
                                        {error ? error : "Enter a local repository path to initiate architectural scanning sequence."}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            )}

            {/* Status Status Bar Overlay */}
            <div className="absolute bottom-8 left-8 flex gap-6 rounded-full border border-border-subtle bg-background-secondary/90 px-6 py-2 backdrop-blur-md z-10 shadow-xl">
                <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${nodes.length > 0 ? 'bg-accent-primary animate-pulse shadow-[0_0_10px_#00f2ff]' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                        {nodes.length > 0 ? 'Map Active' : 'Standby'}
                    </span>
                </div>
                <div className="w-px bg-white/10 h-3" />
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">AI Core Online</span>
                </div>
            </div>
        </div>
    );
}
