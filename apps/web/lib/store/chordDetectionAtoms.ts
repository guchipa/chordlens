/**
 * Jotai Atoms - 構成音自動追従 (basic-pitch)
 *
 * トグル UI は SettingsDrawer 内 (閉じるとアンマウントされる) に置くため、
 * 追従ループ本体は App 直下の useChordFollow が常駐して回す。
 * 両者の間の状態共有を atom で行う。
 */
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
    CHORD_DETECTION_ALGORITHM_DEFAULT,
    type ChordDetectionAlgorithm,
} from "@chordlens/core/constants";

/** 自動追従モードの ON/OFF (マイク権限が絡むため永続化しない) */
export const chordFollowEnabledAtom = atom<boolean>(false);

/** 構成音検出アルゴリズムの選択 (localStorage に永続化) */
export const chordDetectionAlgorithmAtom =
    atomWithStorage<ChordDetectionAlgorithm>(
        "chordlens-chordDetectionAlgorithm",
        CHORD_DETECTION_ALGORITHM_DEFAULT
    );

/**
 * 追従ループの現在の状態
 * - idle:       追従 OFF
 * - listening:  音量閾値を超える入力を待機中
 * - recording:  録音中 (バッチ方式のみ)
 * - processing: 推定中 (バッチ方式のみ)
 * - tracking:   ストリーミング解析で追従中 (pitchplease)
 */
export type ChordFollowStatus =
    | "idle"
    | "listening"
    | "recording"
    | "processing"
    | "tracking";

export const chordFollowStatusAtom = atom<ChordFollowStatus>("idle");

/** 追従ループのエラーメッセージ */
export const chordFollowErrorAtom = atom<string | null>(null);
