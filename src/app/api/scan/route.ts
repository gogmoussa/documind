import { NextRequest, NextResponse } from "next/server";
import { CodeParser } from "@/lib/parser/code-parser";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const isGitUrl = (value: string) =>
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("git@") ||
    value.endsWith(".git");

export async function POST(req: NextRequest) {
    let tempDir: string | null = null;
    try {
        const { path: dirPath } = await req.json();

        if (!dirPath) {
            return NextResponse.json({ error: "No path provided" }, { status: 400 });
        }

        let scanPath = dirPath;

        if (isGitUrl(dirPath)) {
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "documind-"));
            const repoDir = path.join(tempDir, "repo");
            await execFileAsync("git", ["clone", "--depth", "1", dirPath, repoDir]);
            scanPath = repoDir;
        }

        const parser = new CodeParser();
        const graph = await parser.parseDirectory(scanPath);

        return NextResponse.json(graph);
    } catch (error: any) {
        console.error("Scan Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }
}
