import { render, screen, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { FeedbackTypeSelector } from "@/components/feature/FeedbackTypeSelector";
import { feedbackTypeAtom } from "@/lib/store/feedbackAtoms";
import { fireIonChange } from "./helpers/ionic";

describe("FeedbackTypeSelector", () => {
    const renderWithStore = () => {
        const store = createStore();
        return {
            store,
            ...render(
                <Provider store={store}>
                    <FeedbackTypeSelector />
                </Provider>
            ),
        };
    };

    it("タイトルと説明、選択肢を表示する", async () => {
        const { container } = renderWithStore();
        expect(screen.getByText("フィードバック形式")).toBeInTheDocument();
        expect(
            screen.getByText("針が動くアナログメーター表示")
        ).toBeInTheDocument();

        await customElements.whenDefined("ion-select");
        const select = container.querySelector("ion-select");
        expect(select).not.toBeNull();
        expect((select as unknown as { label: string }).label).toBe(
            "フィードバック形式"
        );

        expect(screen.getByText("バー")).toBeInTheDocument();
        expect(screen.getByText("サークル")).toBeInTheDocument();
    });

    it("選択操作で feedbackTypeAtom を更新する", async () => {
        const { store, container } = renderWithStore();
        await customElements.whenDefined("ion-select");
        const select = container.querySelector("ion-select") as Element;

        act(() => {
            fireIonChange(select, { value: "bar" });
        });

        expect(store.get(feedbackTypeAtom)).toBe("bar");
        expect(
            screen.getByText("シンプルな横棒グラフ表示")
        ).toBeInTheDocument();
    });
});
