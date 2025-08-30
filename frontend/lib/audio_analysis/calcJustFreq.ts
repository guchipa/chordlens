import {
  OCTAVE_NUM_LIST,
  PITCH_NAME_LIST,
  JUST_RATIOS,
} from "../constants"; // A4_FREQ のインポートは不要になるため削除
import { formType } from "@/lib/schema";

const calcSemitoneIdx = (pitchName: string, octaveNum: number) => {
  return (
    PITCH_NAME_LIST.indexOf(pitchName) + 12 * OCTAVE_NUM_LIST.indexOf(octaveNum)
  );
};

/**
 * 根音に対する純正律での周波数を取得する
 * @param pitchNameList 取得対象の音名、オクターブ番号、根音であるかの情報
 * @param a4Freq 基準となるA4の周波数
 * @returns 各音の純正律での周波数（Hz）
 */
export function getJustFrequencies(pitchNameList: formType[], a4Freq: number): number[] { // a4Freq を引数に追加
  const justFrequencies: number[] = [];

  const rootData = pitchNameList.filter((data) => {
    return data.isRoot;
  });

  if (rootData.length > 1) {
    console.error("根音が複数設定されています");
    return [];
  }

  if (rootData.length === 0) {
    console.error("根音が設定されていません");
    return [];
  }

  // a4Freq を使用して equalFrequencies を動的に計算
  const equalFrequencies: number[] = [];
  const A4_INDEX = calcSemitoneIdx("A", 4);
  for (let i = 0; i < PITCH_NAME_LIST.length * OCTAVE_NUM_LIST.length; i++) {
    equalFrequencies.push(a4Freq * Math.pow(2, (i - A4_INDEX) / 12));
  }

  // 根音の半音インデックスを取得
  const rootSemitoneIdx = calcSemitoneIdx(
    rootData[0].pitchName,
    rootData[0].octaveNum,
  );

  // 純正律に基づいた基準ピッチ（Hz）の計算
  pitchNameList.forEach((data) => {
    const semitoneIdx = calcSemitoneIdx(data.pitchName, data.octaveNum);
    const semitoneDistance = semitoneIdx - rootSemitoneIdx;

    if (semitoneDistance > 0) {
      justFrequencies.push(
        equalFrequencies[rootSemitoneIdx] *
          JUST_RATIOS[semitoneDistance % 12] *
          Math.pow(2, Math.floor(semitoneDistance / 12)),
      );
    } else {
      justFrequencies.push(
        equalFrequencies[rootSemitoneIdx] *
          JUST_RATIOS[semitoneDistance % 12] *
          Math.pow(2, Math.ceil(Math.floor(semitoneDistance / 12))),
      );
    }
  });

  return justFrequencies;
}

export function getEqualJustDiff(pitchNameList: formType[], a4Freq: number): number[] {
  const rootData = pitchNameList.filter((data) => {
    return data.isRoot;
  });

  if (rootData.length > 1) {
    console.error("根音が複数設定されています");
    return [];
  }

  if (rootData.length === 0) {
    console.error("根音が設定されていません");
    return [];
  }

  // a4Freq を使用して equalFrequencies を動的に計算
  const equalFrequencies: number[] = [];
  const A4_INDEX = calcSemitoneIdx("A", 4);
  for (let i = 0; i < PITCH_NAME_LIST.length * OCTAVE_NUM_LIST.length; i++) {
    equalFrequencies.push(a4Freq * Math.pow(2, (i - A4_INDEX) / 12));
  }

  // 根音の半音インデックスを計算
  const rootSemitoneIdx = calcSemitoneIdx(
    rootData[0].pitchName,
    rootData[0].octaveNum,
  );
  
  const equalJustDiff: number[] = [];

  // 純正律に基づいた基準ピッチ（Hz）の計算
  pitchNameList.forEach(({pitchName, octaveNum}) => {
    const semitoneIdx = calcSemitoneIdx(pitchName, octaveNum);
    const semitoneDistance = semitoneIdx - rootSemitoneIdx;

    let justFreq = 0;

    if (semitoneDistance > 0) {
      justFreq =
        equalFrequencies[rootSemitoneIdx] *
          JUST_RATIOS[semitoneDistance % 12] *
          Math.pow(2, Math.floor(semitoneDistance / 12));
    } else {
      justFreq =
        equalFrequencies[rootSemitoneIdx] *
          JUST_RATIOS[semitoneDistance % 12] *
          Math.pow(2, Math.ceil(Math.floor(semitoneDistance / 12)));
    }

    equalJustDiff.push(1200 * Math.log2(justFreq / equalFrequencies[semitoneIdx]));
  });

  return equalJustDiff;
}