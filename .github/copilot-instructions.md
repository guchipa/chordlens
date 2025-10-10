# Copilot Instructions for ChordLens Web

## Project Overview

- **ChordLens Web** is a Next.js (TypeScript) app for real-time analysis of chords and pitch deviations from just intonation, using the Web Audio API.
- The frontend is in `frontend/` and uses shadcn/ui, Tailwind CSS, React Hook Form, and Zod for UI and validation.
- Audio analysis logic is in `frontend/lib/audio_analysis/` and is decoupled from UI components.

## Key Architecture & Patterns

- **App Entry:** Main UI is in `frontend/app/page.tsx`. This file wires together form input, pitch list management, audio processing, and result display.
- **Component Structure:**
  - UI components: `frontend/components/` (e.g., `TunerMeter.tsx`, `AppFooter.tsx`, `feature/AnalysisControl.tsx`, `feature/AnalysisResult.tsx`)
  - UI primitives: `frontend/components/ui/` (shadcn/ui wrappers)
  - Audio logic: `frontend/lib/audio_analysis/`
  - Constants and schemas: `frontend/lib/constants.ts`, `frontend/lib/schema.ts`
- **State Management:** Uses React hooks (`useState`, `useRef`, `useCallback`, `useEffect`). Pitch list and analysis results are kept in local state.
- **Form Handling:** Uses React Hook Form + Zod. See `FormSchema` in `page.tsx` and usage of `<FormField>`, `<FormItem>`, etc.
- **Audio Processing:**
  - Uses Web Audio API directly in `page.tsx` for microphone input and FFT.
  - Analysis is performed in a loop using `requestAnimationFrame`.
  - `evaluateSpectrum` (from `lib/audio_analysis/justAnalyze.ts`) is the main entry for spectrum analysis.

## Developer Workflows

- **Dev Server:**
  - `cd frontend && npm run dev` (Next.js dev server)
- **Build:**
  - `cd frontend && npm run build`
- **Test:**
  - `cd frontend && npm test` (Jest, see `frontend/__tests__/`)
- **Lint/Format:**
  - `cd frontend && npm run lint` (ESLint)
- **UI:**
  - Uses Tailwind CSS and shadcn/ui. See `tailwind.config.ts` and `components/ui/`.

## Project Conventions

- **Pitch List:** Each pitch is `{ pitchName, octaveNum, isRoot }`. Only one pitch can be root; validation is enforced in audio logic.
- **Analysis Results:** Results are arrays of numbers/null, aligned to the pitch list order.
- **Component Style:** Prefer functional components, hooks, and shadcn/ui patterns. Use Tailwind for layout and color.
- **Error Handling:** User-facing errors (e.g., mic access) are shown via `alert()` or UI messages.
- **Type Safety:** Use Zod schemas for all form data and validation.

## Integration Points

- **Web Audio API:** Used directly for real-time audio input and FFT.
- **shadcn/ui:** All forms and UI controls use shadcn/ui primitives.
- **Vercel:** Deployment target (see README badges).

## Examples

- See `frontend/app/page.tsx` for the main workflow: form input → pitch list update → start/stop audio → analysis loop → result display.
- See `frontend/lib/audio_analysis/calcJustFreq.ts` for pitch/frequency calculation logic.

---

For new features, follow the patterns in `frontend/app/page.tsx` and keep audio logic decoupled from UI. When in doubt, prefer functional, composable components and type-safe data flows.
