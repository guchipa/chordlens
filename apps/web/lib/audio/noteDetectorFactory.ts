/**
 * noteDetectorFactory - 構成音検出アルゴリズムの選択と NoteDetector 生成
 *
 * 新しいアルゴリズムを追加する手順:
 * 1. core の CHORD_DETECTION_ALGORITHMS (constants.ts) に名前とラベルを追加
 * 2. NoteDetector (core/adapters/noteDetection.ts) の実装を用意する
 *    - プラットフォーム非依存なら core に (例: PitchPleaseNoteDetector)
 *    - ブラウザ依存なら apps/web/lib/audio/ に (例: BasicPitchNoteDetector)
 * 3. ここの switch に生成処理を追加する
 * 4. フレーム単位の解析が軽量なら supportsStreaming に追加する
 *    (StreamingChordTracker 経由の低レイテンシ経路に乗る)
 */

import type { ChordDetectionAlgorithm } from "@chordlens/core/constants";
import type { NoteDetector } from "@chordlens/core/adapters/noteDetection";
import { PitchPleaseNoteDetector } from "@chordlens/core/audio_analysis/pitchPleaseNoteDetection";
import { BasicPitchNoteDetector } from "./basicPitchNoteDetector";

export interface NoteDetectorFactoryOptions {
    /** A4 の基準周波数 (Hz)。対応するアルゴリズムのみ反映される */
    a4Freq?: number;
    /** 入力 PCM のサンプルレート (Hz)。対応するアルゴリズムのみ反映される */
    sampleRate?: number;
}

export function createNoteDetector(
    algorithm: ChordDetectionAlgorithm,
    options: NoteDetectorFactoryOptions = {}
): NoteDetector {
    switch (algorithm) {
        case "pitchplease":
            // undefined を渡すと PITCH_PLEASE_DEFAULTS を上書きしてしまうため除外する
            return new PitchPleaseNoteDetector({
                ...(options.a4Freq !== undefined && { a4Freq: options.a4Freq }),
                ...(options.sampleRate !== undefined && {
                    sampleRate: options.sampleRate,
                }),
            });
        case "basicpitch":
            return new BasicPitchNoteDetector();
    }
}

/**
 * ストリーミング解析 (StreamingChordTracker) に対応しているか。
 * 短いフレーム単位の解析が軽量なアルゴリズムのみ true にする
 * (basic-pitch は TFJS 推論が重くバッチ方式のまま)
 */
export function supportsStreaming(algorithm: ChordDetectionAlgorithm): boolean {
    return algorithm === "pitchplease";
}
