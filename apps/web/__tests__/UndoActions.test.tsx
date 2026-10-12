import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Toaster } from "@/components/feature/Toaster";
import { PitchList } from "@/components/feature/PitchList";
import { PresetSwitcher } from "@/components/feature/PresetSwitcher";
import { PresetManager } from "@/components/feature/PresetManager";
import { pitchListAtom, presetsAtom, toastAtom } from "@/lib/store";
import { getPresets, savePreset } from "@/lib/presets";
import type { Pitch } from "@chordlens/core/types";

const chord = (names: string[]): Pitch[] =>
  names.map((n, i) => ({ pitchName: n as Pitch["pitchName"], octaveNum: 4, enabled: true, isRoot: i === 0 }));
const C = chord(["C", "E", "G"]);
const F = chord(["F", "A", "C"]);

function setup(initial: Pitch[]) {
  const store = createStore();
  store.set(pitchListAtom, initial);
  render(
    <Provider store={store}>
      <PitchList />
      <PresetSwitcher onOpenSettings={() => {}} />
      <PresetManager />
      <Toaster />
    </Provider>,
  );
  return store;
}

const undo = () => fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));

describe("「元に戻す」付き操作", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("音の削除を元の位置・根音フラグごと戻せる", () => {
    const list: Pitch[] = [
      { pitchName: "C", octaveNum: 4, enabled: true, isRoot: true },
      { pitchName: "E", octaveNum: 4, enabled: false, isRoot: false },
      { pitchName: "G", octaveNum: 4, enabled: true, isRoot: false },
    ];
    const store = setup(list);
    fireEvent.click(screen.getByRole("button", { name: "E4 を削除" }));
    expect(store.get(pitchListAtom).map((p) => p.pitchName)).toEqual(["C", "G"]);
    expect(screen.getByText("E4 を削除しました")).toBeInTheDocument();
    undo();
    expect(store.get(pitchListAtom)).toEqual(list);
    expect(store.get(toastAtom)).toBeNull();
  });

  it("先頭の根音を削除しても戻せる", () => {
    const store = setup(C);
    fireEvent.click(screen.getByRole("button", { name: "C4 を削除" }));
    undo();
    expect(store.get(pitchListAtom)).toEqual(C);
  });

  it("全てクリアでリスト全体を戻せる", () => {
    const store = setup(C);
    fireEvent.click(screen.getByText("全てクリア"));
    expect(store.get(pitchListAtom)).toEqual([]);
    expect(screen.getByText("全ての音をクリアしました")).toBeInTheDocument();
    undo();
    expect(store.get(pitchListAtom)).toEqual(C);
  });

  it("メイン画面のプリセット切替で直前のリストに戻せる", () => {
    savePreset("Cメジャー", C);
    savePreset("Fメジャー", F);
    const store = setup(C);
    const group = within(screen.getByRole("group", { name: "プリセットで和音を切り替え" }));
    fireEvent.click(group.getByRole("button", { name: /Fメジャー/ }));
    expect(store.get(pitchListAtom)).toEqual(F);
    expect(screen.getByText("「Fメジャー」を読み込みました")).toBeInTheDocument();
    undo();
    expect(store.get(pitchListAtom)).toEqual(C);
  });

  it("現在と同じ内容のプリセットを選んでも通知を出さない", () => {
    savePreset("Cメジャー", C);
    const store = setup(C);
    const group = within(screen.getByRole("group", { name: "プリセットで和音を切り替え" }));
    fireEvent.click(group.getByRole("button", { name: /Cメジャー/ }));
    expect(store.get(toastAtom)).toBeNull();
  });

  it("プリセット削除は確認ダイアログなしで実行され、同じ id・並び順で戻せる", () => {
    // createdAt を明示して並び順 (降順: C, B, A) を固定する
    localStorage.setItem(
      "chordlens-presets",
      JSON.stringify({
        version: 1,
        presets: [
          { id: "id-a", name: "A", pitchList: C, createdAt: 1000 },
          { id: "id-b", name: "B", pitchList: F, createdAt: 2000 },
          { id: "id-c", name: "C", pitchList: C, createdAt: 3000 },
        ],
      }),
    );
    const before = getPresets();
    const store = setup(C);
    const target = before[1];
    fireEvent.click(screen.getByRole("button", { name: `${target.name} を削除` }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(getPresets()).toHaveLength(2);
    expect(store.get(presetsAtom)).toHaveLength(2);
    expect(screen.getByText(`「${target.name}」を削除しました`)).toBeInTheDocument();
    undo();
    expect(getPresets()).toEqual(before);
    expect(getPresets().map((p) => p.id)).toEqual(["id-c", "id-b", "id-a"]);
    expect(store.get(presetsAtom)).toEqual(before);
  });

  it("削除後に同じ音が追加されていたら重複させず、理由を通知する", () => {
    const store = setup(C);
    fireEvent.click(screen.getByRole("button", { name: "E4 を削除" }));
    act(() => store.set(pitchListAtom, [...store.get(pitchListAtom), C[1]]));
    undo();
    expect(store.get(pitchListAtom).filter((p) => p.pitchName === "E")).toHaveLength(1);
    expect(screen.getByText("E4 は既に追加されているため元に戻せません")).toBeInTheDocument();
  });

  it("削除後に別の根音が設定されていたら根音を重複させない", () => {
    const store = setup(C);
    fireEvent.click(screen.getByRole("button", { name: "C4 を削除" }));
    act(() => store.set(pitchListAtom, [{ ...C[1], isRoot: true }, C[2]]));
    undo();
    expect(store.get(pitchListAtom).filter((p) => p.isRoot)).toHaveLength(1);
    expect(store.get(pitchListAtom).some((p) => p.pitchName === "C")).toBe(false);
  });
});
