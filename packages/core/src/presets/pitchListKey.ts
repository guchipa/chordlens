import { PITCH_NAME_LIST } from "../constants";
import type { Pitch } from "../types";

/**
 * 構成音リストを和音として同一判定するためのキー
 * (例: "C4*,E4,G4"。音名+オクターブ、根音には "*")。
 *
 * 有効な音だけを音高の低い順に並べるため、登録順の違いや無効化した音の
 * 有無は同じ和音とみなす。自動追従の推定は常に昇順・全音有効なので、
 * ユーザーのリストとの比較で並び順や無効化した音が食い違いにならないよう、
 * 自動追従・フィードバック表示の和音判定はすべてこのキーを使う。
 * 並び順や有効フラグまで含めて比較したい場合は pitchListEquals を使う。
 */
export function pitchListKey(pitchList: readonly Pitch[]): string {
  return pitchList
    .filter((p) => p.enabled !== false)
    .map((p) => ({ p, semitone: PITCH_NAME_LIST.indexOf(p.pitchName) + 12 * p.octaveNum }))
    .sort((a, b) => a.semitone - b.semitone)
    .map(({ p }) => `${p.pitchName}${p.octaveNum}${p.isRoot ? "*" : ""}`)
    .join(",");
}
