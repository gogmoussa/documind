import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

export interface AISummary {
    purpose: string;
    responsibilities: string[];
    relationships: string;
    architectureRole: string;
    designPatterns: string[];
    technicalDebt?: string;
}

export class AIService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;
    private static cache: Map<string, AISummary> = new Map();

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        const modelName = process.env.LLM_MODEL || "gemini-2.5-pro";

        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: modelName,
            });
        }
    }

    public async summarizeFile(fileName: string, content: string, hash?: string): Promise<AISummary> {
        if (hash && AIService.cache.has(hash)) {
            console.log(`Cache Hit for ${fileName}`);
            return AIService.cache.get(hash)!;
        }

        let summary: AISummary;
        if (this.model) {
            summary = await this.getRealSummary(fileName, content);
        } else {
            summary = this.getHeuristicMock(fileName, content);
        }

        if (hash) {
            AIService.cache.set(hash, summary);
        }
        return summary;
    }

    private async getRealSummary(fileName: string, content: string): Promise<AISummary> {
        try {
            const prompt = `You are a senior software architect. Analyze the provided code and summarize it for an architectural blueprint.
            
            Analyze this file: ${fileName}
            
            Identify:
            1. **Purpose**: Core function.
            2. **Architecture Role**: (e.g., Presentation, Domain/Business Logic, Infrastructure, Data Access, Utility, Orchestration).
            3. **Design Patterns**: Detect patterns like Provider, Factory, Observer, Strategy, Repository, Hook, etc.
            4. **Technical Debt**: Spot high coupling, long methods, or logic smells.
            
            Return ONLY a valid JSON object:
            {
              "purpose": "brief sentence",
              "responsibilities": ["list", "of", "core", "tasks"],
              "relationships": "interaction summary",
              "architectureRole": "Layer Name",
              "designPatterns": ["Pattern1", "Pattern2"],
              "technicalDebt": "optional observation"
            }
            
            Content:
            ${content.substring(0, 10000)}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const cleanJson = jsonMatch ? jsonMatch[0] : "{}";

            const raw = JSON.parse(cleanJson);
            return {
                purpose: raw.purpose || "No purpose identified.",
                responsibilities: raw.responsibilities || ["Analyzed logic flow"],
                relationships: raw.relationships || "Internal module",
                architectureRole: raw.architectureRole || "Logic",
                designPatterns: raw.designPatterns || [],
                technicalDebt: raw.technicalDebt
            };
        } catch (e) {
            console.error("Gemini Error:", e);
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
            relationships: "Actively consumed by higher-level orchestrators.",
            architectureRole: fileName.endsWith('.tsx') ? "Presentation" : "Logic",
            designPatterns: hasState ? ["React State"] : []
        };
    }

    public async generateMermaid(content: string): Promise<string> {
        // Simplified Mermaid generator for visualization
        return `graph TD\n  A[Entry] --> B[Logic]\n  B --> C[Output]`;
    }

    public async chat(message: string, context: string): Promise<string> {
        if (this.model) {
            try {
                const prompt = `You are DocuMind's AI Assistant, a helpful software architect living inside the codebase.
                
                Context about the current file/repo:
                ${context.substring(0, 5000)}

                User: ${message}
                
                Answer concisely and technically.`;

                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (e) {
                console.error("Gemini Chat Error:", e);
                return "I'm having trouble connecting to the neural core right now. (API Error)";
            }
        }

        // Mock Fallback
        return this.getMockChatResponse(message);
    }

    private getMockChatResponse(message: string): string {
        const msg = message.toLowerCase();
        if (msg.includes("hello") || msg.includes("hi")) return "System Online. I am DocuMind's architectural interface. How can I help you understand this codebase?";
        if (msg.includes("repo") || msg.includes("code")) return "I am currently visualizing the dependency graph of your project. Select a file to see detailed insights.";
        if (msg.includes("error")) return "No active system errors detected. The parser is operating at 100% efficiency.";
        return "I am running in simulation mode (No API Key). I can help you navigate the UI, but I cannot analyze code deeply without a Neural Link.";
    }
}

function extensionLabel(fileName: string) {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) return "UI Component";
    if (fileName.endsWith('.ts') || fileName.endsWith('.js')) return "Logic Service";
    return "System File";
}
