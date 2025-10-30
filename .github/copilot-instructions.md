# Copilot Instructions for ChordLens Web

## Project Overview

- **ChordLens Web** is a Next.js (TypeScript) app for real-time chord and pitch analysis using Web Audio API.
- Project root contains the Next.js app (no `frontend/` subdirectory).
- Uses shadcn/ui, Tailwind CSS, React Hook Form, and Zod.

## Key Architecture & Patterns

- **App Entry:** `app/page.tsx`
- **Components:** `components/` (UI) and `components/ui/` (shadcn/ui primitives)
- **Audio Logic:** `lib/audio_analysis/`
- **Constants & Schemas:** `lib/constants.ts`, `lib/schema.ts`

## Developer Workflows

- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Test:** `npm test`
- **Lint:** `npm run lint`

## Paths

- All imports use `@/*` (e.g., `@/components/ui/button`)
- `@/` maps to project root

## Examples

- Main workflow: `app/page.tsx`
- Audio analysis: `lib/audio_analysis/calcJustFreq.ts`