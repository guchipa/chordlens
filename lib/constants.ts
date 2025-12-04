/**
 * A4 の周波数（Hz）
 * 平均律の基準として用いる
 */
export const A4_FREQ = 442;

/**
 * AnalyserNodeのFFTサイズ。2のべき乗である必要があります。
 * Python側の NFFT=65536 とは異なる点に注意（ブラウザの制限のため通常32768が最大）。
 * これが周波数分解能に影響します (サンプルレート / FFT_SIZE)。
 */
export const FFT_SIZE = 32768; // 例: 32768 (最大値の場合が多い) または 16384

/**
 * AnalyserNodeの平滑化定数。0.0から1.0の間。
 * 値が大きいほどスペクトルの変化が滑らかになりますが、遅延が生じます。
 */
export const SMOOTHING_TIME_CONSTANT = 0.8; // 0.8 が一般的な値

/**
 * 音程評価の範囲（セント単位）。
 * ±50セントであれば、合計100セントの範囲で評価されます。
 * Pythonの EVAL_RANGE に対応します。
 */
export const EVAL_RANGE_CENTS = 50;

/**
 * スペクトル評価の閾値（dB）
 * この値以下のスペクトルであった場合メータを描画しない
 */
export const EVAL_THRESHOLD = -100;

/**
 * 感度の範囲（ユーザーフレンドリーな0-100スケール）
 */
export const SENSITIVITY_MIN = 0;
export const SENSITIVITY_MAX = 100;
export const SENSITIVITY_DEFAULT = 50; // デフォルト感度（-100dBに相当）

/**
 * 感度（0-100）をdB値に変換
 * 感度が高いほど小さい音も検出（閾値が低くなる）
 * 実測値に基づき調整：
 * 感度 0 → -60dB (大きい音のみ検出)
 * 感度 50 → -100dB (デフォルト)
 * 感度 100 → -140dB (小さい音も積極的に検出)
 */
export function sensitivityToDb(sensitivity: number): number {
  // 0-100の感度を-60～-140dBの範囲に線形マッピング（逆方向）
  const db = -60 - (sensitivity / 100) * 80;
  return db;
}

/**
 * dB値を感度（0-100）に変換
 */
export function dbToSensitivity(db: number): number {
  // -60～-140dBの範囲を0-100の感度に線形マッピング（逆方向）
  const sensitivity = Math.round(((-60 - db) / 80) * 100);
  return sensitivity;
}

/**
 * 解析対象とする音名のリスト
 */
export const PITCH_NAME_LIST: string[] = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "Bb",
  "B",
];

/**
 * 音名をピッチクラスに変換するための対応表
 */
export const PITCH_CLASSES = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

// コード定義リスト：[名前, 構成音程(Set), スコア]
// 🧠 このリストが推定器の「頭脳」です。スコアと定義を調整して挙動をカスタマイズします。
export const CHORD_DEFINITIONS = [
  // 三和音 (高スコア)
  ["Major", new Set([0, 4, 7]), 100],
  ["Minor", new Set([0, 3, 7]), 99],
  ["Sus4", new Set([0, 5, 7]), 95],
  ["Sus2", new Set([0, 2, 7]), 94],

  // 四和音 (中スコア)
  ["Dominant 7th", new Set([0, 4, 7, 10]), 80],
  ["Major 7th", new Set([0, 4, 7, 11]), 79],
  ["Minor 7th", new Set([0, 3, 7, 10]), 78],
  ["Minor Major 7th", new Set([0, 3, 7, 11]), 75],

  // やや特殊な和音 (低スコア)
  ["Major 6th", new Set([0, 4, 7, 9]), 60],
  ["Minor 6th", new Set([0, 3, 7, 9]), 59],
  ["Half-Diminished 7th", new Set([0, 3, 6, 10]), 55],
  ["Diminished 7th", new Set([0, 3, 6, 9]), 54],
  ["Augmented", new Set([0, 4, 8]), 50],
  ["Diminished", new Set([0, 3, 6]), 49],
  ["Minor Augmented", new Set([0, 3, 8]), 40],
].sort((a, b) => Number(b[2]) - Number(a[2])); // スコアの高い順にソートしておく

/**
 * オクターブ番号のリスト
 */
export const OCTAVE_NUM_LIST: number[] = [1, 2, 3, 4, 5, 6];

/**
 * 純正律を構成する周波数比のリスト
 */
export const JUST_RATIOS: number[] = [
  1,
  16 / 15,
  9 / 8,
  6 / 5,
  5 / 4,
  4 / 3,
  45 / 32,
  3 / 2,
  8 / 5,
  5 / 3,
  16 / 9,
  15 / 8,
];

// --- UI & Visualization Constants ---

/**
 * メーター描画に関する定数 (例: 針の最大回転角度、色など)
 * ここはメーターコンポーネントの実装に合わせて調整してください。
 */
export const METER_MAX_DEVIATION_DEGREES = 90; // 例: 針が中心から左右に最大90度動く
export const METER_GOOD_RANGE_DEGREES = 5; // 例: 中央±5度を「良い」範囲とする

/**
 * マイクアクセスやエラーメッセージなど、ユーザーに表示するテキスト定数。
 */
export const MESSAGE_MIC_ACCESS_DENIED =
  "マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。";
export const MESSAGE_ANALYSIS_ERROR = "音声解析中にエラーが発生しました。";

export const DEFAULT_INITIAL_PITCH_LIST: {
  pitchName:
    | "C"
    | "C#"
    | "D"
    | "Eb"
    | "E"
    | "F"
    | "F#"
    | "G"
    | "G#"
    | "A"
    | "Bb"
    | "B";
  octaveNum: number;
  isRoot?: boolean;
}[] = [
  { pitchName: "C", octaveNum: 4, isRoot: true },
  { pitchName: "E", octaveNum: 4, isRoot: false },
  { pitchName: "G", octaveNum: 4, isRoot: false },
];

/**
 *
 */
export const METER_REMAIN_MS = 1500;

// 各音名に対応する色のマップ
export const PITCH_COLOR_MAP: { [key: string]: string } = {
  C: "#ff6b6b",
  "C#": "#ff8e53",
  D: "#ffc107",
  Eb: "#fde047",
  E: "#a8e063",
  F: "#56ab2f",
  "F#": "#26de81",
  G: "#2bcbba",
  "G#": "#45aaf2",
  A: "#0fb9b1",
  Bb: "#4a90e2",
  B: "#8e44ad",
};

/**
 * フィードバック形式の定義
 */
export const FEEDBACK_TYPES = [
  "meter",
  "bar",
  "circle",
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  meter: "メーター",
  bar: "バー",
  circle: "サークル",
};

export const FEEDBACK_TYPE_DESCRIPTIONS: Record<FeedbackType, string> = {
  meter: "針が動くアナログメーター表示",
  bar: "シンプルな横棒グラフ表示",
  circle: "円になった音名で和音の形をわかりやすく",
};
