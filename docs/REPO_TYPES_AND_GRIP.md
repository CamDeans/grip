# Repo Types and GRIP: Handling ALL GitHub Repo Types

G.R.I.P. must handle every kind of repository on GitHub—not just one-off web apps. This doc describes the **mandatory rule**, **detection**, **plan**, and **steps per scenario** so GRIP works through all cases consistently.

---

## Mandatory Rule

- **G.R.I.P. MUST handle ALL GitHub repo types** with the correct toolchain, build system, and conventions for the detected stack.
- Never assume "just a web app" unless the repo clearly is. Apply category-specific rules (AI/ML, iOS, Android, full-stack, Python, Go, Rust, etc.) when detected.
- The enhanced-chat system prompt injects **Detected repo type** and **Mandatory rules** per category (see `src/lib/repoTypeDetection.ts`). GRIP must follow them.

---

## Detection (How We Classify Repos)

Repo type is inferred from:

1. **Structured analysis** (when available): `identity.primary_languages`, `identity.detected_frameworks`, `identity.project_type`
2. **File paths** (from `file_manifest`): e.g. `Package.swift` → iOS, `build.gradle` → Android, `requirements.txt` + ML libs → AI/ML
3. **Extension counts** (`mainLanguages`): e.g. dominant `py` + ML frameworks → AI/ML; `ts`/`js` + frontend+backend dirs → full-stack

Categories (see `RepoTypeCategory` in `src/lib/repoTypeDetection.ts`):

| Category        | Typical indicators |
|----------------|--------------------|
| **ai_ml_llm**  | Python + PyTorch/TensorFlow/LangChain; or project_type "ml"/"llm" |
| **ios_swift**  | Package.swift, .xcodeproj, Swift/SwiftUI in languages/frameworks |
| **android_kotlin** | build.gradle, settings.gradle, Kotlin/Java + Android frameworks |
| **full_stack_js** | Frontend + backend dirs or frameworks (React + Express, etc.) |
| **web_js**    | TS/JS/TSX/JSX only, no strong backend |
| **python_general** | Python dominant, no ML indicators |
| **go_backend** | go.mod, Go in languages |
| **rust**      | Cargo.toml, Rust in languages |
| **ruby**      | Gemfile, Ruby in languages |
| **php**       | PHP in languages |
| **dotnet**    | .csproj, .sln, C# / ASP.NET |
| **cli_tool**  | project_type "cli"/"tool", cmd/, cli/ |
| **generic**   | Fallback: follow primary languages; support all common types |

---

## Plan and Steps per Scenario

### 1. AI / ML / LLM

- **Preserve** the project's AI/ML/LLM stack (PyTorch, TensorFlow, LangChain, OpenAI/Anthropic SDKs). Do not remove or replace model-related code unless the user asks.
- **Keep** dependencies (transformers, torch, tensorflow, langchain, etc.) and configs (model names, token limits, API keys) intact.
- **Add** new code that fits existing patterns (pipelines, agents, prompts).
- **Steps:** (1) Identify framework from deps and imports. (2) Generate/edit code in the same language and style. (3) Do not strip inference/training deps. (4) Align env vars and config with existing usage.

### 2. iOS (Swift / SwiftUI)

- **Generate/edit** Swift only. Use SwiftUI or UIKit as the repo does. Do not suggest React Native or web unless the user asks.
- **Respect** Xcode project structure: targets, schemes, Info.plist, entitlements. Do not break the project file or bundle IDs.
- **Steps:** (1) Confirm Swift/SwiftUI or UIKit from repo. (2) Add screens/features following Apple HIG and repo patterns. (3) Keep project file and entitlements consistent.

### 3. Android (Kotlin / Java)

- **Generate/edit** Kotlin (or Java) only. Use the repo's build system (Gradle/KTS). Do not suggest cross-platform or web unless the user asks.
- **Respect** Android layout: app/src/main, manifests, resources. Do not break Gradle or package names.
- **Steps:** (1) Confirm Kotlin/Java and Gradle from repo. (2) Add activities/screens following Material Design and repo patterns (Jetpack, Compose, or XML).

### 4. Full-stack (JS/TS)

- **Implement** features end-to-end when relevant (API route + client usage). Keep a **single root dev script** that starts both frontend and backend (e.g. concurrently) so Run in StackBlitz works.
- **Keep** API contracts and env vars in sync. Do not change one side without updating the other when they share types or endpoints.
- **Steps:** (1) Identify frontend and backend roots. (2) Ensure root package.json (or workspace) has a dev script that starts both. (3) Add/change APIs and client code together; keep types/env aligned.

