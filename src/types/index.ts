export interface FileData {
    id: string;
    label: string;
    type: "file" | "folder" | "group";
    fileSize: number;
    hash: string;
    parentId?: string;
    color?: string;
    data?: any; // ReactFlow generic data
}

export interface SummaryData {
    purpose: string;
    responsibilities: string[];
    relationships?: string;
    diagram?: string;
    content?: string;
    architectureRole?: string;
    designPatterns?: string[];
    technicalDebt?: string;
}

export interface NodeData extends FileData { }
