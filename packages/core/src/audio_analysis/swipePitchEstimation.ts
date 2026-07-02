/**
 * SWIPE' (Sawtooth Waveform Inspired Pitch Estimator Prime)
 * ピッチ推定アルゴリズム
 *
 * 参考: Camacho, A., & Harris, J. G. (2008). A sawtooth waveform inspired
 * pitch estimator for speech and music. JASA, 124(3), 1638-1652.
 *
 * 処理の流れ:
 * 1. 構成音の周囲 ±bandwidthCents に IIR バンドパスフィルタをかける
 * 2. フィルタ後の信号に SWIPE' を適用して F0 を推定する
 */

import { nextPow2, radix2FFT } from "./fft";

// ======================================================
// 内部ユーティリティ
// ======================================================

/** エラトステネスのふるい: max 以下の素数リストを返す */
function sieveOfEratosthenes(max: number): number[] {
    if (max < 2) return [];
    const sieve = new Uint8Array(max + 1).fill(1);
    sieve[0] = sieve[1] = 0;
    for (let i = 2; i * i <= max; i++) {
        if (sieve[i]) {
            for (let j = i * i; j <= max; j += i) sieve[j] = 0;
        }
    }
    const primes: number[] = [];
    for (let i = 2; i <= max; i++) {
        if (sieve[i]) primes.push(i);
    }
    return primes;
}

/** Hann ウィンドウを適用してパワースペクトルを計算する (片側) */
function computePowerSpectrum(buffer: Float32Array): { power: Float64Array; fftSize: number } {
    const inputLen = buffer.length;
    const N = nextPow2(inputLen);
    const real = new Float64Array(N);
    const imag = new Float64Array(N);

    for (let i = 0; i < inputLen; i++) {
        const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / inputLen);
        real[i] = buffer[i] * win;
    }

    radix2FFT(real, imag);

    const half = N >> 1;
    const power = new Float64Array(half);
    const norm = N * N;
    for (let i = 0; i < half; i++) {
        power[i] = (real[i] * real[i] + imag[i] * imag[i]) / norm;
    }
    return { power, fftSize: N };
}

// ======================================================
// バンドパスフィルタ (2 次 IIR Butterworth)
// ======================================================

/**
 * 2 次 IIR Butterworth バンドパスフィルタをバッファに適用する。
 *
 * @param buffer         入力音声データ
 * @param sampleRate     サンプルレート (Hz)
 * @param centerFreq     中心周波数 (Hz)
 * @param bandwidthCents 帯域幅 (セント, デフォルト 100 = ±50 cents)
 * @returns フィルタ後の音声データ
 */
export function applyBandpassFilter(
    buffer: Float32Array,
    sampleRate: number,
    centerFreq: number,
    bandwidthCents: number = 100
): Float32Array {
    const halfCents = bandwidthCents / 2;
    const fLow  = centerFreq * Math.pow(2, -halfCents / 1200);
    const fHigh = centerFreq * Math.pow(2,  halfCents / 1200);
    const Q = centerFreq / (fHigh - fLow);

    const w0    = (2 * Math.PI * centerFreq) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Q);
    const cosW0 = Math.cos(w0);
    const a0inv = 1 / (1 + alpha);

    // 正規化係数 (a0 = 1 に基準化)
    const b0 =  alpha * a0inv;
    // b1 = 0
    const b2 = -alpha * a0inv;
    const a1 = -2 * cosW0 * a0inv;
    const a2 = (1 - alpha) * a0inv;

    const output = new Float32Array(buffer.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = 0; i < buffer.length; i++) {
        const x0 = buffer[i];
        const y0 = b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2;
        output[i] = y0;
        x2 = x1; x1 = x0;
        y2 = y1; y1 = y0;
    }

    return output;
}

// ======================================================
// SWIPE' ピッチ推定
// ======================================================

export interface SWIPEResult {
    /** 推定された基本周波数 (Hz) */
    frequency: number;
    /** ピッチ強度: カーネルとスペクトルのコサイン類似度 (0〜1) */
    strength: number;
}

/**
 * SWIPE' アルゴリズムで時間領域バッファから F0 を推定する。
 *
 * 素数次倍音 (1, 2, 3, 5, 7, 11, ...) の √(パワースペクトル) と
 * カーネル 1/√n のコサイン類似度を最大化するピッチを返す。
 *
 * @param buffer       時間領域の音声データ
 * @param sampleRate   サンプルレート (Hz)
 * @param minFreq      探索する最低周波数 (Hz)
 * @param maxFreq      探索する最高周波数 (Hz)
 * @param centsPerStep 候補ピッチの分解能 (セント, デフォルト 10)
 * @returns 推定結果、または null (無音・検出失敗時)
 */
