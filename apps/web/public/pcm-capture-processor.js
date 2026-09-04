/**
 * PcmCaptureProcessor - 生 PCM をメインスレッドへ転送する AudioWorkletProcessor
 *
 * 構成音の自動追従 (StreamingChordTracker) 用。128 サンプルの quantum を
 * batchSize までローカルに蓄積し、transferable な Float32Array として
 * port へ送る (postMessage の頻度を ~43ms/回 @48kHz に抑える)。
 *
 * transfer するとバッファはこちら側で detach されるため、素朴に書くと
 * 毎バッチ Float32Array を確保することになる (48kHz で ~23 回/秒)。
 * オーディオレンダースレッド上の確保は GC を誘発し quantum 超過の
 * リスクになるので、メインスレッド (pcmCapture.ts) が使い終わった
 * ArrayBuffer を送り返し、それをプールして再利用する。
 * 返却が届かない場合 (取りこぼし・破棄) も新規確保にフォールバックするため
 * 動作は壊れない。
 */
const POOL_CAPACITY = 4;

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batchSize = 2048;
    /** メインスレッドから返却された再利用可能なバッファ */
    this.pool = [];
    this.batch = new Float32Array(this.batchSize);
    this.writeIndex = 0;
    this.port.onmessage = (event) => {
      const buffer = event.data;
      // 想定外のメッセージ・サイズ違いは無視する (プールを汚さない)
      if (
        buffer instanceof ArrayBuffer &&
        buffer.byteLength === this.batchSize * 4 &&
        this.pool.length < POOL_CAPACITY
      ) {
        this.pool.push(new Float32Array(buffer));
      }
    };
  }

  /** 送信済みバッファの代わりを用意する (プール優先) */
  takeBatch() {
    return this.pool.pop() ?? new Float32Array(this.batchSize);
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      let offset = 0;
      while (offset < channelData.length) {
        const copyLength = Math.min(
          channelData.length - offset,
          this.batchSize - this.writeIndex
        );
        this.batch.set(
          channelData.subarray(offset, offset + copyLength),
          this.writeIndex
        );
        this.writeIndex += copyLength;
        offset += copyLength;

        if (this.writeIndex === this.batchSize) {
          const filled = this.batch;
          this.batch = this.takeBatch();
          this.writeIndex = 0;
          this.port.postMessage(filled, [filled.buffer]);
        }
      }
    }
    return true;
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
