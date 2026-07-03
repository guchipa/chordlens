/**
 * KeyValueStorage - プラットフォーム非依存の Key-Value ストレージ抽象
 *
 * コアロジックは localStorage / AsyncStorage / MMKV などの具体実装を知らず、
 * このインターフェースにのみ依存する。
 *
 * 実装例:
 * - Web:          localStorage をそのままラップ (apps/web/lib/presets.ts)
 * - React Native: MMKV / AsyncStorage(同期ラッパー経由)
 * - テスト:       インメモリ Map
 */
export interface KeyValueStorage {
  /** キーに対応する値を返す。存在しなければ null */
  getItem(key: string): string | null;
  /** 値を保存する。容量超過などで失敗した場合は例外を投げてよい */
  setItem(key: string, value: string): void;
  /** キーを削除する */
  removeItem(key: string): void;
}

/**
 * テスト・フォールバック用のインメモリ実装
 */
export function createMemoryStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}
