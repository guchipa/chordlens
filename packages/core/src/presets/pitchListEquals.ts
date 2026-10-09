import type { Pitch } from "../types";

/**
 * 2 つの構成音リストが同一かを判定する (順序も含めて比較)。
 * 音名・オクターブ・根音・有効フラグがすべて一致すれば true。
 * メイン画面のプリセット切替で「現在のプリセット」を判別するために使う。
 */
export function pitchListEquals(a: Pitch[], b: Pitch[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((p, i) => {
    const q = b[i];
    return (
      p.pitchName === q.pitchName &&
      p.octaveNum === q.octaveNum &&
      Boolean(p.isRoot) === Boolean(q.isRoot) &&
      p.enabled === q.enabled
    );
  });
}
