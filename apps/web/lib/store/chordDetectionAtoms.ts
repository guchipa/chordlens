/**
 * Jotai Atoms - 構成音自動追従 (basic-pitch)
 *
 * トグル UI は SettingsDrawer 内 (閉じるとアンマウントされる) に置くため、
 * 追従ループ本体は App 直下の useChordFollow が常駐して回す。
 * 両者の間の状態共有を atom で行う。
 */
import { atom } from "jotai";

/** 自動追従モードの ON/OFF (マイク権限が絡むため永続化しない) */
export const chordFollowEnabledAtom = atom<boolean>(false);

/**
 * 追従ループの現在の状態
 * - idle:       追従 OFF
 * - listening:  音量閾値を超える入力を待機中
 * - recording:  録音中
 * - processing: basic-pitch で推定中
 */
export type ChordFollowStatus = "idle" | "listening" | "recording" | "processing";

export const chordFollowStatusAtom = atom<ChordFollowStatus>("idle");

/** 追従ループのエラーメッセージ */
export const chordFollowErrorAtom = atom<string | null>(null);
