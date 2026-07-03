/**
 * presets - プリセット管理の Web バインディング
 *
 * コアロジックは @chordlens/core/presets/presetStore にあり、
 * ここでは localStorage を KeyValueStorage として注入する。
 * 既存コンポーネントとの互換性のため、従来と同じ関数 API を再エクスポートする。
 */
import {
  createPresetStore,
  getRelativeTimeString,
  type SavePresetResult,
} from "@chordlens/core/presets/presetStore";
import type { KeyValueStorage } from "@chordlens/core/adapters/storage";
import type { Pitch, PitchPreset } from "@chordlens/core/types";

/**
 * localStorageが利用可能かチェック
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__localStorage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const localStorageAdapter: KeyValueStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => {
    localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
  },
};

const store = createPresetStore({ storage: localStorageAdapter });

/**
 * プリセット一覧を取得
 */
export function getPresets(): PitchPreset[] {
  if (!isLocalStorageAvailable()) {
    console.warn("localStorage is not available");
    return [];
  }
  return store.getPresets();
}

/**
 * プリセットを保存
 * @param name プリセット名（1～30文字）
 * @param pitchList 構成音リスト
 * @returns 保存に成功した場合はtrue、失敗した場合はエラーメッセージ
 */
export function savePreset(name: string, pitchList: Pitch[]): SavePresetResult {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: "localStorageが利用できません" };
  }
  return store.savePreset(name, pitchList);
}

/**
 * プリセットを削除
 * @param id プリセットID
 * @returns 削除に成功した場合はtrue
 */
export function deletePreset(id: string): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }
  return store.deletePreset(id);
}

/**
 * 特定のプリセットを取得
 * @param id プリセットID
 */
export function getPresetById(id: string): PitchPreset | null {
  return store.getPresetById(id);
}

/**
 * プリセット名の重複チェック
 * @param name プリセット名
 * @returns 重複している場合はtrue
 */
export function isDuplicatePresetName(name: string): boolean {
  return store.isDuplicatePresetName(name);
}

export { getRelativeTimeString };
