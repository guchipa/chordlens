import { render, screen, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { ChordFollowToggle } from "@/components/feature/ChordFollowToggle";
import {
    chordFollowEnabledAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
} from "@/lib/store/chordDetectionAtoms";
import { fireIonChange } from "./helpers/ionic";

describe("ChordFollowToggle", () => {
    const renderWithStore = (setupStore?: (store: ReturnType<typeof createStore>) => void) => {
        const store = createStore();
        setupStore?.(store);
        return {
            store,
            ...render(
                <Provider store={store}>
                    <ChordFollowToggle />
                </Provider>
            ),
        };
    };

    const getToggle = (container: HTMLElement) =>
        container.querySelector("ion-toggle") as Element;

    it("タイトルとトグルを表示する", async () => {
        const { container } = renderWithStore();
        expect(screen.getByText("構成音の自動検出")).toBeInTheDocument();
        expect(screen.getByText("自動追従モード")).toBeInTheDocument();

        await customElements.whenDefined("ion-toggle");
        const toggle = getToggle(container);
        expect(toggle).not.toBeNull();
        expect(toggle).not.toHaveAttribute("checked");
    });

    it("スイッチ操作で chordFollowEnabledAtom を切り替える", async () => {
        const { store, container } = renderWithStore();
        await customElements.whenDefined("ion-toggle");
        const toggle = getToggle(container);

        fireIonChange(toggle, { checked: true });
        expect(store.get(chordFollowEnabledAtom)).toBe(true);

        fireIonChange(toggle, { checked: false });
        expect(store.get(chordFollowEnabledAtom)).toBe(false);
    });

    it("追従中はステータスを表示する", () => {
        renderWithStore((store) => {
            store.set(chordFollowEnabledAtom, true);
            store.set(chordFollowStatusAtom, "listening");
        });

        expect(screen.getByText("楽器音を待機中...")).toBeInTheDocument();
    });

    it("追従中に和音を検出するとステータスが変わる", () => {
        renderWithStore((store) => {
            store.set(chordFollowEnabledAtom, true);
            store.set(chordFollowStatusAtom, "tracking");
        });

        expect(screen.getByText("追従中...")).toBeInTheDocument();
    });

    it("エラーメッセージを表示する", () => {
        renderWithStore((store) => {
            store.set(chordFollowErrorAtom, "マイクが見つかりません。");
        });

        expect(screen.getByText("マイクが見つかりません。")).toBeInTheDocument();
    });

    it("スイッチ操作でエラー表示を消す", async () => {
        // 失敗時は useChordFollow がトグルを OFF に戻すため、次のセッション
        // 開始時の setError(null) には到達しない。操作した時点で消えること
        const { store, container } = renderWithStore((s) => {
            s.set(chordFollowErrorAtom, "マイクが見つかりません。");
        });

        await customElements.whenDefined("ion-toggle");
        act(() => {
            fireIonChange(getToggle(container), { checked: true });
        });

        expect(store.get(chordFollowErrorAtom)).toBeNull();
        expect(
            screen.queryByText("マイクが見つかりません。")
        ).not.toBeInTheDocument();
    });
});
