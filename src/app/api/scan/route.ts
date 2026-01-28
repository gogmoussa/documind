import { NextRequest, NextResponse } from "next/server";
import { CodeParser } from "@/lib/parser/code-parser";

export async function POST(req: NextRequest) {
    try {
        const { path: dirPath } = await req.json();

        if (!dirPath) {
            return NextResponse.json({ error: "No path provided" }, { status: 400 });
        }

        const parser = new CodeParser();
        const graph = await parser.parseDirectory(dirPath);

        return NextResponse.json(graph);
    } catch (error: any) {
        console.error("Scan Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
