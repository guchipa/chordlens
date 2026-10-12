/**
 * Jotai Atoms - 通知 (トースト)
 * 「元に戻す」付きの軽量な通知。同時に 1 件だけ表示し、新しい通知は古いものを置き換える。
 * 表示・自動消去のタイマーは components/feature/Toaster.tsx が担う。
 */
import { atom } from "jotai";

export interface ToastData {
    /** 通知ごとに一意。置き換え時にタイマーを張り直すためのキー */
    id: number;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export type ToastInput = Omit<ToastData, "id">;

/** 表示時間 (ms) */
export const TOAST_DURATION_MS = 5000;

let nextToastId = 1;

export const toastAtom = atom<ToastData | null>(null);

export const showToastAtom = atom(null, (_get, set, input: ToastInput) => {
    set(toastAtom, { ...input, id: nextToastId++ });
});

export const dismissToastAtom = atom(null, (_get, set) => {
    set(toastAtom, null);
});
