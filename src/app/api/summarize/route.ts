import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai/ai-service";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
    try {
        const { filePath } = await req.json();

        if (!filePath) {
            return NextResponse.json({ error: "No file path provided" }, { status: 400 });
        }

        // Check if path is a directory
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
            return NextResponse.json({
                purpose: "This is a directory container that organizes related modules.",
                responsibilities: ["Namespace management", "FileSystem grouping"],
                relationships: "Contains sub-modules and related assets.",
                diagram: "graph LR\n  Folder --> Files"
            });
        }

        // Read file content
        const content = await fs.readFile(filePath, "utf-8");

        const aiService = new AIService();
        const summary = await aiService.summarizeFile(filePath, content);
        const diagram = await aiService.generateMermaid(content);

        return NextResponse.json({ ...summary, diagram, content });
    } catch (error: any) {
        console.error("AI Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
