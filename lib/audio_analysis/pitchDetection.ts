/**
 * 音名推定アルゴリズム (Pitch Detection)
 *
 * 自己相関法 (Autocorrelation) を使用して単音の基本周波数を検出し、
 * 音名とオクターブ番号に変換する。
 */

import { PITCH_NAME_LIST, A4_FREQ as DEFAULT_A4_FREQ } from "@/lib/constants";

/**
 * 音名推定の候補
 */
export interface PitchCandidate {
    /** 音名 (C, C#, D, ...) */
    pitchName: string;
    /** オクターブ番号 (1-6) */
    octaveNum: number;
    /** 検出された周波数 (Hz) */
    frequency: number;
    /** 信頼度 (0.0-1.0) */
    confidence: number;
}

/**
 * 自己相関法の結果
 */
interface AutocorrelationResult {
    frequency: number;
    confidence: number;
}

/**
 * RMS (Root Mean Square) を計算して音量レベルを取得
 */
function calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
}

/**
 * 自己相関法による基本周波数推定
 *
 * @param buffer 時間領域の音声データ
 * @param sampleRate サンプルレート (Hz)
 * @param minFreq 検出する最低周波数 (Hz)
 * @param maxFreq 検出する最高周波数 (Hz)
 * @returns 検出された周波数と信頼度、または null (検出失敗時)
 */
function autocorrelate(
    buffer: Float32Array,
    sampleRate: number,
    minFreq: number = 50, // ~G1
    maxFreq: number = 2000 // ~B6
): AutocorrelationResult | null {
    const SIZE = buffer.length;

    // 無音チェック
    const rms = calculateRMS(buffer);
    if (rms < 0.01) {
        return null;
    }

    // 自己相関を計算するラグの範囲
    // lag = sampleRate / frequency なので、
    // minLag = sampleRate / maxFreq, maxLag = sampleRate / minFreq
    const minLag = Math.floor(sampleRate / maxFreq);
    const maxLag = Math.min(Math.floor(sampleRate / minFreq), SIZE - 1);

    if (minLag >= maxLag || maxLag >= SIZE) {
        return null;
    }

    // 自己相関関数を計算
    const correlations = new Float32Array(maxLag - minLag + 1);
    let maxCorrelation = -Infinity;
    let bestLag = minLag;

    for (let lag = minLag; lag <= maxLag; lag++) {
        let correlation = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < SIZE - lag; i++) {
            correlation += buffer[i] * buffer[i + lag];
            norm1 += buffer[i] * buffer[i];
            norm2 += buffer[i + lag] * buffer[i + lag];
        }

        // 正規化された相関係数
        const normalizedCorrelation =
            norm1 > 0 && norm2 > 0
                ? correlation / Math.sqrt(norm1 * norm2)
                : 0;

        correlations[lag - minLag] = normalizedCorrelation;

        if (normalizedCorrelation > maxCorrelation) {
            maxCorrelation = normalizedCorrelation;
            bestLag = lag;
        }
    }

    // 信頼度が低すぎる場合は検出失敗
    if (maxCorrelation < 0.5) {
        return null;
    }

    // パラボラ補間でより正確なピーク位置を求める
    const lagIndex = bestLag - minLag;
    let refinedLag = bestLag;

    if (lagIndex > 0 && lagIndex < correlations.length - 1) {
        const y0 = correlations[lagIndex - 1];
        const y1 = correlations[lagIndex];
        const y2 = correlations[lagIndex + 1];

        // パラボラ補間: 頂点の位置を計算
        const denom = 2 * (2 * y1 - y0 - y2);
        if (Math.abs(denom) > 1e-10) {
            const delta = (y0 - y2) / denom;
            refinedLag = bestLag + delta;
        }
    }

    const frequency = sampleRate / refinedLag;

    return {
        frequency,
        confidence: maxCorrelation,
    };
}

/**
 * 周波数から音名とオクターブ番号に変換
 *
 * @param frequency 周波数 (Hz)
 * @param a4Freq A4の基準周波数 (Hz)
 * @returns 音名とオクターブ番号
 */
export function frequencyToNote(
    frequency: number,
    a4Freq: number = DEFAULT_A4_FREQ
): { pitchName: string; octaveNum: number } {
    // A4からの半音数を計算
    // n = 12 * log2(f / a4Freq)
    const semitonesFromA4 = 12 * Math.log2(frequency / a4Freq);

    // A4 = A + 4*12 + 9 = 57 (C0 = 0として)
    // MIDIノート番号に変換 (A4 = 69)
    const midiNote = Math.round(69 + semitonesFromA4);

    // 音名インデックス (0-11, C=0)
    const pitchIndex = ((midiNote % 12) + 12) % 12;
    const pitchName = PITCH_NAME_LIST[pitchIndex];

    // オクターブ番号 (MIDIノート番号から計算)
    const octaveNum = Math.floor(midiNote / 12) - 1;

    return { pitchName, octaveNum };
}

