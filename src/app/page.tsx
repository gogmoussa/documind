"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { VisualMap } from "@/components/VisualMap";
import { DocumentationPanel } from "@/components/DocumentationPanel";

import { getLayoutedElements } from "@/lib/layout";

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
    const [summaryData, setSummaryData] = useState<any>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
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
        setNodes([]);
        setEdges([]);

        try {
            // Artificial progress steps for UX
            const progressRef = { current: 10 };
            const interval = setInterval(() => {
                if (progressRef.current < 90) {
                    progressRef.current += Math.random() * 5;
                    setScanPercent(Math.floor(progressRef.current));
                    if (progressRef.current > 30 && progressRef.current < 60) setScanStep("Analyzing AST & Logic...");
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
                setScanStep("Calculating Graph Layout...");

                const rawNodes = data.nodes.map((n: any) => ({
                    id: n.id,
                    type: n.type === 'folder' ? 'group' : undefined,
                    data: { label: n.label, ...n, ...n.data },
                    position: { x: 0, y: 0 }, // Initial position, will be set by dagre
                    style: n.type === 'folder'
                        ? {
                            width: 100, height: 100, // Dagre ignores this mostly but needs something
                            backgroundColor: 'rgba(20, 20, 22, 0.2)',
                            border: '1px dashed rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                        }
                        : {
                            background: n.color || '#141416',
                            color: '#ffffff',
                            border: `1px solid ${n.color ? 'rgba(255,255,255,0.1)' : '#242426'}`,
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: '600',
                            width: 180,
                            // height: 50, // Let height be flexible or fixed
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                            padding: '10px'
                        }
                }));

                const formatEdges = data.edges.map((edge: any) => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    animated: true,
                    type: 'smoothstep',
                    style: { stroke: '#52525b', strokeWidth: 1.5, opacity: 0.6 },
                }));

                // Apply Dagre Layout
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                    rawNodes.filter((n: any) => n.type !== 'group'), // Only layout files for now to keep it simple, or we can look into compound layout later
                    formatEdges,
                    'TB' // Top to Bottom flow
                );

                // Add folders back if we want, or just hide them for the graph view vs file view
                // For "valuable data", showing just the dependency graph of files is often clearer than boxes-in-boxes

                setNodes(layoutedNodes);
                setEdges(layoutedEdges);

                setTimeout(() => {
                    fitView({ padding: 0.2, duration: 1500 });
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

    const onNodeClick = async (_: any, node: any) => {
        if (node.type === 'group') return; // Don't summarize folders yet

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
        <main className="flex h-screen flex-col bg-background-primary overflow-hidden text-text-primary font-roboto-mono">
            <Header
                repoPath={repoPath}
                setRepoPath={setRepoPath}
                handleScan={handleScan}
                isScanning={isScanning}
            />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar nodes={nodes} onNodeClick={onNodeClick} />

                <div className="relative flex-1 bg-background-primary overflow-hidden h-full">
                    <VisualMap
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        isScanning={isScanning}
                        scanPercent={scanPercent}
                        scanStep={scanStep}
                        error={error}
                    />

                    <AnimatePresence>
                        {selectedFile && (
                            <DocumentationPanel
                                selectedFile={selectedFile}
                                summaryData={summaryData}
                                isSummarizing={isSummarizing}
                                onClose={() => setSelectedFile(null)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
}
