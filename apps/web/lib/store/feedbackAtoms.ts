/**
 * Jotai Atoms - フィードバック表示形式
 * メイン画面の形式の切り替えを管理 (評価実験画面はメーター固定のため持たない)
 */
import { atomWithStorage } from "jotai/utils";
import {
    CIRCLE_LAYOUTS,
    DISPLAY_SMOOTHING_DEFAULT,
    DISPLAY_SMOOTHING_LEVELS,
    FEEDBACK_TYPES,
    IN_TUNE_CENTS_DEFAULT,
    type CircleLayout,
    type DisplaySmoothing,
    type FeedbackType,
} from "@chordlens/core/constants";

// メイン画面のフィードバック形式atom（localStorageに永続化）
export const feedbackTypeAtom = atomWithStorage<FeedbackType>(
    "feedbackType",
    "trajectory",
    // カスタムストレージで有効な値のみ受け入れる
    {
        getItem: (key, initialValue) => {
            if (typeof window === "undefined") return initialValue;
            const stored = localStorage.getItem(key);
            if (stored && FEEDBACK_TYPES.includes(stored as FeedbackType)) {
                return stored as FeedbackType;
            }
            return initialValue;
        },
        setItem: (key, value) => {
            if (typeof window !== "undefined") {
                localStorage.setItem(key, value);
            }
        },
        removeItem: (key) => {
            if (typeof window !== "undefined") {
                localStorage.removeItem(key);
            }
        },
    }
);

// サークル形式の音名の並び順 (メイン画面のみ。実験画面はメーター固定)
export const circleLayoutAtom = atomWithStorage<CircleLayout>(
    "circleLayout",
    "chromatic",
    {
        getItem: (key, initialValue) => {
            if (typeof window === "undefined") return initialValue;
            const stored = localStorage.getItem(key);
            if (stored && CIRCLE_LAYOUTS.includes(stored as CircleLayout)) {
                return stored as CircleLayout;
            }
            return initialValue;
        },
        setItem: (key, value) => {
            if (typeof window !== "undefined") {
                localStorage.setItem(key, value);
            }
        },
        removeItem: (key) => {
            if (typeof window !== "undefined") {
                localStorage.removeItem(key);
            }
        },
    }
);

// ピッチの正解幅 (セント)。メイン画面の「合っている」判定の閾値 (実験画面のメーターは使わない)
export const inTuneCentsAtom = atomWithStorage<number>(
    "chordlens-inTuneCents",
    IN_TUNE_CENTS_DEFAULT
);

// 表示の平滑化の強さ (メイン画面のみ。実験画面のメーターは平滑化なしに固定)
export const displaySmoothingAtom = atomWithStorage<DisplaySmoothing>(
    "chordlens-displaySmoothing",
    DISPLAY_SMOOTHING_DEFAULT,
    {
        getItem: (key, initialValue) => {
            if (typeof window === "undefined") return initialValue;
            const stored = localStorage.getItem(key);
            if (stored && DISPLAY_SMOOTHING_LEVELS.includes(stored as DisplaySmoothing)) {
                return stored as DisplaySmoothing;
            }
            return initialValue;
        },
        setItem: (key, value) => {
            if (typeof window !== "undefined") {
                localStorage.setItem(key, value);
            }
        },
        removeItem: (key) => {
            if (typeof window !== "undefined") {
                localStorage.removeItem(key);
            }
        },
    }
);
