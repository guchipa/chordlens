import { DeviationStabilizer } from "../../src/feedback/deviationStabilizer";

const create = () => new DeviationStabilizer({ alpha: 1, holdMs: 250, remainMs: 1500 });

describe("DeviationStabilizer", () => {
  it("音ごとの一瞬の途切れは holdMs だけ保持する", () => {
    const s = create();
    expect(s.update(["C4", "E4"], [0.1, 0.2], 0)).toEqual([0.1, 0.2]);
    expect(s.update(["C4", "E4"], [0.1, null], 100)).toEqual([0.1, 0.2]);
    expect(s.update(["C4", "E4"], [0.1, null], 400)).toEqual([0.1, null]);
  });

  it("全音が未検出になっても remainMs だけ最後の表示を保持する", () => {
    const s = create();
    s.update(["C4", "E4"], [0.1, 0.2], 0);
    expect(s.update(["C4", "E4"], [null, null], 1000)).toEqual([0.1, 0.2]);
    expect(s.update(["C4", "E4"], [null, null], 1600)).toEqual([null, null]);
  });

  it("構成音が変わったら全体の保持はしない", () => {
    const s = create();
    s.update(["C4", "E4"], [0.1, 0.2], 0);
    expect(s.update(["F4", "A4"], [null, null], 100)).toEqual([null, null]);
  });

  it("reset で状態を捨てる (旧和音の値を新和音の同名音に引き継がない)", () => {
    const s = create();
    s.update(["C4", "E4"], [0.1, 0.2], 0);
    s.reset();
    expect(s.update(["C4", "E4"], [null, null], 100)).toEqual([null, null]);
  });

  it("alpha < 1 で EMA 平滑化する", () => {
    const s = new DeviationStabilizer({ alpha: 0.5, holdMs: 0, remainMs: 0 });
    s.update(["C4"], [0], 0);
    expect(s.update(["C4"], [1], 10)[0]).toBeCloseTo(0.5);
  });
});
