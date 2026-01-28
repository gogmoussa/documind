import { Project, SourceFile } from "ts-morph";
import path from "path";
import crypto from "crypto";
import fs from "fs/promises";

export interface GraphNode {
    id: string;
    label: string;
    type: "file" | "folder";
    fileSize: number;
    hash: string;
    summary?: string;
    parentId?: string;
    color?: string;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
}

export interface DependencyGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export class CodeParser {
    private project: Project;

    constructor() {
        this.project = new Project({
            compilerOptions: {
                allowJs: true,
            },
        });
    }

    public async parseDirectory(dirPath: string): Promise<DependencyGraph> {
        try {
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                throw new Error("The provided path is not a directory.");
            }
        } catch (e: any) {
            throw new Error(`Invalid path: ${e.message}`);
        }

        const normalizedDir = dirPath.replace(/\\/g, "/").replace(/\/$/, "");
        const patterns = [
            `${normalizedDir}/**/*.ts`,
            `${normalizedDir}/**/*.tsx`,
            `${normalizedDir}/**/*.js`,
            `${normalizedDir}/**/*.jsx`,
            `!${normalizedDir}/**/node_modules/**`,
            `!${normalizedDir}/**/.next/**`,
            `!${normalizedDir}/**/dist/**`,
        ];

        console.log("Scanning with patterns:", patterns);
        this.project.addSourceFilesAtPaths(patterns);

        const sourceFiles = this.project.getSourceFiles();
        console.log(`Found ${sourceFiles.length} source files.`);
        const folderMap = new Set<string>();
        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];

        for (const sourceFile of sourceFiles) {
            const filePath = sourceFile.getFilePath().replace(/\\/g, "/");
            const relativePath = path.relative(dirPath, filePath).replace(/\\/g, "/");
            const dirName = path.dirname(filePath).replace(/\\/g, "/");
            const relativeDir = path.relative(dirPath, dirName).replace(/\\/g, "/");

            // Track folders
            if (relativeDir && relativeDir !== "." && !folderMap.has(dirName)) {
                folderMap.add(dirName);
                nodes.push({
                    id: dirName,
                    label: relativeDir,
                    type: "folder",
                    fileSize: 0,
                    hash: "folder",
                    color: "#242426"
                });
            }

            const content = sourceFile.getFullText();
            const hash = crypto.createHash("md5").update(content).digest("hex");

            const extension = path.extname(filePath).toLowerCase();
            let color = '#141416'; // Default
            if (extension === '.ts' || extension === '.tsx') color = '#0066cc';
            if (extension === '.js' || extension === '.jsx') color = '#cc9900';
            if (extension === '.css') color = '#cc3399';

            nodes.push({
                id: filePath,
                label: path.basename(filePath),
                type: "file",
                fileSize: content.length,
                hash: hash,
                color: color,
                parentId: relativeDir && relativeDir !== "." ? dirName : undefined
            });
        }

        const fileList = sourceFiles.map(sf => sf.getFilePath().replace(/\\/g, "/"));

        // Second pass: Create all edges
        for (const sourceFile of sourceFiles) {
            const filePath = sourceFile.getFilePath().replace(/\\/g, "/");

            // Helper to add edges fuzzy
            const addFuzzyEdge = (specifier: string) => {
                if (!specifier.startsWith(".")) return false; // Skip node_modules

                const resolvedBase = path.resolve(path.dirname(filePath), specifier).replace(/\\/g, "/");

                // Try to find exact or with extensions
                const candidates = [
                    resolvedBase,
                    `${resolvedBase}.ts`,
                    `${resolvedBase}.tsx`,
                    `${resolvedBase}.js`,
                    `${resolvedBase}.jsx`,
                    `${resolvedBase}/index.ts`,
                    `${resolvedBase}/index.js`,
                ];

                for (const candidate of candidates) {
                    if (fileList.includes(candidate)) {
                        edges.push({
                            id: `e-fuzzy-${filePath}-${candidate}`,
                            source: filePath,
                            target: candidate,
                        });
                        console.log(`  Added fuzzy edge: ${filePath} -> ${candidate} (from specifier: ${specifier})`);
                        return true;
                    }
                }
                return false;
            };

            // 1. ES Modules Imports
            const imports = sourceFile.getImportDeclarations();
            for (const imp of imports) {
                const specifier = imp.getModuleSpecifierValue();
                const resolvedFile = imp.getModuleSpecifierSourceFile();
                if (resolvedFile) {
                    const resolvedPath = resolvedFile.getFilePath().replace(/\\/g, "/");
                    edges.push({
                        id: `e-${filePath}-${resolvedPath}`,
                        source: filePath,
                        target: resolvedPath,
                    });
                    console.log(`  Added direct import edge: ${filePath} -> ${resolvedPath}`);
                } else {
                    addFuzzyEdge(specifier);
                }
            }

            // 2. CommonJS require() / Dynamic import()
            sourceFile.forEachDescendant(node => {
                if (node.getKindName() === "CallExpression") {
                    const callExpr = node as any;
                    const expr = callExpr.getExpression().getText();
                    if (expr === "require" || expr === "import") { // Basic fuzzy catch for require() and import()
                        const args = callExpr.getArguments();
                        if (args.length > 0 && args[0].getKindName() === "StringLiteral") {
                            addFuzzyEdge(args[0].getLiteralValue());
                        }
                    }
                }
            });
        }

        console.log(`Generated ${edges.length} edges.`);
        return { nodes, edges };
    }
}
