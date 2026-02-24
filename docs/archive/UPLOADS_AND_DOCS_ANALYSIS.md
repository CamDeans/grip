# Uploads & Doc Usage: Current State and Strengthening Ideas

## Where we are

### 1. **Multiple uploads**

- **Yes.** Users can upload more than one file at a time.
- **API:** `POST /api/projects/[id]/uploads` accepts `file` or `files` (multipart); the route loops over all provided files and processes each.
- **UI:** Overview "Your uploads" uses `<input type="file" multiple>`, so "Choose images or docs" allows selecting multiple files in one go.
- **Limit:** No count limit on number of uploads; only a **per-file size limit** (4MB) in `uploadValidation.ts`.

### 2. **What gets stored**

- **Types:** Images (PNG/JPEG/GIF/WEBP/ICO/BMP) and reference docs (PDF, TXT, MD).
- **Paths:** Images → `public/` by default; docs → `docs/`. Optional form field `path` can override.
- **Metadata:** Each upload has `metadata.generatedBy: 'user_upload'`, `metadata.purpose: 'image' | 'reference_doc'`, and `metadata.mimeType`.
- **Content:** Images stored as base64; PDF as base64; TXT/MD as UTF-8 string. All stored in `projectFiles` (main) or `legalSandboxFiles` (sandbox).

### 3. **Mandatory usage rules for docs**

- **Global rule only.** In the enhanced-chat system prompt we say:
  - "The user has uploaded images and/or reference docs for this project. **You MUST use them** in your code and implementation."
  - Images: use paths in `<img>`, CSS `url()`, asset imports.
  - Reference docs: "Use them for requirements, copy, or specs; incorporate or reference their content."
- **No per-doc mandatory rules.** There is no way to mark a specific doc as "required for build" or "optional reference."
- **No user-written usage rules.** Users cannot add text like "Use spec.pdf as the source of truth for API shapes" or "brand-guide.md defines colors."

### 4. **Who decides usage: GRIP vs user**

- **Largely GRIP.** We only send **paths and filenames** to the model, not per-file instructions.
- **What GRIP sees:** Two lines in the system prompt, for example:
  - `Images (use these paths in your code): public/logo.png, public/hero.jpg.`
  - `Reference docs (use for requirements or copy): docs/spec.txt, docs/brand.md.`
- **What GRIP does not see:**
  - The actual **content** of any reference doc (no text from .txt/.md, no PDF text).
  - Any **user-supplied description** of how to use each doc (e.g. "use for API spec", "use for hero copy").
- So GRIP infers usage from path/filename only; the user has no way to give clear, per-doc explanations.

### 5. **Doc analysis (text + user context)**

- **No doc content in context.** Reference-doc **content** is never sent to the model. We store it (TXT/MD as text, PDF as base64) but do not include it in the enhanced-chat system prompt.
- **No “doc + user note” flow.** There is no place for the user to attach extra detail for a doc (e.g. "Focus on section 2 for acceptance criteria" or "This is the main API spec; prioritize it over others").
- **Result:** For docs, GRIP only knows that certain paths exist and is told to "use for requirements or copy" without seeing the text or any user guidance.

### 6. **Parity**

- Main project uploads: `POST/GET /api/projects/[id]/uploads` → `projectFiles`, `metadata.generatedBy: 'user_upload'`.
- Sandbox: `POST/GET /api/projects/[id]/legal-sandbox/uploads` → `legalSandboxFiles`, same metadata.
- Enhanced chat uses the same logic for both (different collection, same summary format).

---

## Gaps and risks

| Area | Gap | Risk |
|------|-----|------|
| Doc content | Doc text never sent to model | GRIP cannot actually use requirements/copy from docs; only knows paths. |
| Per-doc usage | No user instructions per file | Ambiguous how each doc should be used; GRIP guesses from filename. |
| Mandatory rules | Only global "MUST use" | Cannot mark some docs as required vs optional; no priority. |
| Doc + user note | No “extra detail” for a doc | User cannot say "focus on section X" or "this is the main spec." |
| Token/scale | No cap on upload count; no token budget for doc content | Many/large docs could blow context if we add content later. |

---

## Ideas for strengthening

### A. **Include reference-doc content in context (high impact)**

