/**
 * 「元に戻す」用の配列操作 (プラットフォーム非依存・純関数)。
 * 削除した要素を元の位置へ戻すために使う。
 */

/** index の要素を取り除いた新しい配列を返す。範囲外なら同じ内容のコピー */
export function removeAt<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

/**
 * index の位置へ要素を挿入した新しい配列を返す。
 * 削除後に他の操作で配列が短くなっていても、範囲内 (0..length) に丸めて挿入する。
 */
export function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const i = Math.min(Math.max(Math.trunc(index), 0), list.length);
  return [...list.slice(0, i), item, ...list.slice(i)];
}