/**
 * 周波数候補を生成（1オクターブ上下も含む）
 */
function generateCandidates(
    frequency: number,
    confidence: number,
    a4Freq: number
): PitchCandidate[] {
    const candidates: PitchCandidate[] = [];
    const { pitchName, octaveNum } = frequencyToNote(frequency, a4Freq);

    // メイン候補
    candidates.push({
        pitchName,
        octaveNum,
        frequency,
        confidence,
    });

    // 1オクターブ上（倍音の可能性）
    const octaveUp = frequencyToNote(frequency * 2, a4Freq);
    if (octaveUp.octaveNum >= 1 && octaveUp.octaveNum <= 6) {
        candidates.push({
            pitchName: octaveUp.pitchName,
            octaveNum: octaveUp.octaveNum,
            frequency: frequency * 2,
            confidence: confidence * 0.3, // 信頼度を下げる
        });
    }

    // 1オクターブ下（基本周波数の可能性）
    const octaveDown = frequencyToNote(frequency / 2, a4Freq);
    if (octaveDown.octaveNum >= 1 && octaveDown.octaveNum <= 6) {
        candidates.push({
            pitchName: octaveDown.pitchName,
            octaveNum: octaveDown.octaveNum,
            frequency: frequency / 2,
            confidence: confidence * 0.2, // 信頼度をさらに下げる
        });
    }

    return candidates;
}

/**
 * 音名推定のメイン関数
 *
 * @param audioBuffer 時間領域の音声データ (Float32Array)
 * @param sampleRate サンプルレート (Hz)
 * @param a4Freq A4の基準周波数 (Hz)
 * @returns 推定された音名候補（信頼度順、最大3件）
 */
export function detectPitch(
    audioBuffer: Float32Array,
    sampleRate: number,
    a4Freq: number = DEFAULT_A4_FREQ
): PitchCandidate[] {
    // 自己相関法で基本周波数を検出
    const result = autocorrelate(audioBuffer, sampleRate);

    if (!result) {
        return [];
    }

    // 候補を生成
    const candidates = generateCandidates(result.frequency, result.confidence, a4Freq);

    // オクターブ範囲でフィルタリング (1-6)
    const validCandidates = candidates.filter(
        (c) => c.octaveNum >= 1 && c.octaveNum <= 6
    );

    // 信頼度順にソートして上位3件を返す
    validCandidates.sort((a, b) => b.confidence - a.confidence);

    return validCandidates.slice(0, 3);
}

/**
 * 複数フレームの結果を統合して最終結果を決定
 *
 * @param frameResults 各フレームの推定結果
 * @returns 統合された推定結果（信頼度順、最大3件、信頼度は合計100%に正規化）
 */
export function aggregatePitchResults(
    frameResults: PitchCandidate[][]
): PitchCandidate[] {
    // 音名+オクターブをキーとして集計
    const aggregated = new Map<string, { count: number; totalConfidence: number; candidate: PitchCandidate }>();

    for (const frame of frameResults) {
        for (const candidate of frame) {
            const key = `${candidate.pitchName}${candidate.octaveNum}`;
            const existing = aggregated.get(key);

            if (existing) {
                existing.count++;
                existing.totalConfidence += candidate.confidence;
                // より高い信頼度の候補で更新
                if (candidate.confidence > existing.candidate.confidence) {
                    existing.candidate = candidate;
                }
            } else {
                aggregated.set(key, {
                    count: 1,
                    totalConfidence: candidate.confidence,
                    candidate,
                });
            }
        }
    }

    // スコアを計算してソート
    // スコア = 出現回数 × 平均信頼度
    const rawResults: Array<{ candidate: PitchCandidate; score: number }> = [];

    for (const { count, totalConfidence, candidate } of aggregated.values()) {
        const avgConfidence = totalConfidence / count;
        const score = count * avgConfidence;

        rawResults.push({
            candidate,
            score,
        });
    }

    // スコア順にソートして上位3件を取得
    rawResults.sort((a, b) => b.score - a.score);
    const top3 = rawResults.slice(0, 3);

    // 信頼度を合計100%に正規化
    const totalScore = top3.reduce((sum, r) => sum + r.score, 0);

    const results: PitchCandidate[] = top3.map(({ candidate, score }) => ({
        ...candidate,
        confidence: totalScore > 0 ? score / totalScore : 0,
    }));

    return results;
}

