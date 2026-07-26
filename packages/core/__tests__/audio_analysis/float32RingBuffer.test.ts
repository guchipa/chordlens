import { Float32RingBuffer } from "../../src/audio_analysis/float32RingBuffer";

/** 連番 (start, start+1, ...) の Float32Array を生成する */
function seq(start: number, length: number): Float32Array {
  return Float32Array.from({ length }, (_, i) => start + i);
}

describe("Float32RingBuffer", () => {
  it("書き込んだサンプルを順番に読み出せる", () => {
    const ring = new Float32RingBuffer(16);
    ring.write(seq(0, 4));
    ring.write(seq(4, 4));

    const out = new Float32Array(8);
    expect(ring.readInto(out, 0)).toBe(true);
    expect(Array.from(out)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("データ不足のときは false を返し out を変更しない", () => {
    const ring = new Float32RingBuffer(16);
    ring.write(seq(0, 4));

    const out = new Float32Array(8).fill(-1);
    expect(ring.readInto(out, 0)).toBe(false);
    expect(out.every((v) => v === -1)).toBe(true);
  });

  it("容量を跨ぐ書き込み・読み出し (wrap-around) が正しく動く", () => {
    const ring = new Float32RingBuffer(8);
    ring.write(seq(0, 6));
    // 6 サンプル消費した状態で 6 サンプル書き込み → 位置 6..11 が wrap する
    ring.write(seq(6, 6));

    const out = new Float32Array(6);
    expect(ring.readInto(out, 6)).toBe(true);
    expect(Array.from(out)).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it("未読分が容量を超えるとオーバーランを検出し、最古の読める位置を返す", () => {
    const ring = new Float32RingBuffer(8);
    ring.write(seq(0, 12)); // 容量 8 を超過 → 先頭 4 サンプルは失われる

    expect(ring.hasOverrun(0)).toBe(true);
    expect(ring.oldestReadable()).toBe(4);

    const out = new Float32Array(8);
    expect(ring.readInto(out, 0)).toBe(false); // 上書き済み位置は読めない
    expect(ring.readInto(out, 4)).toBe(true);
    expect(Array.from(out)).toEqual([4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("容量より長いチャンクは末尾 capacity サンプルが残る", () => {
    const ring = new Float32RingBuffer(4);
    ring.write(seq(0, 10));

    expect(ring.totalWritten).toBe(10);
    expect(ring.oldestReadable()).toBe(6);

    const out = new Float32Array(4);
    expect(ring.readInto(out, 6)).toBe(true);
    expect(Array.from(out)).toEqual([6, 7, 8, 9]);
  });
});
