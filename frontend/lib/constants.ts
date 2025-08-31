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
 * スペクトル評価の閾値
 * この値以下のスペクトルであった場合メータを描画しない
 */
export const EVAL_THRESHOLD = -100;

/**
 * 解析対象とする音名のリスト
 */
export const PITCH_NAME_LIST: string[] = [
  "C",
  "C#",
  "D",
  "E♭",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "B♭",
  "B",
];

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

export const DEFAULT_INITIAL_PITCH_LIST = [
  { pitchName: "C", octaveNum: 4, isRoot: true },
  { pitchName: "E", octaveNum: 4, isRoot: false },
  { pitchName: "G", octaveNum: 4, isRoot: false },
];

/**
 * 
 */
export const METER_REMAIN_MS = 1500;
