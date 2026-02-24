# GRIP docs — production readiness

For **build alignment and production readiness**, use only:

1. **Concrete rules** — `.cursor/rules/*.mdc`  
   All Cursor rules that define how GRIP must behave (identity, clean-room, repo types, mandatory files, uploads, no mock data, sandbox parity, etc.). These are the source of truth for the build.

2. **Alignment checklist** — [docs/CONCRETE-RULES-AND-ALIGNMENT.md](./CONCRETE-RULES-AND-ALIGNMENT.md)  
   Index of every rule, where it is enforced in code, and how to verify alignment. Run the checklist to keep the codebase aligned with the concrete rules.

**All other .md documentation** has been moved to **docs/archive/** for reference. Do not rely on archived docs for production readiness; use the concrete rules and the alignment doc above.

---

**Before shipping:** Run `npm run lint` and `npm test`; then confirm every item in [CONCRETE-RULES-AND-ALIGNMENT.md](./CONCRETE-RULES-AND-ALIGNMENT.md) is enforced in code.
