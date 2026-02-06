import { Activity, Cpu, Play, Search, Menu } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

interface HeaderProps {
    repoPath: string;
    setRepoPath: Dispatch<SetStateAction<string>>;
    handleScan: () => void;
    isScanning: boolean;
    toggleSidebar: () => void;
    recentPaths: string[];
    onSelectRecent: (path: string) => void;
    onClearRecents: () => void;
}

export function Header({ repoPath, setRepoPath, handleScan, isScanning, toggleSidebar, recentPaths, onSelectRecent, onClearRecents }: HeaderProps) {
    return (
        <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-background-secondary/80 px-8 backdrop-blur-md z-10 select-none">
            <div className="flex items-center gap-6">
                <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-white/5 rounded-md text-text-secondary hover:text-accent-primary transition-all active:scale-90"
                    title="Toggle Sidebar"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent-primary border border-accent-secondary border-glow shadow-[0_0_15px_rgba(0,242,255,0.3)]">
                        <Cpu className="h-5 w-5 text-background-primary" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-display text-xl font-bold tracking-tight text-glow uppercase leading-none">DOCUMIND</h1>
                        <span className="text-[9px] text-accent-primary tracking-[0.2em] font-bold opacity-80">ARCHITECTURAL INTELLIGENCE</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative group flex items-center gap-2 rounded-md bg-background-primary border border-border-subtle px-3 py-1.5 focus-within:border-accent-primary transition-all duration-300 w-96 hover:border-white/20">
                    <Search className="h-4 w-4 text-text-secondary group-focus-within:text-accent-primary transition-colors" />
                    <input
                        type="text"
                        list="recent-paths"
                        value={repoPath}
                        onChange={(e) => setRepoPath(e.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && repoPath.trim() && !isScanning) {
                                handleScan();
                            }
                        }}
                        placeholder="Local path or Git URL (e.g. C:\Projects\repo or https://github.com/user/repo)..."
                        className="bg-transparent text-sm outline-none placeholder:text-text-secondary/50 w-full text-text-primary font-mono"
                    />
                    {recentPaths.length > 0 && (
                        <>
                            <datalist id="recent-paths">
                                {recentPaths.map((path) => (
                                    <option key={path} value={path} />
                                ))}
                            </datalist>
                            <button
                                type="button"
                                onClick={() => onSelectRecent(recentPaths[0])}
                                className="text-[9px] uppercase tracking-widest text-text-secondary hover:text-text-primary"
                            >
                                Recent
                            </button>
                            <button
                                type="button"
                                onClick={onClearRecents}
                                className="text-[9px] uppercase tracking-widest text-text-secondary hover:text-text-primary"
                            >
                                Clear
                            </button>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleScan}
                    disabled={isScanning || !repoPath.trim()}
                    className="relative overflow-hidden flex items-center gap-2 rounded-md bg-accent-primary px-6 py-1.5 text-sm font-bold text-background-primary transition-all hover:brightness-110 border-glow disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {isScanning ? <Activity className="h-4 w-4 animate-spin relative z-10" /> : <Play className="h-4 w-4 fill-current relative z-10" />}
                    <span className="relative z-10">{isScanning ? "SCANNING..." : "SCAN REPO"}</span>
                </button>
            </div>
        </header>
    );
}
