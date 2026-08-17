/**
 * evaluate-chord-detection
 *
 * 録音データのディレクトリを走査し、構成音推定 (PitchPleaseNoteDetector) の
 * 精度をファイル名の正解ラベルと突き合わせて評価する。
 *
 * 正解ラベルはファイル名末尾のアンダースコア区切りブロック:
 *   例) "..._Cm_C4-Eb4-G4.webm" → 正解 [C4 (root), Eb4, G4]
 *
 * --root-optional: 根音を「任意の音」として採点する (検出しても extra に
 * せず、欠けても missing にしない)。アンサンブル実験の録音は根音奏者の
 * 有無がファイルによって異なるため、そのデータでは必須
 *
 * 2 つの経路を評価する:
 *  - batch:     ファイル全体を detectNotes → noteEventsToPitchList (バッチ既定値)
 *  - streaming: StreamingChordTracker (アプリの追従経路と同じ)。
 *               最も長く表示されていた確定リストを採用する
 *
 * basic-pitch は TFJS 依存でブラウザ側 (apps/web) の実装のため、ここでは
 * 評価できない。両アルゴリズムの比較は apps/web の同名 CLI を使うこと:
 *   pnpm --filter @chordlens/web eval:chords <dir> --algorithm basicpitch
 *
 * --attenuate <dB>: レベル不均衡 augmentation。採点対象の正解音を 1 音ずつ、
 * 指定 dB だけスペクトル減衰させた変異体を作って評価する (n は変異体数になる)。
 * 実装は ./lib/spectralAttenuation.ts
 *
 * 使い方:
 *   pnpm --filter @chordlens/core eval:chords <dir-or-files...>
 *     [--root-optional] [--sample-rate <hz>] [--a4 <hz>] [--attenuate <dB>] [--verbose]
 */

import { PitchPleaseNoteDetector } from "../src/audio_analysis/pitchPleaseNoteDetection";
import {
  runChordEvalMain,
  type ChordEvalCliConfig,
} from "./lib/chordEvalCli";

const config: ChordEvalCliConfig = {
  usage:
    "Usage: pnpm --filter @chordlens/core eval:chords <dir-or-files...> " +
    "[--root-optional] [--sample-rate <hz>] [--a4 <hz>] [--attenuate <dB>] [--verbose]",
  defaultAlgorithm: "pitchplease",
  resolveDetector: (algorithm) => {
    if (algorithm !== "pitchplease") {
      throw new Error(
        `core の CLI は pitchplease のみ対応している (指定: ${algorithm})。` +
          "basic-pitch の評価は apps/web の eval:chords を使うこと"
      );
    }
    return ({ sampleRate, a4Freq }) =>
      new PitchPleaseNoteDetector({ sampleRate, a4Freq });
  },
  supportsStreaming: () => true,
};

runChordEvalMain(process.argv, config);
