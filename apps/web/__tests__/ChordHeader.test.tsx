import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { ChordHeader } from "@/components/feedback/ChordHeader";
import {
  chordFollowEnabledAtom,
  chordFollowLockedAtom,
  chordFollowPendingAtom,
  chordFollowStatusAtom,
} from "@/lib/store";
import type { Pitch } from "@chordlens/core/types";

const p = (pitchName: string, octaveNum: number, isRoot = false): Pitch => ({
  pitchName,
  octaveNum,
  isRoot,
  enabled: true,
});

function setup(pitchList: Pitch[], init: (s: ReturnType<typeof createStore>) => void = () => {}) {
  const store = createStore();
  init(store);
  render(
    <Provider store={store}>
      <ChordHeader pitchList={pitchList} />
    </Provider>
  );
  return store;
}

describe("ChordHeader", () => {
  afterEach(cleanup);

  it("和音名と根音を表示し、手動時は固定ボタンを出さない", () => {
    setup([p("A", 3, true), p("C", 4), p("E", 4), p("G", 4)]);
    expect(screen.getByTestId("chord-symbol").textContent).toBe("Am7");
    expect(screen.getByText("A3")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("手動");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("自動追従中は判定中の状態を出し、固定ボタンで atom を切り替える", () => {
    const store = setup([p("C", 4, true), p("E", 4), p("G", 4)], (s) => {
      s.set(chordFollowEnabledAtom, true);
      s.set(chordFollowStatusAtom, "tracking");
      s.set(chordFollowPendingAtom, true);
    });
    expect(screen.getByRole("status").textContent).toContain("判定中");
    const button = screen.getByRole("button", { name: "固定" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(store.get(chordFollowLockedAtom)).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("固定中");
    expect(screen.getByRole("button", { name: "固定中" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("根音がなければダッシュを出し、根音の枠は残す (状態表示が横に動かない)", () => {
    setup([p("C", 4), p("E", 4)]);
    expect(screen.getByTestId("chord-symbol").textContent).toBe("—");
    expect(screen.getByTestId("chord-root").textContent).toBe("根音 —");
  });

  it("和音名は根音・状態表示と別の行に置く (和音名の長さで他が動かない)", () => {
    setup([p("A", 3, true), p("C", 4)]);
    const symbol = screen.getByTestId("chord-symbol");
    expect(symbol.textContent).toBe("A + 短3度");
    expect(symbol.parentElement!.contains(screen.getByTestId("chord-root"))).toBe(true);
    expect(symbol.nextElementSibling!.contains(screen.getByTestId("chord-root"))).toBe(true);
  });
});
