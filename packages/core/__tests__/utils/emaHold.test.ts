import { updateEmaHoldList } from "../../src/utils/emaHold";

describe("emaHold", () => {
    it("updates values with EMA when detected", () => {
        const state = new Map();
        const keys = ["A4"];

        const r1 = updateEmaHoldList(state, keys, [10], 0, { alpha: 0.5, holdMs: 250 });
        expect(r1.values[0]).toBeCloseTo(10);
        expect(r1.isDetectedList[0]).toBe(true);
        expect(r1.isHeldList[0]).toBe(false);

        const r2 = updateEmaHoldList(state, keys, [20], 10, { alpha: 0.5, holdMs: 250 });
        // 10 + (20-10)*0.5 = 15
        expect(r2.values[0]).toBeCloseTo(15);
        expect(r2.isDetectedList[0]).toBe(true);
        expect(r2.isHeldList[0]).toBe(false);
    });

    it("時定数指定時は経過時間で係数を決め、更新間隔に依存しない", () => {
        const opts = { alpha: 1, holdMs: 0, timeConstantMs: 100 };
        // 60Hz 相当で 100ms 追従
        const s60 = new Map();
        updateEmaHoldList(s60, ["A4"], [0], 0, opts);
        let v60 = 0;
        for (let t = 1; t <= 6; t++) {
            v60 = updateEmaHoldList(s60, ["A4"], [1], (t * 100) / 6, opts).values[0]!;
        }
        // 120Hz 相当で 100ms 追従
        const s120 = new Map();
        updateEmaHoldList(s120, ["A4"], [0], 0, opts);
        let v120 = 0;
        for (let t = 1; t <= 12; t++) {
            v120 = updateEmaHoldList(s120, ["A4"], [1], (t * 100) / 12, opts).values[0]!;
        }
        // 時定数ぶん経過で 1 - 1/e
        expect(v60).toBeCloseTo(1 - Math.exp(-1), 6);
        expect(v120).toBeCloseTo(1 - Math.exp(-1), 6);
    });

    it("holds last value when temporarily not detected", () => {
        const state = new Map();
        const keys = ["A4"];

        updateEmaHoldList(state, keys, [10], 0, { alpha: 1, holdMs: 50 });

        const held = updateEmaHoldList(state, keys, [null], 30, { alpha: 1, holdMs: 50 });
        expect(held.values[0]).toBeCloseTo(10);
        expect(held.isDetectedList[0]).toBe(false);
        expect(held.isHeldList[0]).toBe(true);

        const cleared = updateEmaHoldList(state, keys, [null], 100, { alpha: 1, holdMs: 50 });
        expect(cleared.values[0]).toBeNull();
        expect(cleared.isDetectedList[0]).toBe(false);
        expect(cleared.isHeldList[0]).toBe(false);
    });
});
