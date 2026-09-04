/**
 * HarmonicNoteDetector - 構成音検出 (NoteDetector) の実装
 *
 * 吹奏楽器アンサンブルの実録音から、鳴っている音の音名 (MIDI ノート番号) を
 * フレーム単位で推定する。一般の多重ピッチ推定と違い、この用途では
 * 次の 2 点が効いてくる:
 *
 * - 出力は「音名の集合」だけでよい。正確な基本周波数は不要 (純正律の
 *   偏差計測は evaluateSpectrum 系が別に担当する)
 * - 探索対象は半音格子上の高々 72 音に限られる。全帯域の FFT ではなく
 *   音名ごとの単一周波数 DFT (Goertzel、goertzel.ts) で必要な点だけを測る
 *
 * ## 処理の流れ (1 フレーム = 既定 0.25 秒)
 *
 * 1. **音名ビンの測定** (measureAmplitudes)
 *    候補音 C2〜B6 とその倍音位置について、Goertzel でパワーを測る。
 *    奏者の音程は平均律格子から ±50 セント近くズレる (そのズレを見せるのが
 *    このアプリである) ため、各音名は ±45 セントを覆う複数のデチューン
 *    オフセットで測り最大値を採る。
 *    値はノイズ床基準の dB SNR に正規化する (§normalizationMode):
 *    床は MIDI 軸の移動窓の分位点で推定し、「床から何 dB 突き出ているか」を
 *    0〜1 に写す。フレーム内最大値で正規化すると閾値の意味が
 *    「最も大きい奏者に対する相対レベル」になり、1 人だけ弱い演奏で
 *    他の奏者の基音が閾値下に沈むため、床基準にしている。
 *
 * 2. **倍音和サリエンス** (harmonicSalience)
 *    金管の第2倍音・クラリネットの第3倍音は基音より強いことがあり、
 *    ビン単体の振幅比較では基音と倍音を区別できない。候補ごとに
 *    倍音系列 (1f〜6f) の重み付き和 (サリエンス) を取り、系列全体で
 *    音の実在を判定する。
 *
 * 3. **貪欲減算** (detectFrameNotes)
 *    サリエンス最大の音から順に採用し、採用した音の倍音位置 (1f〜12f) の
 *    エネルギーを残差から差し引いてから次を探す。倍音位置の候補は減算後の
 *    残差では立たなくなるため、倍音の誤検出が構造的に消える。
 *    採用直前には、オクターブ下・12度下のサリエンスが拮抗していれば
 *    そちらを基音とみなして降りる (サブオクターブ降下)。
 *
 * フレーム間の集約 (どの音を構成音として確定するか) は
 * chordToneEstimation.ts、ストリーミングのちらつき対策は
 * streamingChordTracker.ts が担う。
 *
 * 各パラメータの既定値は吹奏楽器の実録音 61 ファイルでの評価に基づく。
 * 導出の経緯とアブレーション結果は docs/CHORD_DETECTION.md を参照。
 */

import { A4_FREQ } from "../constants";
import { goertzelPower } from "./goertzel";
import type {
  DetectedNoteEvent,
  NoteDetector,
} from "../adapters/noteDetection";
import type { ChordToneEstimationOptions } from "./chordToneEstimation";

