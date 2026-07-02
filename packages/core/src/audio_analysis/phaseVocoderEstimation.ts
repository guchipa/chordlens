/**
 * 位相ボコーダ法 (Phase Vocoder / Instantaneous Frequency)
 * による F0 精密推定
 *
 * 原理:
 * ホップ幅 H だけ時間をずらした 2 つの窓で FFT を計算し、
 * 対象周波数付近のビンにおける 2 フレーム間の位相変化を観測する。
 * ビン中心周波数で期待される位相進みとの差分から、ビン幅に縛られない
 * 真の瞬時周波数を逆算する。
 *
 *   f_true = k * fs / W + Δφ * fs / (2π * H)
 *
 *   k  : 対象ビン番号
 *   W  : FFT 窓長
 *   H  : ホップ幅 (サンプル)
 *   Δφ : 期待位相進みからの偏差を [-π, π] に折り返した値
 *
 * 定常音に対してはサブセント精度が得られる。FFT のピーク検出のように
 * ビン分解能に律速されないため、低音域でも高い周波数精度を保てる。
 *
 * 制約:
 * - ビブラートや短い発音では位相の定常性が崩れ精度が落ちる。
 * - 各構成音の基本波が別ビンに分離できる程度に窓長が長い必要がある
 *   (通常の和音では基本波が半音以上離れるため問題にならない)。
 */

import { nextPow2, radix2FFT } from "./fft";

export interface PhaseVocoderResult {
    /** 対象の期待周波数 (Hz) */
    targetFreq: number;
    /** 位相ボコーダで推定した F0 (Hz)、null = 無音・検出失敗 */
    estimatedF0: number | null;
    /** ピークビンのマグニチュード (相対値) */
    magnitude: number;
}

interface FrameSpectrum {
    real: Float64Array;
    imag: Float64Array;
}

/** buffer[start..start+W) に Hann 窓を掛けて FFT を計算する (W は 2 のべき乗) */
function windowedFFT(buffer: Float32Array, start: number, W: number): FrameSpectrum {
    const real = new Float64Array(W);
    const imag = new Float64Array(W);
    for (let i = 0; i < W; i++) {
        const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / W);
        real[i] = buffer[start + i] * win;
    }
    radix2FFT(real, imag);
    return { real, imag };
}

/** 位相を [-π, π] の主値に折り返す */
function principalAngle(phase: number): number {
    return phase - 2 * Math.PI * Math.round(phase / (2 * Math.PI));
}

/**
 * 各構成音の期待周波数付近を位相ボコーダで精密推定する。
 *
 * @param buffer            時間領域の音声データ (長さは 2 のべき乗を推奨)
 * @param sampleRate        サンプルレート (Hz)
 * @param targetFrequencies 構成音の期待周波数リスト (Hz)
 * @param searchRangeCents  ピーク探索範囲 (セント, デフォルト 100 = ±50 cents)
 * @param silenceThreshold  無音判定する平均パワーの閾値 (デフォルト 1e-6)
 * @returns 各構成音の F0 推定結果リスト
 */
export function estimateF0WithPhaseVocoder(
    buffer: Float32Array,
    sampleRate: number,
    targetFrequencies: number[],
    searchRangeCents: number = 100,
    silenceThreshold: number = 1e-6
): PhaseVocoderResult[] {
    const N = buffer.length;

    // 窓長 W (2 のべき乗) とホップ H = W/4 を決定する。
    // 2 フレーム (W + H サンプル) がバッファに収まるよう W を調整する。
    let W = nextPow2(N) >> 1; // nextPow2(N) ≤ 2N なので W ≤ N が保証される
    while (W > 2 && W + (W >> 2) > N) W >>= 1;
    const H = Math.max(1, W >> 2);

    // 無音チェック
    let sumSq = 0;
    for (let i = 0; i < N; i++) sumSq += buffer[i] * buffer[i];
    if (W < 2 || sumSq / N < silenceThreshold) {
        return targetFrequencies.map((targetFreq) => ({
            targetFreq,
            estimatedF0: null,
            magnitude: 0,
        }));
    }

    // ホップ幅で時間をずらした 2 フレームの FFT
    const frame1 = windowedFFT(buffer, 0, W);
    const frame2 = windowedFFT(buffer, H, W);

    const df = sampleRate / W;
    const maxBin = (W >> 1) - 1;
    const halfCents = searchRangeCents / 2;

    return targetFrequencies.map((targetFreq) => {
        // 探索ビン範囲を ±halfCents から算出
        const fLow = targetFreq * Math.pow(2, -halfCents / 1200);
        const fHigh = targetFreq * Math.pow(2, halfCents / 1200);
        let binLow = Math.max(1, Math.floor(fLow / df));
        let binHigh = Math.min(maxBin, Math.ceil(fHigh / df));
        if (binHigh < binLow) {
            // 範囲が 1 ビン未満に潰れた場合は対象周波数の最近傍ビンを使う
            binLow = binHigh = Math.max(1, Math.min(maxBin, Math.round(targetFreq / df)));
        }

        // 探索範囲内でマグニチュード最大のビンを探す
        let peakBin = binLow;
        let peakPow = -Infinity;
        for (let k = binLow; k <= binHigh; k++) {
            const mag = frame1.real[k] * frame1.real[k] + frame1.imag[k] * frame1.imag[k];
            if (mag > peakPow) {
                peakPow = mag;
                peakBin = k;
            }
        }

        // 位相ボコーダによる精密化
        const phi1 = Math.atan2(frame1.imag[peakBin], frame1.real[peakBin]);
        const phi2 = Math.atan2(frame2.imag[peakBin], frame2.real[peakBin]);
        const expected = (2 * Math.PI * peakBin * H) / W;
        const delta = principalAngle(phi2 - phi1 - expected);
        const estimatedF0 = peakBin * df + (delta * sampleRate) / (2 * Math.PI * H);

        return { targetFreq, estimatedF0, magnitude: Math.sqrt(Math.max(0, peakPow)) };
    });
}
