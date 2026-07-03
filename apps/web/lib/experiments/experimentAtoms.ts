/**
 * /experiments フローの Jotai atoms。sessionStorage に永続化する。
 */
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { SESSION_STORAGE_KEY } from "./constants";
import type { ExperimentSessionState } from "./types";

// メインウィンドウの sessionStorage を取得する（iframe スコープ対応）
const getSessionStorage = (): Storage | typeof undefinedStorage => {
  try {
    // SSR チェック
    if (typeof window === "undefined") return undefinedStorage;
    // 利用可能な sessionStorage を返す
    return window.sessionStorage;
  } catch {
    return undefinedStorage;
  }
};

const sessionStorageBackend = createJSONStorage<ExperimentSessionState | null>(
  getSessionStorage
);

// SSR／テスト環境向けのダミー Storage。
const undefinedStorage: Storage = {
  get length() {
    return 0;
  },
  clear() {},
  getItem() {
    return null;
  },
  key() {
    return null;
  },
  removeItem() {},
  setItem() {},
};

export const experimentSessionAtom = atomWithStorage<
  ExperimentSessionState | null
>(SESSION_STORAGE_KEY, null, sessionStorageBackend);

/** derived atom: 現在 phase (null セッションは "survey" 扱い) */
export const experimentPhaseAtom = atom((get) => {
  const session = get(experimentSessionAtom);
  return session?.phase ?? "survey";
});
