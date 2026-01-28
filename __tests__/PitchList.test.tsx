import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { PitchList } from "@/components/feature/PitchList";
import { pitchListAtom } from "@/lib/store/pitchListAtoms";
import type { Pitch } from "@/lib/types";

describe("PitchList", () => {
  const mockPitchList: Pitch[] = [
    { pitchName: "C", octaveNum: 4, enabled: true, isRoot: true },
    { pitchName: "E", octaveNum: 4, enabled: true, isRoot: false },
  ];

  // Jotai storeをセットアップするヘルパー関数
  const renderWithJotai = (initialPitchList: Pitch[]) => {
    const store = createStore();
    store.set(pitchListAtom, initialPitchList);
    return {
      store,
      ...render(
        <Provider store={store}>
          <PitchList />
        </Provider>
      ),
    };
  };

  it("renders a message when the pitch list is empty", () => {
    renderWithJotai([]);
    expect(
      screen.getByText(
        "まだ評価する音がありません。上のフォームから追加してください。"
      )
    ).toBeInTheDocument();
  });

  it("renders the list of pitches", () => {
    renderWithJotai(mockPitchList);
    expect(screen.getByText("C4 (R)")).toBeInTheDocument();
    expect(screen.getByText("E4")).toBeInTheDocument();
  });

  it("calls removePitch when a pitch's remove button is clicked", () => {
    const { store } = renderWithJotai(mockPitchList);

    // 削除ボタンをクリック（最初の要素を削除）
    fireEvent.click(screen.getAllByRole("button", { name: "" })[0]);

    // Jotai storeから要素が削除されていることを確認
    const updatedList = store.get(pitchListAtom);
    expect(updatedList.length).toBe(1);
    expect(updatedList[0].pitchName).toBe("E");
  });

  it("calls clearPitchList when the clear button is clicked", () => {
    const { store } = renderWithJotai(mockPitchList);

    // 全てクリアボタンをクリック
    fireEvent.click(screen.getByText("全てクリア"));

    // Jotai storeがクリアされていることを確認
    const updatedList = store.get(pitchListAtom);
    expect(updatedList.length).toBe(0);
  });
});
