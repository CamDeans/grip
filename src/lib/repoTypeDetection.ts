/**
 * Repo-type detection for GRIP: classify GitHub repos so we can apply mandatory rules
 * per category (AI/ML/LLM, iOS, Android, full-stack, web, etc.). Ensures GRIP handles
 * ALL repo types—not just one-off web dev—with a clear plan and steps per scenario.
 */

export type RepoTypeCategory =
  | 'ai_ml_llm'
  | 'ios_swift'
  | 'android_kotlin'
  | 'full_stack_js'
  | 'web_js'
  | 'game_web'
  | 'python_general'
  | 'go_backend'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'dotnet'
  | 'cli_tool'
  | 'generic'

export interface RepoTypeInput {
  primary_languages?: string[]
  detected_frameworks?: string[]
  project_type?: string
  /** When passing raw structured analysis (sa), identity is used for project_type and languages */
  identity?: { project_type?: string; primary_languages?: string[]; detected_frameworks?: string[] }
  /** File paths from repo or file_manifest (e.g. Package.swift, build.gradle) */
  filePaths?: string[]
  /** From structured analysis file_manifest; used when passing raw sa and filePaths not set */
  file_manifest?: Array<{ path?: string; language?: string }>
  /** Extension counts from analysis (e.g. { py: 10, ts: 5 }) */
  mainLanguages?: Record<string, number>
}

const LOWER = (s: string) => s.toLowerCase()

function hasAny(s: string, terms: string[]): boolean {
  const lower = LOWER(s)
  return terms.some((t) => lower.includes(LOWER(t)))
}

function hasAnyInList(list: string[] | undefined, terms: string[]): boolean {
  if (!list?.length) return false
  return list.some((s) => hasAny(s, terms))
}

function topExtensions(mainLanguages: Record<string, number>, n = 3): string[] {
  return Object.entries(mainLanguages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([ext]) => ext)
}

/**
 * Detect repo type from structured analysis identity, file paths, and/or extension counts.
 * Used by enhanced-chat to inject "Detected repo type" and mandatory rules per category.
 */
