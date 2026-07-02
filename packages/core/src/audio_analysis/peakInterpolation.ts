/**
 * スペクトルピークのサブビン精度推定
 * FFTの周波数分解能の限界を補間技術で克服するためのユーティリティ
 */

/**
 * パラボラ補間でサブビン精度の周波数を推定
 * 
 * 最大ピーク周辺の3点（左隣、ピーク、右隣）から放物線を当てはめ、
 * 真のピーク位置を推定する。音響処理で広く使われる標準的手法。
 * dB単位のスペクトルに対応（getFloatFrequencyData の結果）
 * 
 * @param spec スペクトル配列（dB単位）- getFloatFrequencyData() の結果を想定
 * @param peakIdx 最大値のインデックス
 * @param freq 周波数配列
 * @returns 補間された周波数。補間できない場合はビンの周波数をそのまま返す
 */
export function quadraticInterpolation(
    spec: Float32Array,
    peakIdx: number,
    freq: number[]
): number {
    // 境界チェック：両隣が存在しない場合は補間不可
    if (peakIdx <= 0 || peakIdx >= spec.length - 1) {
        return freq[peakIdx];
    }

    // 3点のdB値を取得
    const alpha = spec[peakIdx - 1];
    const beta = spec[peakIdx];
    const gamma = spec[peakIdx + 1];

    // ピークが明確でない場合は補間をスキップ
    // （例：平坦、または両隣の方が大きい）
    if (beta <= alpha || beta <= gamma) {
        return freq[peakIdx];
    }

    // dB値を線形振幅に変換してからパラボラ補間を実行
    // A_dB = 20 * log10(A_linear) ⟹ A_linear = 10^(A_dB / 20)
    const alphaLinear = Math.pow(10, alpha / 20);
    const betaLinear = Math.pow(10, beta / 20);
    const gammaLinear = Math.pow(10, gamma / 20);

    // パラボラ補間の公式: δ = 0.5 * (α - γ) / (α - 2β + γ)
    // δ は -0.5 〜 +0.5 の範囲のビンオフセット
    // 線形振幅値に対して補間を行う
    const denominator = alphaLinear - 2 * betaLinear + gammaLinear;

    // 分母が0に近い場合（ほぼ平坦）は補間をスキップ
    if (Math.abs(denominator) < 1e-10) {
        return freq[peakIdx];
    }

    const delta = 0.5 * (alphaLinear - gammaLinear) / denominator;

    // δ が範囲外の場合は補間失敗とみなす
    if (Math.abs(delta) > 0.5) {
        return freq[peakIdx];
    }

    // 補間された位置の周波数を計算
    // 線形補間で周波数を求める
    const freqStep = freq.length > 1 ? freq[1] - freq[0] : 0;
    const interpolatedFreq = freq[peakIdx] + delta * freqStep;

    return interpolatedFreq;
}

/**
 * 重心法でサブビン精度の周波数を推定
 * 
 * 上位N個のビンの振幅で重み付けした周波数平均を計算する。
 * ノイズに強いが、倍音の影響を受けやすい。
 * 
 * @param spec スペクトル配列の一部（評価範囲）
 * @param freqRange 対応する周波数配列
 * @param topN 上位何個のビンを使用するか（デフォルト: 3）
 * @returns 重み付き平均周波数
 */
export function spectralCentroid(
    spec: Float32Array,
    freqRange: number[],
    topN: number = 3
): number {
    if (spec.length === 0 || freqRange.length === 0 || spec.length !== freqRange.length) {
        return freqRange[0] || 0;
    }

    // ビンとその振幅のペアを作成
    const bins: Array<{ idx: number; amplitude: number; freq: number }> = [];
    for (let i = 0; i < spec.length; i++) {
        bins.push({ idx: i, amplitude: spec[i], freq: freqRange[i] });
    }

    // 振幅でソート（降順）
    bins.sort((a, b) => b.amplitude - a.amplitude);

    // 上位N個を取得
    const topBins = bins.slice(0, Math.min(topN, bins.length));

    // 重み付き平均を計算
    let weightedSum = 0;
    let totalWeight = 0;

    for (const bin of topBins) {
        // 線形振幅に変換（対数スペクトルの場合）
        // spec は getFloatFrequencyData の結果でdB単位なので、線形に変換
        const linearAmplitude = Math.pow(10, bin.amplitude / 20);
        weightedSum += bin.freq * linearAmplitude;
        totalWeight += linearAmplitude;
    }

    if (totalWeight === 0) {
        return topBins[0]?.freq || freqRange[0];
    }

    return weightedSum / totalWeight;
}

/**
 * 補間手法の種類
 */
export type InterpolationMethod = 'none' | 'parabolic' | 'centroid';

/**
 * 指定された手法でピーク周波数を推定
 * 
 * @param method 補間手法
 * @param spec 完全なスペクトル配列
 * @param peakIdx 最大値のインデックス（完全なスペクトル配列内）
 * @param freq 完全な周波数配列
 * @param evalRangeMin 評価範囲の開始インデックス（centroid用）
 * @param evalRangeMax 評価範囲の終了インデックス（centroid用）
 * @param topN 重心法で使用する上位ビン数
 * @returns 推定された周波数
 */
export function estimatePeakFrequency(
    method: InterpolationMethod,
    spec: Float32Array,
    peakIdx: number,
    freq: number[],
    evalRangeMin?: number,
    evalRangeMax?: number,
    topN: number = 3
): number {
    switch (method) {
        case 'parabolic':
            return quadraticInterpolation(spec, peakIdx, freq);

        case 'centroid':
            if (evalRangeMin !== undefined && evalRangeMax !== undefined) {
                const evalSpec = spec.slice(evalRangeMin, evalRangeMax);
                const evalFreq = freq.slice(evalRangeMin, evalRangeMax);
                return spectralCentroid(evalSpec, evalFreq, topN);
            }
            return freq[peakIdx];

        case 'none':
        default:
            return freq[peakIdx];
    }
}
