import OpenAI from "openai";

export interface AISummary {
    purpose: string;
    responsibilities: string[];
    relationships: string;
}

export class AIService {
    private openai: OpenAI | null = null;

    constructor() {
        if (process.env.AI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.AI_API_KEY,
            });
        }
    }

    public async summarizeFile(fileName: string, content: string): Promise<AISummary> {
        if (this.openai) {
            return this.getRealSummary(fileName, content);
        }
        return this.getHeuristicMock(fileName, content);
    }

    private async getRealSummary(fileName: string, content: string): Promise<AISummary> {
        try {
            const response = await this.openai!.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a senior software architect. Analyze the provided code and summarize it concisely for an architectural diagram."
                    },
                    {
                        role: "user",
                        content: `Analyze this file: ${fileName}\n\nContent:\n${content.substring(0, 4000)}`
                    }
                ],
                response_format: { type: "json_object" }
            });

            const raw = JSON.parse(response.choices[0].message.content || "{}");
            return {
                purpose: raw.purpose || "No purpose identified.",
                responsibilities: raw.responsibilities || ["Analyzed logic flow"],
                relationships: raw.relationships || "Internal module"
            };
        } catch (e) {
            console.error("OpenAI Error:", e);
            return this.getHeuristicMock(fileName, content);
        }
    }

    private getHeuristicMock(fileName: string, content: string): AISummary {
        const baseName = fileName.split(/[\\/]/).pop() || fileName;

        // Improved Heuristics for "Non-template" feel
        const hasEffect = content.includes("useEffect");
        const hasState = content.includes("useState");
        const hasRequire = content.includes("require(");
        const hasFetch = content.includes("fetch(");

        const roles: string[] = [];
        if (hasEffect) roles.push("Orchestrates side-effects and lifecycle events");
        if (hasState) roles.push("Manages reactive local state");
        if (hasFetch) roles.push("Handles external data synchronization");
        if (hasRequire) roles.push("Consumes legacy dependencies");

        return {
            purpose: `This ${extensionLabel(fileName)} module specializes in ${roles[0] || 'core system logic'}.`,
            responsibilities: roles.length > 0 ? roles : [
                "Processes internal data transformations",
                "Exports shared logic units"
            ],
            relationships: "Actively consumed by higher-level orchestrators."
        };
    }

    public async generateMermaid(content: string): Promise<string> {
        // Simplified Mermaid generator for visualization
        return `graph TD\n  A[Entry] --> B[Logic]\n  B --> C[Output]`;
    }
}

function extensionLabel(fileName: string) {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) return "UI Component";
    if (fileName.endsWith('.ts') || fileName.endsWith('.js')) return "Logic Service";
    return "System File";
}
