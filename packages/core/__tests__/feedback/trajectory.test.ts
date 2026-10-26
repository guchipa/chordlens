import { TrajectoryBuffer, type TrajectoryPushInput } from "../../src/feedback/trajectory";

const input = (chordKey: string, transitioning = false, deviation = 0): TrajectoryPushInput => ({
  chordKey,
  chordLabel: chordKey,
  transitioning,
  voices: [{ key: "C4", role: "root", deviation }],
});

const create = () =>
  new TrajectoryBuffer({ windowMs: 1000, minIntervalMs: 50, retroTransitionMs: 100 });

describe("TrajectoryBuffer", () => {
  it("windowMs より古いサンプルを捨て、minIntervalMs 未満の push は間引く", () => {
    const b = create();
    b.push(0, input("C"));
    b.push(10, input("C"));
    b.push(60, input("C"));
    expect(b.getSamples().map((s) => s.t)).toEqual([0, 60]);
    b.push(1100, input("C"));
    expect(b.getSamples().map((s) => s.t)).toEqual([1100]);
  });

  it("和音ごとに区間を分ける", () => {
    const b = create();
    for (let t = 0; t <= 300; t += 100) b.push(t, input("C"));
    for (let t = 400; t <= 700; t += 100) b.push(t, input("F"));
    const segs = b.getSegments();
    // F 確定時に直前 100ms (t=300) が切替区間にさかのぼる
    expect(segs.map((s) => s.chordKey)).toEqual(["C", null, "F"]);
    expect(segs[0].start).toBe(0);
    expect(segs[2].end).toBe(700);
  });

  it("判定中のサンプルと、判定開始より retroTransitionMs 前までを切替区間にする", () => {
    const b = create();
    for (let t = 0; t <= 400; t += 100) b.push(t, input("C"));
    b.push(500, input("C", true));
    b.push(600, input("C", true));
    b.push(700, input("F"));
    const flags = b.getSamples().map((s) => [s.t, s.transition]);
    expect(flags).toEqual([
      [0, false],
      [100, false],
      [200, false],
      [300, false],
      [400, true],
      [500, true],
      [600, true],
      [700, false],
    ]);
  });

  it("判定中のまま和音が変わらなければ、さかのぼりはしない", () => {
    const b = create();
    b.push(0, input("C"));
    b.push(100, input("C", true));
    b.push(200, input("C"));
    expect(b.getSamples().map((s) => s.transition)).toEqual([false, true, false]);
  });

  it("和音が変わったサンプルは間引かない", () => {
    const b = create();
    b.push(0, input("C"));
    b.push(10, input("F"));
    expect(b.getSamples().map((s) => s.chordKey)).toEqual(["C", "F"]);
  });
});
