import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai/ai-service";

export async function POST(req: NextRequest) {
    try {
        const { context, failedDiagram, errorMsg } = await req.json();

        const aiService = new AIService();
        let diagram;
        
        if (failedDiagram && errorMsg) {
            diagram = await aiService.fixSystemFlow(failedDiagram, errorMsg);
        } else {
            diagram = await aiService.generateSystemFlow(context || "");
        }

        return NextResponse.json({ diagram });
    } catch (error: any) {
        console.error("Global Flow API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
