import { NextRequest, NextResponse } from "next/server";
import { CodeParser } from "@/lib/parser/code-parser";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GIT_CLONE_TIMEOUT_MS = 60_000;
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: "0" };

const getGitCloneErrorMessage = (error: unknown) => {
    if (!error || typeof error !== "object") {
        return "Git clone failed.";
    }

    const message = String((error as { message?: string }).message ?? "");
    const stderr = String((error as { stderr?: string }).stderr ?? "");
    const combined = `${message}\n${stderr}`.toLowerCase();

    if ((error as { killed?: boolean }).killed) {
        return `Git clone timed out after ${GIT_CLONE_TIMEOUT_MS / 1000} seconds.`;
    }

    const authSignals = [
        "authentication failed",
        "permission denied",
        "could not read username",
        "could not read password",
        "repository not found",
    ];
    if (authSignals.some((signal) => combined.includes(signal))) {
        return "Git clone failed due to authentication or authorization. Check repository access and credentials.";
    }

    const networkSignals = [
        "could not resolve host",
        "failed to connect",
        "connection timed out",
        "network is unreachable",
        "connection reset by peer",
    ];
    if (networkSignals.some((signal) => combined.includes(signal))) {
        return "Git clone failed due to a network error. Check the URL and network connectivity.";
    }

    return `Git clone failed. ${stderr || message || "Unknown error."}`.trim();
};

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
            try {
                await execFileAsync(
                    "git",
                    ["clone", "--depth", "1", "--filter=blob:none", "--single-branch", dirPath, repoDir],
                    { timeout: GIT_CLONE_TIMEOUT_MS, env: GIT_ENV }
                );
            } catch (error) {
                throw new Error(getGitCloneErrorMessage(error));
            }
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
