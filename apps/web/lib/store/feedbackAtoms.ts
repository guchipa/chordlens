/**
 * Jotai Atoms - フィードバック表示形式
 * メーター、バー、サークルの切り替えを管理
 */
import { atomWithStorage } from "jotai/utils";
import {
    CIRCLE_LAYOUTS,
    FEEDBACK_TYPES,
    type CircleLayout,
    type FeedbackType,
} from "@chordlens/core/constants";

// フィードバック形式atom（localStorageに永続化）
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


// サークル形式の音名の並び順 (メイン画面のみ。実験画面は常に半音順)
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
