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
    data?: any;
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

            try {
                functions = sourceFile.getFunctions().map(f => f.getName()).filter(Boolean) as string[];
                classes = sourceFile.getClasses().map(c => c.getName()).filter(Boolean) as string[];
                const exports = sourceFile.getExportedDeclarations();
                exportCount = exports.size;
                loc = sourceFile.getEndLineNumber();
            } catch (e) {
                // Fallback for non-TS files if we add them later via other means, though currently loop is over sourceFiles
                loc = content.split('\n').length;
            }

            let color = '#3f3f46'; // Neutral default
            if (extension === '.ts' || extension === '.tsx') color = '#2563eb'; // Blue
            if (extension === '.js' || extension === '.jsx') color = '#eab308'; // Yellow
            if (content.includes("react") || content.includes("useState")) color = '#06b6d4'; // Cyan (React)
            if (content.includes("express") || content.includes("NextResponse")) color = '#22c55e'; // Green (Server)

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
                    loc
                }
            });
        }

        // --- Python Support (Manual Scan) ---
        // ts-morph doesn't do Python, so we scan manually
        const pythonPatterns = [`${normalizedDir}/**/*.py`, `!${normalizedDir}/**/venv/**`];
        // We need a globber, but for now let's just use readdir recursive or similar? 
        // Or assume the user passed a path and we traverse.
        // Actually, ts-morph addSourceFilesAtPaths handles globs for its own purposes. 
        // We should probably just use fs traverse for everything if we want mixed language, 
        // but mixing ts-morph and manual is fine.

        // Let's do a quick manual glob for .py files since we can't depend on 'glob' package being installed
        // We'll trust the user has typical structure.
        // Implementing a simple recursive directory walker for .py
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
        console.log(`Found ${pythonFiles.length} Python files.`);

        for (const pyFile of pythonFiles) {
            const content = await fs.readFile(pyFile, 'utf-8');
            const hash = crypto.createHash("md5").update(content).digest("hex");

            // Simple Regex Analysis
            const functions = (content.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm) || []).map(m => m.replace(/^def\s+/, ''));
            const classes = (content.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm) || []).map(m => m.replace(/^class\s+/, ''));

            const relativeDir = path.relative(dirPath, path.dirname(pyFile)).replace(/\\/g, "/");
            const dirName = path.dirname(pyFile).replace(/\\/g, "/");

            // Track folders for Python too
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

            nodes.push({
                id: pyFile,
                label: path.basename(pyFile),
                type: "file",
                fileSize: content.length,
                hash: hash,
                color: '#3b82f6', // Python Blue/Yellow usually, let's go Blueish
                parentId: relativeDir && relativeDir !== "." ? dirName : undefined,
                data: {
                    functions,
                    classes,
                    variables: [],
                    exportCount: functions.length + classes.length, // Rough proxy
                    loc: content.split('\n').length
                }
            });

            fileList.push(pyFile); // Add to lookup list
        }

        // --- Edge Detection ---
        for (const sourceFile of sourceFiles) {
            const filePath = sourceFile.getFilePath().replace(/\\/g, "/");

            // Helper: Detect fuzzy edges
            const addEdgeTo = (specifier: string) => {
                // Ignore node_modules
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
                    edges.push({
                        id: `e-${crypto.randomBytes(4).toString('hex')}`,
                        source: filePath,
                        target: target
                    });
                }
            };

            // 1. Static Imports (ESM)
            sourceFile.getImportDeclarations().forEach(imp => {
                addEdgeTo(imp.getModuleSpecifierValue());
            });

            // 2. Export Declarations (Re-exports)
            sourceFile.getExportDeclarations().forEach(exp => {
                const moduleSpecifier = exp.getModuleSpecifierValue();
                if (moduleSpecifier) {
                    addEdgeTo(moduleSpecifier);
                }
            });

            // 3. Dynamic Imports & Requires
            sourceFile.forEachDescendant(node => {
                if (node.getKind() === SyntaxKind.CallExpression) {
                    const callExpr = node as any;
                    const expression = callExpr.getExpression();
                    const text = expression.getText();

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

        console.log(`Generated ${uniqueEdges.length} edges.`);
        return { nodes, edges: uniqueEdges };
    }
}
