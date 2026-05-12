/**
 * /experiments フロー用の定数
 */

export const COUNTDOWN_MS = 3000;
export const RECORD_MS = 5000;
export const PRACTICE_MS = 10 * 60 * 1000;

export const CHORD_KEYS = ["Bb", "Cm", "F7"] as const;
export type ChordKey = (typeof CHORD_KEYS)[number];

export type RootNote = "Bb" | "C" | "F";

export const CHORD_ROOT_KEY: Record<ChordKey, RootNote> = {
  Bb: "Bb",
  Cm: "C",
  F7: "F",
};

export const CHORD_LABELS: Record<ChordKey, string> = {
  Bb: "B♭ major",
  Cm: "C minor",
  F7: "F7",
};

export const CONDITIONS = ["with", "without"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const SESSION_STORAGE_KEY = "chordlens-experiment-session";
export const PRESETS_BACKUP_KEY_PREFIX = "chordlens-presets-backup-";
export const PRESETS_STORAGE_KEY = "chordlens-presets";
