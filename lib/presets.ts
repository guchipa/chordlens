import type { PitchPreset, PresetsData, Pitch } from "@/lib/types";

const STORAGE_KEY = "chordlens-presets";
const MAX_PRESETS = 20;
const SCHEMA_VERSION = 1;

/**
 * UUID v4を生成
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

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

/**
 * プリセット一覧を取得
 */
export function getPresets(): PitchPreset[] {
  if (!isLocalStorageAvailable()) {
    console.warn("localStorage is not available");
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }

    const parsed: PresetsData = JSON.parse(data);

    // バージョンチェック
    if (parsed.version !== SCHEMA_VERSION) {
      console.warn(
        `Schema version mismatch: expected ${SCHEMA_VERSION}, got ${parsed.version}`
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

/**
 * プリセットを保存
 * @param name プリセット名（1～30文字）
 * @param pitchList 構成音リスト
 * @returns 保存に成功した場合はtrue、失敗した場合はエラーメッセージ
 */
export function savePreset(
  name: string,
  pitchList: Pitch[]
): { success: true } | { success: false; error: string } {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: "localStorageが利用できません" };
  }

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
      id: existingIndex === -1 ? generateUUID() : presets[existingIndex].id,
      name: name.trim(),
      pitchList: JSON.parse(JSON.stringify(pitchList)), // ディープコピー
      createdAt: Date.now(),
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
      version: SCHEMA_VERSION,
      presets: updatedPresets,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { success: true };
  } catch (error) {
    console.error("Failed to save preset:", error);

    // QuotaExceededErrorのチェック
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return {
        success: false,
        error:
          "ストレージ容量が不足しています。古いプリセットを削除してください。",
      };
    }

    return { success: false, error: "プリセットの保存に失敗しました" };
  }
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

  try {
    const presets = getPresets();
    const updatedPresets = presets.filter((p) => p.id !== id);

    if (presets.length === updatedPresets.length) {
      // 削除対象が見つからなかった
      return false;
    }

    const data: PresetsData = {
      version: SCHEMA_VERSION,
      presets: updatedPresets,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Failed to delete preset:", error);
    return false;
  }
}

/**
 * 特定のプリセットを取得
 * @param id プリセットID
 */
export function getPresetById(id: string): PitchPreset | null {
  const presets = getPresets();
  return presets.find((p) => p.id === id) || null;
}

/**
 * プリセット名の重複チェック
 * @param name プリセット名
 * @returns 重複している場合はtrue
 */
export function isDuplicatePresetName(name: string): boolean {
  const presets = getPresets();
  return presets.some((p) => p.name === name.trim());
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
