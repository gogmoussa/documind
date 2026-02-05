"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Zap, ShieldCheck, Box, Code, FileText } from "lucide-react";

export interface ArchitectureNodeData {
    label: string;
    type: "file" | "folder";
    complexity?: number;
    architectureRole?: string;
    designPatterns?: string[];
    color?: string;
}

export function ArchitectureNode({ data, selected }: any) {
    const nodeData = data as ArchitectureNodeData;
    const isHighComplexity = (nodeData.complexity || 0) > 20;
    const isMidComplexity = (nodeData.complexity || 0) > 10;

    const getComplexityColor = () => {
        if (isHighComplexity) return "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
        if (isMidComplexity) return "border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]";
        return "border-accent-primary/30";
    };

    const getRoleIcon = () => {
        const role = nodeData.architectureRole?.toLowerCase() || "";
        if (role.includes("presentation") || role.includes("ui")) return <FileText className="h-3 w-3 text-cyan-400" />;
        if (role.includes("logic") || role.includes("domain")) return <ShieldCheck className="h-3 w-3 text-purple-400" />;
        if (role.includes("infra") || role.includes("data")) return <Box className="h-3 w-3 text-green-400" />;
        return <Code className="h-3 w-3 text-accent-primary" />;
    };

    return (
        <div className={`relative min-w-[180px] p-3 rounded-lg bg-background-secondary border-2 transition-all ${getComplexityColor()} ${selected ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-background-primary scale-105' : 'opacity-90'}`}>
            {/* Complexity Indicator (Ring/Glow) */}
            {isHighComplexity && (
                <div className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full animate-pulse z-10 shadow-lg">
                    <Zap className="h-3 w-3 text-white fill-current" />
                </div>
            )}

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        {getRoleIcon()}
                        <span className="text-[10px] font-bold text-text-primary truncate font-mono tracking-tight">
                            {nodeData.label}
                        </span>
                    </div>
                    {nodeData.complexity !== undefined && (
                        <span className={`text-[8px] font-bold px-1 rounded ${isHighComplexity ? 'text-red-400' : 'text-text-secondary opacity-60'}`}>
                            CPX:{nodeData.complexity}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-1">
                    {nodeData.designPatterns?.slice(0, 3).map((pattern: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/20 rounded text-[7px] font-bold uppercase tracking-tighter">
                            {pattern}
                        </span>
                    ))}
                    {nodeData.architectureRole && (
                        <span className="px-1.5 py-0.5 bg-white/5 text-text-secondary border border-white/10 rounded text-[7px] font-bold uppercase">
                            {nodeData.architectureRole}
                        </span>
                    )}
                </div>
            </div>

            {/* Interaction Handles */}
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-accent-primary !border-none" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-accent-primary !border-none" />
        </div>
    );
}
