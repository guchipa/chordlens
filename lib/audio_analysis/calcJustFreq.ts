import { OCTAVE_NUM_LIST, PITCH_NAME_LIST, JUST_RATIOS } from "../constants";
import type { Pitch } from "@/lib/types";

/**
 * 音名とオクターブ番号から半音インデックスを計算する
 */
const calcSemitoneIdx = (pitchName: string, octaveNum: number): number => {
  return (
    PITCH_NAME_LIST.indexOf(pitchName) + 12 * OCTAVE_NUM_LIST.indexOf(octaveNum)
  );
};

/**
 * 周波数計算のための前処理を行うヘルパー関数。
 * 根音のバリデーション、平均律周波数テーブル、根音の情報を生成する
 * @param pitchNameList ユーザーが入力した音のリスト
 * @param a4Freq A4の基準周波数
 * @returns 計算に必要なデータ（平均律周波数、根音のインデックス、根音の周波数）
 * @throws 根音が設定されていない、または複数設定されている場合にエラーをスローする
 */
const preparePitchCalculation = (pitchNameList: Pitch[], a4Freq: number) => {
  const rootData = pitchNameList.filter((data) => data.isRoot);

  if (rootData.length !== 1) {
    const errorMessage =
      rootData.length === 0
        ? "根音が設定されていません"
        : "根音が複数設定されています";
    throw new Error(errorMessage);
  }

  const A4_INDEX = calcSemitoneIdx("A", 4);
  const totalPitches = PITCH_NAME_LIST.length * OCTAVE_NUM_LIST.length;

  // 平均律の周波数テーブルを生成
  const equalFrequencies = Array.from(
    { length: totalPitches },
    (_, i) => a4Freq * Math.pow(2, (i - A4_INDEX) / 12)
  );

  const rootSemitoneIdx = calcSemitoneIdx(
    rootData[0].pitchName,
    rootData[0].octaveNum
  );

  return {
    equalFrequencies,
    rootSemitoneIdx,
    rootFrequency: equalFrequencies[rootSemitoneIdx],
  };
};

/**
 * 指定された音の純正律周波数を計算する
 * @param data 計算対象の音データ
 * @param rootSemitoneIdx 根音の半音インデックス
 * @param rootFrequency 根音の周波数 (Hz)
 * @returns 純正律での周波数 (Hz)
 */
const calculateJustFrequency = (
  data: Pitch,
  rootSemitoneIdx: number,
  rootFrequency: number
): number => {
  const semitoneIdx = calcSemitoneIdx(data.pitchName, data.octaveNum);
  const semitoneDistance = semitoneIdx - rootSemitoneIdx;

  // 距離が負の場合でもインデックスが 0-11 の範囲になるように剰余を計算
  const ratioIndex = ((semitoneDistance % 12) + 12) % 12;

  return (
    rootFrequency *
    JUST_RATIOS[ratioIndex] *
    Math.pow(2, Math.floor(semitoneDistance / 12))
  );
};

/**
 * 各音の平均律での周波数（Hz）のリストを取得
 * @param pitchNameList 取得対象の音のリスト
 * @param a4Freq A4の基準周波数
 * @returns 各音の平均律での周波数（Hz）のリスト
 */
export function getEqualFrequencies(
  pitchNameList: Pitch[],
  a4Freq: number
): number[] {
  try {
    const { equalFrequencies } = preparePitchCalculation(
      pitchNameList,
      a4Freq
    );

    return pitchNameList.map((data) => {
      const semitoneIdx = calcSemitoneIdx(data.pitchName, data.octaveNum);
      return equalFrequencies[semitoneIdx];
    });
  } catch (e) {
    console.error((e as Error).message);
    return [];
  }
}

/**
 * 各音の純正律での周波数（Hz）のリストを取得
 * @param pitchNameList 取得対象の音のリスト
 * @param a4Freq A4の基準周波数
 * @returns 各音の純正律での周波数（Hz）のリスト
 */
export function getJustFrequencies(
  pitchNameList: Pitch[],
  a4Freq: number
): number[] {
  try {
    const { rootSemitoneIdx, rootFrequency } = preparePitchCalculation(
      pitchNameList,
      a4Freq
    );

    return pitchNameList.map((data) =>
      calculateJustFrequency(data, rootSemitoneIdx, rootFrequency)
    );
  } catch (e) {
    console.error((e as Error).message);
    return [];
  }
}

/**
 * 各音の平均律と純正律の周波数差をセント値で取得
 * @param pitchNameList 取得対象の音のリスト
 * @param a4Freq A4の基準周波数
 * @returns 各音の周波数差（セント）のリスト
 */
export function getEqualJustDiff(
  pitchNameList: Pitch[],
  a4Freq: number
): number[] {
  try {
    const { equalFrequencies, rootSemitoneIdx, rootFrequency } =
      preparePitchCalculation(pitchNameList, a4Freq);

    return pitchNameList.map((data) => {
      const justFreq = calculateJustFrequency(
        data,
        rootSemitoneIdx,
        rootFrequency
      );
      const semitoneIdx = calcSemitoneIdx(data.pitchName, data.octaveNum);
      const equalFreq = equalFrequencies[semitoneIdx];

      return 1200 * Math.log2(justFreq / equalFreq);
    });
  } catch (e) {
    console.error((e as Error).message);
    return [];
  }
}

/**
 * 単一の音名から平均律と純正律の周波数差をセント値で取得
 * @param pitchName 対象の音名（例: "C4"）
 * @param rootPitchName 根音の音名（例: "C4"）
 * @param a4Freq A4の基準周波数
 * @returns 周波数差（セント）、計算できない場合はnull
 */
export function getSingleEqualJustDiff(
  pitchName: string,
  rootPitchName: string,
  a4Freq: number
): number | null {
  // 音名とオクターブを分離
  const parseNote = (note: string): { pitchName: string; octaveNum: number } | null => {
    const match = note.match(/^([A-G][#b]?)(\d)$/);
    if (!match) return null;
    return { pitchName: match[1], octaveNum: parseInt(match[2], 10) };
  };

  const currentNote = parseNote(pitchName);
  const rootNote = parseNote(rootPitchName);
  if (!currentNote || !rootNote) return null;

  // 半音インデックスを計算（オクターブ1からの通し番号）
  const calcSemitoneIdxSimple = (name: string, octave: number): number => {
    const pitchIndex = PITCH_NAME_LIST.indexOf(name);
    if (pitchIndex === -1) return -1;
    return pitchIndex + 12 * (octave - 1);
  };

  const currentIdx = calcSemitoneIdxSimple(currentNote.pitchName, currentNote.octaveNum);
  const rootIdx = calcSemitoneIdxSimple(rootNote.pitchName, rootNote.octaveNum);
  if (currentIdx === -1 || rootIdx === -1) return null;

  const semitoneDistance = currentIdx - rootIdx;
  const ratioIndex = ((semitoneDistance % 12) + 12) % 12;

  // 純正律と平均律の周波数を計算
  const A4_INDEX = calcSemitoneIdxSimple("A", 4);
  const rootEqualFreq = a4Freq * Math.pow(2, (rootIdx - A4_INDEX) / 12);
  const justFreq = rootEqualFreq * JUST_RATIOS[ratioIndex] * Math.pow(2, Math.floor(semitoneDistance / 12));
  const equalFreq = a4Freq * Math.pow(2, (currentIdx - A4_INDEX) / 12);

  // セント単位で差を計算
  return 1200 * Math.log2(equalFreq / justFreq);
}
