/**
 * Jotai Atoms - 「元に戻す」付きの破壊的操作
 * 構成音の削除・全クリア・プリセット切替/削除を実行し、トーストで取り消しを提案する。
 * 実験フローの loadPresetAtom 等は変更せず、メインアプリ側だけがこちらを使う。
 */
import { atom } from "jotai";
import type { PitchPreset } from "@chordlens/core/types";
import { insertAt, removeAt } from "@chordlens/core/undo/listOps";
import { pitchListEquals } from "@chordlens/core/presets/pitchListEquals";
import { deletePreset, restorePreset } from "@/lib/presets";
import { pitchListAtom } from "./pitchListAtoms";
import { refreshPresetsAtom } from "./presetAtoms";
import { showToastAtom } from "./toastAtoms";

const UNDO_LABEL = "元に戻す";

/** 構成音を 1 つ削除する。元の位置・根音/有効フラグごと復元できる */
export const removePitchWithUndoAtom = atom(null, (get, set, index: number) => {
    const list = get(pitchListAtom);
    const removed = list[index];
    if (!removed) return;
    set(pitchListAtom, removeAt(list, index));
    set(showToastAtom, {
        message: `${removed.pitchName}${removed.octaveNum} を削除しました`,
        actionLabel: UNDO_LABEL,
        onAction: () => {
            const current = get(pitchListAtom);
            const label = `${removed.pitchName}${removed.octaveNum}`;
            // 削除後に同じ音や別の根音が追加されていたら、重複を作らないよう復元しない
            if (current.some((p) => p.pitchName === removed.pitchName && p.octaveNum === removed.octaveNum)) {
                set(showToastAtom, { message: `${label} は既に追加されているため元に戻せません` });
                return;
            }
            if (removed.isRoot && current.some((p) => p.isRoot)) {
                set(showToastAtom, { message: `根音が既に設定されているため ${label} を元に戻せません` });
                return;
            }
            set(pitchListAtom, insertAt(current, index, removed));
        },
    });
});

/** 構成音を全てクリアする。リスト全体を復元できる */
export const clearPitchListWithUndoAtom = atom(null, (get, set) => {
    const previous = get(pitchListAtom);
    if (previous.length === 0) return;
    set(pitchListAtom, []);
    set(showToastAtom, {
        message: "全ての音をクリアしました",
        actionLabel: UNDO_LABEL,
        onAction: () => set(pitchListAtom, previous),
    });
});

/**
 * プリセットを構成音リストへ読み込む。直前のリストと内容が違うときだけ取り消しを提案する。
 */
export const loadPresetWithUndoAtom = atom(
    null,
    (get, set, preset: Pick<PitchPreset, "name" | "pitchList">) => {
        const previous = get(pitchListAtom);
        set(pitchListAtom, preset.pitchList);
        if (pitchListEquals(previous, preset.pitchList)) return;
        set(showToastAtom, {
            message: `「${preset.name}」を読み込みました`,
            actionLabel: UNDO_LABEL,
            onAction: () => set(pitchListAtom, previous),
        });
    },
);

/** プリセットを削除する。同じ id・名前・並び順で復元できる */
export const deletePresetWithUndoAtom = atom(null, (_get, set, preset: PitchPreset) => {
    if (!deletePreset(preset.id)) return false;
    set(refreshPresetsAtom);
    set(showToastAtom, {
        message: `「${preset.name}」を削除しました`,
        actionLabel: UNDO_LABEL,
        onAction: () => {
            const res = restorePreset(preset);
            if (res.success) {
                set(refreshPresetsAtom);
            } else {
                set(showToastAtom, { message: res.error });
            }
        },
    });
    return true;
});

