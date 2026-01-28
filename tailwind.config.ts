import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,px,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: {
                    primary: "#0a0a0c",
                    secondary: "#141416",
                },
                accent: {
                    primary: "#00f2ff",
                    secondary: "#0066cc",
                },
                status: {
                    error: "#ff3366",
                    success: "#00ff99",
                },
            },
            fontFamily: {
                display: ["var(--font-space-grotesk)", "system-ui"],
                mono: ["var(--font-roboto-mono)", "monospace"],
            },
        },
    },
    plugins: [],
};
export default config;
