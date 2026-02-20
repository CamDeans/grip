/**
 * Styling reference repositories for GRIP plan and chat prompts.
 * Injected in the middle (plan context stack guidance) and in enhanced-chat
 * so GRIP receives styling requirements from shadcn-ui/ui and tailwindlabs/headlessui.
 */

export const STYLING_REFERENCE_REPOS = [
  { owner: 'shadcn-ui', name: 'ui', label: 'shadcn/ui' },
  { owner: 'tailwindlabs', name: 'headlessui', label: 'Headless UI' },
] as const

/**
 * Styling requirements text for Claude/GRIP prompts. Derived from
 * https://github.com/shadcn-ui/ui and https://github.com/tailwindlabs/headlessui
 * so generated UIs follow accessibility, Tailwind, and component best practices.
 */
export const STYLING_REQUIREMENTS_FOR_GRIP = `
**Styling reference (use for web/UI projects):** Follow patterns from **shadcn-ui/ui** (https://github.com/shadcn-ui/ui) and **tailwindlabs/headlessui** (https://github.com/tailwindlabs/headlessui).

- **shadcn/ui:** Copyable components built with Radix UI primitives + Tailwind CSS. Use composition over abstraction; style with Tailwind utility classes; ensure full keyboard navigation, focus management, and ARIA where needed. Prefer \`cn()\` or \`clsx\` + \`tailwind-merge\` for class merging. Do not ship a separate component library—implement or adapt the patterns (Button, Card, Dialog, Dropdown, Form, etc.) so they match the project's design tokens and Tailwind config.
- **Headless UI:** Unstyled, accessible components (Dialog, Listbox, Menu, Popover, Transition, etc.) that work with Tailwind. Use Headless UI for behavior and accessibility; style with Tailwind classes. Ensure focus trap, escape key, and aria-* attributes are correct. Prefer \`@headlessui/react\` when the project uses React and Tailwind.
- **Tailwind CSS:** Use the project's Tailwind config (theme, colors, spacing). Prefer utility-first classes; use \`@apply\` only in component-level CSS when it reduces duplication. Keep a consistent design system (e.g. primary/secondary/muted, border-radius, shadows) across pages and components.
- **Accessibility:** All interactive components must be keyboard-accessible, have visible focus states, and use appropriate ARIA (roles, labels, live regions). Follow WCAG 2.1 AA where feasible.
`.trim()
