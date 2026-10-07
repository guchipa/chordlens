import { render, screen, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { PresetManager } from "@/components/feature/PresetManager";
import { pitchListAtom } from "@/lib/store/pitchListAtoms";
import type { Pitch } from "@chordlens/core/types";

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

  // "保存" テキストの最寄りの ion-button を取得する。
  // ion-button には暗黙の button ロールが付かない (jsdom は Stencil の
  // shadow DOM を描画しない) ため getByRole は使えない。
  const getSaveButton = () =>
    screen.getByText("保存").closest("ion-button") as Element;

  it("renders preset manager card", () => {
    renderWithJotai(mockPitchList);

    expect(screen.getByText("プリセット")).toBeDefined();
    expect(
      screen.getByText("構成音リストを保存・読み込みできます")
    ).toBeDefined();
  });

  it("shows save button", async () => {
    renderWithJotai(mockPitchList);

    // Stencil のカスタム要素は非同期にアップグレードされるため、
    // customElements.whenDefined を待ってから disabled 属性の反映を確認する
    await customElements.whenDefined("ion-button");
    const saveButton = getSaveButton();
    expect(saveButton).not.toBeNull();
    expect(saveButton).not.toHaveAttribute("disabled");
  });

  it("disables save button when pitch list is empty", async () => {
    renderWithJotai([]);

    await customElements.whenDefined("ion-button");
    // disabled 属性への反映は Stencil 側の再レンダーを挟むため、
    // whenDefined の直後では未反映のことがある。waitFor でポーリングする
    await waitFor(() => {
      expect(getSaveButton()).toHaveAttribute("disabled");
    });
  });

  it("shows empty state when no presets exist", () => {
    renderWithJotai(mockPitchList);

    expect(screen.getByText("プリセットがありません")).toBeDefined();
  });
});
