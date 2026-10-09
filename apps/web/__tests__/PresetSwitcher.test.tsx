import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresetSwitcher } from "@/components/feature/PresetSwitcher";
import { PresetManager } from "@/components/feature/PresetManager";
import { pitchListAtom, presetsAtom } from "@/lib/store";
import { savePreset } from "@/lib/presets";
import type { Pitch } from "@chordlens/core/types";

const chord = (names: string[]): Pitch[] =>
  names.map((n, i) => ({ pitchName: n as Pitch["pitchName"], octaveNum: 4, enabled: true, isRoot: i === 0 }));

const C = chord(["C", "E", "G"]);
const F = chord(["F", "A", "C"]);

const chips = () => within(screen.getByRole("group", { name: "プリセットで和音を切り替え" }));

function setup(initial: Pitch[], onOpenSettings = vi.fn()) {
  const store = createStore();
  store.set(pitchListAtom, initial);
  const utils = render(
    <Provider store={store}>
      <PresetSwitcher onOpenSettings={onOpenSettings} />
      <PresetManager />
    </Provider>,
  );
  return { store, onOpenSettings, ...utils };
}

describe("PresetSwitcher", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("プリセットがなければヒントを表示し、押すと設定を開く", () => {
    const { onOpenSettings } = setup(C);
    fireEvent.click(
      screen.getByRole("button", { name: /プリセットを保存すると、ここで切り替えられます/ }),
    );
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it("保存済みプリセットをチップで表示し、現在の和音と一致するものが押下状態になる", () => {
    savePreset("Cメジャー", C);
    savePreset("Fメジャー", F);
    setup(C);
    const group = screen.getByRole("group", { name: "プリセットで和音を切り替え" });
    expect(group.querySelectorAll("button")).toHaveLength(2);
    expect(chips().getByRole("button", { name: /Cメジャー/ }).getAttribute("aria-pressed")).toBe("true");
    expect(chips().getByRole("button", { name: /Fメジャー/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("タップすると確認なしで構成音リストを切り替える", () => {
    savePreset("Cメジャー", C);
    savePreset("Fメジャー", F);
    const { store } = setup(C);
    fireEvent.click(chips().getByRole("button", { name: /Fメジャー/ }));
    expect(store.get(pitchListAtom)).toEqual(F);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(chips().getByRole("button", { name: /Fメジャー/ }).getAttribute("aria-pressed")).toBe("true");
    expect(chips().getByRole("button", { name: /Cメジャー/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("PresetManager での保存が共有 state を通じて即座にチップへ反映される", async () => {
    const { store } = setup(C);
    expect(store.get(presetsAtom)).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /現在の構成音を保存/ }));
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "新規" } });
    fireEvent.click(screen.getByRole("button", { name: /^保存$/ }));
    await screen.findByRole("group", { name: "プリセットで和音を切り替え" });
    expect(chips().getByRole("button", { name: /新規/ })).toBeDefined();
    expect(store.get(presetsAtom)).toHaveLength(1);
  });
});
