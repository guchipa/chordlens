import { vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { useChordFollow } from "@/lib/hooks/useChordFollow";
import { pitchListAtom } from "@/lib/store/pitchListAtoms";
import {
    chordFollowEnabledAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
} from "@/lib/store/chordDetectionAtoms";
import type { DetectedNoteEvent } from "@chordlens/core/adapters/noteDetection";

// vi.mock はファイル冒頭へホイストされるため、ファクトリが参照する値も
// vi.hoisted で巻き上げる (通常の const だと初期化前に評価されうる)
const CAPTURE_SAMPLE_RATE = 22050;
const mocks = vi.hoisted(() => ({
    detectNotes: vi.fn(),
    createNoteDetector: vi.fn(),
    captureDispose: vi.fn(),
    captureAttach: vi.fn(),
    attachRejection: null as Error | null,
    onChunk: null as ((chunk: Float32Array) => void) | null,
}));

// 構成音検出をモックする
vi.mock("@/lib/audio/noteDetectorFactory", () => ({
    createNoteDetector: (...args: unknown[]) => {
        mocks.createNoteDetector(...args);
        return {
            requiredSampleRate: 22050,
            detectNotes: (...detectArgs: unknown[]) =>
                mocks.detectNotes(...detectArgs),
        };
    },
    BATCH_ESTIMATION_OPTIONS: {},
}));

// AudioWorklet ベースの PCM キャプチャをモックする (jsdom に実装がない)
vi.mock("@/lib/audio/pcmCapture", () => ({
    StreamingPcmCapture: {
        attach: (target: unknown, onChunk: (chunk: Float32Array) => void) => {
            mocks.captureAttach(target, onChunk);
            if (mocks.attachRejection) {
                return Promise.reject(mocks.attachRejection);
            }
            mocks.onChunk = onChunk;
            return Promise.resolve({
                sampleRate: 22050,
                dispose: mocks.captureDispose,
            });
        },
    },
}));

describe("useChordFollow", () => {
    // StreamingChordTracker のフレーム長 (0.25 秒 @22050Hz)
    const FRAME_LENGTH = Math.floor(0.25 * CAPTURE_SAMPLE_RATE);

    /** 1 フレームぶんの検出イベント */
    const frameNote = (midiNote: number): DetectedNoteEvent => ({
        midiNote,
        startTimeSeconds: 0,
        durationSeconds: 0.25,
        amplitude: 0.8,
    });

    /** 1 フレームぶんの PCM チャンクを注入する */
    const injectFrame = async () => {
        await act(async () => {
            mocks.onChunk!(new Float32Array(FRAME_LENGTH));
            // poll の完了を待つ
            await Promise.resolve();
        });
    };

    /**
     * チューナー本体 (useAudioAnalysis) が公開する音声グラフの代わり。
     * useChordFollow はここから PCM を分岐する
     */
    const createAudioNodesRef = () => ({
        current: {
            audioContext: { sampleRate: CAPTURE_SAMPLE_RATE },
            mediaStreamSource: {},
        },
    }) as unknown as Parameters<typeof useChordFollow>[0]["audioNodesRef"];

    const setup = () => {
        const store = createStore();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        // ref は再レンダーを跨いで同一であること (毎回作ると effect が回り直す)
        const audioNodesRef = createAudioNodesRef();
        renderHook(() => useChordFollow({ audioNodesRef }), { wrapper });
        return store;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.onChunk = null;
        mocks.attachRejection = null;
        mocks.detectNotes.mockResolvedValue([]);
    });

    it("追従 ON でストリーミング解析を開始する", async () => {
        const store = setup();

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(mocks.captureAttach).toHaveBeenCalled();
        });
        // AudioContext のネイティブレートと A4 設定で検出器を生成する
        expect(mocks.createNoteDetector).toHaveBeenCalledWith({
            a4Freq: 442,
            sampleRate: CAPTURE_SAMPLE_RATE,
        });

        act(() => {
            store.set(chordFollowEnabledAtom, false);
        });
        await waitFor(() => {
            expect(store.get(chordFollowStatusAtom)).toBe("idle");
        });
    });

    it("持続する和音を確定して pitchList に反映し、OFF で停止する", async () => {
        mocks.detectNotes.mockResolvedValue([
            frameNote(60),
            frameNote(64),
            frameNote(67),
        ]);
        const store = setup();

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(mocks.onChunk).not.toBeNull();
        });

        // フレーム1: 発音 0.25s < 0.4 で未確定、フレーム2: 初回推定、
        // フレーム3: 2 回一致 → 確定
        await injectFrame();
        await injectFrame();
        await injectFrame();

        await waitFor(() => {
            const pitchList = store.get(pitchListAtom);
            expect(pitchList.map((p) => `${p.pitchName}${p.octaveNum}`)).toEqual(
                ["C4", "E4", "G4"]
            );
        });
        expect(store.get(pitchListAtom).find((p) => p.isRoot)?.pitchName).toBe(
            "C"
        );
        expect(store.get(chordFollowStatusAtom)).toBe("tracking");

        act(() => {
            store.set(chordFollowEnabledAtom, false);
        });

        await waitFor(() => {
            expect(store.get(chordFollowStatusAtom)).toBe("idle");
        });
        expect(mocks.captureDispose).toHaveBeenCalled();
    });

    it("無音フレームでは listening 表示のまま pitchList を保持する", async () => {
        mocks.detectNotes.mockResolvedValue([]);
        const store = setup();
        const initial = store.get(pitchListAtom);

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(mocks.onChunk).not.toBeNull();
        });
        await injectFrame();
        await injectFrame();

        await waitFor(() => {
            expect(mocks.detectNotes).toHaveBeenCalled();
        });
        expect(store.get(chordFollowStatusAtom)).toBe("listening");
        expect(store.get(pitchListAtom)).toEqual(initial);

        act(() => {
            store.set(chordFollowEnabledAtom, false);
        });
    });

    it("解析が実行されていない間 (active=false) はトグル ON でも推定しない", async () => {
        mocks.detectNotes.mockResolvedValue([
            frameNote(60),
            frameNote(64),
            frameNote(67),
        ]);
        const store = createStore();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        const audioNodesRef = createAudioNodesRef();
        const { rerender } = renderHook(
            ({ active }: { active: boolean }) =>
                useChordFollow({ active, audioNodesRef }),
            { wrapper, initialProps: { active: false } }
        );

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        // 少し待ってもキャプチャは始まらない
        await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
        expect(mocks.captureAttach).not.toHaveBeenCalled();
        expect(store.get(chordFollowStatusAtom)).toBe("idle");

        // 解析開始 (active=true) で追従が始まる
        rerender({ active: true });
        await waitFor(() => {
            expect(mocks.captureAttach).toHaveBeenCalled();
        });

        // 解析停止 (active=false) で追従も止まる
        rerender({ active: false });
        await waitFor(() => {
            expect(store.get(chordFollowStatusAtom)).toBe("idle");
        });
        expect(mocks.captureDispose).toHaveBeenCalled();
    });

    it("チューナーが解析中でなければ (グラフなし) 何もしない", async () => {
        const store = createStore();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        const emptyRef = { current: null } as Parameters<
            typeof useChordFollow
        >[0]["audioNodesRef"];
        renderHook(() => useChordFollow({ audioNodesRef: emptyRef }), {
            wrapper,
        });

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
        expect(mocks.captureAttach).not.toHaveBeenCalled();
        expect(store.get(chordFollowStatusAtom)).toBe("idle");
    });

    it("キャプチャの初期化に失敗したらエラーを設定して追従を OFF にする", async () => {
        // マイク権限はチューナー本体が握るため、ここで起きうるのは
        // worklet の読み込み失敗など
        mocks.attachRejection = new Error("failed to load worklet");
        const store = setup();

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(store.get(chordFollowErrorAtom)).toContain(
                "構成音の検出に失敗しました"
            );
        });
        expect(store.get(chordFollowEnabledAtom)).toBe(false);
        expect(store.get(chordFollowStatusAtom)).toBe("idle");
    });
});
