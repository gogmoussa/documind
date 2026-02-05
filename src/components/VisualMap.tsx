"use client";

import { Background, Controls, Panel, ReactFlow, useEdgesState, useNodesState, useReactFlow, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity } from "lucide-react";
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
    stats
}: VisualMapProps) {
    const { fitView } = useReactFlow();
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Blast Radius Logic: Calculate which nodes/edges are in the impact zone
    const impactElements = useMemo(() => {
        if (!hoveredNode) return { nodes: new Set(), edges: new Set() };

        const connectedNodes = new Set([hoveredNode]);
        const connectedEdges = new Set();

        // Find all downstream paths (recursive for better architect insight)
        const findDownstream = (id: string, depth = 0) => {
            if (depth > 5) return; // Prevent infinite loops just in case
            edges.forEach(edge => {
                if (edge.source === id) {
                    connectedNodes.add(edge.target);
                    connectedEdges.add(edge.id);
                    findDownstream(edge.target, depth + 1);
                }
            });
        };

        // Find all immediate upstream (who depends on me)
        edges.forEach(edge => {
            if (edge.target === hoveredNode) {
                connectedNodes.add(edge.source);
                connectedEdges.add(edge.id);
            }
        });

        findDownstream(hoveredNode);
        return { nodes: connectedNodes, edges: connectedEdges };
    }, [hoveredNode, edges]);

    // Apply styles dynamically based on impact
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

    // Auto-fit when nodes change significantly
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
                    <Background color="#242426" gap={32} size={1} />
                    <Controls className="bg-background-secondary border-border-subtle fill-text-primary" />
                    <Panel position="top-right">
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
            <div className="absolute bottom-8 right-8 flex gap-6 rounded-full border border-border-subtle bg-background-secondary/90 px-6 py-2 backdrop-blur-md z-10 shadow-xl">
                <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${nodes.length > 0 ? 'bg-accent-primary animate-pulse shadow-[0_0_10px_#00f2ff]' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                        {nodes.length > 0 ? 'Map Active' : 'Standby'}
                    </span>
                </div>
            </div>

            {/* AI Assistant */}
            <AIAssistant nodes={nodes} stats={stats} />
        </div>
    );
}
