import {
    applyBandpassFilter,
    swipePrimeEstimate,
    estimateF0WithSWIPE,
} from "../../src/audio_analysis/swipePitchEstimation";

const SAMPLE_RATE = 48000;
const BUFFER_SIZE = 4096;

// ヘルパー: 純音 (正弦波) を生成
function generateSine(freq: number, amplitude = 0.5): Float32Array {
    const buf = new Float32Array(BUFFER_SIZE);
    for (let i = 0; i < BUFFER_SIZE; i++) {
        buf[i] = amplitude * Math.sin(2 * Math.PI * freq * i / SAMPLE_RATE);
    }
    return buf;
}

// ヘルパー: 鋸波 (倍音を numHarmonics 次まで重ねた近似) を生成
function generateSawtooth(freq: number, numHarmonics = 20, amplitude = 0.5): Float32Array {
    const buf = new Float32Array(BUFFER_SIZE);
    for (let n = 1; n <= numHarmonics; n++) {
        const harmFreq = n * freq;
        if (harmFreq >= SAMPLE_RATE / 2) break;
        for (let i = 0; i < BUFFER_SIZE; i++) {
            buf[i] += (amplitude / n) * Math.sin(2 * Math.PI * harmFreq * i / SAMPLE_RATE);
        }
    }
    return buf;
}

// ヘルパー: 周波数偏差をセントに変換
function toCents(estimated: number, reference: number): number {
    return 1200 * Math.log2(estimated / reference);
}

// ======================================================
// applyBandpassFilter
// ======================================================

describe("applyBandpassFilter", () => {
    it("440 Hz 純音に 440 Hz±50 cents のフィルタをかけると振幅が保存される", () => {
        const input = generateSine(440, 0.5);
        const output = applyBandpassFilter(input, SAMPLE_RATE, 440, 100);

        // フィルタ後の RMS はほぼ入力と同程度 (立ち上がりを除く後半で比較)
        let rmsIn = 0, rmsOut = 0;
        for (let i = BUFFER_SIZE / 2; i < BUFFER_SIZE; i++) {
            rmsIn  += input[i]  * input[i];
            rmsOut += output[i] * output[i];
        }
        rmsIn  = Math.sqrt(rmsIn  / (BUFFER_SIZE / 2));
        rmsOut = Math.sqrt(rmsOut / (BUFFER_SIZE / 2));
        expect(rmsOut / rmsIn).toBeGreaterThan(0.5);
    });

    it("帯域外 (1 オクターブ上) の純音はほぼ除去される", () => {
        // 440 Hz フィルタに対して 880 Hz は帯域外
        const input = generateSine(880, 0.5);
        const output = applyBandpassFilter(input, SAMPLE_RATE, 440, 100);

        let rmsIn = 0, rmsOut = 0;
        for (let i = BUFFER_SIZE / 2; i < BUFFER_SIZE; i++) {
            rmsIn  += input[i]  * input[i];
            rmsOut += output[i] * output[i];
        }
        rmsIn  = Math.sqrt(rmsIn  / (BUFFER_SIZE / 2));
        rmsOut = Math.sqrt(rmsOut / (BUFFER_SIZE / 2));
        // 帯域外なので出力は入力より十分小さい
        expect(rmsOut / rmsIn).toBeLessThan(0.1);
    });

    it("無音入力に対して無音を返す", () => {
        const input = new Float32Array(BUFFER_SIZE); // 全ゼロ
        const output = applyBandpassFilter(input, SAMPLE_RATE, 440, 100);
        const maxAbs = Math.max(...Array.from(output).map(Math.abs));
        expect(maxAbs).toBe(0);
    });
});

// ======================================================
// swipePrimeEstimate
// ======================================================

describe("swipePrimeEstimate", () => {
    it("440 Hz の鋸波から ±30 cents 以内で F0 を推定する", () => {
        const buf = generateSawtooth(440);
        const result = swipePrimeEstimate(buf, SAMPLE_RATE, 300, 600);
        expect(result).not.toBeNull();
        const cents = toCents(result!.frequency, 440);
        expect(Math.abs(cents)).toBeLessThan(30);
    });

    it("261.63 Hz (C4) の鋸波から ±30 cents 以内で F0 を推定する", () => {
        const buf = generateSawtooth(261.63);
        const result = swipePrimeEstimate(buf, SAMPLE_RATE, 200, 350);
        expect(result).not.toBeNull();
        const cents = toCents(result!.frequency, 261.63);
        expect(Math.abs(cents)).toBeLessThan(30);
    });

    it("392 Hz (G4) の鋸波から ±30 cents 以内で F0 を推定する", () => {
        const buf = generateSawtooth(392);
        const result = swipePrimeEstimate(buf, SAMPLE_RATE, 300, 500);
        expect(result).not.toBeNull();
        const cents = toCents(result!.frequency, 392);
        expect(Math.abs(cents)).toBeLessThan(30);
    });

    it("無音バッファに対して null を返す", () => {
        const buf = new Float32Array(BUFFER_SIZE);
        expect(swipePrimeEstimate(buf, SAMPLE_RATE)).toBeNull();
    });

    it("strength は 0〜1 の範囲に収まる", () => {
        const buf = generateSawtooth(440);
        const result = swipePrimeEstimate(buf, SAMPLE_RATE, 300, 600);
        expect(result).not.toBeNull();
        expect(result!.strength).toBeGreaterThanOrEqual(0);
        expect(result!.strength).toBeLessThanOrEqual(1);
    });
});

// ======================================================
// estimateF0WithSWIPE
// ======================================================

describe("estimateF0WithSWIPE", () => {
    it("複数の構成音それぞれの F0 を ±30 cents 以内で推定する", () => {
        const targets = [261.63, 329.63, 392.0]; // C4, E4, G4

        const results = targets.map(freq => {
            // 各音を個別に生成してテスト (混合和音は干渉が大きいため単音でテスト)
            const buf = generateSawtooth(freq);
            return estimateF0WithSWIPE(buf, SAMPLE_RATE, [freq], 100)[0];
        });

        results.forEach((result, idx) => {
            expect(result.estimatedF0).not.toBeNull();
            const cents = toCents(result.estimatedF0!, targets[idx]);
            expect(Math.abs(cents)).toBeLessThan(30);
        });
    });

    it("targetFrequencies が空のとき空配列を返す", () => {
        const buf = generateSawtooth(440);
        const results = estimateF0WithSWIPE(buf, SAMPLE_RATE, []);
        expect(results).toEqual([]);
    });

    it("無音バッファのとき estimatedF0 が null になる", () => {
        const buf = new Float32Array(BUFFER_SIZE);
        const results = estimateF0WithSWIPE(buf, SAMPLE_RATE, [440]);
        expect(results[0].estimatedF0).toBeNull();
        expect(results[0].strength).toBe(0);
    });

    it("targetFreq が結果に正しく引き継がれる", () => {
        const buf = generateSawtooth(440);
        const results = estimateF0WithSWIPE(buf, SAMPLE_RATE, [440, 880]);
        expect(results[0].targetFreq).toBe(440);
        expect(results[1].targetFreq).toBe(880);
    });
});