export function detectRepoType(input: RepoTypeInput): {
  category: RepoTypeCategory
  label: string
  hints: string[]
} {
  const id = input.identity
  const {
    primary_languages = [],
    detected_frameworks = [],
    project_type = '',
    filePaths = [],
    file_manifest,
    mainLanguages = {},
  } = input

  const pt = LOWER(project_type || id?.project_type || '')
  const pl = primary_languages?.length ? primary_languages : id?.primary_languages ?? []
  const df = detected_frameworks?.length ? detected_frameworks : id?.detected_frameworks ?? []

  const resolvedPaths =
    filePaths.length > 0 ? filePaths : (file_manifest?.map((f) => f.path).filter(Boolean) as string[]) ?? []
  const pathsLower = resolvedPaths.map((p) => p.replace(/\\/g, '/').toLowerCase())
  const pathSet = new Set(pathsLower)
  const hasPath = (name: string) => pathSet.has(name) || pathsLower.some((p) => p.includes(name))
  const topLangs = topExtensions(mainLanguages)
  const langs = [...new Set([...pl.map(LOWER), ...topLangs])]
  const frameworks = [...new Set([...df.map(LOWER), ...pl.map(LOWER)])]

  const hints: string[] = []

  // Direct mapping from tree-sitter project_type taxonomy (when LLM fills identity.project_type)
  if (pt === 'ios_app') {
    return { category: 'ios_swift', label: 'iOS (Swift/SwiftUI)', hints: ['Use Swift and SwiftUI (or UIKit) conventions.', 'Respect Xcode project structure and Info.plist.'] }
  }
  if (pt === 'android_app') {
    return { category: 'android_kotlin', label: 'Android (Kotlin/Java)', hints: ['Use Kotlin (or Java) and Gradle.', 'Respect Android project layout (app/src/main, manifests).'] }
  }
  if (pt === 'ai_ml_llm') {
    return {
      category: 'ai_ml_llm',
      label: 'AI / ML / LLM',
      hints: ['Preserve the project\'s ML framework (PyTorch, TensorFlow, LangChain, etc.).', 'Keep model configs and API usage patterns.'],
    }
  }
  if (pt === 'full_stack') {
    return {
      category: 'full_stack_js',
      label: 'Full-stack (JS/TS)',
      hints: ['Ensure a single root dev script starts both frontend and backend (e.g. concurrently).', 'Keep API contracts and env vars in sync.'],
    }
  }
  if (pt === 'web_app') {
    return { category: 'web_js', label: 'Web (JS/TS)', hints: ['Use package.json scripts (dev, build, start) and framework conventions (Next, Vite, etc.).'] }
  }
  if (pt === 'python_app') {
    return { category: 'python_general', label: 'Python', hints: ['Use Python 3 and standard project layout (e.g. pyproject.toml, requirements.txt).'] }
  }
  if (pt === 'go_app') {
    return { category: 'go_backend', label: 'Go', hints: ['Use Go modules and standard layout (cmd/, internal/).'] }
  }
  if (pt === 'rust_app') {
    return { category: 'rust', label: 'Rust', hints: ['Use Cargo and standard crate layout.'] }
  }
  if (pt === 'cli_tool') {
    return { category: 'cli_tool', label: 'CLI / Tool', hints: ['Preserve entrypoints and CLI flags.'] }
  }

  // iOS / Swift (heuristic)
  if (
    hasPath('Package.swift') ||
    hasPath('*.xcodeproj') ||
    hasPath('.xcodeproj') ||
    hasAnyInList(langs, ['swift']) ||
    hasAnyInList(frameworks, ['swift', 'swiftui', 'uikit']) ||
    hasAny(pt, ['ios', 'swift', 'apple', 'xcode'])
  ) {
    return {
      category: 'ios_swift',
      label: 'iOS (Swift/SwiftUI)',
      hints: ['Use Swift and SwiftUI (or UIKit) conventions.', 'Respect Xcode project structure and Info.plist.'],
    }
  }

  // Android / Kotlin
  if (
    hasPath('build.gradle') ||
    hasPath('build.gradle.kts') ||
    hasPath('settings.gradle') ||
    hasAnyInList(langs, ['kotlin', 'kotlin_android']) ||
    (hasAnyInList(langs, ['java']) && (hasPath('android') || hasPath('app/src/main'))) ||
    hasAnyInList(frameworks, ['android', 'kotlin', 'jetpack']) ||
    hasAny(pt, ['android', 'kotlin', 'mobile_android'])
  ) {
    return {
      category: 'android_kotlin',
      label: 'Android (Kotlin/Java)',
      hints: ['Use Kotlin (or Java) and Gradle.', 'Respect Android project layout (app/src/main, manifests).'],
    }
  }

  // AI / ML / LLM (Python-dominated with ML stack, or JS/TS with LLM libs)
  const mlFrameworks = ['pytorch', 'tensorflow', 'transformers', 'langchain', 'openai', 'anthropic', 'llm', 'keras', 'scikit', 'jax', 'onnx']
  const mlInFrameworks = hasAnyInList(frameworks, mlFrameworks)
  const mlInProjectType = hasAny(pt, ['ai', 'ml', 'llm', 'machine learning', 'deep learning', 'nlp'])
  const pyDominant = langs.includes('py') && (mainLanguages['py'] ?? 0) >= (mainLanguages['ts'] ?? 0) + (mainLanguages['js'] ?? 0)
  const hasMlPaths = pathsLower.some((p) => mlFrameworks.some((m) => p.includes(m))) || hasPath('requirements.txt')
  if (
    (pyDominant && (mlInFrameworks || mlInProjectType || hasMlPaths)) ||
    (mlInFrameworks && (langs.includes('py') || langs.includes('ts') || langs.includes('js'))) ||
    mlInProjectType
  ) {
    return {
      category: 'ai_ml_llm',
      label: 'AI / ML / LLM',
      hints: [
        'Respect the project\'s ML framework (PyTorch, TensorFlow, LangChain, etc.).',
        'Preserve model configs, token limits, and API usage patterns.',
        'Do not strip dependencies needed for inference or training.',
      ],
    }
  }

  // Python (general)
  if (langs.includes('py') || (mainLanguages['py'] ?? 0) > 0) {
    return {
      category: 'python_general',
      label: 'Python',
      hints: ['Use Python 3 and standard project layout (e.g. pyproject.toml, requirements.txt).'],
    }
  }

  // Full-stack JS/TS (frontend + backend indicators)
  const frontendIndicators = ['react', 'next', 'vue', 'angular', 'svelte', 'vite', 'frontend', 'client']
  const backendIndicators = ['express', 'fastify', 'nest', 'backend', 'server', 'api']
  const hasFrontend = hasAnyInList(frameworks, frontendIndicators) || pathsLower.some((p) => frontendIndicators.some((f) => p.includes(f)));
  const hasBackend = hasAnyInList(frameworks, backendIndicators) || pathsLower.some((p) => backendIndicators.some((b) => p.includes(b)));
  if (
    (hasFrontend && hasBackend) ||
    (hasPath('frontend') && hasPath('backend')) ||
    (hasPath('client') && hasPath('server')) ||
    hasAny(pt, ['fullstack', 'full-stack', 'full stack', 'monorepo'])
  ) {
    return {
      category: 'full_stack_js',
      label: 'Full-stack (JS/TS)',
      hints: [
        'Ensure a single root dev script starts both frontend and backend (e.g. concurrently).',
        'Keep API contracts and env vars consistent between client and server.',
      ],
    }
  }

  // Go
  if (langs.includes('go') || (mainLanguages['go'] ?? 0) > 0 || hasPath('go.mod')) {
    return { category: 'go_backend', label: 'Go', hints: ['Use Go modules and standard layout (cmd/, internal/).'] }
  }

  // Rust
  if (langs.includes('rs') || (mainLanguages['rs'] ?? 0) > 0 || hasPath('Cargo.toml')) {
    return { category: 'rust', label: 'Rust', hints: ['Use Cargo and standard crate layout.'] }
  }

  // Ruby
  if (langs.includes('rb') || (mainLanguages['rb'] ?? 0) > 0 || hasPath('Gemfile')) {
    return { category: 'ruby', label: 'Ruby', hints: ['Use Bundler and conventional layout.'] }
  }

  // PHP
  if (langs.includes('php') || (mainLanguages['php'] ?? 0) > 0) {
    return { category: 'php', label: 'PHP', hints: ['Use Composer and framework conventions (Laravel, etc.).'] }
  }

  // .NET
  if (
    hasPath('.csproj') ||
    hasPath('*.sln') ||
    hasAnyInList(langs, ['c#', 'csharp', 'cs']) ||
    hasAnyInList(frameworks, ['aspnet', 'dotnet', '.net'])
  ) {
    return { category: 'dotnet', label: '.NET', hints: ['Use .NET SDK and solution/project structure.'] }
  }

  // Web (JS/TS only, no strong backend)
  if (
    (langs.includes('ts') || langs.includes('tsx') || langs.includes('js') || langs.includes('jsx')) &&
    (mainLanguages['ts'] ?? 0) + (mainLanguages['tsx'] ?? 0) + (mainLanguages['js'] ?? 0) + (mainLanguages['jsx'] ?? 0) > 0
  ) {
    return {
      category: 'web_js',
      label: 'Web (JS/TS)',
      hints: ['Use package.json scripts (dev, build, start) and framework conventions (Next, Vite, etc.).'],
    }
  }

  // CLI
  if (hasAny(pt, ['cli', 'tool', 'binary']) || hasPath('cmd/') || hasPath('cli')) {
    return { category: 'cli_tool', label: 'CLI / Tool', hints: ['Preserve entrypoints and CLI flags.'] }
  }

  return {
    category: 'generic',
    label: 'Generic (all repo types)',
    hints: [
      'Follow the primary languages and frameworks detected.',
      'Support all common GitHub repo types: web, full-stack, mobile (iOS/Android), AI/ML/LLM, CLI, backend.',
      'Use the appropriate toolchain, build system, and conventions for the stack.',
    ],
  }
}

