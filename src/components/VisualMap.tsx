"use client";

import { Background, Controls, Panel, ReactFlow, useEdgesState, useNodesState, useReactFlow, Node, Edge, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity, Layers, Share2, Box, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { NodeData } from "@/types";
import { AIAssistant } from "./AIAssistant";
import { ArchitectureNode } from "./ArchitectureNode";

interface VisualMapProps {
    nodes: any[];
    edges: any[];
    onNodesChange: any;
    onEdgesChange: any;
    onNodeClick: (e: any, node: any) => void;
    isScanning: boolean;
    scanPercent: number;
    scanStep: string;
    error: string | null;
    stats?: any;
    onLayoutChange?: (options: { direction: string, edgeType: string }) => void;
    currentLayout?: { direction: string, edgeType: string };
}

const nodeTypes = {
    architectureNode: ArchitectureNode,
};

export function VisualMap({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    isScanning,
    scanPercent,
    scanStep,
    error,
    stats,
    onLayoutChange,
    currentLayout
}: VisualMapProps) {
    const { fitView } = useReactFlow();
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Blast Radius Logic
    const impactElements = useMemo(() => {
        if (!hoveredNode) return { nodes: new Set(), edges: new Set() };

        const connectedNodes = new Set([hoveredNode]);
        const connectedEdges = new Set();

        const findDownstream = (id: string, depth = 0) => {
            if (depth > 5) return;
            edges.forEach(edge => {
                if (edge.source === id) {
                    connectedNodes.add(edge.target);
                    connectedEdges.add(edge.id);
                    findDownstream(edge.target, depth + 1);
                }
            });
        };

        edges.forEach(edge => {
            if (edge.target === hoveredNode) {
                connectedNodes.add(edge.source);
                connectedEdges.add(edge.id);
            }
        });

        findDownstream(hoveredNode);
        return { nodes: connectedNodes, edges: connectedEdges };
    }, [hoveredNode, edges]);

    const styledNodes = useMemo(() =>
        nodes.map(node => ({
            ...node,
            style: {
                ...node.style,
                opacity: hoveredNode ? (impactElements.nodes.has(node.id) ? 1 : 0.15) : 1,
            }
        })), [nodes, hoveredNode, impactElements]);

    const styledEdges = useMemo(() =>
        edges.map(edge => ({
            ...edge,
            animated: hoveredNode ? impactElements.edges.has(edge.id) : edge.animated,
            style: {
                ...edge.style,
                stroke: hoveredNode ? (impactElements.edges.has(edge.id) ? '#00f2ff' : '#27272a') : '#52525b',
                strokeWidth: hoveredNode ? (impactElements.edges.has(edge.id) ? 3 : 1) : 1.5,
                opacity: hoveredNode ? (impactElements.edges.has(edge.id) ? 1 : 0.05) : 0.6,
            }
        })), [edges, hoveredNode, impactElements]);

    useEffect(() => {
        if (nodes.length > 0 && !isScanning) {
            setTimeout(() => fitView({ padding: 0.1, duration: 800 }), 100);
        }
    }, [nodes.length, isScanning, fitView]);

    const onNodeMouseEnter = useCallback((_e: any, node: any) => setHoveredNode(node.id), []);
    const onNodeMouseLeave = useCallback(() => setHoveredNode(null), []);

    return (
        <div className="relative flex-1 bg-background-primary overflow-hidden h-full">
            {nodes.length > 0 && !isScanning ? (
                <ReactFlow
                    nodes={styledNodes}
                    edges={styledEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    nodeTypes={nodeTypes}
                    fitView
                    minZoom={0.05}
                    maxZoom={2}
                    className="bg-background-primary transition-all"
                >
                    <Background color="#1a1a1c" gap={40} size={1} />

                    <Controls
                        position="top-left"
                        className="bg-background-secondary border-border-subtle fill-text-primary !shadow-2xl m-4"
                    />

                    <MiniMap
                        position="bottom-left"
                        nodeStrokeColor="#00f2ff"
                        nodeColor={(n) => (n.type === 'architectureNode' ? '#141416' : '#27272a')}
                        maskColor="rgba(0, 0, 0, 0.4)"
                        style={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', margin: '16px' }}
                        className="!bg-background-secondary/50 !backdrop-blur-md"
                    />

                    <Panel position="top-right" className="m-4">
                        <div className="flex flex-col gap-2">
                            <div className="rounded border border-border-subtle bg-background-secondary/80 p-2 backdrop-blur-sm text-[10px] text-text-secondary uppercase font-bold flex items-center gap-2 shadow-lg">
                                <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                                {nodes.length} Objects Live
                            </div>
                            <div className="rounded border border-border-subtle bg-background-secondary/80 p-2 backdrop-blur-sm text-[8px] text-text-secondary uppercase font-bold flex flex-col gap-1.5 shadow-lg">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]" />
                                    <span>Critical Complexity (&gt;20)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_#eab308]" />
                                    <span>High Complexity (&gt;10)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
                                    <span>Stable Logic</span>
                                </div>
                            </div>
                        </div>
                    </Panel>

                    <Panel position="bottom-center" className="mb-8">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest bg-background-primary/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">Architectural Presets</span>
                            <div className="flex gap-2 p-1.5 bg-background-secondary/80 backdrop-blur-md rounded-2xl border border-border-subtle shadow-2xl">
                                {[
                                    { id: 'TB-smoothstep', label: 'Hierarchy', icon: Layers, description: 'Standard Top-Down structural overview showing system layers.' },
                                    { id: 'LR-default', label: 'Stream', icon: Share2, description: 'Left-to-Right flow, ideal for sequential logic and pipelines.' },
                                    { id: 'TB-straight', label: 'Blueprint', icon: Box, description: 'Clean orthogonal schematic layout for precise component mapping.' },
                                    { id: 'BT-step', label: 'Trace', icon: Activity, description: 'Bottom-Up dependency tracing to find root base modules.' }
                                ].map((p) => {
                                    const [dir, type] = p.id.split('-');
                                    const isActive = currentLayout?.direction === dir && currentLayout?.edgeType === type;
                                    const Icon = p.icon;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => onLayoutChange?.({ direction: dir, edgeType: type })}
                                            title={p.description}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${isActive ? 'bg-accent-primary border-accent-primary text-background-primary shadow-[0_0_20px_#00f2ff44]' : 'bg-white/5 border-transparent text-text-secondary hover:bg-white/10 hover:text-white'}`}
                                        >
                                            <Icon className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{p.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </Panel>

                    <Panel position="bottom-right" className="m-8 flex flex-col items-end gap-4">
                        <button
                            onClick={() => onLayoutChange?.(currentLayout || { direction: 'TB', edgeType: 'smoothstep' })}
                            className="flex items-center gap-3 px-4 py-2.5 bg-accent-primary/10 hover:bg-accent-primary/20 backdrop-blur-md border border-accent-primary/30 rounded-full text-[11px] font-bold text-accent-primary transition-all hover:shadow-[0_0_20px_#00f2ff33] group"
                        >
                            <Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Re-Layout Map
                        </button>

                        <div className="flex gap-6 rounded-full border border-border-subtle bg-background-secondary/90 px-6 py-2.5 backdrop-blur-md shadow-xl">
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${nodes.length > 0 ? 'bg-accent-primary animate-pulse shadow-[0_0_10px_#00f2ff]' : 'bg-white/20'}`} />
                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em]">
                                    {nodes.length > 0 ? 'System Active' : 'Standby'}
                                </span>
                            </div>
                        </div>
                    </Panel>
                </ReactFlow>
            ) : (
                <div className="flex h-full items-center justify-center p-12 relative">
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
            <AIAssistant nodes={nodes} stats={stats} />
        </div>
    );
}
