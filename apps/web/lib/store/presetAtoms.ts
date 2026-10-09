/**
 * Jotai Atoms - プリセット一覧
 * 設定ドロワー (PresetManager) とメイン画面 (PresetSwitcher) で共有する。
 * 永続化は lib/presets.ts (localStorage) が担い、atom はその読み込みキャッシュ。
 */
import { atom } from "jotai";
import type { PitchPreset } from "@chordlens/core/types";
import { getPresets } from "@/lib/presets";

export const presetsAtom = atom<PitchPreset[]>([]);

/** localStorage から再読み込みして presetsAtom を更新する (保存・削除後や初回マウント時に呼ぶ) */
export const refreshPresetsAtom = atom(null, (_get, set) => {
    set(presetsAtom, getPresets());
});
