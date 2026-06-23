# Claude / Assistant Handoff

Use `AGENTS.md` as the source of mandatory project instructions.

For fast context, read in this order:

1. `AGENTS.md`
2. `README.md`
3. `requirements.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATA_MODEL.md`
6. `docs/DEVELOPMENT.md`
7. `docs/HANDOFF.md`

Key project reminders:

- This is a Next.js `16.2.9` App Router project. Read local Next docs before
  changing Next APIs.
- `/` is the tool hub and must not be turned back into a redirect.
- `/trainer` is the active 3Style BLD edge trainer.
- The app is local-first and stores cases/preferences in `localStorage`.
- Use the existing hydration-safe `useLocalStorage` hook for persisted state.
- Run `npm run lint` and `npm run build` before handing off.

