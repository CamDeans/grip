# GRIP: Mobile-First Builds and Preview Strategy

This document is the **concrete plan** for how GRIP handles 100% iOS, 100% Android, and Expo/React Native (mobile-first) builds, and how preview aligns with the web StackBlitz strategy.

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
- **Native iOS/Android:** No `xcodebuild` or `./gradlew` in GRIP. The "build" phase in the in-flight modal is npm-based; for native iOS/Android we would need either (a) skip run-build and show "Export and open in Xcode/Android Studio", or (b) future: run gradle/xcodebuild in CI or hosted agents (out of scope for this plan).

### 1.3 Preview (StackBlitz) today

- **Preview tab** and **Open in StackBlitz** use `openInStackBlitz()` → preflight (target=stackblitz) → export-files → `@stackblitz/sdk` openProject. StackBlitz runs the project in the browser (Node/npm).
- **Preflight** uses `validatePackageJsonForStackBlitz()` which infers stack from files; for Expo it suggests adding react-native-web and react-dom so web target works.
- So **Expo projects** can be previewed in StackBlitz **if** they have a web target (expo start --web). Native-only iOS/Android cannot run in StackBlitz.

---

## 2. Unified strategy: mobile-first builds and preview (concrete plan)

### 2.1 Three mobile-related stacks

| Stack | Description | Build in GRIP | Preview strategy (like StackBlitz for web) |
|-------|--------------|---------------|--------------------------------------------|
| **Expo (React Native)** | 100% Expo/RN app (expo, react-native in package.json; no next/vite). | npm install + `expo export` or `expo start --web` (or npm run build if script exists). Run-main/sandbox already use npm; ensure package.json has correct Expo scripts. | **StackBlitz:** Use same flow as web. StackBlitz runs Node; Expo web runs there. Preflight: ensure Expo projects have web deps (react-native-web, react-dom) so "Run in StackBlitz" launches expo start --web. **Alternative:** Link to **Expo Snack** (snack.expo.dev) for in-browser device preview; optional "Open in Snack" button that passes export URL or bundle. |
| **Native iOS (Swift/SwiftUI)** | 100% native iOS (Package.swift, Xcode). | GRIP does **not** run xcodebuild (no macOS/Xcode in server). Build phase: **validate** that the project has the expected structure (Package.swift or .xcodeproj, Info.plist) and **do not run** npm build. Show "Build: N/A (native iOS). Export and open in Xcode to run." In-flight modal: mark build step as "skipped" or "not applicable" for native iOS and show done when file generation succeeds. | **No in-browser preview.** Preview tab: show **"Export to GitHub"** and **"Open in Xcode"** (or "Download and open in Xcode") as primary actions. Optional: link to **Xcode Cloud** or **TestFlight** after export; or "Run on Simulator" instructions (local only). |
| **Native Android (Kotlin)** | 100% native Android (Gradle, app/src/main). | GRIP does **not** run Gradle (no JDK/android-sdk in server). Build phase: **validate** structure (build.gradle, AndroidManifest.xml) and **do not run** npm build. Show "Build: N/A (native Android). Export and open in Android Studio to run." In-flight modal: mark build step skipped for native Android; show done when file generation succeeds. | **No in-browser preview.** Preview tab: show **"Export to GitHub"** and **"Open in Android Studio"** (or "Download and open in Android Studio"). Optional: link to **Android App Bundle** or **Play Console** instructions; or "Run on Emulator" instructions (local only). |

### 2.2 Implementation checklist (concrete)

1. **Stack detection**
   - Keep **repo type** (ios_swift, android_kotlin) from structured analysis and file paths.
   - Keep **inferred stack** (expo, next, vite, …) from package.json + paths in packageJsonRequirementsService and highLevelFileContextService.
   - For **mobile-first** UX: when repo type is `ios_swift` or `android_kotlin`, treat project as native mobile (no StackBlitz preview; build step N/A). When inferred stack is `expo` (and repo is not native iOS/Android), treat as Expo (StackBlitz for web target + optional Snack).

2. **Plan and prompts**
   - Already: getMandatoryRepoTypeRules(ios_swift) and getMandatoryRepoTypeRules(android_kotlin) inject iOS/Android rules and PREVIEW_RUN_GUIDANCE.
   - Add **Expo-specific** guidance in plan/chat when stack is Expo: "Preview: Use Run in StackBlitz (Expo web) or Export and open in Expo Go / Snack. Ensure package.json has scripts for expo start --web and expo export."

