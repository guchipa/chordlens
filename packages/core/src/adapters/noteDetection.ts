/**
 * NoteDetector - プラットフォーム非依存の構成音検出抽象
 *
 * 録音済みのモノラル音声バッファから構成音 (MIDI ノートイベント) を推定する契約。
 * 推定結果は audio_analysis/chordToneEstimation.ts の noteEventsToPitchList で
 * チューナーの構成音リスト (Pitch[]) に変換する。
 *
 * 実装のマッピング:
 * - Web:          @spotify/basic-pitch (TensorFlow.js)
 *                 → apps/web/lib/audio/basicPitchNoteDetector.ts
 * - React Native: TFLite / ONNX 版 basic-pitch モデルを想定
 */

export interface DetectedNoteEvent {
  /** MIDI ノート番号 (A4 = 69)。平均律基準の半音格子 */
  midiNote: number;
  /** ノート開始時刻 (秒、バッファ先頭基準) */
  startTimeSeconds: number;
  /** ノート長 (秒) */
  durationSeconds: number;
  /** 音量・信頼度 (0〜1) */
  amplitude: number;
}

export interface NoteDetector {
  /** detectNotes に渡す音声バッファの要求サンプルレート (Hz) */
  readonly requiredSampleRate: number;

  /**
   * モノラル音声バッファから構成音のノートイベントを推定する。
   * @param monoAudio requiredSampleRate でサンプリングされたモノラル PCM
   */
  detectNotes(monoAudio: Float32Array): Promise<DetectedNoteEvent[]>;
}
