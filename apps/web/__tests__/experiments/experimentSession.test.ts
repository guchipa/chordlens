import { createInitialSession } from "@/lib/experiments/types";

describe("createInitialSession", () => {
  it("初期 phase は survey", () => {
    const s = createInitialSession("PR01", "with");
    expect(s.phase).toBe("survey");
    expect(s.pairId).toBe("PR01");
    expect(s.condition).toBe("with");
    expect(s.attemptCounters.test1.Bb).toBe(0);
    expect(s.finalizedAttempts.test1).toEqual({});
    expect(s.pendingUploads).toEqual([]);
  });
});
