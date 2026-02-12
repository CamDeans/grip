/**
 * Mandatory GRIP build-quality plan.
 * Injected into plan generation and enhanced chat so every build follows the same bar:
 * latest stable libraries, modern UX/UI, clean design, best practices.
 * Reduces token waste by getting the first build right.
 */

export const MANDATORY_GRIP_BUILD_QUALITY = `
## GRIP mandatory build quality (follow every time)

- **Libraries and stack:** Use latest stable versions of dependencies (check current npm/lockfile). Prefer well-maintained, widely adopted libraries. Avoid deprecated or experimental APIs unless the user explicitly requests them.
- **UX/UI:** Apply modern design practices: clear information architecture, consistent spacing and typography, sensible user flows, visual hierarchy, feedback and affordances (loading states, errors, success). Prefer clean, minimal layouts unless the user asks for a specific style. Ensure responsive behavior where relevant (mobile/desktop).
- **Accessibility:** Follow a11y best practices (semantic HTML, ARIA where needed, keyboard navigation, focus management, sufficient contrast). Aim for WCAG 2.1 AA where feasible.
- **Code quality:** Production-minded code: clear naming, separation of concerns, no dead code. Structure that scales (components, hooks, utils). So the first build is maintainable and the user does not waste tokens on rework.
- **User flow:** Design the first build so core user flows work end-to-end (e.g. sign up → main action → outcome). Avoid placeholder-only screens; implement at least one complete path that matches the project goals.
- **Token efficiency:** Deliver a complete, high-quality first build so the user does not need multiple rounds of "fix this" or "add this." Prefer one well-scoped implementation over many partial ones.
`.trim()
