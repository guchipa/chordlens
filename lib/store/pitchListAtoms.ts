/**
 * Jotai Atoms - ピッチリスト（構成音リスト）
 * フォームからの追加、削除、プリセット読み込みを管理
 */
import { atom } from "jotai";
import { DEFAULT_INITIAL_PITCH_LIST } from "@/lib/constants";
import type { Pitch } from "@/lib/types";

// メインのピッチリストatom
export const pitchListAtom = atom<Pitch[]>(DEFAULT_INITIAL_PITCH_LIST);

// ピッチを追加/更新するaction atom
export const addOrUpdatePitchAtom = atom(
    null, // read不要
    (get, set, newPitch: Pitch) => {
        const currentList = get(pitchListAtom);
        const existingIndex = currentList.findIndex(
            (item) =>
                item.pitchName === newPitch.pitchName &&
                item.octaveNum === newPitch.octaveNum
        );

        if (existingIndex !== -1) {
            // 既存の要素を更新
            const newList = [...currentList];
            newList[existingIndex] = newPitch;
            set(pitchListAtom, newList);
        } else {
            // 新規追加
            set(pitchListAtom, [...currentList, newPitch]);
        }
    }
);

// ピッチを削除するaction atom
export const removePitchAtom = atom(null, (get, set, indexToRemove: number) => {
    const currentList = get(pitchListAtom);
    set(
        pitchListAtom,
        currentList.filter((_, index) => index !== indexToRemove)
    );
});

// ピッチリストをクリアするaction atom
export const clearPitchListAtom = atom(null, (get, set) => {
    set(pitchListAtom, []);
});

// プリセットからピッチリストを読み込むaction atom
export const loadPresetAtom = atom(null, (get, set, presetPitchList: Pitch[]) => {
    set(pitchListAtom, presetPitchList);
});

// ピッチの有効/無効を切り替えるaction atom
export const togglePitchEnabledAtom = atom(
    null,
    (get, set, index: number) => {
        const currentList = get(pitchListAtom);
        if (index < 0 || index >= currentList.length) return;

        const newList = [...currentList];
        newList[index] = {
            ...newList[index],
            enabled: !newList[index].enabled,
        };
        set(pitchListAtom, newList);
    }
);

// ルートを設定するaction atom
export const setRootAtom = atom(null, (get, set, index: number) => {
    const currentList = get(pitchListAtom);
    const newList = currentList.map((pitch, i) => ({
        ...pitch,
        isRoot: i === index,
    }));
    set(pitchListAtom, newList);
});
