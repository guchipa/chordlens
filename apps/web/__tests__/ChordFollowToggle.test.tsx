import { render, screen, fireEvent } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { ChordFollowToggle } from "@/components/feature/ChordFollowToggle";
import {
    chordFollowEnabledAtom,
    chordDetectionAlgorithmAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
} from "@/lib/store/chordDetectionAtoms";
import {
    CHORD_DETECTION_ALGORITHM_DESCRIPTIONS,
    CHORD_DETECTION_ALGORITHM_LABELS,
} from "@chordlens/core/constants";

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

    it("検出アルゴリズムの選択肢と説明を表示する", () => {
        renderWithStore((store) => {
            store.set(chordDetectionAlgorithmAtom, "pitchplease");
        });

        // ラベル文言そのものではなく定数と一致することを確認する
        expect(screen.getByText("検出アルゴリズム")).toBeInTheDocument();
        expect(
            screen.getByText(CHORD_DETECTION_ALGORITHM_LABELS.pitchplease)
        ).toBeInTheDocument();
        expect(
            screen.getByText(CHORD_DETECTION_ALGORITHM_DESCRIPTIONS.pitchplease)
        ).toBeInTheDocument();
    });

    it("エラーメッセージを表示する", () => {
        renderWithStore((store) => {
            store.set(chordFollowErrorAtom, "マイクが見つかりません。");
        });

        expect(screen.getByText("マイクが見つかりません。")).toBeInTheDocument();
    });
});
