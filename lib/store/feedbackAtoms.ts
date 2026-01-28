/**
 * Jotai Atoms - フィードバック表示形式
 * メーター、バー、サークルの切り替えを管理
 */
import { atomWithStorage } from "jotai/utils";
import { FEEDBACK_TYPES, type FeedbackType } from "@/lib/constants";

// フィードバック形式atom（localStorageに永続化）
export const feedbackTypeAtom = atomWithStorage<FeedbackType>(
    "feedbackType",
    "meter",
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
