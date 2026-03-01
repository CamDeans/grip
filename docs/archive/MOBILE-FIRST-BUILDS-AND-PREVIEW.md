# GRIP: Mobile-First Builds and Preview Strategy

This document is the **concrete plan** for how GRIP handles 100% iOS, 100% Android, and Expo/React Native (mobile-first) builds, and how preview aligns with the web StackBlitz strategy.

**Source of truth for rules:** `docs/CONCRETE-RULES-AND-ALIGNMENT.md` (Mobile-first builds and preview, rule 23).

---

## 1. How GRIP currently handles iOS, Android, and Expo

### 1.1 Repo type detection (`repoTypeDetection.ts`)

| Stack | Category | Detection | Preview/run guidance today |
|-------|----------|-----------|----------------------------|
| **Native iOS** | `ios_swift` | Package.swift, *.xcodeproj, Swift/SwiftUI in identity/paths | "StackBlitz cannot run native iOS. After build succeeds, direct the user to Export to GitHub or run in Xcode. Do not suggest Run in StackBlitz." |
| **Native Android** | `android_kotlin` | build.gradle, settings.gradle, Kotlin/Java + android paths | "StackBlitz cannot run native Android. After build succeeds, direct the user to Export to GitHub or run in Android Studio." |
| **Expo / React Native** | Not a category | Inferred from **package.json** only: `inferStackFromDepsAndPaths()` returns `expo` when deps include `expo` or `react-native`. Path-based inference (app/, next.config) can override so web projects with stray expo stay web. | Expo projects use npm scripts; `expo start --web` can run in browser. StackBlitz can run Expo **web** target. |

So:

- **100% iOS (Swift/SwiftUI):** Detected as `ios_swift`. Plan and chat get iOS rules (Swift only, Xcode structure). No in-browser preview; PREVIEW_RUN_GUIDANCE says Export or Xcode.
- **100% Android (Kotlin/Java):** Detected as `android_kotlin`. Plan and chat get Android rules (Kotlin, Gradle, app/src/main). No in-browser preview; Export or Android Studio.
- **Expo (React Native):** Treated as a **framework** (highLevelFileContextService, packageJsonRequirementsService), not a repo type category. One-stack rule: if the project is Expo, package.json has only Expo deps; if web, we strip Expo. **Preview:** Expo can run in browser via `expo start --web`, so StackBlitz is a valid preview target for Expo web builds.

### 1.2 Build/run today

- **runMainProject / runSandboxProject:** Only run `npm install` and `npm run build` (or `npm run dev`). So they support **Node-based** projects: Next, Vite, and **Expo** (expo export / expo start).
- **Native iOS/Android:** No `xcodebuild` or `./gradlew` in GRIP. The "build" phase in the in-flight modal is npm-based; for native iOS/Android we skip run-build and return success with message to Export and open in Xcode/Android Studio.

### 1.3 Preview (StackBlitz) today

- **Preview tab** and **Open in StackBlitz** use `openInStackBlitz()` → preflight (target=stackblitz) → export-files → `@stackblitz/sdk` openProject. StackBlitz runs the project in the browser (Node/npm).
- **Preflight** uses `validatePackageJsonForStackBlitz()` which infers stack from files; for Expo it suggests adding react-native-web and react-dom so web target works. For native iOS/Android, preflight returns ok: false with message to use Export + Xcode/Android Studio.
- So **Expo projects** can be previewed in StackBlitz **if** they have a web target (expo start --web). Native-only iOS/Android cannot run in StackBlitz.

---

## 2. Unified strategy: mobile-first builds and preview (concrete plan)

### 2.1 Three mobile-related stacks

| Stack | Description | Build in GRIP | Preview strategy (like StackBlitz for web) |
|-------|--------------|---------------|--------------------------------------------|
| **Expo (React Native)** | 100% Expo/RN app (expo, react-native in package.json; no next/vite). | npm install + `expo export` or `expo start --web` (or npm run build if script exists). Run-main/sandbox already use npm; ensure package.json has correct Expo scripts. | **StackBlitz:** Use same flow as web. StackBlitz runs Node; Expo web runs there. Preflight: ensure Expo projects have web deps (react-native-web, react-dom) so "Run in StackBlitz" launches expo start --web. **Alternative:** Link to **Expo Snack** (snack.expo.dev) for in-browser device preview; optional "Open in Snack" button. |
| **Native iOS (Swift/SwiftUI)** | 100% native iOS (Package.swift, Xcode). | GRIP does **not** run xcodebuild (no macOS/Xcode in server). run-build returns success without npm; in-flight modal shows done. | **No in-browser preview.** Preview tab: show **"Export to GitHub"** and **"Open in Xcode"** (or "Download and open in Xcode") as primary actions. |
| **Native Android (Kotlin)** | 100% native Android (Gradle, app/src/main). | GRIP does **not** run Gradle. run-build returns success without npm; in-flight modal shows done. | **No in-browser preview.** Preview tab: show **"Export to GitHub"** and **"Open in Android Studio"**. |

### 2.2 Enforcement (code locations)

| Area | Location |
|------|----------|
| Repo type | `repoTypeDetection.ts` — ios_swift, android_kotlin, getNativeMobileRepoCategory |
| run-build | `run-build/route.ts` — when native mobile, return success without calling runMainProject |
| Preflight | `preflight/route.ts` — for target=stackblitz and native mobile, return ok: false |
| Preview page | `dashboard/projects/[id]/preview/page.tsx` — isNativeMobile, native-iOS/Android card |
| Project API | GET `/api/projects/[id]` — adds repoCategory from analysis |

---

## 3. Summary

- **100% iOS / 100% Android:** GRIP detects them and injects rules. Preview: no StackBlitz; preflight fails for stackblitz; Preview tab emphasizes Export + Xcode/Android Studio. run-build returns success without npm.
- **Expo (mobile-first JS):** Build uses npm + Expo scripts. Preview: StackBlitz for Expo web; preflight ensures Expo web deps.
- **Concrete rules:** See `docs/CONCRETE-RULES-AND-ALIGNMENT.md` (rule 23, section "Mobile-first builds and preview").
