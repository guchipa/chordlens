/**
 * Float32RingBuffer - PCM ストリーム用の固定容量リングバッファ
 *
 * AudioWorklet から届く細かいチャンクを蓄積し、解析側が固定長フレームを
 * 順番に読み出すための土台。書き込み位置は累計サンプル数 (totalWritten) で
 * 管理し、読み出し側は自分が消費した累計位置 (consumedTotal) を保持する。
 * 解析が追いつかず容量を超えた分は古いデータから上書きされる
 * (読み出し側は skipToLatest で追いつく)。
 */
export class Float32RingBuffer {
  private readonly buffer: Float32Array;
  private written = 0;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error(`capacity must be positive: ${capacity}`);
    }
    this.buffer = new Float32Array(capacity);
  }

  get capacity(): number {
    return this.buffer.length;
  }

  /** これまでに書き込まれた累計サンプル数 */
  get totalWritten(): number {
    return this.written;
  }

  /** consumedTotal 以降に読み出せるサンプル数 */
  available(consumedTotal: number): number {
    return this.written - consumedTotal;
  }

  /** 未読分が容量を超えて上書きされているか */
  hasOverrun(consumedTotal: number): boolean {
    return this.available(consumedTotal) > this.capacity;
  }

  /**
   * 上書きで失われていない最古の位置を返す。
   * オーバーラン時に読み出し側が消費位置を前進させるために使う
   */
  oldestReadable(): number {
    return Math.max(0, this.written - this.capacity);
  }

  /** チャンクを書き込む。容量を超える分は古いデータを上書きする */
  write(chunk: Float32Array): void {
    const capacity = this.capacity;
    // 容量より長いチャンクは末尾 capacity サンプルだけ意味を持つ
    const src = chunk.length > capacity ? chunk.subarray(chunk.length - capacity) : chunk;
    const skipped = chunk.length - src.length;

    const pos = (this.written + skipped) % capacity;
    const firstLen = Math.min(src.length, capacity - pos);
    this.buffer.set(src.subarray(0, firstLen), pos);
    if (firstLen < src.length) {
      this.buffer.set(src.subarray(firstLen), 0);
    }
    this.written += chunk.length;
  }

  /**
   * consumedTotal から out.length サンプルを読み出す。
   * データ不足・上書き済みの場合は false を返し out は変更しない
   */
  readInto(out: Float32Array, consumedTotal: number): boolean {
    if (
      consumedTotal < this.oldestReadable() ||
      this.available(consumedTotal) < out.length
    ) {
      return false;
    }
    const capacity = this.capacity;
    const pos = consumedTotal % capacity;
    const firstLen = Math.min(out.length, capacity - pos);
    out.set(this.buffer.subarray(pos, pos + firstLen), 0);
    if (firstLen < out.length) {
      out.set(this.buffer.subarray(0, out.length - firstLen), firstLen);
    }
    return true;
  }
}