### 5. Web (JS/TS only)

- Use the repo's frontend stack (React, Next, Vite, etc.) and package.json scripts. Ensure dev/build/start work and dependencies match imports.
- **Steps:** (1) Use existing scripts and framework. (2) Add components/pages in the same style. (3) Do not introduce a backend unless the user asks.

### 6. Python (general)

- Use Python 3 and the repo's layout (pyproject.toml, requirements.txt, or setup.py). Preserve virtualenv/poetry usage. Do not mix in Node/JS unless the repo already does.
- **Steps:** (1) Respect existing layout and deps. (2) Add modules/tests in the same style. (3) Keep entrypoints (e.g. `__main__`, CLI) consistent.

### 7. Go / Rust / Ruby / PHP / .NET / CLI

- **Go:** Use Go modules (go.mod) and standard layout (cmd/, internal/, pkg/). Preserve build and run commands.
- **Rust:** Use Cargo (Cargo.toml) and crate layout. Preserve dependencies and features.
- **Ruby:** Use Bundler (Gemfile) and the repo's framework (Rails, Sinatra, etc.).
- **PHP:** Use Composer and the repo's framework (Laravel, etc.). Preserve config and routing.
- **.NET:** Use .NET SDK and solution/project structure (.csproj, .sln). Preserve target framework and packages.
- **CLI:** Preserve CLI entrypoints, flags, and subcommands. Do not turn the project into a web app unless the user asks.

**Steps (generic):** (1) Identify stack from key files (go.mod, Cargo.toml, Gemfile, composer.json, .csproj). (2) Add/edit code in the same language and layout. (3) Do not break build/run commands or entrypoints.

### 8. Generic (unknown or mixed)

- Follow primary languages and frameworks. Support all common GitHub repo types (web, full-stack, mobile, AI/ML, CLI). Use the appropriate toolchain and conventions.
- **Steps:** (1) Infer from file extensions and key files. (2) Apply the closest category rules. (3) When in doubt, preserve existing structure and deps; add code that matches the repo style.

---

## Strengthening Enhancements

- **Preview/run guidance per type:** GRIP is told when to suggest Run in StackBlitz vs Export/local (e.g. iOS/Android/Python/Go/Rust → Export or local run; web/full-stack JS → StackBlitz when build succeeds). Avoids suggesting StackBlitz for non-web stacks.
- **Expected commands per type:** GRIP gets expected install/dev/build commands (e.g. pip install -r requirements.txt for Python, go build for Go) so it does not suggest npm install for non-Node repos.
- **Explicit "Do NOT" rules:** Per category, rules include "Do NOT" lines (e.g. do not suggest React Native for iOS; do not remove ML framework unless the user asks; do not suggest npm for Python/Go/Rust).
- **Fallback from saved files:** When there is no structured analysis (e.g. new project, analysis not run yet), repo type is inferred from **saved project files** (path + extension counts). So once the user has added e.g. `main.py` and `requirements.txt`, GRIP gets Python rules instead of generic.
- **Tree-sitter project_type taxonomy:** The LLM that fills structured analysis is instructed to set `identity.project_type` to one of: web_app, full_stack, ai_ml_llm, ios_app, android_app, python_app, go_app, rust_app, cli_tool, generic. Detection then maps these directly to our categories for consistent behavior.

---

## Where This Is Implemented

| Piece | Location |
|-------|----------|
| **Detection** | `src/lib/repoTypeDetection.ts` — `detectRepoType()`, `getMandatoryRepoTypeRules()`, `PREVIEW_RUN_GUIDANCE`, `EXPECTED_COMMANDS` |
| **Injection** | `src/app/api/enhanced-chat/route.ts` — repo type from structured analysis (identity + file_manifest) or fallback from savedFiles; `repoTypeRules` passed to `buildSystemPrompt()` |
| **Prompt** | Enhanced-chat system prompt: "## Mandatory: Repo type and stack (handle ALL GitHub repo types)" + category-specific rules + preview/run + commands |
| **Tree-sitter** | `src/lib/sandbox/treeSitterAnalysis.ts` — buildStructuredAnalysisWithPrompt instructs LLM to use project_type taxonomy |
| **.cursorrules** | `full_automation_guidance.rules` + `repo_types_mandate` — mandate and categories |

---

## Parity (Main and Sandbox)

Repo type detection and mandatory rules apply to **both** main GRIP and Sandbox GRIP: the same analysis (or fallback from saved files) feeds the same prompt section, so both contexts follow the same plan and steps per scenario.
