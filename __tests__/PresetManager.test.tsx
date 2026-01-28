import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { PresetManager } from "@/components/feature/PresetManager";
import { pitchListAtom } from "@/lib/store/pitchListAtoms";
import type { Pitch } from "@/lib/types";

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("PresetManager", () => {
  const mockPitchList: Pitch[] = [
    { pitchName: "C", octaveNum: 4, enabled: true, isRoot: true },
    { pitchName: "E", octaveNum: 4, enabled: true, isRoot: false },
    { pitchName: "G", octaveNum: 4, enabled: true, isRoot: false },
  ];

  beforeEach(() => {
    localStorageMock.clear();
  });

  // Jotai storeをセットアップするヘルパー関数
  const renderWithJotai = (pitchList: Pitch[]) => {
    const store = createStore();
    store.set(pitchListAtom, pitchList);
    return render(
      <Provider store={store}>
        <PresetManager />
      </Provider>
    );
  };

  it("renders preset manager card", () => {
    renderWithJotai(mockPitchList);

    expect(screen.getByText("プリセット")).toBeDefined();
    expect(
      screen.getByText("構成音リストを保存・読み込みできます")
    ).toBeDefined();
  });

  it("shows save button", () => {
    renderWithJotai(mockPitchList);

    const saveButton = screen.getByRole("button", { name: /保存/i });
    expect(saveButton).toBeDefined();
    expect(saveButton.hasAttribute("disabled")).toBe(false);
  });

  it("disables save button when pitch list is empty", () => {
    renderWithJotai([]);

    const saveButton = screen.getByRole("button", { name: /保存/i });
    expect(saveButton.hasAttribute("disabled")).toBe(true);
  });

  it("shows empty state when no presets exist", () => {
    renderWithJotai(mockPitchList);

    expect(screen.getByText("プリセットがありません")).toBeDefined();
  });
});
