import { estimateF0WithPhaseVocoder } from "../../src/audio_analysis/phaseVocoderEstimation";

const SAMPLE_RATE = 48000;
const BUFFER_SIZE = 16384; // 2 のべき乗 (AnalyserNode.fftSize 相当)

// ヘルパー: 純音 (正弦波) を生成
function generateSine(freq: number, amplitude = 0.5, phase = 0): Float32Array {
    const buf = new Float32Array(BUFFER_SIZE);
    for (let i = 0; i < BUFFER_SIZE; i++) {
        buf[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE + phase);
    }
    return buf;
}

// ヘルパー: 複数の正弦波を加算
function sumSines(specs: Array<{ freq: number; amp?: number }>): Float32Array {
    const buf = new Float32Array(BUFFER_SIZE);
    for (const { freq, amp = 0.5 } of specs) {
        for (let i = 0; i < BUFFER_SIZE; i++) {
            buf[i] += amp * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
        }
    }
    return buf;
}

// ヘルパー: セント偏差
function toCents(estimated: number, reference: number): number {
    return 1200 * Math.log2(estimated / reference);
}

// 平均律周波数 (A4 = 440)
const C4 = 440 * Math.pow(2, -9 / 12); // 261.6 Hz
const E4 = 440 * Math.pow(2, -5 / 12); // 329.6 Hz
const G4 = 440 * Math.pow(2, -2 / 12); // 392.0 Hz

describe("estimateF0WithPhaseVocoder", () => {
    it("純音をサブセント精度で推定する", () => {
        const buf = generateSine(C4, 0.5);
        const [r] = estimateF0WithPhaseVocoder(buf, SAMPLE_RATE, [C4]);
        expect(r.estimatedF0).not.toBeNull();
        expect(Math.abs(toCents(r.estimatedF0!, C4))).toBeLessThan(2);
    });

    it("ビン中心から外れた周波数 (+20 cents) も正しく追跡する", () => {
        const detuned = C4 * Math.pow(2, 20 / 1200);
        const buf = generateSine(detuned, 0.5);
        // 期待値は平均律 C4、実際は +20 cents シャープ
        const [r] = estimateF0WithPhaseVocoder(buf, SAMPLE_RATE, [C4], 100);
        expect(r.estimatedF0).not.toBeNull();
        expect(toCents(r.estimatedF0!, C4)).toBeCloseTo(20, 0);
    });

    it("FFT ビン幅を下回るずれを分離できる (ビン幅 ≈ 11.7 cents @ C4)", () => {
        // BUFFER_SIZE=16384 → W=8192 → ビン幅 5.86Hz ≈ 38 cents @ C4
        // ビン幅未満の +5 cents を推定できることを確認
        const detuned = C4 * Math.pow(2, 5 / 1200);
        const buf = generateSine(detuned, 0.5);
        const [r] = estimateF0WithPhaseVocoder(buf, SAMPLE_RATE, [C4], 100);
        expect(r.estimatedF0).not.toBeNull();
        expect(toCents(r.estimatedF0!, C4)).toBeCloseTo(5, 0);
    });

    it("和音 (C4+E4+G4) の各音を独立に推定する", () => {
        // 各音を異なるセント量だけデチューン
        const cAct = C4 * Math.pow(2, 10 / 1200);  // +10
        const eAct = E4 * Math.pow(2, -8 / 1200);  // -8
        const gAct = G4 * Math.pow(2, 3 / 1200);   // +3
        const buf = sumSines([{ freq: cAct }, { freq: eAct }, { freq: gAct }]);

        const results = estimateF0WithPhaseVocoder(buf, SAMPLE_RATE, [C4, E4, G4], 100);
        expect(results).toHaveLength(3);
        expect(toCents(results[0].estimatedF0!, C4)).toBeCloseTo(10, 0);
        expect(toCents(results[1].estimatedF0!, E4)).toBeCloseTo(-8, 0);
        expect(toCents(results[2].estimatedF0!, G4)).toBeCloseTo(3, 0);
    });

    it("無音は null を返す", () => {
        const buf = new Float32Array(BUFFER_SIZE); // 全ゼロ
        const results = estimateF0WithPhaseVocoder(buf, SAMPLE_RATE, [C4, E4, G4]);
        expect(results).toHaveLength(3);
        for (const r of results) expect(r.estimatedF0).toBeNull();
    });

    it("空の周波数リストは空配列を返す", () => {
        const buf = generateSine(C4, 0.5);
        expect(estimateF0WithPhaseVocoder(buf, SAMPLE_RATE, [])).toEqual([]);
    });

    it("初期位相に依存せず安定して推定する", () => {
        const r1 = estimateF0WithPhaseVocoder(generateSine(C4, 0.5, 0), SAMPLE_RATE, [C4])[0];
        const r2 = estimateF0WithPhaseVocoder(generateSine(C4, 0.5, 1.3), SAMPLE_RATE, [C4])[0];
        expect(Math.abs(toCents(r1.estimatedF0!, C4))).toBeLessThan(2);
        expect(Math.abs(toCents(r2.estimatedF0!, C4))).toBeLessThan(2);
    });
});