/** Preview/run guidance per repo type: when to suggest StackBlitz vs Export/local. */
const PREVIEW_RUN_GUIDANCE: Record<RepoTypeCategory, string> = {
  ai_ml_llm: 'Preview/run: StackBlitz is not suited for Python ML runtimes. After build succeeds, direct the user to Export to GitHub or run locally (e.g. pip install -r requirements.txt && python main.py). Do not suggest Run in StackBlitz as the primary way to run this project.',
  ios_swift: 'Preview/run: StackBlitz cannot run native iOS. After build succeeds, direct the user to Export to GitHub or run in Xcode. Do not suggest Run in StackBlitz for this project.',
  android_kotlin: 'Preview/run: StackBlitz cannot run native Android. After build succeeds, direct the user to Export to GitHub or run in Android Studio. Do not suggest Run in StackBlitz for this project.',
  full_stack_js: 'Preview/run: Use Run in StackBlitz when the build succeeds (single root dev script starts both frontend and backend). Otherwise suggest Export or local run.',
  web_js: 'Preview/run: Use Run in StackBlitz when the build succeeds. Suggest Export or local run only when the user asks.',
  python_general: 'Preview/run: StackBlitz is not suited for Python runtimes. After build succeeds, direct the user to Export to GitHub or run locally (pip/poetry install then the repo\'s run command). Do not suggest Run in StackBlitz as the primary way to run.',
  go_backend: 'Preview/run: StackBlitz cannot run Go binaries. Direct the user to Export to GitHub or run locally (go build && ./binary). Do not suggest Run in StackBlitz.',
  rust: 'Preview/run: StackBlitz cannot run Rust binaries. Direct the user to Export to GitHub or run locally (cargo run). Do not suggest Run in StackBlitz.',
  ruby: 'Preview/run: Direct the user to Export or run locally (bundle install && bundle exec ...). Do not suggest Run in StackBlitz as the primary way to run.',
  php: 'Preview/run: Direct the user to Export or run locally (composer install && php -S ...). Do not suggest Run in StackBlitz as the primary way to run.',
  dotnet: 'Preview/run: StackBlitz cannot run .NET. Direct the user to Export to GitHub or run locally (dotnet run). Do not suggest Run in StackBlitz.',
  cli_tool: 'Preview/run: CLI projects run locally or in CI. Direct the user to Export to GitHub or run locally. Do not suggest Run in StackBlitz for CLI-only projects.',
  game_web: 'Preview/run: Use Run in StackBlitz when the build succeeds (web-based 2D/3D). For heavy 3D or native engines, suggest Export or local run.',
  generic: 'Preview/run: If the stack is web (JS/TS), suggest Run in StackBlitz after build succeeds. Otherwise suggest Export or local run.',
}