export interface HarmonicNoteDetectorOptions {
  /** A4 の基準周波数 (Hz)。候補音の周波数生成に使う */
  a4Freq?: number;
  /** 入力バッファのサンプルレート (Hz) */
  sampleRate?: number;
  /** 候補音の下限 MIDI ノート番号 (デフォルト: C1 = 24) */
  minMidiNote?: number;
  /** 候補音の上限 MIDI ノート番号 (デフォルト: B6 = 95) */
  maxMidiNote?: number;
  /** 解析フレーム長 (秒) */
  frameSeconds?: number;
  /** 候補の基音ビンに要求する正規化振幅の下限 (0〜1) */
  fundamentalThreshold?: number;
  /** フレーム内最大サリエンスに対する採用閾値 (0〜1) */
  salienceThreshold?: number;
  /**
   * 音名ビンの正規化方式。
   * "noiseFloor" (既定): 各ビンのパワーを dB 化し、MIDI 軸上近傍ビンの
   * 分位点で推定したノイズ床からの SNR (headroomDb で 0〜1 に正規化) を
   * 振幅とする。大音量奏者がいても他奏者の基音の相対的な強さが揺れない。
   * "frameMax": 旧実装 (フレーム内最大パワーで正規化)。比較実験用に残す
   */
  normalizationMode?: "frameMax" | "noiseFloor";
  /** noiseFloor: 床推定に使う分位点 (0〜1) */
  floorPercentile?: number;
  /** noiseFloor: 床推定の近傍窓幅 (半音、片側) */
  floorWindowSemitones?: number;
  /** noiseFloor: 振幅 1.0 に相当する床からの SNR (dB) */
  headroomDb?: number;
  /**
   * noiseFloor: 床のケイリング。frameMaxDb (フレーム内最大パワーの dB) から
   * この値以上下がった床は frameMaxDb - maxDynamicRangeDb で切り上げる
   * (= フレーム内で maxDynamicRangeDb を超えるダイナミックレンジの SNR を
   * 与えない)。真基音同士のダイナミックレンジは実測でほぼ全て 26dB 以内に
   * 収まる一方、床が局所的に極端に低く推定された領域 (実音が疎な高音域など)
   * では弱いアーティファクトでも SNR が過大評価されやすい。Infinity で無効
   */
  maxDynamicRangeDb?: number;
  /**
   * eligible だが採択閾値未満の候補を provisional 標本として残す下限比率
   * (フレーム内最大サリエンスに対する比、0〜1)
   */
  provisionalMinRatio?: number;
  /** 無音とみなすフレーム RMS 閾値 */
  silenceRmsThreshold?: number;
  /** 1 フレームで採用する音の最大数 */
  maxNotesPerFrame?: number;
  /** 倍音位置の減算率 (倍音が立っている複合音) */
  harmonicRichSubtract?: number;
  /** 倍音位置の減算率 (倍音を持たない純音) */
  harmonicPureSubtract?: number;
  /** サブオクターブ降下のサリエンス拮抗判定比 */
  subHarmonicDescendRatio?: number;
  /**
   * アブレーション評価用のスイッチ (既定は全機能有効)。
   * アプリからは使わない。各機構の寄与を実録音で切り分けるためだけに存在する
   * (scripts/ablation-chord-detection.ts、docs/CHORD_DETECTION.md §5.6)
   */
  ablation?: NoteDetectionAblation;
}

/**
 * 個々の機構を無効化するアブレーション用スイッチ。
 * すべて省略時 false (= 本番と同じ全機能有効)
 */
export interface NoteDetectionAblation {
  /** デチューン探索を無効化し、平均律格子の中心周波数だけを測る */
  disableDetuneSearch?: boolean;
  /** 倍音和サリエンスを無効化し、基音ビンの振幅だけを候補のスコアにする */
  disableHarmonicSalience?: boolean;
  /** 貪欲減算を無効化する (採用音の基音・倍音位置の残差を減らさない) */
  disableHarmonicSubtraction?: boolean;
  /**
   * 正規化だけを frameMax (フレーム内最大パワー基準) に戻す。
   * normalizationMode: "frameMax" と違い、Hann 窓・12f 減算系列・降下閾値は
   * noiseFloor の設定のまま残すため、床正規化そのものの寄与を切り分けられる
   */
  useFrameMaxNormalization?: boolean;
}

export const NOTE_DETECTION_DEFAULTS: Required<HarmonicNoteDetectorOptions> = {
  a4Freq: A4_FREQ,
  sampleRate: 22050,
  // C1 (32Hz) ではなく C2 (65Hz) を下限とする: 電源ハム (50/60Hz) が
  // C1-B1 の格子とデチューン探索幅の内側に落ちるため。管楽器の和音練習で
  // C2 未満の構成音は実用上現れない
  minMidiNote: 36, // C2
  maxMidiNote: 95, // B6
  frameSeconds: 0.25,
  // 0.20 は noiseFloor 校正スイープの結果 (docs/CHORD_DETECTION.md 参照)。
  // floorPercentile/floorWindowSemitones と合わせて選定した
  fundamentalThreshold: 0.2,
  salienceThreshold: 0.3,
  normalizationMode: "noiseFloor",
  // floorPercentile 0.5 (中央値) ・floorWindowSemitones 6 は、Hann 窓 +
  // 減算系列 12f 拡張後の TUS/YCY 評価スイープで TUS が最良だった組
  floorPercentile: 0.5,
  floorWindowSemitones: 6,
  headroomDb: 40,
  // 45 は batch を legacy (durationAmplitude) 集約に戻した組み合わせでの
  // 評価スイープの結果 (docs/CHORD_DETECTION.md 参照)。medianSalience 集約と
  // 組み合わせると -12dB でゲートの不均衡脆弱性を再導入したが、床正規化で
  // フレーム採択自体が安定した結果、legacy 集約 (フレーム単位の二値採択の
  // 数え上げ) と組み合わせると原音・減衰の全条件で純増した
  maxDynamicRangeDb: 45,
  provisionalMinRatio: 0.05,
  silenceRmsThreshold: 0.01,
  maxNotesPerFrame: 6,
  harmonicRichSubtract: 0.9,
  harmonicPureSubtract: 0.3,
  // 0.85 は実データの座標降下法探索の結果 (docs/CHORD_DETECTION.md §5)。
  // 調整用 (TUS)・検証用 (YCY) の両方でストリーミング経路が改善した
  subHarmonicDescendRatio: 0.85,
  ablation: {},
};

