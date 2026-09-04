import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { ChordFollowToggle } from "@/components/feature/ChordFollowToggle";
import {
    chordFollowEnabledAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
} from "@/lib/store/chordDetectionAtoms";

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

    it("タイトルとトグルを表示する", () => {
        renderWithStore();
        expect(screen.getByText("構成音の自動検出")).toBeInTheDocument();
        expect(screen.getByText("自動追従モード")).toBeInTheDocument();
        expect(screen.getByRole("switch")).not.toBeChecked();
    });

    it("スイッチ操作で chordFollowEnabledAtom を切り替える", () => {
        const { store } = renderWithStore();

        fireEvent.click(screen.getByRole("switch"));
        expect(store.get(chordFollowEnabledAtom)).toBe(true);

        fireEvent.click(screen.getByRole("switch"));
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

    it("スイッチ操作でエラー表示を消す", () => {
        // 失敗時は useChordFollow がトグルを OFF に戻すため、次のセッション
        // 開始時の setError(null) には到達しない。操作した時点で消えること
        const { store } = renderWithStore((s) => {
            s.set(chordFollowErrorAtom, "マイクが見つかりません。");
        });

        fireEvent.click(screen.getByRole("switch"));

        expect(store.get(chordFollowErrorAtom)).toBeNull();
        expect(
            screen.queryByText("マイクが見つかりません。")
        ).not.toBeInTheDocument();
    });
});
