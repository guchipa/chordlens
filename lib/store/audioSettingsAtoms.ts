/**
 * Jotai Atoms - 音声設定
 * 評価範囲、A4周波数、閾値、FFTサイズ、平滑化定数を管理
 */
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
    EVAL_RANGE_CENTS,
    A4_FREQ,
    EVAL_THRESHOLD,
    FFT_SIZE,
    SMOOTHING_TIME_CONSTANT,
    HOLD_ENABLED_DEFAULT,
    sensitivityToDb,
    dbToSensitivity,
} from "@/lib/constants";

// 基本設定atoms（localStorageに永続化）
export const evalRangeCentsAtom = atomWithStorage<number>(
    "chordlens-evalRangeCents",
    EVAL_RANGE_CENTS
);

export const a4FreqAtom = atomWithStorage<number>("chordlens-a4Freq", A4_FREQ);

export const fftSizeAtom = atomWithStorage<number>("chordlens-fftSize", FFT_SIZE);

export const smoothingTimeConstantAtom = atomWithStorage<number>(
    "chordlens-smoothingTimeConstant",
    SMOOTHING_TIME_CONSTANT
);

// 感度はdB値で内部保存（-60〜-140dB）
export const evalThresholdAtom = atomWithStorage<number>(
    "chordlens-evalThreshold",
    EVAL_THRESHOLD
);

// ホールド機能の有効/無効
export const holdEnabledAtom = atomWithStorage<boolean>(
    "chordlens-holdEnabled",
    HOLD_ENABLED_DEFAULT
);

// 実験モード（localStorageには保存しない）
export const experimentModeAtom = atom<boolean>(false);

// 派生atom: 感度（0-100スケール）
export const sensitivityAtom = atom(
    (get) => dbToSensitivity(get(evalThresholdAtom)),
    (get, set, newSensitivity: number) => {
        set(evalThresholdAtom, sensitivityToDb(newSensitivity));
    }
);

// 設定をまとめて取得する派生atom
export const audioSettingsAtom = atom((get) => ({
    evalRangeCents: get(evalRangeCentsAtom),
    a4Freq: get(a4FreqAtom),
    evalThreshold: get(evalThresholdAtom),
    fftSize: get(fftSizeAtom),
    smoothingTimeConstant: get(smoothingTimeConstantAtom),
    holdEnabled: get(holdEnabledAtom),
    experimentMode: get(experimentModeAtom),
}));
