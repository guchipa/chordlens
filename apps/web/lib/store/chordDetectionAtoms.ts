/**
 * Jotai Atoms - 構成音自動追従
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
 * - idle:      追従 OFF
 * - listening: 追従中だが音を検出していない (無音)
 * - tracking:  ストリーミング解析で構成音に追従中
 */
export type ChordFollowStatus = "idle" | "listening" | "tracking";

export const chordFollowStatusAtom = atom<ChordFollowStatus>("idle");

/** 追従ループのエラーメッセージ */
export const chordFollowErrorAtom = atom<string | null>(null);

/**
 * 推定中の和音が確定値と食い違っているか (和音の切替中・判定待ち)。
 * この間の偏差は旧和音を基準に計算されているため、フィードバックを
 * 灰色にして誤った赤表示を出さない
 */
export const chordFollowPendingAtom = atom<boolean>(false);

/**
 * 和音の固定 (自動追従の一時停止)。音を直している最中に推定が
 * 切り替わるのを防ぐ。解析と推定は続け、構成音リストへの反映だけを止める。
 * 永続化しない
 */
export const chordFollowLockedAtom = atom<boolean>(false);
