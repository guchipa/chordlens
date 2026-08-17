/**
 * evaluate-chord-detection (apps/web)
 *
 * core の同名 CLI と同じ評価を、ブラウザ依存の検出アルゴリズムも含めて行う。
 * basic-pitch は TFJS 実装が apps/web 側にあり core からは参照できないため、
 * NoteDetector をここから注入する (共通ロジックは core の chordEvalCli)。
 *
 * アプリと同じ BasicPitchNoteDetector をそのまま使う。差分はモデルの取得元
 * だけで (ブラウザ: fetch / Node: node_modules から fs 読み込み)、
 * 推論と後処理の設定はアプリと同一である。
 *
 * 使い方:
 *   pnpm --filter @chordlens/web eval:chords <dir-or-files...> \
 *     --algorithm basicpitch [--root-optional] [--a4 <hz>] [--verbose]
 *
 * 注意:
 *  - basic-pitch は 22050Hz 固定・A4=440 固定のため、--sample-rate は無視され、
 *    --a4 は期待周波数の計算にのみ影響する (検出器側は追従しない)
 *  - basic-pitch はストリーミング非対応のため batch のみ評価される
 */

import {
    runChordEvalMain,
    type ChordEvalCliConfig,
} from "@chordlens/core/scripts/lib/chordEvalCli";

import { BasicPitchNoteDetector } from "../lib/audio/basicPitchNoteDetector";
import { loadBasicPitchModelForNode } from "./lib/basicPitchNodeModel";

const config: ChordEvalCliConfig = {
    usage:
        "Usage: pnpm --filter @chordlens/web eval:chords <dir-or-files...> " +
        "[--algorithm pitchplease|basicpitch] [--root-optional] " +
        "[--sample-rate <hz>] [--a4 <hz>] [--verbose]",
    defaultAlgorithm: "pitchplease",
    resolveDetector: (algorithm) => {
        switch (algorithm) {
            case "pitchplease":
                // undefined (= createDetector 未指定) を返すと chordEvalLib.ts が
                // 既定の PitchPleaseNoteDetector を生成し、pitchplease 推奨の
                // estimationOptions (medianSalience) を自動的に下敷きにする
                return undefined;
            case "basicpitch": {
                // モデルのロードとインスタンスはファイル間で使い回す
                // (detectNotes は状態を持たない)
                const detector = new BasicPitchNoteDetector({
                    model: loadBasicPitchModelForNode(),
                });
                return () => detector;
            }
            default:
                throw new Error(
                    `未知のアルゴリズム: ${algorithm} ` +
                        "(pitchplease | basicpitch)"
                );
        }
    },
    supportsStreaming: (algorithm) => algorithm === "pitchplease",
};

runChordEvalMain(process.argv, config);
