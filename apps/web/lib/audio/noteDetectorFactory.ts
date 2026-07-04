/**
 * noteDetectorFactory - 構成音検出アルゴリズムの選択と NoteDetector 生成
 *
 * 新しいアルゴリズムを追加する手順:
 * 1. core の CHORD_DETECTION_ALGORITHMS (constants.ts) に名前とラベルを追加
 * 2. NoteDetector (core/adapters/noteDetection.ts) の実装を用意する
 *    - プラットフォーム非依存なら core に (例: PitchPleaseNoteDetector)
 *    - ブラウザ依存なら apps/web/lib/audio/ に (例: BasicPitchNoteDetector)
 * 3. ここの switch に生成処理を追加する
 */

import type { ChordDetectionAlgorithm } from "@chordlens/core/constants";
import type { NoteDetector } from "@chordlens/core/adapters/noteDetection";
import { PitchPleaseNoteDetector } from "@chordlens/core/audio_analysis/pitchPleaseNoteDetection";
import { BasicPitchNoteDetector } from "./basicPitchNoteDetector";

export interface NoteDetectorFactoryOptions {
    /** A4 の基準周波数 (Hz)。対応するアルゴリズムのみ反映される */
    a4Freq?: number;
}

export function createNoteDetector(
    algorithm: ChordDetectionAlgorithm,
    options: NoteDetectorFactoryOptions = {}
): NoteDetector {
    switch (algorithm) {
        case "pitchplease":
            return new PitchPleaseNoteDetector({ a4Freq: options.a4Freq });
        case "basicpitch":
            return new BasicPitchNoteDetector();
    }
}
