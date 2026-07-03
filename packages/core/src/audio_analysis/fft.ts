/**
 * FFT 共通ユーティリティ
 *
 * Cooley-Tukey Radix-2 FFT と補助関数。
 * SWIPE'・位相ボコーダなど複数のピッチ推定アルゴリズムで共用する。
 */

/** n 以上の最小の 2 のべき乗を返す */
export function nextPow2(n: number): number {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
}

/** Cooley-Tukey Radix-2 FFT (in-place、長さは 2 のべき乗であること) */
export function radix2FFT(real: Float64Array, imag: Float64Array): void {
    const N = real.length;

    // ビット反転置換
    for (let i = 1, j = 0; i < N; i++) {
        let bit = N >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            let t = real[i]; real[i] = real[j]; real[j] = t;
            t = imag[i]; imag[i] = imag[j]; imag[j] = t;
        }
    }

    // バタフライ演算
    for (let len = 2; len <= N; len <<= 1) {
        const half = len >> 1;
        const ang = (-2 * Math.PI) / len;
        const wdRe = Math.cos(ang);
        const wdIm = Math.sin(ang);

        for (let i = 0; i < N; i += len) {
            let wRe = 1, wIm = 0;
            for (let j = 0; j < half; j++) {
                const u = i + j, v = i + j + half;
                const vRe = real[v] * wRe - imag[v] * wIm;
                const vIm = real[v] * wIm + imag[v] * wRe;
                real[v] = real[u] - vRe;
                imag[v] = imag[u] - vIm;
                real[u] += vRe;
                imag[u] += vIm;
                const tmp = wRe * wdRe - wIm * wdIm;
                wIm = wRe * wdIm + wIm * wdRe;
                wRe = tmp;
            }
        }
    }
}