export function swipePrimeEstimate(
    buffer: Float32Array,
    sampleRate: number,
    minFreq: number = 80,
    maxFreq: number = 1200,
    centsPerStep: number = 10
): SWIPEResult | null {
    // 無音チェック
    let sumSq = 0;
    for (let i = 0; i < buffer.length; i++) sumSq += buffer[i] * buffer[i];
    if (sumSq / buffer.length < 1e-6) return null;

    const { power, fftSize } = computePowerSpectrum(buffer);
    const df = sampleRate / fftSize;
    const nyquist = sampleRate / 2;
    const half = power.length;

    // √パワースペクトルとそのノルム二乗
    const sqrtPow = new Float64Array(half);
    let specNormSq = 0;
    for (let i = 0; i < half; i++) {
        sqrtPow[i] = Math.sqrt(power[i]);
        specNormSq += power[i]; // == sqrtPow[i]^2
    }
    if (specNormSq === 0) return null;

    // 素数倍音次数リスト: [1, 2, 3, 5, 7, 11, ...]
    const maxOrder = Math.max(1, Math.floor(nyquist / minFreq));
    const primes = sieveOfEratosthenes(Math.min(maxOrder, 512));
    const harmonicOrders = [1, ...primes];

    // 候補ピッチのピッチ強度を計算する
    const computeStrength = (p: number): { inner: number; kernelNormSq: number } => {
        let inner = 0, kNormSq = 0;
        for (const n of harmonicOrders) {
            const harmFreq = n * p;
            if (harmFreq > nyquist) break;
            const bin = Math.round(harmFreq / df);
            if (bin >= half) break;
            const kv = 1 / Math.sqrt(n);
            inner   += kv * sqrtPow[bin];
            kNormSq += kv * kv;
        }
        return { inner, kernelNormSq: kNormSq };
    };

    // 対数等間隔で候補ピッチを走査
    const totalCents = 1200 * Math.log2(maxFreq / minFreq);
    const steps = Math.ceil(totalCents / centsPerStep);

    let bestStep = 0;
    let bestStrength = -Infinity;
    const strengths = new Float64Array(steps + 1);

    for (let s = 0; s <= steps; s++) {
        const p = minFreq * Math.pow(2, (s * centsPerStep) / 1200);
        const { inner, kernelNormSq } = computeStrength(p);
        if (kernelNormSq === 0) continue;
        const strength = inner / (Math.sqrt(kernelNormSq) * Math.sqrt(specNormSq));
        strengths[s] = strength;
        if (strength > bestStrength) {
            bestStrength = strength;
            bestStep = s;
        }
    }

    if (bestStrength <= 0) return null;

    // パラボラ補間でピッチを精緻化
    let refinedStep = bestStep;
    if (bestStep > 0 && bestStep < steps) {
        const sm1 = strengths[bestStep - 1];
        const s0  = strengths[bestStep];
        const sp1 = strengths[bestStep + 1];
        const denom = 2 * (2 * s0 - sm1 - sp1);
        if (Math.abs(denom) > 1e-12) {
            refinedStep = bestStep + (sm1 - sp1) / denom;
        }
    }

    const frequency = minFreq * Math.pow(2, (refinedStep * centsPerStep) / 1200);
    return { frequency, strength: bestStrength };
}

// ======================================================
// メイン API
// ======================================================

export interface F0EstimateResult {
    /** 対象の期待周波数 (Hz) */
    targetFreq: number;
    /** SWIPE' で推定した F0 (Hz)、null = 未検出 */
    estimatedF0: number | null;
    /** ピッチ強度 (0〜1) */
    strength: number;
}

/**
 * 各構成音の周囲 ±(bandwidthCents/2) cents に IIR バンドパスフィルタをかけ、
 * SWIPE' で F0 を推定する。
 *
 * @param buffer             時間領域の音声データ
 * @param sampleRate         サンプルレート (Hz)
 * @param targetFrequencies  構成音の期待周波数リスト (Hz)
 * @param bandwidthCents     バンドパス幅 (セント, デフォルト 100 = ±50 cents)
 * @returns 各構成音の F0 推定結果リスト
 */
export function estimateF0WithSWIPE(
    buffer: Float32Array,
    sampleRate: number,
    targetFrequencies: number[],
    bandwidthCents: number = 100
): F0EstimateResult[] {
    const halfCents = bandwidthCents / 2;

    return targetFrequencies.map(targetFreq => {
        // ±halfCents のバンドパスフィルタで構成音を分離
        const filtered = applyBandpassFilter(buffer, sampleRate, targetFreq, bandwidthCents);

        // SWIPE' の探索範囲をフィルタ帯域に限定
        const minFreq = targetFreq * Math.pow(2, -halfCents / 1200);
        const maxFreq = targetFreq * Math.pow(2,  halfCents / 1200);

        const result = swipePrimeEstimate(filtered, sampleRate, minFreq, maxFreq);

        return {
            targetFreq,
            estimatedF0: result?.frequency ?? null,
            strength:    result?.strength ?? 0,
        };
    });
}
