# 🧠 DocuMind: The Visual Architecture Agent

> **"Code is ephemeral, but architecture is eternal."**

DocuMind is an AI-powered documentation agent designed to bridge the gap between complex source code and human-readable architectural maps. It uses **Static Analysis (ts-morph)** combined with **LLM Intelligence** to visually decompose your codebase into interactive, navigable blueprints.

## 🚀 The DevRel "Wow" Factors
- **Hierarchical Visualization:** Automatically groups modules into "Zonal Folders" to show project boundaries.
- **Smart Connection Engine:** Detects both ES Modules (`import`) and CommonJS (`require`) dependencies.
- **AI Logic Extraction:** Automatically identifies the "Purpose" and "Architectural Role" of every file using GPT-4o-mini.
- **Zero-Config Blueprints:** Transform any local directory into a structured map with zero setup.

## 📡 Get Started (Local Setup)
1. **Clone & Install:**
   ```bash
   npm install
   ```
2. **Setup AI (Optional but Recommended):**
   - Copy `.env.local.example` to `.env.local`.
   - Add your `AI_API_KEY` (OpenAI compatible) to enable deep architectural analysis.
   - *If no key is provided, the system uses "Heuristic Parsing" to derive logic roles.*
3. **Run Development:**
   ```bash
   npm run dev
   ```
4. **Scan a Project:**
   - Enter an **Absolute Path** to a local repository (e.g., `C:\Projects\my-app`).
   - Click **SCAN REPO** and watch the architecture bloom.

## 🛠️ Tech Stack
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Graph Engine:** [React Flow](https://reactflow.dev/) (Interactive orchestration)
- **Static Analysis:** [ts-morph](https://ts-morph.com/) (TypeScript AST discovery)
- **AI Layer:** [OpenAI SDK](https://github.com/openai/openai-node) (Architectural reasoning)
- **UI Architecture:** Tailwind CSS + Framer Motion (Industrial Utilitarian design)

## 🔭 The Vision
DocuMind is built to be the "voice of the codebase." The next phase involves supporting **PR Architectural Diffs**, allowing developers to see how their code changes impact the overall system flow before hitting "Merge."

---
*Built for the Antigravity Awesome Skills DevRel Portfolio.*
