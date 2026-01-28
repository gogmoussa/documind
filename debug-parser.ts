import { Project } from "ts-morph";
import path from "path";

const dirPath = process.argv[2] || process.cwd();

async function test() {
    const project = new Project();

    // Test multiple pattern formats
    const patterns = [
        path.join(dirPath, "/**/*.ts").replace(/\\/g, "/"),
        path.join(dirPath, "/**/*.tsx").replace(/\\/g, "/"),
    ];

    console.log("Root Path:", dirPath);
    console.log("Patterns:", patterns);

    try {
        project.addSourceFilesAtPaths(patterns);
        const files = project.getSourceFiles();
        console.log(`Success! Found ${files.length} files.`);
        if (files.length > 0) {
            console.log("First file:", files[0].getFilePath());
        }
    } catch (e) {
        console.error("Error adding files:", e);
    }
}

test();
