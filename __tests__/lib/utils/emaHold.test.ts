import { updateEmaHoldList } from "@/lib/utils/emaHold";

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
