"use client";

import { Background, Controls, Panel, ReactFlow, useEdgesState, useNodesState, useReactFlow, Node, Edge, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity, Layers, Zap, Filter, Flame, Target, Eye } from "lucide-react";
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
    const [focusMode, setFocusMode] = useState(false);
    const [focusedNode, setFocusedNode] = useState<string | null>(null);
    const [impactDirection, setImpactDirection] = useState<"both" | "upstream" | "downstream">("both");
    const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
    const [complexityFilter, setComplexityFilter] = useState<"all" | "low" | "medium" | "high">("all");
    const [hotspotOnly, setHotspotOnly] = useState(false);
    const [highlightHotspots, setHighlightHotspots] = useState(true);
    const [showLegend, setShowLegend] = useState(true);

    // Blast Radius Logic
    const impactElements = useMemo(() => {
        const activeNode = focusedNode || hoveredNode;
        if (!activeNode) return { nodes: new Set(), edges: new Set() };

        const connectedNodes = new Set([activeNode]);
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

        const findUpstream = (id: string) => {
            edges.forEach(edge => {
                if (edge.target === id) {
                    connectedNodes.add(edge.source);
                    connectedEdges.add(edge.id);
                }
            });
        };

        if (impactDirection === "both" || impactDirection === "upstream") {
            findUpstream(activeNode);
        }

        if (impactDirection === "both" || impactDirection === "downstream") {
            findDownstream(activeNode);
        }
        return { nodes: connectedNodes, edges: connectedEdges };
    }, [focusedNode, hoveredNode, edges, impactDirection]);

    const hotspotIds = useMemo(() => {
        if (!stats?.topComplexFiles) return new Set<string>();
        return new Set(stats.topComplexFiles.map((file: { id: string }) => file.id));
    }, [stats]);

    const availableRoles = useMemo(() => {
        const roles = new Map<string, string>();
        nodes.forEach(node => {
            const role = node.data?.architectureRole || "Unknown";
            if (!roles.has(role)) {
                roles.set(role, node.color || node.style?.background || "#3f3f46");
            }
        });
        return Array.from(roles.entries()).map(([role, color]) => ({ role, color }));
    }, [nodes]);

    const activeNode = useMemo(() => {
        const activeId = focusedNode || hoveredNode;
        if (!activeId) return null;
        return nodes.find(node => node.id === activeId) || null;
    }, [focusedNode, hoveredNode, nodes]);

    const filteredNodes = useMemo(() => {
        return nodes.filter((node) => {
            const role = node.data?.architectureRole || "Unknown";
            const roleOk = selectedRoles.size === 0 || selectedRoles.has(role);

            const complexity = node.data?.complexity ?? 0;
            const complexityOk = complexityFilter === "all"
                || (complexityFilter === "low" && complexity <= 10)
                || (complexityFilter === "medium" && complexity > 10 && complexity <= 20)
                || (complexityFilter === "high" && complexity > 20);

            const hotspotOk = !hotspotOnly || hotspotIds.has(node.id);
            return roleOk && complexityOk && hotspotOk;
        });
    }, [nodes, selectedRoles, complexityFilter, hotspotOnly, hotspotIds]);

    const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(node => node.id)), [filteredNodes]);

    const filteredEdges = useMemo(() => {
        return edges.filter(edge => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target));
    }, [edges, filteredNodeIds]);

    const mapStats = useMemo(() => {
        const hiddenCount = Math.max(nodes.length - filteredNodes.length, 0);
        const hotspotCount = hotspotIds.size;
        const visibleEdges = filteredEdges.length;
        return { hiddenCount, hotspotCount, visibleEdges };
    }, [nodes.length, filteredNodes.length, hotspotIds, filteredEdges.length]);

    const styledNodes = useMemo(() =>
        filteredNodes.map(node => ({
            ...node,
            style: {
                ...node.style,
                opacity: (focusedNode || hoveredNode) ? (impactElements.nodes.has(node.id) ? 1 : 0.12) : 1,
                border: highlightHotspots && hotspotIds.has(node.id)
                    ? "1px solid rgba(248,113,113,0.9)"
                    : node.style?.border,
                boxShadow: highlightHotspots && hotspotIds.has(node.id)
                    ? "0 0 16px rgba(248,113,113,0.5)"
                    : node.style?.boxShadow,
            }
        })), [filteredNodes, hoveredNode, focusedNode, impactElements, highlightHotspots, hotspotIds]);

    const styledEdges = useMemo(() =>
        filteredEdges.map(edge => ({
            ...edge,
            animated: (focusedNode || hoveredNode) ? impactElements.edges.has(edge.id) : edge.animated,
            style: {
                ...edge.style,
                stroke: (focusedNode || hoveredNode) ? (impactElements.edges.has(edge.id) ? '#00f2ff' : '#27272a') : '#52525b',
                strokeWidth: (focusedNode || hoveredNode) ? (impactElements.edges.has(edge.id) ? 3 : 1) : 1.5,
                opacity: (focusedNode || hoveredNode) ? (impactElements.edges.has(edge.id) ? 1 : 0.05) : 0.6,
            }
        })), [filteredEdges, hoveredNode, focusedNode, impactElements]);

    useEffect(() => {
        if (filteredNodes.length > 0 && !isScanning) {
            setTimeout(() => fitView({ padding: 0.1, duration: 800 }), 100);
        }
    }, [filteredNodes.length, isScanning, fitView]);

    const onNodeMouseEnter = useCallback((_e: any, node: any) => setHoveredNode(node.id), []);
    const onNodeMouseLeave = useCallback(() => setHoveredNode(null), []);

    const handleNodeClick = useCallback((event: any, node: any) => {
        if (focusMode) {
            setFocusedNode(node.id);
        }
        onNodeClick(event, node);
    }, [focusMode, onNodeClick]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === "f") {
                setFocusMode(prev => !prev);
            }
            if (event.key.toLowerCase() === "h") {
                setHighlightHotspots(prev => !prev);
            }
            if (event.key.toLowerCase() === "l") {
                setShowLegend(prev => !prev);
            }
            if (event.key === "Escape") {
                setFocusedNode(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const toggleRole = (role: string) => {
        setSelectedRoles(prev => {
            const next = new Set(prev);
            if (next.has(role)) {
                next.delete(role);
            } else {
                next.add(role);
            }
            return next;
        });
    };

    return (
        <div className="relative flex-1 bg-background-primary overflow-hidden h-full">
            {nodes.length > 0 && !isScanning ? (
                <ReactFlow
                    nodes={styledNodes}
                    edges={styledEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
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

                    <Panel position="top-right" className="m-4 flex flex-col gap-3 w-72">
                        <div className="rounded border border-border-subtle bg-background-secondary/80 p-2 backdrop-blur-sm text-[10px] text-text-secondary uppercase font-bold flex items-center gap-2 shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                            {filteredNodes.length} Objects Live
                        </div>

                        <div className="rounded-lg border border-border-subtle bg-background-secondary/70 p-3 text-[10px] text-text-secondary uppercase font-bold shadow-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span>Map Intelligence</span>
                                <button
                                    onClick={() => fitView({ padding: 0.2, duration: 600 })}
                                    className="text-[9px] text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Fit View
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                                <div className="rounded border border-white/5 px-2 py-1">
                                    <span className="block text-[8px] opacity-60">Total</span>
                                    {nodes.length}
                                </div>
                                <div className="rounded border border-white/5 px-2 py-1">
                                    <span className="block text-[8px] opacity-60">Hidden</span>
                                    {mapStats.hiddenCount}
                                </div>
                                <div className="rounded border border-white/5 px-2 py-1">
                                    <span className="block text-[8px] opacity-60">Edges</span>
                                    {mapStats.visibleEdges}
                                </div>
                                <div className="rounded border border-white/5 px-2 py-1">
                                    <span className="block text-[8px] opacity-60">Hotspots</span>
                                    {mapStats.hotspotCount}
                                </div>
                            </div>
                            {activeNode && (
                                <div className="rounded border border-white/5 px-2 py-1 text-[9px] font-mono">
                                    <span className="block text-[8px] opacity-60">Active Node</span>
                                    <span className="truncate block">{activeNode.data?.label || activeNode.id}</span>
                                    <div className="flex justify-between text-[8px] opacity-70 mt-1">
                                        <span>Impact</span>
                                        <span>{impactElements.nodes.size} nodes · {impactElements.edges.size} edges</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-border-subtle bg-background-secondary/70 p-3 text-[10px] text-text-secondary uppercase font-bold shadow-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <Filter className="h-3 w-3" /> Filters
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedRoles(new Set());
                                        setComplexityFilter("all");
                                        setHotspotOnly(false);
                                    }}
                                    className="text-[9px] text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {availableRoles.map(({ role }) => {
                                    const isActive = selectedRoles.has(role) || selectedRoles.size === 0;
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => toggleRole(role)}
                                            className={`px-2 py-1 rounded border text-[9px] font-bold transition-colors ${isActive && selectedRoles.size > 0 ? "bg-accent-primary/20 border-accent-primary/30 text-accent-primary" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                        >
                                            {role}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-2">
                                {(["all", "low", "medium", "high"] as const).map((tier) => (
                                    <button
                                        key={tier}
                                        onClick={() => setComplexityFilter(tier)}
                                        className={`px-2 py-1 rounded border text-[9px] font-bold transition-colors ${complexityFilter === tier ? "bg-yellow-500/20 border-yellow-400/40 text-yellow-300" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setHotspotOnly(prev => !prev)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold transition-colors ${hotspotOnly ? "bg-red-500/20 border-red-400/40 text-red-300" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                >
                                    <Flame className="h-3 w-3" /> Hotspots only
                                </button>
                                <button
                                    onClick={() => setHighlightHotspots(prev => !prev)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold transition-colors ${highlightHotspots ? "bg-red-500/10 border-red-400/30 text-red-200" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                >
                                    <Eye className="h-3 w-3" /> Highlight
                                </button>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border-subtle bg-background-secondary/70 p-3 text-[10px] text-text-secondary uppercase font-bold shadow-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target className="h-3 w-3" /> Focus / Trace
                                </div>
                                <button
                                    onClick={() => setFocusMode(prev => !prev)}
                                    className={`px-2 py-1 rounded border text-[9px] font-bold transition-colors ${focusMode ? "bg-accent-primary/20 border-accent-primary/30 text-accent-primary" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                >
                                    {focusMode ? "On" : "Off"}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {(["both", "upstream", "downstream"] as const).map((direction) => (
                                    <button
                                        key={direction}
                                        onClick={() => setImpactDirection(direction)}
                                        className={`px-2 py-1 rounded border text-[9px] font-bold transition-colors ${impactDirection === direction ? "bg-accent-primary/20 border-accent-primary/30 text-accent-primary" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                    >
                                        {direction}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-text-secondary">
                                <span>{focusedNode ? "Focused" : "No focus"}</span>
                                {focusedNode && (
                                    <button
                                        onClick={() => setFocusedNode(null)}
                                        className="text-[9px] text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="rounded-lg border border-border-subtle bg-background-secondary/70 p-3 text-[10px] text-text-secondary uppercase font-bold shadow-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span>Quick Actions</span>
                                <button
                                    onClick={() => {
                                        setSelectedRoles(new Set());
                                        setComplexityFilter("all");
                                        setHotspotOnly(false);
                                        setFocusedNode(null);
                                    }}
                                    className="text-[9px] text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setImpactDirection("upstream")}
                                    className="px-2 py-1 rounded border border-white/5 text-[9px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Upstream
                                </button>
                                <button
                                    onClick={() => setImpactDirection("downstream")}
                                    className="px-2 py-1 rounded border border-white/5 text-[9px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Downstream
                                </button>
                                <button
                                    onClick={() => setImpactDirection("both")}
                                    className="px-2 py-1 rounded border border-white/5 text-[9px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Both
                                </button>
                            </div>
                        </div>
                    </Panel>

                    <Panel position="bottom-right" className="m-8 flex flex-col items-end gap-4">
                        <button
                            onClick={() => setShowLegend(prev => !prev)}
                            className="flex items-center gap-3 px-4 py-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-border-subtle rounded-full text-[11px] font-bold text-text-secondary transition-all"
                        >
                            <Layers className="w-4 h-4" /> {showLegend ? "Hide" : "Show"} Legend
                        </button>
                        <button
                            onClick={() => onLayoutChange?.(currentLayout || { direction: 'TB', edgeType: 'smoothstep' })}
                            className="flex items-center gap-3 px-4 py-2.5 bg-accent-primary/10 hover:bg-accent-primary/20 backdrop-blur-md border border-accent-primary/30 rounded-full text-[11px] font-bold text-accent-primary transition-all hover:shadow-[0_0_20px_#00f2ff33] group"
                        >
                            <Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Re-Layout Map
                        </button>
                    </Panel>

                    {showLegend && (
                        <Panel position="bottom-left" className="mb-24 ml-6">
                            <div className="rounded-xl border border-border-subtle bg-background-secondary/80 p-3 backdrop-blur-md shadow-2xl w-64 space-y-3 text-[10px] text-text-secondary">
                                <div className="flex items-center justify-between uppercase font-bold tracking-widest">
                                    <span>Legend</span>
                                    <span className="text-[9px]">Shortcuts</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableRoles.map(({ role, color }) => (
                                        <button
                                            key={role}
                                            onClick={() => toggleRole(role)}
                                            className="flex items-center gap-2 px-2 py-1 rounded border border-white/5 hover:border-white/20 transition-colors text-left"
                                        >
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                                            <span className="truncate">{role}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-1 text-[9px] uppercase tracking-widest opacity-70">
                                    <span>F: Toggle Focus</span>
                                    <span>H: Hotspot Highlight</span>
                                    <span>L: Legend</span>
                                    <span>Esc: Clear Focus</span>
                                </div>
                            </div>
                        </Panel>
                    )}
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
