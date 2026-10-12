/**
 * Jotai Store - エントリーポイント
 * 全てのatomsを再エクスポート
 */

// 音声設定
export {
    evalRangeCentsAtom,
    a4FreqAtom,
    fftSizeAtom,
    smoothingTimeConstantAtom,
    evalThresholdAtom,
    holdEnabledAtom,
    experimentModeAtom,
    sensitivityAtom,
    audioSettingsAtom,
    pitchAlgorithmAtom,
    swipeBandwidthCentsAtom,
} from "./audioSettingsAtoms";

// ピッチリスト
export {
    pitchListAtom,
    addOrUpdatePitchAtom,
    removePitchAtom,
    clearPitchListAtom,
    loadPresetAtom,
    togglePitchEnabledAtom,
    setRootAtom,
    applyDetectedPitchListAtom,
} from "./pitchListAtoms";

// プリセット一覧
export { presetsAtom, refreshPresetsAtom } from "./presetAtoms";

// 通知 (トースト) と「元に戻す」付き操作
export {
    toastAtom,
    showToastAtom,
    dismissToastAtom,
    TOAST_DURATION_MS,
    type ToastData,
} from "./toastAtoms";
export {
    removePitchWithUndoAtom,
    clearPitchListWithUndoAtom,
    loadPresetWithUndoAtom,
    deletePresetWithUndoAtom,
} from "./undoAtoms";

// フィードバック
export { feedbackTypeAtom } from "./feedbackAtoms";

// 構成音自動追従
export {
    chordFollowEnabledAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
    chordFollowPendingAtom,
    chordFollowLockedAtom,
    type ChordFollowStatus,
} from "./chordDetectionAtoms";
