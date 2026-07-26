/**
 * PcmCaptureProcessor - 生 PCM をメインスレッドへ転送する AudioWorkletProcessor
 *
 * 構成音の自動追従 (StreamingChordTracker) 用。128 サンプルの quantum を
 * batchSize までローカルに蓄積し、transferable な Float32Array として
 * port へ送る (postMessage の頻度を ~43ms/回 @48kHz に抑える)。
 */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batchSize = 2048;
    this.batch = new Float32Array(this.batchSize);
    this.writeIndex = 0;
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
          this.port.postMessage(filled, [filled.buffer]);
          this.batch = new Float32Array(this.batchSize);
          this.writeIndex = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