- For **TXT and MD:** Include content (or a truncated/summarized version) in the system prompt under "User uploads," e.g. per doc: `[docs/spec.md]\n{content}`.
- **Token cap:** Truncate or summarize per doc (e.g. first N chars or a short summary) so total upload context stays within a budget (e.g. 8K–16K tokens).
- **PDF:** Either skip content for now, or add server-side text extraction (e.g. pdf-parse) and send extracted text with the same token cap.

**Effect:** GRIP can actually read and use requirements/copy from docs instead of only paths.

### B. **Per-file “How should GRIP use this?” (user clarity)**

- Add an optional **usage instruction** per upload (e.g. one line or short paragraph).
- **API:** Extend POST body or form to accept per-file fields, e.g. `usageInstruction` or `purposeDescription`, and store in `metadata.usageInstruction` (or similar).
- **UI:** In Overview "Your uploads," allow editing or adding a short "Usage note" per file (and show it in the list).
- **Prompt:** In `userUploadsSummary`, for each doc (and optionally image) include that note, e.g. `docs/spec.pdf — User: "Use as main API spec; prioritize over other docs."`

**Effect:** User gives clear explanations per doc; GRIP knows how each file should be used.

### C. **Mandatory vs optional and priority**

- Add optional **flags** per upload, e.g. `metadata.requiredForBuild: boolean`, `metadata.priority: 'high' | 'normal' | 'low'` (or similar).
- **Prompt:** Tell GRIP which uploads are "required for build" and which are "optional reference," and optionally priority order.
- **UI:** Checkbox or dropdown per file: "Required for build" / "Optional reference," and optionally "Priority."

**Effect:** Clear mandatory usage rules and priority without overloading the prompt.

### D. **Doc + user note (extra detailed communication)**

- Allow a **per-doc “User note”** (free text) that is always shown next to that doc in the prompt, e.g. "Focus on section 2 for acceptance criteria" or "Ignore appendix; use only chapters 1–3."
- Can be the same as or in addition to the per-file "usage instruction" (B); store in `metadata.userNote` or extend `metadata.usageInstruction`.
- **Prompt:** When including doc content (A), format as: `[path] User note: "...". Content: ...`

**Effect:** User can align GRIP with specific sections or clarify how to use a doc beyond a one-line purpose.

### E. **Upload usage rules (global)**

- Add a single **project-level** "Upload usage rules" or "Doc usage rules" text (e.g. in Overview or project settings): e.g. "All reference docs must be used; prioritize spec.pdf for API design; brand.md for copy only."
- Store on project (e.g. `project.uploadUsageRules` or in existing ideation/settings).
- **Prompt:** Append this block to the "User uploads" section when present.

**Effect:** One place for mandatory/global rules and priorities without touching every file.

### F. **Limits and token budget**

- **Count:** Optional soft cap on number of uploads per project (e.g. 20) to avoid abuse and keep listing manageable.
- **Doc content:** When adding content to context (A), enforce a **total token budget** for all upload text (e.g. 12K tokens); truncate or summarize oldest/largest docs if over.

---

## Suggested order of work

1. **Short term (quick wins)**  
   - **B** (per-file usage instruction) + **E** (global upload usage rules).  
   - No doc content yet; just clearer instructions so GRIP and the user agree on how uploads are used.

2. **Medium term (high impact)**  
   - **A** (include TXT/MD content in context with token cap).  
   - Then **D** (per-doc user note) so "doc analysis" includes both text and user-directed focus.

3. **As needed**  
   - **C** (required/optional + priority) for stricter mandatory usage.  
   - **F** (count limit + token budget) when scaling or adding more doc content.

---

## Files to touch (for implementation)

- **Upload API:** `src/app/api/projects/[id]/uploads/route.ts`, `src/app/api/projects/[id]/legal-sandbox/uploads/route.ts` — accept and store `usageInstruction` / `userNote` / `requiredForBuild` (and optionally global rules if stored on project).
- **Enhanced-chat:** `src/app/api/enhanced-chat/route.ts` — build `userUploadsSummary` from uploads; add doc content (with truncation) for TXT/MD; include per-file notes and global rules.
- **Overview UI:** `src/app/dashboard/projects/[id]/page.tsx` — "Your uploads" list: add optional usage note / required checkbox per file; optional "Upload usage rules" text area for the project.
- **Validation:** `src/lib/uploadValidation.ts` — no change for content; optional: document or enforce max number of uploads per project in API.

This doc can live in the repo as the single place for "where we are" and "how to strengthen" uploads and doc usage for GRIP.
