import { render, screen, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { SettingsForm } from "@/components/feature/SettingsForm";
import {
    pitchAlgorithmAtom,
    a4FreqAtom,
    sensitivityAtom,
    holdEnabledAtom,
} from "@/lib/store/audioSettingsAtoms";
import { fireIonChange, fireIonInput } from "./helpers/ionic";

describe("SettingsForm", () => {
    beforeEach(() => {
        // atomWithStorage は実 localStorage を参照するため、他テストでの
        // 書き込み (例: pitchAlgorithm を "swipe" にする) が残ると
        // 条件付きレンダー (バンドパス幅欄の有無) がテスト間で変わってしまう
        localStorage.clear();
    });

    const findInputByLabel = (container: HTMLElement, label: string) =>
        Array.from(container.querySelectorAll("ion-input")).find(
            (el) => (el as unknown as { label: string }).label === label
        ) as Element;

    const renderWithStore = () => {
        const store = createStore();
        return {
            store,
            ...render(
                <Provider store={store}>
                    <SettingsForm />
                </Provider>
            ),
        };
    };

    it("主要なラベルを表示する", async () => {
        const { container } = renderWithStore();
        expect(screen.getByText("設定")).toBeInTheDocument();

        await customElements.whenDefined("ion-select");
        await customElements.whenDefined("ion-input");
        await customElements.whenDefined("ion-range");

        const selects = container.querySelectorAll("ion-select");
        const inputs = container.querySelectorAll("ion-input");
        const range = container.querySelector("ion-range");

        expect((selects[0] as unknown as { label: string }).label).toBe(
            "アルゴリズム"
        );
        expect((inputs[0] as unknown as { label: string }).label).toBe(
            "音程評価範囲 (セント)"
        );
        expect((inputs[1] as unknown as { label: string }).label).toBe(
            "A4周波数 (Hz)"
        );
        expect(range).toHaveAttribute("aria-label", "音量感度");

        // ion-label のスロット内容は Stencil の初回レンダーが非同期のため
        // 即時の getByText だとまだ反映されていないことがある。findByText で待つ
        expect(await screen.findByText("高度な設定")).toBeInTheDocument();
    });

    it("アルゴリズム選択で pitchAlgorithmAtom を更新する", async () => {
        const { store, container } = renderWithStore();
        await customElements.whenDefined("ion-select");
        const algorithmSelect = container.querySelectorAll("ion-select")[0];

        act(() => {
            fireIonChange(algorithmSelect, { value: "swipe" });
        });

        expect(store.get(pitchAlgorithmAtom)).toBe("swipe");
    });

    it("A4 周波数入力で a4FreqAtom を更新する", async () => {
        const { store, container } = renderWithStore();
        await customElements.whenDefined("ion-input");
        const a4Input = findInputByLabel(container, "A4周波数 (Hz)");

        act(() => {
            fireIonInput(a4Input, "440");
        });

        expect(store.get(a4FreqAtom)).toBe(440);
    });

    it("感度スライダー操作で sensitivityAtom を更新する", async () => {
        const { store, container } = renderWithStore();
        await customElements.whenDefined("ion-range");
        const range = container.querySelector("ion-range") as Element;

        act(() => {
            fireIonChange(range, { value: 75 });
        });

        expect(store.get(sensitivityAtom)).toBe(75);
    });

    it("表示保持トグルで holdEnabledAtom を更新する", async () => {
        const { store, container } = renderWithStore();
        await customElements.whenDefined("ion-toggle");
        const holdToggle = container.querySelectorAll("ion-toggle")[0];

        act(() => {
            fireIonChange(holdToggle, { checked: true });
        });

        expect(store.get(holdEnabledAtom)).toBe(true);
    });
});
