/**
 * StreamingPcmCapture - 既存の音声グラフから生 PCM を連続取得する
 *
 * AudioWorklet (public/pcm-capture-processor.js) でマイクの PCM を
 * ~2048 サンプルごとのチャンクとして受け取り、onChunk に渡す。
 * MediaRecorder → decodeAudioData の往復 (recordMonoAudio) と違い
 * エンコードを挟まないため、StreamingChordTracker と組み合わせて
 * 低レイテンシの逐次解析ができる。
 *
 * AudioContext とマイクストリームは自前で作らず、チューナー本体
 * (useAudioContext) が持つグラフに attach する。マイク入力グラフを
 * 二重に確保すると CPU・バッテリーを余分に食い、入力デバイスの
 * 同時利用制限にも当たるため。
 *
 * サンプルレートは AudioContext のネイティブレート (通常 44.1/48kHz)。
 * HarmonicNoteDetector は sampleRate オプションで任意レートに対応する
 * ためリサンプルは行わない。
 */

/** PCM を取り出す対象のグラフ (チューナー本体の AudioContext とマイク源) */
export interface PcmCaptureTarget {
  context: AudioContext;
  source: AudioNode;
}

/** 接続の解除は closed な AudioContext では失敗しうるため握りつぶす */
function safeDisconnect(disconnect: () => void): void {
  try {
    disconnect();
  } catch {
    // AudioContext が既に閉じている場合など。解放済みなので無視してよい
  }
}

export class StreamingPcmCapture {
  private constructor(
    private readonly context: AudioContext,
    private readonly source: AudioNode,
    private readonly node: AudioWorkletNode,
    private readonly silentGain: GainNode
  ) {}

  /**
   * 既存のグラフに PCM 取得用の worklet をぶら下げる。
   * source と context の寿命は呼び出し側 (チューナー本体) が握るため、
   * dispose ではここで張った接続だけを外す
   */
  static async attach(
    target: PcmCaptureTarget,
    onChunk: (chunk: Float32Array) => void
  ): Promise<StreamingPcmCapture> {
    const { context, source } = target;
    // 同じモジュールの二重登録は無害 (解決済みの Promise が返る)
    await context.audioWorklet.addModule("/pcm-capture-processor.js");
    const node = new AudioWorkletNode(context, "pcm-capture-processor");
    node.port.onmessage = (event: MessageEvent<Float32Array>) => {
      onChunk(event.data);
    };
    // worklet は destination に到達する経路がないと process() が呼ばれない
    // ブラウザがあるため、ゲイン 0 の経路で繋いで無音のまま駆動する
    const silentGain = context.createGain();
    silentGain.gain.value = 0;
    source.connect(node);
    node.connect(silentGain);
    silentGain.connect(context.destination);
    return new StreamingPcmCapture(context, source, node, silentGain);
  }

  /** 解析に使うサンプルレート (AudioContext のネイティブレート) */
  get sampleRate(): number {
    return this.context.sampleRate;
  }

  dispose(): void {
    this.node.port.onmessage = null;
    safeDisconnect(() => this.source.disconnect(this.node));
    safeDisconnect(() => this.node.disconnect());
    safeDisconnect(() => this.silentGain.disconnect());
  }
}
