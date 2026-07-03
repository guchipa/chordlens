/**
 * 練習ページで一時的に実験用プリセットに差し替えるためのガード関数。
 * ユーザーの既存 presets は backup キーに退避し、終了時に復元する。
 */
import type { PitchPreset, PresetsData, Pitch } from "@chordlens/core/types";
import type { ChordKey } from "./constants";
import { CHORD_KEYS, PRESETS_BACKUP_KEY_PREFIX, PRESETS_STORAGE_KEY } from "./constants";
import type { ChordPitches } from "./types";

const EXPERIMENT_PRESET_NAME: Record<ChordKey, string> = {
  Bb: "__exp__B♭",
  Cm: "__exp__Cm",
  F7: "__exp__F7",
};

const SCHEMA_VERSION = 1;

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem("__exp_ls_test__", "1");
    window.localStorage.removeItem("__exp_ls_test__");
    return true;
  } catch {
    return false;
  }
}

function backupKey(pairId: string): string {
  return `${PRESETS_BACKUP_KEY_PREFIX}${pairId}`;
}

/**
 * 既存 chordlens-presets を backup キーに退避し、
 * 実験用プリセット 3 件のみを chordlens-presets に書き込む。
 */
export function installExperimentPresets(
  pairId: string,
  chordPitches: ChordPitches
): void {
  if (!isLocalStorageAvailable()) return;
  const existing = window.localStorage.getItem(PRESETS_STORAGE_KEY);
  const bk = backupKey(pairId);
  if (window.localStorage.getItem(bk) === null) {
    // すでに backup 済みなら上書きしない（途中でこの関数が再度呼ばれても安全）。
    window.localStorage.setItem(bk, existing ?? "");
  }

  const now = Date.now();
  const presets: PitchPreset[] = CHORD_KEYS.map((chord) => ({
    id: `exp-${pairId}-${chord}`,
    name: EXPERIMENT_PRESET_NAME[chord],
    pitchList: chordPitches[chord] as Pitch[],
    createdAt: now,
  }));

  const data: PresetsData = { version: SCHEMA_VERSION, presets };
  window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(data));
}

/**
 * backup キーからユーザーの元 presets を復元する。
 */
export function restoreUserPresets(pairId: string): void {
  if (!isLocalStorageAvailable()) return;
  const bk = backupKey(pairId);
  const backup = window.localStorage.getItem(bk);
  if (backup === null) return;

  if (backup === "") {
    window.localStorage.removeItem(PRESETS_STORAGE_KEY);
  } else {
    window.localStorage.setItem(PRESETS_STORAGE_KEY, backup);
  }
  window.localStorage.removeItem(bk);
}

export function experimentPresetName(chord: ChordKey): string {
  return EXPERIMENT_PRESET_NAME[chord];
}
