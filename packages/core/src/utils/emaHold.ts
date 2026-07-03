export type EmaHoldState = {
    lastSeenMs: number;
    smoothedValue: number;
};

export type EmaHoldOptions = {
    /** 0〜1: 値が大きいほど追従が速い */
    alpha: number;
    /** 未検出でも保持する時間（ms） */
    holdMs: number;
};

export type EmaHoldUpdateResult = {
    value: number | null;
    isDetected: boolean;
    isHeld: boolean;
};

function clamp01(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

function clampHoldMs(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, value);
}

/**
 * EMA + ホールドによる時系列平滑化。
 * - rawValue が null でない場合: EMA更新して保存
 * - rawValue が null の場合: holdMs 以内なら前回値を保持、超えたら null
 */
export function updateEmaHoldState(
    stateMap: Map<string, EmaHoldState>,
    key: string,
    rawValue: number | null,
    nowMs: number,
    options: EmaHoldOptions
): EmaHoldUpdateResult {
    const alpha = clamp01(options.alpha);
    const holdMs = clampHoldMs(options.holdMs);

    const prev = stateMap.get(key);

    if (rawValue !== null) {
        const prevSmoothed = prev?.smoothedValue ?? rawValue;
        const smoothed = prevSmoothed + (rawValue - prevSmoothed) * alpha;

        stateMap.set(key, {
            lastSeenMs: nowMs,
            smoothedValue: smoothed,
        });

        return { value: smoothed, isDetected: true, isHeld: false };
    }

    if (prev && nowMs - prev.lastSeenMs <= holdMs) {
        return { value: prev.smoothedValue, isDetected: false, isHeld: true };
    }

    return { value: null, isDetected: false, isHeld: false };
}

export function updateEmaHoldList(
    stateMap: Map<string, EmaHoldState>,
    keys: string[],
    rawValues: Array<number | null>,
    nowMs: number,
    options: EmaHoldOptions
): {
    values: Array<number | null>;
    isDetectedList: boolean[];
    isHeldList: boolean[];
} {
    const values: Array<number | null> = [];
    const isDetectedList: boolean[] = [];
    const isHeldList: boolean[] = [];

    for (let i = 0; i < keys.length; i++) {
        const result = updateEmaHoldState(
            stateMap,
            keys[i],
            rawValues[i] ?? null,
            nowMs,
            options
        );

        values.push(result.value);
        isDetectedList.push(result.isDetected);
        isHeldList.push(result.isHeld);
    }

    return { values, isDetectedList, isHeldList };
}
