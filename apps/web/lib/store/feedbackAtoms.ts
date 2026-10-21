/**
 * Jotai Atoms - フィードバック表示形式
 * メイン画面と評価実験画面の形式の切り替えを管理
 */
import { atomWithStorage } from "jotai/utils";
import {
    CIRCLE_LAYOUTS,
    FEEDBACK_TYPES,
    LEGACY_FEEDBACK_TYPES,
    type CircleLayout,
    type FeedbackType,
    type LegacyFeedbackType,
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

// 評価実験画面 (/experiments) のフィードバック形式atom（localStorageに永続化）。
// メイン画面のカルーセル操作で実験条件が変わらないよう、メイン画面とは分ける。
// 未保存なら、分離前に共有していた "feedbackType" の値 (従来 3 形式のみ) を引き継ぐ
const EXPERIMENT_FEEDBACK_TYPE_KEY = "experimentFeedbackType";
const isLegacyFeedbackType = (value: string | null): value is LegacyFeedbackType =>
    value !== null && (LEGACY_FEEDBACK_TYPES as readonly string[]).includes(value);

export const experimentFeedbackTypeAtom = atomWithStorage<LegacyFeedbackType>(
    EXPERIMENT_FEEDBACK_TYPE_KEY,
    "meter",
    {
        getItem: (key, initialValue) => {
            if (typeof window === "undefined") return initialValue;
            const stored = localStorage.getItem(key);
            if (isLegacyFeedbackType(stored)) return stored;
            const shared = localStorage.getItem("feedbackType");
            if (isLegacyFeedbackType(shared)) return shared;
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