/**
 * デチューン探索の目標カバー幅 (セント)。奏者の音程ズレ ±45 セント弱を
 * カバーする。オフセットの刻みは周波数ごとの DFT メインローブ幅に合わせる:
 * 低音域はローブが広く 0 オフセットだけで ±45 セントを覆える一方、
 * むやみに広く探索すると隣の半音の実音まで拾ってしまう
 * (65Hz ではローブ半幅が ±50 セント相当ある)
 */
const DETUNE_COVER_CENTS = 45;

/**
 * 周波数ごとのデチューン探索オフセットを返す。
 * 矩形窓 DFT の実効捕捉半幅 ≈ 1/(2·frameSeconds) Hz をセントに換算し、
 * それより粗い刻みで DETUNE_COVER_CENTS まで並べる。
 * useHannCapture (noiseFloor モード): Hann 窓はメインローブ幅が矩形窓の
 * ほぼ2倍になるため、捕捉半幅を 1/frameSeconds に広げる
 */
function detuneOffsetsForFreq(
  freqHz: number,
  frameSeconds: number,
  useHannCapture = false,
  disabled = false
): number[] {
  if (disabled) {
    return [0];
  }
  const captureHz = useHannCapture ? 1 / frameSeconds : 1 / (2 * frameSeconds);
  const halfWidthCents = 1200 * Math.log2(1 + captureHz / freqHz);
  if (halfWidthCents >= DETUNE_COVER_CENTS) {
    return [0];
  }
  const step = Math.max(15, halfWidthCents);
  const offsets = [0];
  for (let c = step; c <= DETUNE_COVER_CENTS; c += step) {
    offsets.push(c, -c);
  }
  return offsets;
}

/**
 * 倍音系列の半音オフセット (1f〜6f)。平均律格子からの偏差は
 * 0, 0, +2, 0, -14, +2 セントで、デチューン探索幅に吸収される
 */
const HARMONIC_SEMITONE_OFFSETS = [0, 12, 19, 24, 28, 31];

/**
 * サリエンスの倍音重み。基音を 1 として高次ほど軽くするが、
 * 基音が弱い実楽器 (金管・クラリネット) でも倍音側から音の実在を
 * 拾えるよう、単純な 1/k より緩やかに減衰させる
 */
const SALIENCE_WEIGHTS = [1.0, 0.6, 0.45, 0.35, 0.3, 0.25];

/**
 * noiseFloor モードの倍音減算専用オフセット (1f, 2f〜12f)。
 * サリエンス計算 (HARMONIC_SEMITONE_OFFSETS, 6項) は変更しないが、
 * noiseFloor は床基準の SNR で正規化するため、強い音の 7f 以上の
 * 実在倍音 (Hann 窓でもメインローブは残る) が床から 20〜30dB 級で
 * 露出し、幽霊音として誤検出されうる。減算だけ 12f まで拡張して
 * これを除去する (11f=41.51 半音は 41・42 の両方をカバー)
 */
const SUBTRACT_SEMITONE_OFFSETS = [
  0, 12, 19, 24, 28, 31, 34, 36, 38, 40, 41, 42, 43,
];

/**
 * 減算の使い分け (harmonicRichSubtract / harmonicPureSubtract オプション):
 * - 倍音が立っている音 (実楽器の複合音) は倍音位置のエネルギーを
 *   ほぼすべてその音由来とみなして強く引く
 * - 倍音がまったくない音 (純音に近い) の倍音位置のエネルギーは
 *   別の実音の可能性が高いので少しだけ引く
 */
