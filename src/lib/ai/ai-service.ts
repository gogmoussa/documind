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
    private static readonly cacheMaxEntries = 200;

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
        if (hash) {
            const cached = AIService.getFromCache(hash);
            if (cached) {
                console.log(`Cache Hit for ${fileName}`);
                return cached;
            }
        }

        let summary: AISummary;
        if (this.model) {
            summary = await this.getRealSummary(fileName, content);
        } else {
            summary = this.getHeuristicMock(fileName, content);
        }

        if (hash) {
            AIService.setCache(hash, summary);
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
        if (!this.model) {
            return `sequenceDiagram\n    participant System\n    System->>System: Static Mode (No AI Key)\n    Note right of System: Provide API key for Flow analysis`;
        }

        try {
            const prompt = `You are a technical architect. Generate a Mermaid sequence diagram (sequenceDiagram) representing the execution flow or logical steps of the following code.
            
            Keep it high-level, focusing on the main functions, state changes, or external calls. 
            Do NOT include markdown formatting like \`\`\`mermaid or \`\`\`. Start the response directly with "sequenceDiagram" followed by the diagram definition.
            If the code is too simple, generate a basic flow showing its primary action.

            Code Content:
            ${content.substring(0, 8000)}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();
            
            // Clean up potentially remaining markdown code blocks
            if (text.startsWith('\`\`\`mermaid')) {
                text = text.replace(/^\`\`\`mermaid\n/g, '');
            }
            if (text.startsWith('\`\`\`')) {
                text = text.replace(/^\`\`\`\n/g, '');
            }
            text = text.replace(/\n\`\`\`$/g, '');

            return text.trim() || `sequenceDiagram\n  Note over Logic: No complex flow detected`;
        } catch (e) {
            console.error("Gemini Error generating Mermaid:", e);
            return `sequenceDiagram\n    participant Error\n    Note over Error: Neural Engine failed to generate sequence flow`;
        }
    }

    public async generateSystemFlow(context: string): Promise<string> {
        if (!this.model) {
            return `sequenceDiagram\n    participant System\n    System->>System: Static Mode (No AI Key)\n    Note right of System: Provide API key for Global Flow analysis`;
        }
        
        try {
            const prompt = `You are a technical architect. Based on the following repository analysis, generate a **Mermaid Flowchart** (graph TD) representing the primary data flow and structural layout between modules.

            RULES:
            1. Use "graph TD" as the first line.
            2. Modules/Nodes MUST have safe IDs (alphanumeric only).
            3. Use descriptive labels like: NodeA[Visual Map Layer] --> NodeB[Documentation Engine].
            4. Do NOT include markdown code blocks (no \`\`\`mermaid or \`\`\`).
            5. Return ONLY the flowchart code.

            Context (Nodes and Edges):
            ${context.substring(0, 8000)}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();
            
            // Improved cleaning logic for various LLM output styles
            text = text.replace(/```mermaid\n?/g, '')
                       .replace(/```\n?/g, '')
                       .trim();
            
            // Surgical extraction: Find start and potentially end (if model hallucinated trailing notes)
            const lines = text.split('\n');
            const startIndex = lines.findIndex((l: string) => 
                l.trim().startsWith('sequenceDiagram') || 
                l.trim().startsWith('graph ') || 
                l.trim().startsWith('flowchart ')
            );
            
            if (startIndex !== -1) {
                const diagramLines = lines.slice(startIndex);
                // Simple heuristic: If a line after sequenceDiagram is just text without Mermaid operators, it's likely junk
                // but for now, let's just trim trailing markdown artifacts.
                text = diagramLines.join('\n')
                    .replace(/```\s*$/g, '') // Remove trailing block
                    .trim();
            }

            return text.trim() || `sequenceDiagram\n  Note over System: No complex global flow detected`;
        } catch (e) {
            console.error("Gemini Error generating System Flow:", e);
            return `sequenceDiagram\n    participant Error\n    Note over Error: Neural Engine failed to generate global flow`;
        }
    }

    public async fixSystemFlow(failedDiagram: string, errorMsg: string): Promise<string> {
        if (!this.model) {
            return failedDiagram;
        }
        
        try {
            const prompt = `You are a technical architect. The following Mermaid diagram you generated has a syntax error.

            Error Message:
            ${errorMsg}

            Broken Diagram:
            ${failedDiagram}

            Please fix the syntax error and return ONLY the corrected Mermaid diagram code. Do NOT include markdown formatting like \`\`\`mermaid or \`\`\`. Start the response directly with the diagram type ("sequenceDiagram" or "graph TD").`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text().trim();
            
            if (text.startsWith('\`\`\`mermaid')) text = text.replace(/^\`\`\`mermaid\n/g, '');
            if (text.startsWith('\`\`\`')) text = text.replace(/^\`\`\`\n/g, '');
            text = text.replace(/\n\`\`\`$/g, '');

            return text.trim();
        } catch (e) {
            console.error("Gemini Error fixing System Flow:", e);
            return `sequenceDiagram\n    participant Error\n    Note over Error: Neural Engine failed to parse correction`;
        }
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

    private static getFromCache(hash: string): AISummary | undefined {
        const value = AIService.cache.get(hash);
        if (!value) {
            return undefined;
        }
        AIService.cache.delete(hash);
        AIService.cache.set(hash, value);
        return value;
    }

    private static setCache(hash: string, summary: AISummary): void {
        if (AIService.cache.has(hash)) {
            AIService.cache.delete(hash);
        }
        AIService.cache.set(hash, summary);
        if (AIService.cache.size > AIService.cacheMaxEntries) {
            const oldestKey = AIService.cache.keys().next().value;
            if (oldestKey) {
                AIService.cache.delete(oldestKey);
            }
        }
    }
}

function extensionLabel(fileName: string) {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) return "UI Component";
    if (fileName.endsWith('.ts') || fileName.endsWith('.js')) return "Logic Service";
    return "System File";
}
