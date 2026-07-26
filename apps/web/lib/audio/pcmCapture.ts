/**
 * StreamingPcmCapture - マイク入力の生 PCM を連続取得する
 *
 * AudioWorklet (public/pcm-capture-processor.js) でマイクの PCM を
 * ~2048 サンプルごとのチャンクとして受け取り、onChunk に渡す。
 * MediaRecorder → decodeAudioData の往復 (recordMonoAudio) と違い
 * エンコードを挟まないため、StreamingChordTracker と組み合わせて
 * 低レイテンシの逐次解析ができる。
 *
 * サンプルレートは AudioContext のネイティブレート (通常 44.1/48kHz)。
 * PitchPleaseNoteDetector は sampleRate オプションで任意レートに対応する
 * ためリサンプルは行わない。
 */
export class StreamingPcmCapture {
  private constructor(
    private readonly context: AudioContext,
    private readonly source: MediaStreamAudioSourceNode,
    private readonly node: AudioWorkletNode
  ) {}

  static async create(
    stream: MediaStream,
    onChunk: (chunk: Float32Array) => void
  ): Promise<StreamingPcmCapture> {
    const context = new AudioContext();
    try {
      await context.resume();
      await context.audioWorklet.addModule("/pcm-capture-processor.js");
      const node = new AudioWorkletNode(context, "pcm-capture-processor");
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        onChunk(event.data);
      };
      const source = context.createMediaStreamSource(stream);
      // 解析専用なので destination には接続しない
      source.connect(node);
      return new StreamingPcmCapture(context, source, node);
    } catch (err) {
      await context.close().catch(() => {});
      throw err;
    }
  }

  /** 解析に使うサンプルレート (AudioContext のネイティブレート) */
  get sampleRate(): number {
    return this.context.sampleRate;
  }

  dispose(): void {
    this.node.port.onmessage = null;
    this.source.disconnect();
    this.node.disconnect();
    void this.context.close().catch(() => {});
  }
}
