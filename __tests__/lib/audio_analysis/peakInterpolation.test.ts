import {
    quadraticInterpolation,
    spectralCentroid,
    estimatePeakFrequency,
} from "@/lib/audio_analysis/peakInterpolation";

describe("quadraticInterpolation", () => {
    test("理想的なパラボラ形状で正確に補間（対称）", () => {
        // 周波数440Hzをピークとする理想的なパラボラ
        // ビン間隔を10Hzとする
        const freq = [430, 440, 450];

        // dB単位で中央がピーク、両隣が対称に減衰
        // -6dB ≈ 0.5 (線形), 0dB = 1.0 (線形)
        const spec = new Float32Array([-6, 0, -6]); // dB単位

        const result = quadraticInterpolation(spec, 1, freq);

        // 完全に対称なので補間結果は中央の440Hz
        expect(result).toBeCloseTo(440, 1);
    });

    test("ピークが右寄りの場合（dB単位）", () => {
        const freq = [100, 110, 120];

        // 右側の振幅が高い → ピークは右寄り
        // -12dB < 0dB > -4dB
        const spec = new Float32Array([-12, 0, -4]); // dB単位

        const result = quadraticInterpolation(spec, 1, freq);

        // 110Hzより高い周波数になるはず
        expect(result).toBeGreaterThan(110);
        expect(result).toBeLessThan(120);
    });

    test("ピークが左寄りの場合（dB単位）", () => {
        const freq = [100, 110, 120];

        // 左側の振幅が高い → ピークは左寄り
        // -4dB > 0dB < -12dB
        const spec = new Float32Array([-4, 0, -12]); // dB単位

        const result = quadraticInterpolation(spec, 1, freq);

        // 110Hzより低い周波数になるはず
        expect(result).toBeLessThan(110);
        expect(result).toBeGreaterThan(100);
    });

    test("境界のビン（最初）では補間しない", () => {
        const freq = [100, 110, 120];
        const spec = new Float32Array([0, -3, -6]);

        const result = quadraticInterpolation(spec, 0, freq);

        // 補間できないのでそのまま返す
        expect(result).toBe(100);
    });

    test("境界のビン（最後）では補間しない", () => {
        const freq = [100, 110, 120];
        const spec = new Float32Array([-6, -3, 0]);

        const result = quadraticInterpolation(spec, 2, freq);

        // 補間できないのでそのまま返す
        expect(result).toBe(120);
    });

    test("ピークが明確でない（平坦）場合は補間しない", () => {
        const freq = [100, 110, 120];
        const spec = new Float32Array([0, 0, 0]);

        const result = quadraticInterpolation(spec, 1, freq);

        // 補間できないのでそのまま返す
        expect(result).toBe(110);
    });

    test("ピークが明確でない（両隣が高い）場合は補間しない", () => {
        const freq = [100, 110, 120];
        const spec = new Float32Array([0, -3, 0]);

        const result = quadraticInterpolation(spec, 1, freq);

        // ピークでないので補間しない
        expect(result).toBe(110);
    });
});

describe("spectralCentroid", () => {
    test("単一ピークの場合はそのピークの周波数", () => {
        const freqRange = [100, 110, 120, 130, 140];
        const spec = new Float32Array([-60, -60, 0, -60, -60]); // dB単位

        const result = spectralCentroid(spec, freqRange, 3);

        // 中央の120Hzに近い値
        expect(result).toBeCloseTo(120, 0);
    });

    test("2つのピークがある場合は中間の周波数", () => {
        const freqRange = [100, 110, 120, 130, 140];
        const spec = new Float32Array([0, -60, -60, -60, 0]); // dB単位、両端にピーク

        const result = spectralCentroid(spec, freqRange, 3);

        // 100Hzと140Hzの中間、120Hzに近い
        expect(result).toBeGreaterThan(115);
        expect(result).toBeLessThan(125);
    });

    test("topN=1の場合は最大ピークのみ使用", () => {
        const freqRange = [100, 110, 120];
        const spec = new Float32Array([-6, 0, -3]);

        const result = spectralCentroid(spec, freqRange, 1);

        // 最大ピークの110Hzのみ
        expect(result).toBeCloseTo(110, 0);
    });

    test("空の配列では最初の周波数を返す", () => {
        const freqRange: number[] = [];
        const spec = new Float32Array([]);

        const result = spectralCentroid(spec, freqRange, 3);

        expect(result).toBe(0);
    });

    test("配列サイズが異なる場合は最初の周波数を返す", () => {
        const freqRange = [100, 110];
        const spec = new Float32Array([0, 0, 0]);

        const result = spectralCentroid(spec, freqRange, 3);

        expect(result).toBe(100);
    });
});