/** Expected install/dev/build commands per type so GRIP does not suggest wrong commands (e.g. npm for Python). */
const EXPECTED_COMMANDS: Record<RepoTypeCategory, string> = {
  ai_ml_llm: 'Expected commands: pip install -r requirements.txt (or poetry install); run command per repo (e.g. python main.py). Do not suggest npm install unless the repo also has Node.',
  ios_swift: 'Expected commands: Xcode build and run (or xcodebuild). Do not suggest npm install or npm run.',
  android_kotlin: 'Expected commands: ./gradlew assembleDebug or Android Studio run. Do not suggest npm install or npm run.',
  full_stack_js: 'Expected commands: npm install (or pnpm/yarn), then npm run dev (or the repo\'s single root dev script).',
  web_js: 'Expected commands: npm install (or pnpm/yarn), npm run dev, npm run build.',
  python_general: 'Expected commands: pip install -r requirements.txt or poetry install; then the repo\'s run command. Do not suggest npm install unless the repo has Node.',
  go_backend: 'Expected commands: go mod download, go build, go run . Do not suggest npm install.',
  rust: 'Expected commands: cargo build, cargo run. Do not suggest npm install.',
  ruby: 'Expected commands: bundle install, bundle exec ... Do not suggest npm install unless the repo has Node.',
  php: 'Expected commands: composer install, php -S ... or the repo\'s server command. Do not suggest npm install unless the repo has Node.',
  dotnet: 'Expected commands: dotnet restore, dotnet build, dotnet run. Do not suggest npm install.',
  cli_tool: 'Expected commands: per repo (e.g. go run ., cargo run, python -m cli). Do not suggest npm install unless the CLI is Node-based.',
  game_web: 'Expected commands: npm install (or pnpm/yarn), npm run dev, npm run build. Preserve WebGL/Canvas and asset loading (e.g. glTF, textures).',
  generic: 'Expected commands: follow the repo\'s package manager and scripts (npm/pip/go/cargo/bundle/composer/dotnet). Do not assume npm for non-Node repos.',
}

