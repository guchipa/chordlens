import { describe, it, expect } from "vitest";
import { createPresetStore } from "../../src/presets/presetStore";
import type { KeyValueStorage } from "../../src/adapters/storage";
import type { Pitch } from "../../src/types";

function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const pitches: Pitch[] = [
  { pitchName: "C", octaveNum: 4, enabled: true, isRoot: true },
  { pitchName: "E", octaveNum: 4, enabled: true, isRoot: false },
];

function setup() {
  let t = 1000;
  let n = 0;
  return createPresetStore({
    storage: memoryStorage(),
    generateId: () => `id-${++n}`,
    now: () => (t += 10),
  });
}

describe("restorePreset", () => {
  it("削除したプリセットを同じ id・名前・並び順で復元する", () => {
    const store = setup();
    store.savePreset("A", pitches);
    store.savePreset("B", pitches);
    store.savePreset("C", pitches);
    const before = store.getPresets();
    expect(before.map((p) => p.name)).toEqual(["C", "B", "A"]);

    const target = before[1];
    expect(store.deletePreset(target.id)).toBe(true);
    expect(store.getPresets().map((p) => p.name)).toEqual(["C", "A"]);

    expect(store.restorePreset(target)).toEqual({ success: true });
    expect(store.getPresets()).toEqual(before);
  });

  it("既に存在する id は重複させない", () => {
    const store = setup();
    store.savePreset("A", pitches);
    const [p] = store.getPresets();
    expect(store.restorePreset(p).success).toBe(true);
    expect(store.getPresets()).toHaveLength(1);
  });

  it("上限に達していれば失敗を返す", () => {
    const store = setup();
    for (let i = 0; i < 20; i++) store.savePreset(`P${i}`, pitches);
    const res = store.restorePreset({
      id: "x",
      name: "X",
      pitchList: pitches,
      createdAt: 1,
    });
    expect(res.success).toBe(false);
  });
});
