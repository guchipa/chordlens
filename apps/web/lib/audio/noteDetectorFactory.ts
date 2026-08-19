/**
 * noteDetectorFactory - 構成音検出 (NoteDetector) の生成
 *
 * ChordLens の構成音検出は pitchplease (PitchPleaseNoteDetector) のみ。
 * 実装はプラットフォーム非依存なので core にあるが、A4 やサンプルレートなど
 * ブラウザ側の実行時パラメータを注入する差し替え点としてここに集約する。
 *
 * 検出器を増やす場合は、core の NoteDetector (core/adapters/noteDetection.ts)
 * を実装したうえでここに選択のしくみを戻す。かつては basic-pitch (TFJS) を
 * 設定で選べたが、3 秒録音のバッチ方式でしか動かせず、リアルタイム追従に
 * 必要な 1 秒未満のレイテンシを構成上満たせないため削除した
 * (経緯は docs/CHORD_DETECTION.md)。
 */

import type { NoteDetector } from "@chordlens/core/adapters/noteDetection";
import {
    PitchPleaseNoteDetector,
    PITCH_PLEASE_ESTIMATION_OPTIONS,
} from "@chordlens/core/audio_analysis/pitchPleaseNoteDetection";
import type { ChordToneEstimationOptions } from "@chordlens/core/audio_analysis/chordToneEstimation";

export interface NoteDetectorFactoryOptions {
    /** A4 の基準周波数 (Hz) */
    a4Freq?: number;
    /** 入力 PCM のサンプルレート (Hz) */
    sampleRate?: number;
}

export function createNoteDetector(
    options: NoteDetectorFactoryOptions = {}
): NoteDetector {
    // undefined を渡すと PITCH_PLEASE_DEFAULTS を上書きしてしまうため除外する
    return new PitchPleaseNoteDetector({
        ...(options.a4Freq !== undefined && { a4Freq: options.a4Freq }),
        ...(options.sampleRate !== undefined && {
            sampleRate: options.sampleRate,
        }),
    });
}

/**
 * バッチ的な一括解析 (MicInputButton の単音検出など) で
 * noteEventsToPitchList に渡す集約オプション。
 *
 * StreamingChordTracker (低レイテンシ追従) には適用しない: streaming 固有の
 * ちらつき対策 (継続時間フィルタなど) を含む
 * STREAMING_CHORD_ESTIMATION_DEFAULTS に委ねる
 */
export const BATCH_ESTIMATION_OPTIONS: ChordToneEstimationOptions =
    PITCH_PLEASE_ESTIMATION_OPTIONS;
