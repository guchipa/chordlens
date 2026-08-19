/**
 * evaluate-chord-detection
 *
 * 録音データのディレクトリを走査し、構成音推定 (HarmonicNoteDetector) の
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
 * --attenuate <dB>: レベル不均衡 augmentation。採点対象の正解音を 1 音ずつ、
 * 指定 dB だけスペクトル減衰させた変異体を作って評価する (n は変異体数になる)。
 * 実装は ./lib/spectralAttenuation.ts
 *
 * 使い方:
 *   pnpm --filter @chordlens/core eval:chords <dir-or-files...>
 *     [--root-optional] [--sample-rate <hz>] [--a4 <hz>] [--attenuate <dB>]
 *     [--window-seconds <sec>] [--verbose]
 */

import { runChordEvalMain } from "./lib/chordEvalCli";

runChordEvalMain(
  process.argv,
  "Usage: pnpm --filter @chordlens/core eval:chords <dir-or-files...> " +
    "[--root-optional] [--sample-rate <hz>] [--a4 <hz>] [--attenuate <dB>] " +
    "[--window-seconds <sec>] [--verbose]"
);