/** 「倍音が立っている」とみなす正規化振幅の下限 */
const HARMONIC_PRESENT_MIN = 0.15;
/** リッチ (複合音) 判定に要求する倍音の本数 */
const RICH_HARMONIC_COUNT = 1;
/**
 * サブオクターブ降下 (subHarmonicDescendRatio オプション):
 * 採用直前の候補に対し、そのオクターブ下 (または 12度下) のサリエンスが
 * この比率以上なら低い方を基音として優先する。
 * 基音が弱い実楽器では倍音位置 (2f) のサリエンスが基音をわずかに上回る
 * ことがある (倍音位置は自身の系列 {2f,4f,6f} を高い重みで拾うため)。
 * 真の基音は系列全体を拾うのでサリエンスは拮抗し、この降下で正しい側に倒す
 */
/** サブオクターブ降下で調べる下方オフセット (2f: -12, 3f: -19) */
const DESCEND_SEMITONE_OFFSETS = [12, 19];
/**
 * サブオクターブ降下の対象に要求する基音ビンの正規化振幅の下限。
 * 通常の採用閾値 (fundamentalThreshold) よりやや高くし、
 * ノイズ床程度の基音ビンしか持たない位置へ降下しないようにする。
 * noiseFloor モードは床から 12dB (0.30) を要求し、frameMax は従来の 0.15
 */
const DESCEND_FUNDAMENTAL_MIN = 0.15;
const DESCEND_FUNDAMENTAL_MIN_NOISE_FLOOR = 0.3;

/**
 * この MIDI ノート未満の候補は倍音サポート (2f または 3f) を必須にする。
 * 実楽器の低音は必ず倍音を持つ一方、電源ハム (50/60Hz とその倍波) や
 * 空調・息などの低域ランブルは半音格子に倍音が乗らないためここで除去される
 */
export const LOW_NOTE_SUPPORT_MAX_MIDI = 55; // G3 未満
/** 低音候補に要求する倍音サポートの正規化振幅の下限 */
export const LOW_NOTE_SUPPORT_MIN = 0.15;

/**
 * provisional 標本の上限個数。
 * 採択閾値 (fundamentalThreshold/salienceThreshold) には届かなかったが
 * 候補として存在した音を、chordToneEstimation.ts の medianSalience 集約に
 * 連続サリエンスの標本として渡すための緩い足切り。
 * 採用下限比率は provisionalMinRatio オプション (既定 0.05) で調整する
 */
const PROVISIONAL_MAX_COUNT = 8;

/**
 * 純正五度の2音 (根音+完全5度上) が録音系の非線形性で生む差音 (根音の
 * 1オクターブ下の狭帯域幽霊音) の抑制比。原音/-6dB/-12dB の 3 条件 ×
 * batch/streaming × TUS/YCY のスイープで選定 (docs/CHORD_DETECTION.md 参照)。
 * batch・streaming の両経路に同じ値を使う
 * (NOTE_DETECTION_ESTIMATION_OPTIONS と streamingChordTracker.ts の
 * STREAMING_CHORD_ESTIMATION_DEFAULTS)
 */
export const SUB_OCTAVE_SUPPRESSION_RATIO = 0.4;

/**
 * この検出器に合わせた集約オプション (chordToneEstimation.ts に渡す)。
 *
 * scoreMode は明示せず CHORD_TONE_ESTIMATION_DEFAULTS の既定
 * ("durationAmplitude"、二値採択の数え上げ) に委ねる。段階3以前は
 * 閾値境界での採択の揺れに頑健な medianSalience (連続サリエンスの時間中央値)
 * を既定にしていたが、noiseFloor 正規化 (Hann 窓 + 12f 減算拡張 +
 * 最大比ケイリング) でフレーム単位の採択自体が安定した結果、
 * durationAmplitude + maxDynamicRangeDb=45 の組が全評価条件で
 * medianSalience 込みの組を上回った (docs/CHORD_DETECTION.md 参照)。
 * medianSalience・provisional はオプション機能として引き続き利用できる
 * (scoreMode: "medianSalience" を明示すれば有効)
 */
export const NOTE_DETECTION_ESTIMATION_OPTIONS: ChordToneEstimationOptions = {
  subOctaveSuppressionScoreRatio: SUB_OCTAVE_SUPPRESSION_RATIO,
};

/** MIDI ノート番号 → 周波数 (Hz) */
function midiNoteToFreq(midiNote: number, a4Freq: number): number {
  return a4Freq * Math.pow(2, (midiNote - 69) / 12);
}

