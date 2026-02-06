"use client";

import { Background, Controls, Panel, ReactFlow, useEdgesState, useNodesState, useReactFlow, Node, Edge, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Activity, Layers, Zap, Filter, Flame, Target, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { NodeData } from "@/types";
import { AIAssistant } from "./AIAssistant";
import { ArchitectureNode } from "./ArchitectureNode";
import { getLayoutedElements } from "@/lib/layout";

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
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
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
    currentLayout,
    searchTerm,
    onSearchTermChange
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
    const [autoRelayout, setAutoRelayout] = useState(true);
    const [impactOnly, setImpactOnly] = useState(false);
    const [showConnectedOnly, setShowConnectedOnly] = useState(false);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const [minimalMode, setMinimalMode] = useState(false);
    const [openSections, setOpenSections] = useState({
        intelligence: true,
        filters: true,
        focus: true,
        quickActions: true
    });

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
        const roles = new Map<string, { color: string; count: number }>();
        nodes.forEach(node => {
            const role = node.data?.architectureRole || "Unknown";
            const existing = roles.get(role);
            if (!existing) {
                roles.set(role, {
                    color: node.color || node.style?.background || "#3f3f46",
                    count: 1
                });
            } else {
                roles.set(role, { ...existing, count: existing.count + 1 });
            }
        });
        return Array.from(roles.entries()).map(([role, value]) => ({ role, ...value }));
    }, [nodes]);

    const activeNode = useMemo(() => {
        const activeId = focusedNode || hoveredNode;
        if (!activeId) return null;
        return nodes.find(node => node.id === activeId) || null;
    }, [focusedNode, hoveredNode, nodes]);

    const baseFilteredNodes = useMemo(() => {
        return nodes.filter((node) => {
            const role = node.data?.architectureRole || "Unknown";
            const roleOk = selectedRoles.size === 0 || selectedRoles.has(role);

            const complexity = node.data?.complexity ?? 0;
            const complexityOk = complexityFilter === "all"
                || (complexityFilter === "low" && complexity <= 10)
                || (complexityFilter === "medium" && complexity > 10 && complexity <= 20)
                || (complexityFilter === "high" && complexity > 20);

            const hotspotOk = !hotspotOnly || hotspotIds.has(node.id);
            const label = (node.data?.label || node.id || "").toLowerCase();
            const searchOk = !searchTerm.trim() || label.includes(searchTerm.trim().toLowerCase());
            const impactOk = !impactOnly || impactElements.nodes.has(node.id);
            return roleOk && complexityOk && hotspotOk && searchOk && impactOk;
        });
    }, [nodes, selectedRoles, complexityFilter, hotspotOnly, hotspotIds, searchTerm, impactOnly, impactElements.nodes]);

    const baseFilteredNodeIds = useMemo(() => new Set(baseFilteredNodes.map(node => node.id)), [baseFilteredNodes]);

    const filteredEdges = useMemo(() => {
        return edges.filter(edge => baseFilteredNodeIds.has(edge.source) && baseFilteredNodeIds.has(edge.target));
    }, [edges, baseFilteredNodeIds]);

    const connectedNodeIds = useMemo(() => {
        const connected = new Set<string>();
        filteredEdges.forEach(edge => {
            connected.add(edge.source);
            connected.add(edge.target);
        });
        return connected;
    }, [filteredEdges]);

    const filteredNodes = useMemo(() => {
        if (!showConnectedOnly) return baseFilteredNodes;
        return baseFilteredNodes.filter(node => connectedNodeIds.has(node.id));
    }, [baseFilteredNodes, showConnectedOnly, connectedNodeIds]);

    const mapStats = useMemo(() => {
        const hiddenCount = Math.max(nodes.length - filteredNodes.length, 0);
        const hotspotCount = hotspotIds.size;
        const visibleEdges = filteredEdges.length;
        return { hiddenCount, hotspotCount, visibleEdges };
    }, [nodes.length, filteredNodes.length, hotspotIds, filteredEdges.length]);

    const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(node => node.id)), [filteredNodes]);

    const layoutedNodes = useMemo(() => {
        if (!autoRelayout || filteredNodes.length === 0) return null;
        const { nodes: layouted } = getLayoutedElements(
            filteredNodes,
            filteredEdges.map(edge => ({ ...edge, type: currentLayout?.edgeType || "smoothstep" })),
            { direction: currentLayout?.direction || "TB", ranksep: 120, nodesep: 80 }
        );
        const positions = new Map(layouted.map(node => [node.id, node.position]));
        return positions;
    }, [autoRelayout, filteredNodes, filteredEdges, currentLayout]);

    const styledNodes = useMemo(() =>
        filteredNodes.map(node => {
            const layoutPosition = layoutedNodes?.get(node.id);
            return ({
                ...node,
                position: layoutPosition || node.position,
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
            });
        }), [filteredNodes, hoveredNode, focusedNode, impactElements, highlightHotspots, hotspotIds, layoutedNodes]);

    const styledEdges = useMemo(() =>
        filteredEdges
            .filter(edge => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target))
            .map(edge => ({
                ...edge,
                animated: (focusedNode || hoveredNode) ? impactElements.edges.has(edge.id) : edge.animated,
                style: {
                    ...edge.style,
                    stroke: (focusedNode || hoveredNode) ? (impactElements.edges.has(edge.id) ? '#00f2ff' : '#27272a') : '#52525b',
                    strokeWidth: (focusedNode || hoveredNode) ? (impactElements.edges.has(edge.id) ? 3 : 1) : 1.5,
                    opacity: (focusedNode || hoveredNode) ? (impactElements.edges.has(edge.id) ? 1 : 0.05) : 0.6,
                }
            })), [filteredEdges, filteredNodeIds, hoveredNode, focusedNode, impactElements]);

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

    useEffect(() => {
        const storedState = localStorage.getItem("documind:mapUi");
        if (!storedState) return;
        try {
            const parsed = JSON.parse(storedState);
            if (typeof parsed.rightPanelOpen === "boolean") setRightPanelOpen(parsed.rightPanelOpen);
            if (typeof parsed.showLegend === "boolean") setShowLegend(parsed.showLegend);
            if (typeof parsed.highlightHotspots === "boolean") setHighlightHotspots(parsed.highlightHotspots);
            if (typeof parsed.hotspotOnly === "boolean") setHotspotOnly(parsed.hotspotOnly);
            if (typeof parsed.impactOnly === "boolean") setImpactOnly(parsed.impactOnly);
            if (typeof parsed.showConnectedOnly === "boolean") setShowConnectedOnly(parsed.showConnectedOnly);
            if (typeof parsed.autoRelayout === "boolean") setAutoRelayout(parsed.autoRelayout);
            if (typeof parsed.minimalMode === "boolean") setMinimalMode(parsed.minimalMode);
            if (typeof parsed.complexityFilter === "string") setComplexityFilter(parsed.complexityFilter);
            if (Array.isArray(parsed.selectedRoles)) setSelectedRoles(new Set(parsed.selectedRoles));
            if (parsed.openSections) setOpenSections(parsed.openSections);
        } catch {
            // Ignore malformed state.
        }
    }, []);

    useEffect(() => {
        const state = {
            rightPanelOpen,
            showLegend,
            highlightHotspots,
            hotspotOnly,
            impactOnly,
            showConnectedOnly,
            autoRelayout,
            minimalMode,
            complexityFilter,
            selectedRoles: Array.from(selectedRoles),
            openSections
        };
        localStorage.setItem("documind:mapUi", JSON.stringify(state));
    }, [
        rightPanelOpen,
        showLegend,
        highlightHotspots,
        hotspotOnly,
        impactOnly,
        showConnectedOnly,
        autoRelayout,
        minimalMode,
        complexityFilter,
        selectedRoles,
        openSections
    ]);

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

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const filterSummary = useMemo(() => {
        const parts: string[] = [];
        if (selectedRoles.size > 0) parts.push(`Roles: ${Array.from(selectedRoles).join(", ")}`);
        if (complexityFilter !== "all") parts.push(`Complexity: ${complexityFilter}`);
        if (hotspotOnly) parts.push("Hotspots");
        if (impactOnly) parts.push("Impact");
        if (showConnectedOnly) parts.push("Links");
        if (searchTerm.trim()) parts.push(`Search: ${searchTerm.trim()}`);
        return parts;
    }, [selectedRoles, complexityFilter, hotspotOnly, impactOnly, showConnectedOnly, searchTerm]);

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

                    {filteredNodes.length === 0 && nodes.length > 0 && (
                        <Panel position="top-center" className="mt-4">
                            <div className="rounded-lg border border-border-subtle bg-background-secondary/80 px-4 py-3 text-[10px] uppercase font-bold text-text-secondary shadow-lg">
                                No results match these filters.
                                <button
                                    onClick={() => {
                                        setSelectedRoles(new Set());
                                        setComplexityFilter("all");
                                        setHotspotOnly(false);
                                        onSearchTermChange("");
                                        setImpactOnly(false);
                                        setShowConnectedOnly(false);
                                    }}
                                    className="ml-3 text-[9px] text-accent-primary hover:text-white transition-colors"
                                >
                                    Clear filters
                                </button>
                            </div>
                        </Panel>
                    )}

                    {rightPanelOpen ? (
                        <Panel position="top-right" className="m-4 flex flex-col gap-3 w-72">
                            <div className="rounded border border-border-subtle bg-background-secondary/80 p-2 backdrop-blur-sm text-[10px] text-text-secondary uppercase font-bold flex items-center justify-between gap-2 shadow-lg">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                                    {filteredNodes.length} Objects Live
                                </div>
                                <div className="flex items-center gap-2 text-[9px]">
                                    <button
                                        onClick={() => {
                                            setMinimalMode(prev => {
                                                const next = !prev;
                                                setOpenSections({
                                                    intelligence: true,
                                                    filters: !next,
                                                    focus: !next,
                                                    quickActions: !next
                                                });
                                                setShowLegend(!next);
                                                return next;
                                            });
                                        }}
                                        className="text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        {minimalMode ? "Full" : "Minimal"}
                                    </button>
                                    <button
                                        onClick={() => setRightPanelOpen(false)}
                                        className="text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        Hide
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border-subtle bg-background-secondary/70 p-3 text-[10px] text-text-secondary uppercase font-bold shadow-lg space-y-2">
                                <button
                                    onClick={() => toggleSection("intelligence")}
                                    className="flex w-full items-center justify-between text-left"
                                >
                                    <span>Map Intelligence</span>
                                    <span className="text-[9px] text-text-secondary">{openSections.intelligence ? "−" : "+"}</span>
                                </button>
                                {openSections.intelligence && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] opacity-70">Overview</span>
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
                                        <div className="flex items-center justify-between text-[9px] font-mono">
                                            <span className="opacity-60">Focus Mode</span>
                                            <span className={focusMode ? "text-accent-primary" : "text-text-secondary"}>{focusMode ? "Enabled" : "Idle"}</span>
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
                                        {filterSummary.length > 0 && (
                                            <div className="rounded border border-white/5 px-2 py-1 text-[9px] font-mono">
                                                <span className="block text-[8px] opacity-60">Filters</span>
                                                <span className="block text-text-secondary">{filterSummary.join(" · ")}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-lg border border-border-subtle bg-background-secondary/70 p-3 text-[10px] text-text-secondary uppercase font-bold shadow-lg space-y-3">
                                <button
                                    onClick={() => toggleSection("filters")}
                                    className="flex w-full items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-2 text-text-secondary">
                                        <Filter className="h-3 w-3" /> Filters
                                    </div>
                                    <span className="text-[9px] text-text-secondary">{openSections.filters ? "−" : "+"}</span>
                                </button>
                                {openSections.filters && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] opacity-70">Roles</span>
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
                                            {availableRoles.map(({ role, count }) => {
                                                const isActive = selectedRoles.has(role) || selectedRoles.size === 0;
                                                return (
                                                    <button
                                                        key={role}
                                                        onClick={() => toggleRole(role)}
                                                        className={`px-2 py-1 rounded border text-[9px] font-bold transition-colors ${isActive && selectedRoles.size > 0 ? "bg-accent-primary/20 border-accent-primary/30 text-accent-primary" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                                    >
                                                        {role} <span className="opacity-60">({count})</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="flex items-center gap-2 rounded border border-white/5 bg-background-primary/40 px-2 py-1">
                                            <span className="text-[8px] opacity-60">Search</span>
                                            <input
                                                value={searchTerm}
                                                onChange={(event) => onSearchTermChange(event.target.value)}
                                                placeholder="Filter nodes..."
                                                className="flex-1 bg-transparent text-[9px] font-mono text-text-primary outline-none placeholder:text-text-secondary/60"
                                            />
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
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setImpactOnly(prev => !prev)}
                                                className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold transition-colors ${impactOnly ? "bg-accent-primary/20 border-accent-primary/30 text-accent-primary" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                            >
                                                <Target className="h-3 w-3" /> Impact only
                                            </button>
                                            <button
                                                onClick={() => setShowConnectedOnly(prev => !prev)}
                                                className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold transition-colors ${showConnectedOnly ? "bg-accent-primary/20 border-accent-primary/30 text-accent-primary" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                            >
                                                Links only
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setAutoRelayout(prev => !prev)}
                                            className={`w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold transition-colors ${autoRelayout ? "bg-accent-primary/20 border-accent-primary/30 text-accent-primary" : "border-white/5 text-text-secondary hover:text-text-primary"}`}
                                        >
                                            Auto-layout
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="rounded-lg border border-border-subtle bg-background-secondary/70 p-3 text-[10px] text-text-secondary uppercase font-bold shadow-lg space-y-2">
                                <button
                                    onClick={() => toggleSection("focus")}
                                    className="flex w-full items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <Target className="h-3 w-3" /> Focus / Trace
                                    </div>
                                    <span className="text-[9px] text-text-secondary">{openSections.focus ? "−" : "+"}</span>
                                </button>
                                {openSections.focus && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] opacity-70">Mode</span>
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
                                        {activeNode && (
                                            <div className="flex flex-wrap gap-2 pt-1 text-[9px]">
                                                <button
                                                    onClick={() => setImpactOnly(true)}
                                                    className="px-2 py-1 rounded border border-white/5 text-text-secondary hover:text-text-primary transition-colors"
                                                >
                                                    Focus impact
                                                </button>
                                                <button
                                                    onClick={() => setImpactDirection("upstream")}
                                                    className="px-2 py-1 rounded border border-white/5 text-text-secondary hover:text-text-primary transition-colors"
                                                >
                                                    Upstream
                                                </button>
                                                <button
                                                    onClick={() => setImpactDirection("downstream")}
                                                    className="px-2 py-1 rounded border border-white/5 text-text-secondary hover:text-text-primary transition-colors"
                                                >
                                                    Downstream
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="rounded-lg border border-border-subtle bg-background-secondary/70 p-3 text-[10px] text-text-secondary uppercase font-bold shadow-lg space-y-2">
                                <button
                                    onClick={() => toggleSection("quickActions")}
                                    className="flex w-full items-center justify-between text-left"
                                >
                                    <span>Quick Actions</span>
                                    <span className="text-[9px] text-text-secondary">{openSections.quickActions ? "−" : "+"}</span>
                                </button>
                                {openSections.quickActions && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] opacity-70">Reset</span>
                                            <button
                                                onClick={() => {
                                                    setSelectedRoles(new Set());
                                                    setComplexityFilter("all");
                                                    setHotspotOnly(false);
                                                    onSearchTermChange("");
                                                    setImpactOnly(false);
                                                    setShowConnectedOnly(false);
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
                                        <button
                                            onClick={() => fitView({ padding: 0.2, duration: 600 })}
                                            className="w-full px-2 py-1 rounded border border-white/5 text-[9px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                                        >
                                            Refresh View
                                        </button>
                                    </>
                                )}
                            </div>
                        </Panel>
                    ) : (
                        <Panel position="top-right" className="m-4">
                            <button
                                onClick={() => setRightPanelOpen(true)}
                                className="rounded-full border border-border-subtle bg-background-secondary/80 px-3 py-2 text-[10px] uppercase font-bold text-text-secondary shadow-lg hover:text-text-primary transition-colors"
                            >
                                Show Panels
                            </button>
                        </Panel>
                    )}

                    {showLegend && (
                        <Panel position="bottom-left" className="mb-24 ml-6">
                            <div className="rounded-xl border border-border-subtle bg-background-secondary/80 p-3 backdrop-blur-md shadow-2xl w-64 space-y-3 text-[10px] text-text-secondary">
                                <div className="flex items-center justify-between uppercase font-bold tracking-widest">
                                    <span>Legend</span>
                                    <span className="text-[9px]">Shortcuts</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableRoles.map(({ role, color, count }) => (
                                        <button
                                            key={role}
                                            onClick={() => toggleRole(role)}
                                            className="flex items-center gap-2 px-2 py-1 rounded border border-white/5 hover:border-white/20 transition-colors text-left"
                                        >
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                                            <span className="truncate">{role}</span>
                                            <span className="ml-auto text-[9px] opacity-60">{count}</span>
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
