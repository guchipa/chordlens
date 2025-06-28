import { EVAL_THRESHOLD } from "../constants";
import { getJustFrequencies } from "./calcJustFreq";
import { formType } from "@/lib/schema";

/**
 * 演奏された音の評価
 * @param spec 各周波数に対するスペクトル（強さ）- AnalyserNode.getFloatFrequencyData() の結果
 * @param freq 周波数ビン配列 - AnalyserNode から計算
 * @param pitchNameList 評価する音名データ
 * @param EVAL_RANGE 評価範囲（セント）
 */
export function evaluateSpectrum(
  spec: Float32Array, // AnalyserNode から取得する生データ
  freq: number[],
  pitchNameList: formType[],
  EVAL_RANGE: number = 50, // デフォルト50セント
): (number | null)[] {
  const estFreqs = getJustFrequencies(pitchNameList);

  if (estFreqs.length === 0) {
    return [];
  }

  const evalList: (number | null)[] = [];

  for (const est_f of estFreqs) {
    let targetFreq = 1e10;
    let targetIdx = -1;

    // 周波数ビンの中から最も近いものを探索
    for (let idx = 0; idx < freq.length; idx++) {
      const f = freq[idx];
      if (Math.abs(est_f - f) < Math.abs(est_f - targetFreq)) {
        targetFreq = f;
        targetIdx = idx;
      } else {
        // 周波数がソートされている前提で、近くなった時点で探索終了
        break;
      }
    }

    // ±EVAL_RANGE cents の周波数範囲を計算
    const minFreq = est_f * 2 ** (-EVAL_RANGE / 1200);
    const maxFreq = est_f * 2 ** (EVAL_RANGE / 1200);

    // 周波数範囲に対応するスペクトルインデックスの範囲を計算
    // freq[1] - freq[0] は周波数ビンの刻み幅
    const freqStep = freq.length > 1 ? freq[1] - freq[0] : 1; // 0除算対策

    // 中央のビンを基準に範囲を調整
    // targetIdx を中心とした近似的な範囲
    const rangeMinIdxApprox =
      targetIdx - Math.floor((targetFreq - minFreq) / freqStep);
    const rangeMaxIdxApprox =
      targetIdx + Math.ceil((maxFreq - targetFreq) / freqStep);

    const evalRangeMin = Math.max(0, rangeMinIdxApprox);
    const evalRangeMax = Math.min(spec.length, rangeMaxIdxApprox);

    // 近傍の周波数のスペクトルを抽出
    const evalSpec = spec.slice(evalRangeMin, evalRangeMax);

    if (evalSpec.length === 0) {
      evalList.push(null);
      continue;
    }

    // 最も強いスペクトルをもつもののindex を取得
    let specMax = 0;
    let maxVal = evalSpec[0];
    for (let i = 1; i < evalSpec.length; i++) {
      if (evalSpec[i] > maxVal) {
        maxVal = evalSpec[i];
        specMax = i;
      }
    }

    // spec_max が閾値以下の場合は None を返す
    if (maxVal < EVAL_THRESHOLD) {
      evalList.push(null);
    } else {
      // spec_max が center と等しい場合は 0 を返す
      // center は eval_spec 配列の中央のインデックス
      const center = Math.floor(evalSpec.length / 2);

      if (specMax === center) {
        evalList.push(0);
      } else {
        // (-1, 1) に丸めてリストに追加
        evalList.push(Math.round(((specMax - center) / center) * 100) / 100);
      }
    }
  }

  console.log(evalList);

  return evalList;
}
