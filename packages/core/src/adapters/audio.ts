/**
 * SpectrumSource - プラットフォーム非依存の音声入力抽象
 *
 * リアルタイム解析パイプラインとプラットフォーム音声 API の境界を定義する契約。
 * 解析関数 (evaluateSpectrum / estimateF0WithSWIPE / estimateF0WithPhaseVocoder)
 * は生の Float32Array と数値のみを受け取るため既に非依存であり、
 * このインターフェースは「そのデータをどう取得するか」を差し替え可能にする。
 *
 * 実装のマッピング:
 * - Web:          AudioContext + AnalyserNode
 *                 (現状は apps/web/lib/hooks/audio/useAudioContext.ts が
 *                  この契約と同等の機能を担う。docs/MOBILE_MIGRATION.md 参照)
 * - React Native: react-native-audio-api の AnalyserNode 互換実装、
 *                 または native モジュール + 自前 FFT (src/audio_analysis/fft.ts)
 */
export interface SpectrumSourceOptions {
  /** FFT サイズ (2 の冪、例: 4096) */
  fftSize: number;
  /** スペクトルの時間平滑化定数 (0〜1)。AnalyserNode.smoothingTimeConstant 相当 */
  smoothingTimeConstant: number;
}

export interface SpectrumSource {
  /** サンプリングレート (Hz)。start() 後に有効 */
  readonly sampleRate: number;
  /** 現在の FFT サイズ */
  readonly fftSize: number;
  /** 周波数ビン数 (= fftSize / 2) */
  readonly frequencyBinCount: number;

  /** マイク入力の取得と解析グラフの構築を行う。成功時 true */
  start(): Promise<boolean>;
  /** リソースを解放する */
  stop(): void;
  /** 設定を更新する (fftSize 変更時はバッファの再確保が必要) */
  updateSettings(options: SpectrumSourceOptions): void;

  /**
   * 現在の振幅スペクトル (dB) を out に書き込む。
   * out.length は frequencyBinCount と一致していること。
   * AnalyserNode.getFloatFrequencyData 相当。
   */
  getFloatFrequencyData(out: Float32Array): void;

  /**
   * 現在の時間領域波形を out に書き込む。
   * out.length は fftSize と一致していること。
   * AnalyserNode.getFloatTimeDomainData 相当。
   */
  getFloatTimeDomainData(out: Float32Array): void;
}

/**
 * 周波数ビン配列 (各ビンの中心周波数 Hz) を計算する。
 * evaluateSpectrum の freqBins 引数に渡す値。
 */
export function calcFreqBins(sampleRate: number, binCount: number): number[] {
  return Array.from(
    { length: binCount },
    (_, i) => (sampleRate / 2) * (i / binCount)
  );
}
