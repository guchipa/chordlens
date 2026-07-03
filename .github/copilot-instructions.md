# Copilot Instructions for ChordLens

## Project Overview

- **ChordLens** is a Vite + React (TypeScript) app for real-time chord and pitch analysis using Web Audio API.
- pnpm workspaces monorepo: platform-agnostic core logic in `packages/core`, web app in `apps/web`.
- Uses shadcn/ui, Tailwind CSS, Jotai, React Hook Form, and Zod.

## Key Architecture & Patterns

- **Core (platform-agnostic):** `packages/core/src/` — audio analysis (`audio_analysis/`), constants, types, preset store, log CSV. No DOM/browser APIs allowed (enforced by tsconfig without DOM lib). Platform seams are defined as interfaces in `packages/core/src/adapters/`.
- **Web app:** `apps/web/` — entry `src/main.tsx` / `src/App.tsx`, components in `components/` (`ui/` = shadcn/ui primitives), browser-dependent logic in `lib/` (hooks, Jotai store, firebase).
- See `docs/ARCHITECTURE.md` and `docs/MOBILE_MIGRATION.md`.

## Developer Workflows (run at repo root)

- **Dev:** `pnpm dev`
- **Build:** `pnpm build`
- **Test:** `pnpm test` (Vitest; core = Node env, web = jsdom)
- **Lint:** `pnpm lint`
- **Typecheck:** `pnpm typecheck`

## Paths

- Within `apps/web`, imports use `@/*` (e.g., `@/components/ui/button`); `@/` maps to `apps/web/`.
- Core modules are imported as `@chordlens/core/...` (e.g., `@chordlens/core/audio_analysis/justAnalyze`).
- Never import from `apps/web` inside `packages/core`.

## Examples

- Main workflow: `apps/web/src/App.tsx`
- Audio analysis: `packages/core/src/audio_analysis/calcJustFreq.ts`
