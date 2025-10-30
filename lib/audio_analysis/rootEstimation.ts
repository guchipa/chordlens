import {
  PITCH_CLASSES,
  CHORD_DEFINITIONS,
  PITCH_NAME_LIST,
} from "@/lib/constants";

import { formType } from "@/lib/schema";

/**
 * 音名の配列から最も可能性の高いコード名を推定します。
 * @param {string[]} noteNames - 例: ['C4', 'E4', 'G4']
 * @returns {string} - 推定されたコード名 (例: "C Major")
 */
export function estimateRoot(
  currentPitchList: formType[],
  setCurrentPitchList: (pitchList: formType[]) => void
): void {
  if (!currentPitchList || currentPitchList.length < 2) {
    return;
  }

  // Step 1: 入力された音名を、重複のないピッチクラス(0-11)のSetに変換
  const pitchClasses: Set<number> = new Set();
  currentPitchList.forEach((p) => {
    pitchClasses.add(PITCH_CLASSES[p.pitchName as keyof typeof PITCH_CLASSES]);
  });

  const sortedPitchClasses = Array.from(pitchClasses);
  let bestMatch = { score: -1, name: "Unknown", rootName: "" };

  // Step 2: 各構成音をルート候補としてループ処理
  for (const rootCandidate of sortedPitchClasses) {
    // Step 3: 現在のルート候補を基準(0)とした時の、各音のインターバル(半音差)を計算
    const intervals = new Set(
      sortedPitchClasses.map((pc) => (pc - rootCandidate + 12) % 12)
    );

    // Step 4: コード定義リストと照合 (スコアの高い順にチェック)
    for (const [name, definitionIntervals, score] of CHORD_DEFINITIONS) {
      // 構成音の数と内容が完全に一致するかチェック
      if (
        definitionIntervals instanceof Set &&
        intervals.size === definitionIntervals.size &&
        [...intervals].every((i) => definitionIntervals.has(i))
      ) {
        // Step 5: これまでに見つかったベストな候補よりスコアが高ければ更新
        if (typeof score === "number" && score > bestMatch.score) {
          const rootName = PITCH_NAME_LIST[rootCandidate];
          bestMatch = {
            score: score,
            name: `${rootName} ${name}`,
            rootName: rootName,
          };
        }
        // このルート候補では、これ以上スコアの高いものは見つからないので次のルート候補へ
        break;
      }
    }
  }

  // Step 6: 推定した根音と同じ音名の要素のisRootをtrueにする
  if (bestMatch.rootName) {
    const updatedList = currentPitchList.map((pitch) => ({
      ...pitch,
      isRoot: pitch.pitchName === bestMatch.rootName,
    }));
    setCurrentPitchList(updatedList);
  }
}