/** Mandatory GRIP rules text per category for injection into system prompt. */
export function getMandatoryRepoTypeRules(category: RepoTypeCategory, label: string, hints: string[]): string {
  const base = `**Detected repo type: ${label}.** You MUST handle this stack correctly—not as a one-off web app.`
  const bulletHints = hints.map((h) => `- ${h}`).join('\n')

  const byCategory: Record<RepoTypeCategory, string> = {
    ai_ml_llm: `${base}
- Preserve and use the project's AI/ML/LLM stack (e.g. PyTorch, TensorFlow, LangChain, OpenAI/Anthropic SDKs). Do NOT remove or replace model-related code or switch to a different ML framework unless the user asks.
- Keep dependencies (transformers, torch, tensorflow, langchain, etc.) and configs (model names, token limits, API keys) intact. Add new code that fits the existing patterns.
- When adding features: use the same framework and conventions (e.g. pipelines, agents, prompts) as the rest of the repo.`,
    ios_swift: `${base}
- Generate and edit Swift code only. Use SwiftUI or UIKit as the repo does. Do NOT suggest React Native or web as the primary solution unless the user explicitly asks.
- Respect Xcode project structure: targets, schemes, Info.plist, entitlements. Do not break the project file or bundle IDs.
- When adding screens or features: follow Apple HIG and the repo's existing patterns (navigation, state, assets).`,
    android_kotlin: `${base}
- Generate and edit Kotlin (or Java) code only. Use the repo's build system (Gradle/KTS). Do NOT suggest cross-platform or web as the primary solution unless the user asks.
- Respect Android project layout: app/src/main, manifests, resources. Do not break Gradle or package names.
- When adding activities/screens: follow Material Design and the repo's existing patterns (Jetpack, Compose, or XML).`,
    full_stack_js: `${base}
- There is both a frontend and a backend. Implement features end-to-end when relevant (API route + client usage). Keep a single root dev script that starts both (e.g. concurrently) so Run in StackBlitz works.
- Keep API contracts and env vars in sync. Do not change one side without updating the other when they share types or endpoints.`,
    web_js: `${base}
- Use the repo's frontend stack (React, Next, Vite, etc.) and package.json scripts. Ensure dev/build/start work and dependencies match imports.`,
    python_general: `${base}
- Use Python 3 and the repo's layout (pyproject.toml, requirements.txt, or setup.py). Preserve virtualenv/poetry usage. Do NOT suggest npm install or Node-based run unless the repo already has Node.`,
    go_backend: `${base}
- Use Go modules (go.mod) and standard layout (cmd/, internal/, pkg/). Preserve build and run commands. Do NOT suggest npm install.`,
    rust: `${base}
- Use Cargo (Cargo.toml) and crate layout. Preserve dependencies and features. Do NOT suggest npm install.`,
    ruby: `${base}
- Use Bundler (Gemfile) and the repo's framework (Rails, Sinatra, etc.). Do NOT suggest npm install unless the repo has Node.`,
    php: `${base}
- Use Composer and the repo's framework (Laravel, etc.). Preserve config and routing. Do NOT suggest npm install unless the repo has Node.`,
    dotnet: `${base}
- Use .NET SDK and solution/project structure (.csproj, .sln). Preserve target framework and packages. Do NOT suggest npm install.`,
    cli_tool: `${base}
- Preserve CLI entrypoints, flags, and subcommands. Do NOT turn the project into a web app unless the user asks. Do not suggest Run in StackBlitz for CLI-only projects.`,
    game_web: `${base}
- Preserve the project's rendering stack (Three.js, React Three Fiber, Babylon.js, Canvas 2D, etc.). Keep asset paths, scene structure, animations, and high-quality image/2D/3D model usage. Use reference repos for patterns and structure only; implement in new code.`,
    generic: `${base}
- Follow primary languages and frameworks. Support all common GitHub repo types (web, full-stack, mobile, AI/ML, CLI). Use the appropriate toolchain and conventions. Do not assume npm for non-Node repos.`,
  }

  const rules = byCategory[category]
  const preview = PREVIEW_RUN_GUIDANCE[category]
  const commands = EXPECTED_COMMANDS[category]
  return `${rules}\n${bulletHints}\n- **Preview/run:** ${preview}\n- **Commands:** ${commands}`
}

/**
 * Short one-line summary for plan generation so phases and tasks are scoped to the detected stack.
 * Used in plan context so the plan generator sees "Detected repo type: X. Expected commands: Y."
 */
export function getRepoTypeSummary(category: RepoTypeCategory, label: string): string {
  const commands = EXPECTED_COMMANDS[category]
  return `Detected repo type: ${label}. ${commands}`
}

/**
 * Return native mobile category when the project is 100% iOS or Android (no in-browser preview).
 * Used by run-build (skip npm), preflight (reject stackblitz), and preview tab (hide StackBlitz CTA).
 */
export function getNativeMobileRepoCategory(input: RepoTypeInput): 'ios_swift' | 'android_kotlin' | null {
  const { category } = detectRepoType(input)
  return category === 'ios_swift' || category === 'android_kotlin' ? category : null
}
