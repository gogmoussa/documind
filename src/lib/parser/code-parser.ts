import { Project, SyntaxKind } from "ts-morph";
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
    data?: {
        functions: string[];
        classes: string[];
        variables: string[];
        exportCount: number;
        loc: number;
        complexity?: number;
        architectureRole?: string;
        designPatterns?: string[];
        dependencyCount?: number;
    };
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
}

export interface RepositoryStats {
    totalLoc: number;
    totalFiles: number;
    averageComplexity: number;
    topComplexFiles: { name: string, score: number }[];
    layerBreakdown: Record<string, number>;
}

export interface DependencyGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: RepositoryStats;
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
            `!${normalizedDir}/**/.git/**`,
        ];

        console.log("Scanning with patterns:", patterns);
        this.project.addSourceFilesAtPaths(patterns);

        const sourceFiles = this.project.getSourceFiles();
        console.log(`Found ${sourceFiles.length} source files.`);

        const folderMap = new Set<string>();
        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];
        const fileList = sourceFiles.map(sf => sf.getFilePath().replace(/\\/g, "/"));

        for (const sourceFile of sourceFiles) {
            const filePath = sourceFile.getFilePath().replace(/\\/g, "/");
            const relativePath = path.relative(dirPath, filePath).replace(/\\/g, "/");
            const dirName = path.dirname(filePath).replace(/\\/g, "/");
            const relativeDir = path.relative(dirPath, dirName).replace(/\\/g, "/");

            // Track folders (Zonal layout)
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

            // --- Static Analysis Metrics ---
            // Basic support for TS/JS via ts-morph
            let functions: string[] = [];
            let classes: string[] = [];
            let exportCount = 0;
            let loc = 0;
            let color = '#3f3f46'; // Neutral default
            let architectureRole: string | undefined = "Logic";
            const designPatterns: string[] = [];
            let dependencyCount = 0;

            try {
                functions = sourceFile.getFunctions().map(f => f.getName()).filter(Boolean) as string[];
                classes = sourceFile.getClasses().map(c => c.getName()).filter(Boolean) as string[];
                const exports = sourceFile.getExportedDeclarations();
                exportCount = exports.size;
                loc = sourceFile.getEndLineNumber();

                // Advanced Logic Role Inference
                const importDeclarations = sourceFile.getImportDeclarations();
                dependencyCount = importDeclarations.length;
                const hasReact = content.includes("react") || content.includes("useState");
                const isComponent = extension === '.tsx' || (hasReact && classes.length > 0);
                const isService = filePath.includes(".service.") || filePath.includes("lib/");
                const isRoute = filePath.includes("api/") || filePath.includes("route.");
                const isTest = filePath.includes(".test.") || filePath.includes(".spec.");

                if (isComponent) architectureRole = "Presentation";
                else if (isRoute) architectureRole = "Edge/API";
                else if (isService) architectureRole = "Service/Logic";
                else if (isTest) architectureRole = "Verification";

                // Design Pattern Heuristics
                if (content.includes("new Proxy")) designPatterns.push("Proxy");
                if (content.includes("EventEmitter")) designPatterns.push("Observer");
                if (content.includes("Singleton") || (exportCount === 1 && classes.length === 1)) designPatterns.push("Singleton/Module");
                if (content.includes("useContext")) designPatterns.push("Provider");

            } catch (e) {
                loc = content.split('\n').length;
            }

            if (extension === '.ts' || extension === '.tsx') color = '#2563eb'; // Blue
            if (extension === '.js' || extension === '.jsx') color = '#eab308'; // Yellow

            // Override colors based on roles for better "at-a-glance" value
            if (architectureRole === 'Presentation') color = '#06b6d4'; // Cyan
            if (architectureRole === 'Edge/API') color = '#22c55e'; // Green
            if (architectureRole === 'Verification') color = '#ec4899'; // Pink
            if (filePath.includes("config.") || filePath.includes(".json")) color = '#71717a';

            // --- Complexity Calculation ---
            let complexity = 0;
            try {
                const controlFlowKinds = [
                    SyntaxKind.IfStatement,
                    SyntaxKind.ForStatement,
                    SyntaxKind.ForInStatement,
                    SyntaxKind.ForOfStatement,
                    SyntaxKind.WhileStatement,
                    SyntaxKind.DoStatement,
                    SyntaxKind.CaseClause,
                    SyntaxKind.ConditionalExpression,
                    SyntaxKind.BinaryExpression,
                    SyntaxKind.TryStatement,
                    SyntaxKind.CatchClause,
                ];

                sourceFile.forEachDescendant(node => {
                    const kind = node.getKind();
                    if (controlFlowKinds.includes(kind)) {
                        if (kind === SyntaxKind.BinaryExpression) {
                            const op = (node as any).getOperatorToken().getKind();
                            if (op === SyntaxKind.AmpersandAmpersandToken || op === SyntaxKind.BarBarToken) {
                                complexity++;
                            }
                        } else {
                            complexity++;
                        }
                    }
                });
                complexity += (functions.length + classes.length);
            } catch (e) {
                complexity = 0;
            }

            nodes.push({
                id: filePath,
                label: path.basename(filePath),
                type: "file",
                fileSize: content.length,
                hash: hash,
                color: color,
                parentId: relativeDir && relativeDir !== "." ? dirName : undefined,
                data: {
                    functions,
                    classes,
                    variables: [],
                    exportCount,
                    loc,
                    complexity,
                    architectureRole,
                    designPatterns,
                    dependencyCount: dependencyCount || 0
                }
            });
        }

        // --- Python Support (Enhanced Manual Scan) ---
        const getAllFiles = async (dir: string): Promise<string[]> => {
            let results: string[] = [];
            const list = await fs.readdir(dir);
            for (const file of list) {
                const fullPath = path.resolve(dir, file);
                const stat = await fs.stat(fullPath);
                if (stat && stat.isDirectory()) {
                    if (file !== 'node_modules' && file !== '.git' && file !== '__pycache__' && file !== 'venv' && file !== '.next') {
                        results = results.concat(await getAllFiles(fullPath));
                    }
                } else {
                    if (file.endsWith('.py')) {
                        results.push(fullPath.replace(/\\/g, "/"));
                    }
                }
            }
            return results;
        };

        const pythonFiles = await getAllFiles(normalizedDir);
        for (const pyFile of pythonFiles) {
            const content = await fs.readFile(pyFile, 'utf-8');
            const lines = content.split('\n');
            const hash = crypto.createHash("md5").update(content).digest("hex");

            // Python-specific Logic Analysis
            const functions = (content.match(/^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm) || [])
                .map(m => m.replace(/^(?:async\s+)?def\s+/, ''));
            const classes = (content.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm) || [])
                .map(m => m.replace(/^class\s+/, ''));

            // Complexity Heuristic for Python (Control Flow Count)
            const controlKeywords = ['if ', 'elif ', 'for ', 'while ', 'except ', 'with ', 'match ', 'case '];
            let complexity = functions.length + classes.length;
            lines.forEach(line => {
                const trimmed = line.trim();
                controlKeywords.forEach(kw => {
                    if (trimmed.startsWith(kw)) complexity++;
                });
            });

            // Architecture Role Heuristic
            let architectureRole = "Logic";
            const designPatterns: string[] = [];

            if (pyFile.includes("test_") || pyFile.includes("_test")) architectureRole = "Verification";
            if (content.includes("FastAPI") || content.includes("Flask") || content.includes("Django")) architectureRole = "Edge/API";
            if (content.includes("models.") || content.includes("Schema")) architectureRole = "Data/Model";
            if (pyFile.endsWith("__init__.py")) architectureRole = "Orchestration";
            if (content.includes("BaseSettings")) designPatterns.push("Configuration");
            if (content.includes("abstractmethod")) designPatterns.push("Abstact Base Class");

            const relativeDir = path.relative(dirPath, path.dirname(pyFile)).replace(/\\/g, "/");
            const dirName = path.dirname(pyFile).replace(/\\/g, "/");

            if (relativeDir && relativeDir !== "." && !folderMap.has(dirName)) {
                folderMap.add(dirName);
                nodes.push({
                    id: dirName, label: relativeDir, type: "folder", fileSize: 0, hash: "folder", color: "#242426"
                });
            }

            // Regex for imports
            const importMatches = [
                ...Array.from(content.matchAll(/^from\s+([\w\.]+)\s+import/gm)),
                ...Array.from(content.matchAll(/^import\s+([\w\.]+)/gm))
            ];
            const dependencyCount = importMatches.length;

            nodes.push({
                id: pyFile,
                label: path.basename(pyFile),
                type: "file",
                fileSize: content.length,
                hash: hash,
                color: architectureRole === 'Verification' ? '#ec4899' : '#3b82f6',
                parentId: relativeDir && relativeDir !== "." ? dirName : undefined,
                data: {
                    functions,
                    classes,
                    variables: [],
                    exportCount: functions.length + classes.length,
                    loc: lines.length,
                    complexity,
                    architectureRole,
                    designPatterns,
                    dependencyCount
                }
            });

            fileList.push(pyFile);
        }

        // --- Edge Detection ---
        for (const sourceFile of sourceFiles) {
            const filePath = sourceFile.getFilePath().replace(/\\/g, "/");
            const addEdgeTo = (specifier: string) => {
                if (!specifier.startsWith(".")) return;
                const dir = path.dirname(filePath);
                const candidates = [
                    path.resolve(dir, specifier).replace(/\\/g, "/"),
                    path.resolve(dir, specifier + ".ts").replace(/\\/g, "/"),
                    path.resolve(dir, specifier + ".tsx").replace(/\\/g, "/"),
                    path.resolve(dir, specifier + ".js").replace(/\\/g, "/"),
                    path.resolve(dir, specifier + ".jsx").replace(/\\/g, "/"),
                    path.resolve(dir, specifier, "index.ts").replace(/\\/g, "/"),
                    path.resolve(dir, specifier, "index.js").replace(/\\/g, "/"),
                ];
                const target = fileList.find(f => candidates.includes(f));
                if (target && target !== filePath) {
                    edges.push({ id: `e-${crypto.randomBytes(4).toString('hex')}`, source: filePath, target: target });
                }
            };

            sourceFile.getImportDeclarations().forEach(imp => addEdgeTo(imp.getModuleSpecifierValue()));
            sourceFile.getExportDeclarations().forEach(exp => {
                const ms = exp.getModuleSpecifierValue();
                if (ms) addEdgeTo(ms);
            });

            sourceFile.forEachDescendant(node => {
                if (node.getKind() === SyntaxKind.CallExpression) {
                    const callExpr = node as any;
                    const text = callExpr.getExpression().getText();
                    if (text === "require" || text === "import") {
                        const args = callExpr.getArguments();
                        if (args.length > 0 && args[0].getKind() === SyntaxKind.StringLiteral) {
                            addEdgeTo(args[0].getLiteralText());
                        }
                    }
                }
            });
        }

        // 4. Python Edge Detection
        for (const pyFile of pythonFiles) {
            const content = await fs.readFile(pyFile, 'utf-8');
            const dir = path.dirname(pyFile);

            // Regex for imports
            const importMatches = [
                ...Array.from(content.matchAll(/^from\s+([\w\.]+)\s+import/gm)),
                ...Array.from(content.matchAll(/^import\s+([\w\.]+)/gm))
            ];

            for (const match of importMatches) {
                const modulePath = match[1].replace(/\./g, "/"); // Convert x.y to x/y

                // Try to resolve this module path
                const candidates = [
                    path.resolve(dir, modulePath + ".py").replace(/\\/g, "/"),
                    path.resolve(dir, modulePath, "__init__.py").replace(/\\/g, "/"), // Package import
                    path.resolve(normalizedDir, modulePath + ".py").replace(/\\/g, "/"), // Root relative
                    path.resolve(normalizedDir, modulePath, "__init__.py").replace(/\\/g, "/")
                ];

                const target = fileList.find(f => candidates.includes(f));
                if (target && target !== pyFile) {
                    edges.push({
                        id: `e-${crypto.randomBytes(4).toString('hex')}`,
                        source: pyFile,
                        target: target
                    });
                }
            }
        }

        // Remove duplicate edges
        const uniqueEdges = edges.filter((edge, index, self) =>
            index === self.findIndex((t) => (
                t.source === edge.source && t.target === edge.target
            ))
        );

        // --- Global Stats ---
        const fileNodes = nodes.filter(n => n.type === 'file');
        const stats: RepositoryStats = {
            totalLoc: fileNodes.reduce((acc, n) => acc + (n.data?.loc || 0), 0),
            totalFiles: fileNodes.length,
            averageComplexity: fileNodes.length > 0
                ? fileNodes.reduce((acc, n) => acc + (n.data?.complexity || 0), 0) / fileNodes.length
                : 0,
            topComplexFiles: fileNodes
                .map(n => ({ id: n.id, name: n.label, score: n.data?.complexity || 0 }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5),
            layerBreakdown: fileNodes.reduce((acc, n) => {
                const role = n.data?.architectureRole || "Unknown";
                acc[role] = (acc[role] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };

        console.log(`Generated ${uniqueEdges.length} edges.`);
        return { nodes, edges: uniqueEdges, stats };
    }
}
