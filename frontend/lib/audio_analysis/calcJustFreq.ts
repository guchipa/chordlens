import { A4_FREQ, OCTAVE_NUM_LIST, PITCH_NAME_LIST, JUST_RATIOS } from "../constants";
import { formType } from "@/app/page";

const calcSemitoneIdx = (pitchName: string, octaveNum: number) => {
  return PITCH_NAME_LIST.indexOf(pitchName) + 12 * OCTAVE_NUM_LIST.indexOf(octaveNum);
}

const equalFrequencies: number[] = [];
const A4_INDEX = calcSemitoneIdx("A", 4);
for (let i = 0; i < PITCH_NAME_LIST.length * OCTAVE_NUM_LIST.length; i++) {
  equalFrequencies.push(A4_FREQ * Math.pow(2, (i - A4_INDEX) / 12));
}

/**
 * 根音に対する純正律での周波数を取得する
 * @param pitchNameList 取得対象の音名、オクターブ番号、根音であるかの情報
 * @returns 各音の純正律での周波数（Hz）
 */
export function getJustFrequencies(pitchNameList: formType[]): number[] {
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

  const rootSemitoneIdx = calcSemitoneIdx(rootData[0].pitchName, rootData[0].octaveNum)

  pitchNameList.forEach(data => {
    const semitoneIdx = calcSemitoneIdx(data.pitchName, data.octaveNum);
    const semitoneDistance = semitoneIdx - rootSemitoneIdx;

    if (semitoneDistance > 0) {
      justFrequencies.push(
        equalFrequencies[rootSemitoneIdx]
        * JUST_RATIOS[semitoneDistance % 12]
        * (Math.pow(2, Math.floor(semitoneDistance / 12)))
      )
    } else {
      justFrequencies.push(
        equalFrequencies[rootSemitoneIdx]
        * JUST_RATIOS[semitoneDistance % 12]
        * Math.pow(2, Math.ceil(Math.floor(semitoneDistance / 12)))
      )
    }
  });

  return justFrequencies;
}