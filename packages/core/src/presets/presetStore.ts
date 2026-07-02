/**
 * presetStore - プリセット管理のコアロジック
 *
 * ストレージ実装 (localStorage / AsyncStorage 等) は KeyValueStorage として
 * 注入されるため、このモジュール自体はプラットフォーム非依存。
 * Web 向けのバインディングは apps/web/lib/presets.ts。
 */
import type { Pitch, PitchPreset, PresetsData } from "../types";
import type { KeyValueStorage } from "../adapters/storage";

export const PRESETS_STORAGE_KEY = "chordlens-presets";
export const MAX_PRESETS = 20;
export const PRESETS_SCHEMA_VERSION = 1;

export type SavePresetResult =
  | { success: true }
  | { success: false; error: string };

export interface PresetStoreOptions {
  storage: KeyValueStorage;
  /** ID 生成器。省略時は crypto.randomUUID (利用可能な場合) */
  generateId?: () => string;
  /** 現在時刻 (ms)。テスト用に差し替え可能 */
  now?: () => number;
}

export interface PresetStore {
  getPresets(): PitchPreset[];
  savePreset(name: string, pitchList: Pitch[]): SavePresetResult;
  deletePreset(id: string): boolean;
  getPresetById(id: string): PitchPreset | null;
  isDuplicatePresetName(name: string): boolean;
}

function defaultGenerateId(): string {
  const cryptoObj = (
    globalThis as { crypto?: { randomUUID?: () => string } }
  ).crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  // crypto.randomUUID が使えない環境向けのフォールバック (UUID v4 形式)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createPresetStore(options: PresetStoreOptions): PresetStore {
  const { storage, generateId = defaultGenerateId, now = Date.now } = options;

  function getPresets(): PitchPreset[] {
    try {
      const data = storage.getItem(PRESETS_STORAGE_KEY);
      if (!data) {
        return [];
      }

      const parsed: PresetsData = JSON.parse(data);

      // バージョンチェック
      if (parsed.version !== PRESETS_SCHEMA_VERSION) {
        console.warn(
          `Schema version mismatch: expected ${PRESETS_SCHEMA_VERSION}, got ${parsed.version}`
        );
        return [];
      }

      // データの妥当性チェック
      if (!Array.isArray(parsed.presets)) {
        console.error("Invalid presets data format");
        return [];
      }

      // 作成日時の新しい順でソート
      return parsed.presets.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Failed to load presets:", error);
      return [];
    }
  }

  function savePreset(name: string, pitchList: Pitch[]): SavePresetResult {
    // バリデーション
    if (!name || name.trim().length === 0) {
      return { success: false, error: "プリセット名を入力してください" };
    }

    if (name.length > 30) {
      return {
        success: false,
        error: "プリセット名は30文字以内で入力してください",
      };
    }

    if (pitchList.length === 0) {
      return { success: false, error: "構成音が登録されていません" };
    }

    try {
      const presets = getPresets();

      // 上限チェック（同名の上書きの場合は除外）
      const existingIndex = presets.findIndex((p) => p.name === name);
      if (existingIndex === -1 && presets.length >= MAX_PRESETS) {
        return {
          success: false,
          error: `プリセットは最大${MAX_PRESETS}件まで保存できます。古いプリセットを削除してください。`,
        };
      }

      // 新しいプリセットを作成
      const newPreset: PitchPreset = {
        id: existingIndex === -1 ? generateId() : presets[existingIndex].id,
        name: name.trim(),
        pitchList: JSON.parse(JSON.stringify(pitchList)), // ディープコピー
        createdAt: now(),
      };

      // 既存のプリセットを上書き、または新規追加
      let updatedPresets: PitchPreset[];
      if (existingIndex !== -1) {
        updatedPresets = [...presets];
        updatedPresets[existingIndex] = newPreset;
      } else {
        updatedPresets = [newPreset, ...presets];
      }

      // 保存
      const data: PresetsData = {
        version: PRESETS_SCHEMA_VERSION,
        presets: updatedPresets,
      };

      storage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(data));
      return { success: true };
    } catch (error) {
      console.error("Failed to save preset:", error);

      // ストレージ容量超過のチェック (Web では DOMException "QuotaExceededError")
      if (error instanceof Error && error.name === "QuotaExceededError") {
        return {
          success: false,
          error:
            "ストレージ容量が不足しています。古いプリセットを削除してください。",
        };
      }

      return { success: false, error: "プリセットの保存に失敗しました" };
    }
  }

  function deletePreset(id: string): boolean {
    try {
      const presets = getPresets();
      const updatedPresets = presets.filter((p) => p.id !== id);

      if (presets.length === updatedPresets.length) {
        // 削除対象が見つからなかった
        return false;
      }

      const data: PresetsData = {
        version: PRESETS_SCHEMA_VERSION,
        presets: updatedPresets,
      };

      storage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Failed to delete preset:", error);
      return false;
    }
  }

  function getPresetById(id: string): PitchPreset | null {
    const presets = getPresets();
    return presets.find((p) => p.id === id) || null;
  }

  function isDuplicatePresetName(name: string): boolean {
    const presets = getPresets();
    return presets.some((p) => p.name === name.trim());
  }

  return {
    getPresets,
    savePreset,
    deletePreset,
    getPresetById,
    isDuplicatePresetName,
  };
}

/**
 * 相対的な日時文字列を取得
 * @param timestamp Unix timestamp (ミリ秒)
 */
export function getRelativeTimeString(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) {
    return "たった今";
  } else if (minutes < 60) {
    return `${minutes}分前`;
  } else if (hours < 24) {
    return `${hours}時間前`;
  } else if (days < 7) {
    return `${days}日前`;
  } else if (weeks < 4) {
    return `${weeks}週間前`;
  } else {
    return new Date(timestamp).toLocaleDateString("ja-JP");
  }
}