3. **Run/build (in-flight modal)**
   - **Web (next, vite, cra, generic):** Current behavior: npm install + npm run build (or dev). No change.
   - **Expo:** Same: npm install + npm run build (or expo export). Ensure runMainProject/runSandboxProject use script from package.json; Expo template should have build/dev scripts. No change if scripts exist.
   - **Native iOS:** run-build API should detect ios_swift (e.g. from project files or repo type stored on project). Return success: true with message "Native iOS: no server build. Export and open in Xcode to run." so in-flight modal can show done without running npm build.
   - **Native Android:** Same: return success with "Native Android: no server build. Export and open in Android Studio to run."

4. **Preflight**
   - **StackBlitz target:** For ios_swift and android_kotlin, preflight for target=stackblitz should **fail** with a clear message: "This project is native iOS (or Android). StackBlitz cannot run it. Use Export to GitHub and open in Xcode (or Android Studio) to run." So the Preview tab doesn’t offer "Run in StackBlitz" for native mobile.
   - **Expo:** Preflight for stackblitz should pass when package.json has Expo scripts and (for web) react-native-web/react-dom when we validate; already partially there in validatePackageJsonForStackBlitz.

5. **Preview tab UI**
   - **Web (Next, Vite, etc.):** Show "Run in StackBlitz" as primary. (Current.)
   - **Expo:** Show "Run in StackBlitz (Expo web)" and optionally "Open in Expo Snack" (link to Snack with repo or bundle URL if we support it).
   - **Native iOS:** Hide or disable "Run in StackBlitz". Show "Export to GitHub" and "Download ZIP" with copy: "Open in Xcode to run on simulator or device."
   - **Native Android:** Same: "Export to GitHub" and "Download ZIP" with "Open in Android Studio to run on emulator or device."

6. **Mandatory rules (concrete)**
   - **One stack only:** Already enforced (no Next + Expo mix). For mobile-first: when the user chooses or repo is detected as 100% iOS or 100% Android, plan and file generation must output only that stack (Swift/Xcode or Kotlin/Gradle).
   - **Expo only for Expo apps:** Already enforced. For 100% Expo projects, include expo and react-native; for web, never add them.
   - **Mobile preview parity:** "For Expo projects, GRIP must support in-browser preview via StackBlitz (Expo web) so the user gets an experience similar to web. For native iOS/Android, GRIP must not suggest StackBlitz; instead direct the user to Export and open in Xcode/Android Studio."

---

## 3. Where each part is enforced (code locations)

| Area | Location | Change / addition |
|------|----------|-------------------|
| Repo type | `repoTypeDetection.ts` | Already has ios_swift, android_kotlin and PREVIEW_RUN_GUIDANCE. No change. |
| Inferred stack | `packageJsonRequirementsService.ts`, `highLevelFileContextService.ts` | Already have expo. No change. |
| Plan/chat rules | `getMandatoryRepoTypeRules`, enhanced-chat, legal-sandbox | Already inject iOS/Android rules. Optional: add explicit Expo preview line when category is inferred as Expo (e.g. from package.json in context). |
| run-build API | `run-build` route (e.g. calls runMainProject) | **Add:** If project is detected as native iOS or native Android (e.g. from analysis or stored repoType), return 200 with success: true and message "Native iOS/Android: export and open in Xcode/Android Studio." without running npm build. |
| Preflight | `preflight/route.ts` | **Add:** For target=stackblitz, if project is native iOS or native Android, return ok: false with message that StackBlitz cannot run native mobile; suggest Export. |
| Preview page | `dashboard/projects/[id]/preview/page.tsx` | **Add:** Infer or receive stack/repoType (from API). For ios_swift/android_kotlin: hide or disable "Run in StackBlitz"; show Export + Download with mobile-specific copy. For Expo: show "Run in StackBlitz (Expo web)" and optional Snack link. |
| Docs | `CONCRETE-RULES-AND-ALIGNMENT.md`, `.cursorrules` | **Add:** Rule or section "mobile-first-builds-and-preview" referencing this plan and the table above. |

---

## 4. Summary

- **100% iOS / 100% Android:** GRIP already detects them and injects rules. Preview strategy: **no StackBlitz**; preflight fails for stackblitz with a clear message; Preview tab emphasizes **Export to GitHub** and **Open in Xcode/Android Studio**. Build step in automation: **N/A** (return success and message so in-flight modal can complete).
- **Expo (mobile-first JS):** Same as today for build (npm + Expo scripts). Preview strategy: **StackBlitz for Expo web** (same as web apps); preflight ensures Expo web deps; optional **Expo Snack** link for device-like preview.
- **Concrete plan:** Implement run-build skip for native mobile, preflight rejection for stackblitz on native mobile, and Preview tab stack-aware CTAs; document in CONCRETE-RULES and .cursorrules.