function frameRms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i];
  }
  return Math.sqrt(sum / frame.length);
}

/**
 * この値以上のサンプルレート入力は隣接ペア平均で 1/2 にデシメーションする。
 * 解析対象の最高周波数は最高候補音 B6 の 6 倍音 ≈ 11.8kHz なので、
 * 24kHz (Nyquist 12kHz) あれば足りる。48kHz をそのまま解析すると
 * Goertzel のサンプルループが倍かかり、メインスレッドを塞ぐ
 */
const DECIMATION_MIN_SAMPLE_RATE = 32000;

/** 隣接 2 サンプルの平均で 1/2 デシメーションする (粗いローパス込み) */
function decimateByTwo(audio: Float32Array): Float32Array {
  const out = new Float32Array(Math.floor(audio.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = (audio[2 * i] + audio[2 * i + 1]) / 2;
  }
  return out;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * 昇順ソート済み配列の分位点 (線形補間)。
 * sorted は非空であること
 */
function percentileOfSorted(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

/**
 * 各ビンのノイズ床 (dB) を、MIDI 軸上 ±windowSemitones 以内の全計測ビンの
 * 分位点として推定する。和音の実音ビンが窓内の少数派である限り、
 * 少数の強いビンに床が引きずられない
 */
function computeFloorDb(
  powerDb: number[],
  windowSemitones: number,
  percentile: number
): number[] {
  const n = powerDb.length;
  const floor = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - windowSemitones);
    const hi = Math.min(n - 1, i + windowSemitones);
    const window = powerDb.slice(lo, hi + 1).sort((a, b) => a - b);
    floor[i] = percentileOfSorted(window, percentile);
  }
  return floor;
}

/**
 * Hann 窓の係数配列を返す (長さ n)。noiseFloor モードで測定前のフレームに
 * 掛け、矩形窓の緩やかなサイドローブ減衰 (-6dB/oct) を Hann の急峻な減衰
 * (-18dB/oct) に置き換えることで、強い音の遠くの倍音位置にスペクトル漏れが
 * 「床から浮いた孤立ビン」として残るのを防ぐ
 */
function computeHannWindow(n: number): Float32Array {
  const window = new Float32Array(n);
  if (n <= 1) {
    window.fill(1);
    return window;
  }
  for (let i = 0; i < n; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return window;
}

/**
 * 残差振幅から倍音和サリエンスを計算する。
 * lookup は範囲外の MIDI ノートに対して 0 を返すこと
 */
export function harmonicSalience(
  midiNote: number,
  amplitudeByMidi: (midiNote: number) => number,
  weights: readonly number[] = SALIENCE_WEIGHTS
): number {
  let salience = 0;
  for (let k = 0; k < HARMONIC_SEMITONE_OFFSETS.length; k++) {
    salience +=
      weights[k] * amplitudeByMidi(midiNote + HARMONIC_SEMITONE_OFFSETS[k]);
  }
  return salience;
}

/** アブレーション用: 基音ビンだけを見る (倍音和サリエンスを無効化した重み) */
const FUNDAMENTAL_ONLY_WEIGHTS = [1, 0, 0, 0, 0, 0];

export class HarmonicNoteDetector implements NoteDetector {
  readonly requiredSampleRate: number;

  private options: Required<HarmonicNoteDetectorOptions>;
  /** 実際に解析するサンプルレート (高レート入力はデシメーション後) */
  private analysisSampleRate: number;
  /** 候補音の数 (minMidiNote〜maxMidiNote) */
  private candidateCount: number;
  /**
   * 解析する周波数リスト (index = midiNote - minMidiNote)。
   * 候補範囲に加え、サリエンス計算用に最高候補音の 6f 相当まで拡張する
   * (Nyquist 未満のみ)
   */
  private noteFrequencies: number[];
  /** noiseFloor モード用に事前計算した Hann 窓係数 (frameMax モードでは null) */
  private hannWindow: Float32Array | null;

  constructor(options: HarmonicNoteDetectorOptions = {}) {
    this.options = { ...NOTE_DETECTION_DEFAULTS, ...options };
    // ablation: undefined を明示的に渡された場合も既定 (全機能有効) に倒す
    this.options.ablation = this.options.ablation ?? {};
    this.requiredSampleRate = this.options.sampleRate;
    this.analysisSampleRate =
      this.options.sampleRate >= DECIMATION_MIN_SAMPLE_RATE
        ? this.options.sampleRate / 2
        : this.options.sampleRate;

    const { minMidiNote, maxMidiNote, a4Freq } = this.options;
    const sampleRate = this.analysisSampleRate;
    this.candidateCount = maxMidiNote - minMidiNote + 1;
    const maxHarmonicOffset =
      HARMONIC_SEMITONE_OFFSETS[HARMONIC_SEMITONE_OFFSETS.length - 1];
    this.noteFrequencies = [];
    for (
      let midiNote = minMidiNote;
      midiNote <= maxMidiNote + maxHarmonicOffset;
      midiNote++
    ) {
      const freq = midiNoteToFreq(midiNote, a4Freq);
      // デチューン探索の上端が Nyquist を超えない範囲まで
      if (
        midiNote > maxMidiNote &&
        freq * Math.pow(2, DETUNE_COVER_CENTS / 1200) >= sampleRate / 2
      ) {
        break;
      }
      this.noteFrequencies.push(freq);
    }

    // フレーム長ごとに 1 回だけ Hann 窓係数を事前計算する (noiseFloor のみ)
    this.hannWindow =
      this.options.normalizationMode === "noiseFloor"
        ? computeHannWindow(Math.floor(this.options.frameSeconds * sampleRate))
        : null;
  }

  /** 各音名ビンをデチューン探索付きで測り、パワー配列を返す (index = noteFrequencies の index) */
  private computePowers(frame: Float32Array, useHannCapture: boolean): number[] {
    const { frameSeconds } = this.options;
    const sampleRate = this.analysisSampleRate;
    return this.noteFrequencies.map((baseFreq) => {
      let best = 0;
      for (const cents of detuneOffsetsForFreq(
        baseFreq,
        frameSeconds,
        useHannCapture,
        this.options.ablation.disableDetuneSearch
      )) {
        const freq = baseFreq * Math.pow(2, cents / 1200);
        if (freq >= sampleRate / 2) continue;
        const p = goertzelPower(frame, freq, sampleRate);
        if (p > best) best = p;
      }
      return best;
    });
  }

  /** frame に Hann 窓を掛けた新しい配列を返す */
  private applyHannWindow(frame: Float32Array): Float32Array {
    const window = this.hannWindow!;
    const n = Math.min(frame.length, window.length);
    const out = new Float32Array(frame.length);
    for (let i = 0; i < n; i++) {
      out[i] = frame[i] * window[i];
    }
    return out;
  }

  /**
   * 各音名ビンを測り、正規化振幅の配列を返す。
   * frameMax モード: 矩形窓のまま Goertzel し、正規化の基準は候補範囲内の
   * 最大値 (旧実装とビット同一)。
   * noiseFloor モード (既定): Hann 窓を掛けてから Goertzel し (遠くの倍音の
   * スペクトル漏れを抑える)、各ビンの dB パワーを MIDI 軸上近傍ビンの
   * 分位点から推定したノイズ床からの SNR として 0〜1 に正規化する
   * (詳細は computeFloorDb 参照)。大音量奏者がいても弱い奏者の基音の
   * 相対的な強さが揺れない
   */
  private measureAmplitudes(frame: Float32Array): number[] | null {
    const {
      normalizationMode,
      floorPercentile,
      floorWindowSemitones,
      headroomDb,
      maxDynamicRangeDb,
    } = this.options;

    if (normalizationMode === "frameMax") {
      const powers = this.computePowers(frame, false);
      const maxPower = Math.max(...powers.slice(0, this.candidateCount));
      if (maxPower <= 0) {
        return null;
      }
      // power は振幅の2乗なので振幅スケールに戻して正規化する
      return powers.map((p) => Math.sqrt(p / maxPower));
    }

    // noiseFloor モード: Hann 窓を掛けてから測り、dB 化してノイズ床基準の SNR で正規化する
    const windowed = this.applyHannWindow(frame);
    const powers = this.computePowers(windowed, true);
    const maxPower = Math.max(...powers.slice(0, this.candidateCount));
    if (maxPower <= 0) {
      return null;
    }
    // アブレーション: 床正規化だけを外す (Hann 窓・12f 減算はそのまま)
    if (this.options.ablation.useFrameMaxNormalization) {
      return powers.map((p) => Math.sqrt(p / maxPower));
    }
    const eps = maxPower * 1e-12; // log(0) 回避
    const powerDb = powers.map((p) => 10 * Math.log10(p + eps));
    const floorDb = computeFloorDb(powerDb, floorWindowSemitones, floorPercentile);
    // 床のケイリング: フレーム内最大パワーから maxDynamicRangeDb 以上下がった
    // 床は frameMaxDb - maxDynamicRangeDb まで切り上げる (詳細は
    // maxDynamicRangeDb オプションのコメント参照)。Infinity (既定) なら無効
    const frameMaxDb = 10 * Math.log10(maxPower);
    const ceilingDb = frameMaxDb - maxDynamicRangeDb;
    const cappedFloorDb = floorDb.map((db) => Math.max(db, ceilingDb));
    return powerDb.map((db, i) => clamp01((db - cappedFloorDb[i]) / headroomDb));
  }

  /**
   * 1 フレームぶんの音を貪欲減算で選び出す。
   * 返り値は { midiNote, amplitude (= 正規化サリエンス) } のリスト
   */
  private detectFrameNotes(
    frame: Float32Array
  ): { midiNote: number; amplitude: number; provisional?: boolean }[] {
    const {
      minMidiNote,
      fundamentalThreshold,
      salienceThreshold,
      maxNotesPerFrame,
      harmonicRichSubtract,
      harmonicPureSubtract,
      subHarmonicDescendRatio,
      normalizationMode,
      provisionalMinRatio,
      ablation,
    } = this.options;
    const isNoiseFloor = normalizationMode === "noiseFloor";
    // アブレーション: 倍音和サリエンスを外すと基音ビンだけのスコアになる
    const salienceWeights = ablation.disableHarmonicSalience
      ? FUNDAMENTAL_ONLY_WEIGHTS
      : SALIENCE_WEIGHTS;
    const salienceOf = (midiNote: number, lookup: (m: number) => number) =>
      harmonicSalience(midiNote, lookup, salienceWeights);
    // noiseFloor は床基準の SNR で強い音の高次倍音 (7f〜12f) が露出しうるため
    // 減算系列だけ拡張する (サリエンス計算は HARMONIC_SEMITONE_OFFSETS のまま)
    const subtractOffsets = isNoiseFloor
      ? SUBTRACT_SEMITONE_OFFSETS
      : HARMONIC_SEMITONE_OFFSETS;
    const descendFundamentalMin = isNoiseFloor
      ? DESCEND_FUNDAMENTAL_MIN_NOISE_FLOOR
      : DESCEND_FUNDAMENTAL_MIN;

    const amplitudes = this.measureAmplitudes(frame);
    if (!amplitudes) {
      return [];
    }

    const residual = amplitudes.slice();
    const residualByMidi = (midiNote: number) =>
      residual[midiNote - minMidiNote] ?? 0;

    // 候補: 基音ビンが立っていて局所ピークであること (隣接半音への漏れ除去)。
    // 低音域は倍音サポートも要求する (電源ハム対策)
    const eligible: number[] = [];
    for (let i = 0; i < this.candidateCount; i++) {
      const isLocalPeak =
        (i === 0 || amplitudes[i] >= amplitudes[i - 1]) &&
        (i === this.candidateCount - 1 || amplitudes[i] >= amplitudes[i + 1]);
      if (!isLocalPeak) continue;
      const midiNote = minMidiNote + i;
      if (
        midiNote < LOW_NOTE_SUPPORT_MAX_MIDI &&
        Math.max(
          amplitudes[i + 12] ?? 0,
          amplitudes[i + 19] ?? 0
        ) < LOW_NOTE_SUPPORT_MIN
      ) {
        continue;
      }
      eligible.push(midiNote);
    }
    if (eligible.length === 0) {
      return [];
    }

    const initialMaxSalience = Math.max(
      ...eligible.map((m) => salienceOf(m, residualByMidi))
    );
    if (initialMaxSalience <= 0) {
      return [];
    }

    const accepted: { midiNote: number; amplitude: number }[] = [];
    const excluded = new Set<number>();
    const eligibleSet = new Set(eligible);
    const isAcceptable = (midiNote: number) =>
      eligibleSet.has(midiNote) &&
      !excluded.has(midiNote) &&
      residualByMidi(midiNote) >= fundamentalThreshold;

    while (accepted.length < maxNotesPerFrame) {
      // 残差からサリエンスを再計算し、最有力の候補を探す
      let best = -1;
      let bestSalience = 0;
      for (const midiNote of eligible) {
        if (!isAcceptable(midiNote)) continue;
        const s = salienceOf(midiNote, residualByMidi);
        if (s > bestSalience) {
          bestSalience = s;
          best = midiNote;
        }
      }
      if (best === -1 || bestSalience < salienceThreshold * initialMaxSalience) {
        break;
      }

      // サブオクターブ降下: 基音候補 (オクターブ下・12度下) のサリエンスが
      // 拮抗していれば、best は倍音位置とみなして低い方を採用する
      let descended = true;
      while (descended) {
        descended = false;
        for (const offset of DESCEND_SEMITONE_OFFSETS) {
          const lower = best - offset;
          if (!isAcceptable(lower)) continue;
          if (residualByMidi(lower) < descendFundamentalMin) continue;
          const lowerSalience = salienceOf(lower, residualByMidi);
          if (lowerSalience >= subHarmonicDescendRatio * bestSalience) {
            best = lower;
            bestSalience = lowerSalience;
            descended = true;
            break;
          }
        }
      }

      accepted.push({
        midiNote: best,
        amplitude: Math.min(1, bestSalience / initialMaxSalience),
      });
      // 同一音の再判定と隣接半音 (デチューンした同じ音の漏れ) を除外する
      excluded.add(best);
      excluded.add(best - 1);
      excluded.add(best + 1);

      // アブレーション: 貪欲減算を外すと残差を更新しない
      // (同一音の再選択は excluded で防いでいるため無限ループにはならない)
      if (ablation.disableHarmonicSubtraction) {
        continue;
      }

      // 倍音減算: 倍音が複数立っている複合音は倍音位置をほぼ全て差し引き、
      // 純音に近い音は控えめに引く (倍音位置の実音の重ねを残すため)
      const baseIndex = best - minMidiNote;
      let presentHarmonics = 0;
      for (let k = 1; k < HARMONIC_SEMITONE_OFFSETS.length; k++) {
        if (
          (residual[baseIndex + HARMONIC_SEMITONE_OFFSETS[k]] ?? 0) >=
          HARMONIC_PRESENT_MIN
        ) {
          presentHarmonics++;
        }
      }
      const subtractFactor =
        presentHarmonics >= RICH_HARMONIC_COUNT
          ? harmonicRichSubtract
          : harmonicPureSubtract;
      residual[baseIndex] = 0;
      for (let k = 1; k < subtractOffsets.length; k++) {
        const j = baseIndex + subtractOffsets[k];
        if (j < residual.length) {
          residual[j] *= 1 - subtractFactor;
        }
      }
    }

    // 貪欲減算で採用されなかった候補を、連続サリエンスの標本 (provisional)
    // として残す。採択閾値のブレで一部フレームだけ通る/通らない音を、
    // 集約段の medianSalience が「サンプルの一部」として拾えるようにする
    // (確定検出ではないため amplitude 以外の意味は持たせない)
    const provisional = eligible
      .filter((midiNote) => !excluded.has(midiNote))
      .map((midiNote) => ({
        midiNote,
        ratio: Math.min(
          1,
          salienceOf(midiNote, residualByMidi) / initialMaxSalience
        ),
      }))
      .filter(({ ratio }) => ratio >= provisionalMinRatio)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, PROVISIONAL_MAX_COUNT)
      .map(({ midiNote, ratio }) => ({
        midiNote,
        amplitude: ratio,
        provisional: true as const,
      }));

    return [...accepted, ...provisional];
  }

  detectNotes(monoAudio: Float32Array): Promise<DetectedNoteEvent[]> {
    const { frameSeconds, silenceRmsThreshold } = this.options;
    const sampleRate = this.analysisSampleRate;

    const audio =
      this.analysisSampleRate !== this.options.sampleRate
        ? decimateByTwo(monoAudio)
        : monoAudio;
    const frameLength = Math.floor(frameSeconds * sampleRate);
    const events: DetectedNoteEvent[] = [];

    for (
      let frameStart = 0;
      frameStart + frameLength <= audio.length;
      frameStart += frameLength
    ) {
      const frame = audio.subarray(frameStart, frameStart + frameLength);

      // 無音フレームは解析しない
      if (frameRms(frame) < silenceRmsThreshold) {
        continue;
      }

      const startTimeSeconds = frameStart / sampleRate;
      for (const note of this.detectFrameNotes(frame)) {
        events.push({
          midiNote: note.midiNote,
          startTimeSeconds,
          durationSeconds: frameSeconds,
          amplitude: note.amplitude,
          ...(note.provisional && { provisional: true }),
        });
      }
    }

    return Promise.resolve(events);
  }
}