describe("estimatePeakFrequency", () => {
    const freq = [100, 110, 120, 130, 140];
    const spec = new Float32Array([-6, -2, 0, -2, -6]);
    const peakIdx = 2;

    test("method='none'の場合はビンの周波数をそのまま返す", () => {
        const result = estimatePeakFrequency("none", spec, peakIdx, freq);
        expect(result).toBe(120);
    });

    test("method='parabolic'の場合はパラボラ補間を使用", () => {
        const result = estimatePeakFrequency("parabolic", spec, peakIdx, freq);

        // 対称なので120Hzに近い
        expect(result).toBeCloseTo(120, 1);
    });

    test("method='centroid'の場合は重心法を使用", () => {
        const result = estimatePeakFrequency(
            "centroid",
            spec,
            peakIdx,
            freq,
            0,
            5,
            3
        );

        // 重心計算の結果
        expect(result).toBeGreaterThan(100);
        expect(result).toBeLessThan(140);
    });

    test("centroidで範囲指定がない場合はビンの周波数を返す", () => {
        const result = estimatePeakFrequency("centroid", spec, peakIdx, freq);
        expect(result).toBe(120);
    });
});

describe("実践的なシナリオ", () => {
    test("A4=440Hz付近のFFT結果をシミュレート", () => {
        // FFTサイズ2048、サンプリングレート44100Hzを想定
        // 周波数分解能 = 44100 / 2048 ≈ 21.53Hz
        const freqStep = 21.53;
        const targetFreq = 440; // A4
        const centerBin = Math.round(targetFreq / freqStep);

        // 周波数配列を生成
        const freq: number[] = [];
        const spec: number[] = [];
        for (let i = centerBin - 5; i <= centerBin + 5; i++) {
            freq.push(i * freqStep);
            // ガウシアン形状のスペクトルを生成（中央が最大）
            const distance = Math.abs(i - centerBin);
            spec.push(-distance * distance * 3); // dB単位
        }

        const specArray = new Float32Array(spec);
        const peakIdx = 5; // 配列の中央

        // パラボラ補間を適用
        const result = quadraticInterpolation(specArray, peakIdx, freq);

        // centerBin * freqStep の周波数付近の値になるはず
        const expectedFreq = centerBin * freqStep;
        expect(result).toBeGreaterThan(expectedFreq - freqStep);
        expect(result).toBeLessThan(expectedFreq + freqStep);
    });

    test("実際のFFT結果でピークが少しずれている場合", () => {
        // 真の周波数442Hzだが、最も近いビンは440Hz
        const freqStep = 21.53;
        const truePeakFreq = 442;
        const centerBinFreq = 440;
        const centerBin = Math.round(centerBinFreq / freqStep);

        // 周波数配列を生成
        const freq: number[] = [];
        const spec: number[] = [];
        for (let i = centerBin - 2; i <= centerBin + 2; i++) {
            const binFreq = i * freqStep;
            freq.push(binFreq);
            // 真のピーク442Hzからの距離でスペクトルを計算
            const distance = Math.abs(binFreq - truePeakFreq) / freqStep;
            spec.push(-distance * distance * 6); // dB単位
        }

        const specArray = new Float32Array(spec);
        // 最大値を探す
        let maxIdx = 0;
        let maxVal = spec[0];
        for (let i = 1; i < spec.length; i++) {
            if (spec[i] > maxVal) {
                maxVal = spec[i];
                maxIdx = i;
            }
        }

        // パラボラ補間を適用
        const result = quadraticInterpolation(specArray, maxIdx, freq);

        // 442Hz付近の値になるはず（補間により改善）
        expect(result).toBeGreaterThan(centerBinFreq);
        expect(result).toBeLessThan(centerBinFreq + freqStep);
    });
});
