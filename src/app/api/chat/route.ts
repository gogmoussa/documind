import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai/ai-service";

export async function POST(req: NextRequest) {
    try {
        const { message, context } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "No message provided" }, { status: 400 });
        }

        const aiService = new AIService();
        const response = await aiService.chat(message, context || "");

        return NextResponse.json({ response });
    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
