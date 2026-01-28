"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Terminal, Cpu, Share2, Layers, Search, Play,
    Activity, Database, Code2, AlertCircle, FileCode
} from "lucide-react";
import {
    ReactFlow,
    Background,
    Controls,
    Panel,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    ReactFlowProvider,
    useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export default function Home() {
    return (
        <ReactFlowProvider>
            <DocuMindApp />
        </ReactFlowProvider>
    );
}

function DocuMindApp() {
    const [repoPath, setRepoPath] = useState("");
    const { fitView } = useReactFlow();
    const [isScanning, setIsScanning] = useState(false);
    const [scanStep, setScanStep] = useState("");
    const [scanPercent, setScanPercent] = useState(0);
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleScan = async () => {
        if (!repoPath) return;

        // Block URLs
        if (repoPath.startsWith("http")) {
            setError("DocuMind requires a LOCAL directory path (e.g., C:\\Projects\\my-app). URL-based scanning is not supported yet.");
            return;
        }

        setIsScanning(true);
        setError(null);
        setScanPercent(10);
        setScanStep("Initializing Parser...");

        try {
            // Artificial progress steps for UX
            const progressRef = { current: 10 };
            const interval = setInterval(() => {
                if (progressRef.current < 90) {
                    progressRef.current += Math.random() * 5;
                    setScanPercent(Math.floor(progressRef.current));
                    if (progressRef.current > 30 && progressRef.current < 60) setScanStep("Analyzing AST...");
                    if (progressRef.current > 60) setScanStep("Mapping Dependencies...");
                }
            }, 300);

            const response = await fetch("/api/scan", {
                method: "POST",
                body: JSON.stringify({ path: repoPath }),
            });

            const data = await response.json();
            clearInterval(interval);
            setScanPercent(100);

            if (data.error) {
                setError(data.error);
                return;
            }

            if (data.nodes && data.nodes.length > 0) {
                setScanStep("Optimizing Hierarchy...");

                const folders = data.nodes.filter((n: any) => n.type === "folder");
                const files = data.nodes.filter((n: any) => n.type === "file");

                // 1. Layout Folders in a Grid
                const folderNodes = folders.map((f: any, i: number) => ({
                    id: f.id,
                    type: 'group', // React Flow group type
                    data: { label: f.label, ...f },
                    position: { x: (i % 3) * 600, y: Math.floor(i / 3) * 500 },
                    style: {
                        width: 500,
                        height: 400,
                        backgroundColor: 'rgba(0, 242, 255, 0.02)',
                        border: '1px dashed rgba(0, 242, 255, 0.2)',
                        borderRadius: '12px',
                    }
                }));

                // 2. Layout Files (either inside folders or floating)
                const fileNodes = files.map((f: any, i: number) => {
                    const isInside = !!f.parentId;
                    const folderIndex = folders.findIndex((fold: any) => fold.id === f.parentId);

                    // Simple local offset inside folder
                    const localX = (i % 2) * 220 + 40;
                    const localY = Math.floor((i % 10) / 2) * 80 + 60;

                    return {
                        id: f.id,
                        parentId: f.parentId,
                        extent: f.parentId ? 'parent' : undefined,
                        position: f.parentId
                            ? { x: localX, y: localY }
                            : { x: 1000 + (i % 5) * 200, y: (i / 5) * 150 },
                        data: { label: f.label, ...f },
                        style: {
                            background: f.color || '#141416',
                            color: '#ffffff',
                            border: `2px solid ${f.color ? 'rgba(255,255,255,0.2)' : '#242426'}`,
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600',
                            width: 180,
                            height: 50,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                            padding: '8px'
                        }
                    };
                });

                const flowEdges = data.edges.map((edge: any) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    animated: true,
                    type: 'smoothstep',
                    style: { stroke: '#00f2ff', strokeWidth: 2, opacity: 0.4 },
                }));

                setNodes([...folderNodes, ...fileNodes]);
                setEdges(flowEdges);

                setTimeout(() => {
                    fitView({ padding: 0.1, duration: 1500 });
                }, 200);
            } else {
                setError("No source files found in the specified directory.");
            }
        } catch (error: any) {
            console.error("Scan failed:", error);
            setError(error.message || "An unexpected error occurred.");
        } finally {
            setTimeout(() => {
                setIsScanning(false);
                setScanPercent(0);
                setScanStep("");
            }, 500);
        }
    };

    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summaryData, setSummaryData] = useState<any>(null);

    const onNodeClick = async (_: any, node: any) => {
        setSelectedFile(node.data);
        setIsSummarizing(true);
        setSummaryData(null);

        try {
            const response = await fetch("/api/summarize", {
                method: "POST",
                body: JSON.stringify({ filePath: node.id }),
            });
            const data = await response.json();
            setSummaryData(data);
        } catch (error) {
            console.error("Failed to fetch summary:", error);
        } finally {
            setIsSummarizing(false);
        }
    };

    return (
        <main className="flex h-screen flex-col bg-background-primary overflow-hidden">
            {/* Header */}
            <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-background-secondary/80 px-8 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent-primary border border-accent-secondary border-glow">
                        <Cpu className="h-5 w-5 text-background-primary" />
                    </div>
                    <h1 className="font-display text-xl font-bold tracking-tight text-glow uppercase">DOCUMIND</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 rounded-md bg-background-primary border border-border-subtle px-3 py-1.5 focus-within:border-accent-primary transition-colors">
                        <Search className="h-4 w-4 text-text-secondary" />
                        <input
                            type="text"
                            value={repoPath}
                            onChange={(e) => setRepoPath(e.target.value)}
                            placeholder="Absolute LOCAL path (e.g. C:\Projects\repo)..."
                            className="bg-transparent text-sm outline-none placeholder:text-text-secondary w-80 text-text-primary"
                        />
                    </div>
                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className="flex items-center gap-2 rounded-md bg-accent-primary px-4 py-1.5 text-sm font-bold text-background-primary transition-all hover:brightness-110 border-glow disabled:opacity-50"
                    >
                        {isScanning ? <Activity className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                        {isScanning ? "SCANNING..." : "SCAN REPO"}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Command Center */}
                <aside className="w-64 border-r border-border-subtle bg-background-secondary/50 p-6 z-10 overflow-y-auto">
                    <div className="space-y-8">
                        <section>
                            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                                <Database className="h-3 w-3" />
                                Index
                            </h2>
                            <div className="space-y-1">
                                {nodes.length > 0 ? nodes.slice(0, 20).map((node) => (
                                    <div
                                        key={node.id}
                                        onClick={() => onNodeClick(null, node)}
                                        className="flex items-center gap-2 text-[11px] text-text-secondary hover:text-accent-primary cursor-pointer transition-colors px-2 py-1.5 rounded hover:bg-white/5 truncate"
                                    >
                                        <FileCode className="h-3 w-3 shrink-0" />
                                        {node.data.label}
                                    </div>
                                )) : (
                                    <p className="text-[10px] text-text-secondary italic px-2">No files scanned</p>
                                )}
                            </div>
                        </section>
                    </div>
                </aside>

                {/* Viewport - React Flow */}
                <div className="relative flex-1 bg-background-primary overflow-hidden h-full">
                    {nodes.length > 0 && !isScanning ? (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onNodeClick={onNodeClick}
                            fitView
                        >
                            <Background color="#1px solid #242426" gap={32} size={1} />
                            <Controls className="bg-background-secondary border-border-subtle fill-text-primary" />
                            <Panel position="top-right">
                                <div className="rounded border border-border-subtle bg-background-secondary/80 p-2 backdrop-blur-sm text-[10px] text-text-secondary uppercase font-bold">
                                    {nodes.length} Components Detected
                                </div>
                            </Panel>
                        </ReactFlow>
                    ) : (
                        <div className="flex h-full items-center justify-center p-12">
                            <div className="text-center w-full max-w-md">
                                {isScanning ? (
                                    <div className="space-y-6">
                                        <div className="relative mx-auto h-32 w-32">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 rounded-full border-4 border-accent-primary border-t-transparent shadow-[0_0_20px_rgba(0,242,255,0.3)]"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xl font-bold font-display text-accent-primary">{scanPercent}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="mb-2 font-display text-lg font-bold text-text-primary uppercase tracking-widest">{scanStep}</h3>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
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
                                    >
                                        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent-primary border-t-transparent opacity-10" />
                                        <h3 className="mb-2 font-display text-lg font-bold text-text-primary uppercase tracking-widest">
                                            {error ? "SCAN ERROR" : "ENGINE IDLE"}
                                        </h3>
                                        <p className="text-sm text-text-secondary">
                                            {error ? error : "Enter a local directory path and run \"SCAN REPO\" to generate a visual architectural map."}
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Logic Inspector - Slide out Panel */}
                    <AnimatePresence>
                        {selectedFile && (
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 20 }}
                                className="absolute top-0 right-0 h-full w-96 border-l border-border-subtle bg-background-secondary/95 backdrop-blur-xl p-8 z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
                            >
                                <div className="flex h-full flex-col">
                                    <header className="mb-8">
                                        <button
                                            onClick={() => setSelectedFile(null)}
                                            className="mb-4 text-xs text-text-secondary hover:text-white flex items-center gap-1"
                                        >
                                            ← Back to Map
                                        </button>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-accent-primary/10 rounded border border-accent-primary/20">
                                                <Code2 className="h-5 w-5 text-accent-primary" />
                                            </div>
                                            <h2 className="text-xl font-bold font-display truncate">{selectedFile.label}</h2>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-text-secondary">
                                                {(selectedFile.fileSize / 1024).toFixed(1)} KB
                                            </span>
                                            <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-text-secondary">
                                                HASH: {selectedFile.hash.substring(0, 8)}
                                            </span>
                                        </div>
                                    </header>

                                    <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                        <section>
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-accent-primary mb-3">AI Intelligence</h3>
                                            <div className="p-4 rounded bg-background-primary border border-border-subtle min-h-[100px] flex flex-col justify-center">
                                                {isSummarizing ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Activity className="h-4 w-4 animate-spin text-accent-primary" />
                                                        <span className="text-[10px] text-text-secondary uppercase">Analyzing Logic...</span>
                                                    </div>
                                                ) : summaryData ? (
                                                    <p className="text-sm text-text-secondary italic">
                                                        &quot;{summaryData.purpose}&quot;
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-text-secondary italic">Could not analyze file.</p>
                                                )}
                                            </div>
                                        </section>

                                        {summaryData && (
                                            <section>
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Architectural Role</h3>
                                                <ul className="space-y-2 text-sm text-text-secondary">
                                                    {summaryData.responsibilities.map((resp: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <span className="mt-1.5 h-1 w-1 rounded-full bg-accent-primary" />
                                                            {resp}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}
                                    </div>

                                    <footer className="mt-auto pt-8 border-t border-border-subtle">
                                        <button className="w-full flex items-center justify-center gap-2 rounded bg-white py-2 text-sm font-bold text-background-primary hover:bg-accent-primary transition-all">
                                            <Share2 className="h-4 w-4" />
                                            EXPORT DOCUMENTATION
                                        </button>
                                    </footer>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>


                    {/* Legend / Status Overlay */}
                    <div className="absolute bottom-12 left-12 flex gap-6 rounded-md border border-border-subtle bg-background-secondary/80 p-4 backdrop-blur-md z-10">
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${nodes.length > 0 ? 'bg-accent-primary animate-pulse' : 'bg-text-secondary'}`} />
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-tighter">
                                {nodes.length > 0 ? 'Map Synchronized' : 'Scanner Ready'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-status-success shadow-[0_0_8px_#00ff99]" />
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-tighter">AI Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
