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

// 構成音検出をモックする
const mockDetectNotes = vi.fn();
const mockCreateNoteDetector = vi.fn();
vi.mock("@/lib/audio/noteDetectorFactory", () => ({
    createNoteDetector: (...args: unknown[]) => {
        mockCreateNoteDetector(...args);
        return {
            requiredSampleRate: 22050,
            detectNotes: (...detectArgs: unknown[]) =>
                mockDetectNotes(...detectArgs),
        };
    },
    BATCH_ESTIMATION_OPTIONS: {},
}));

// AudioWorklet ベースの PCM キャプチャをモックする (jsdom に実装がない)
const CAPTURE_SAMPLE_RATE = 22050;
let capturedOnChunk: ((chunk: Float32Array) => void) | null = null;
const mockCaptureDispose = vi.fn();
const mockCaptureCreate = vi.fn();
vi.mock("@/lib/audio/pcmCapture", () => ({
    StreamingPcmCapture: {
        create: (stream: unknown, onChunk: (chunk: Float32Array) => void) => {
            mockCaptureCreate(stream, onChunk);
            capturedOnChunk = onChunk;
            return Promise.resolve({
                sampleRate: CAPTURE_SAMPLE_RATE,
                dispose: mockCaptureDispose,
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
            capturedOnChunk!(new Float32Array(FRAME_LENGTH));
            // poll の完了を待つ
            await Promise.resolve();
        });
    };

    const setup = () => {
        const store = createStore();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        renderHook(() => useChordFollow(), { wrapper });
        return store;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        capturedOnChunk = null;
        mockDetectNotes.mockResolvedValue([]);
    });

    it("追従 ON でストリーミング解析を開始する", async () => {
        const store = setup();

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(mockCaptureCreate).toHaveBeenCalled();
        });
        // AudioContext のネイティブレートと A4 設定で検出器を生成する
        expect(mockCreateNoteDetector).toHaveBeenCalledWith({
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
        mockDetectNotes.mockResolvedValue([
            frameNote(60),
            frameNote(64),
            frameNote(67),
        ]);
        const store = setup();

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(capturedOnChunk).not.toBeNull();
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
        expect(mockCaptureDispose).toHaveBeenCalled();
    });

    it("無音フレームでは listening 表示のまま pitchList を保持する", async () => {
        mockDetectNotes.mockResolvedValue([]);
        const store = setup();
        const initial = store.get(pitchListAtom);

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(capturedOnChunk).not.toBeNull();
        });
        await injectFrame();
        await injectFrame();

        await waitFor(() => {
            expect(mockDetectNotes).toHaveBeenCalled();
        });
        expect(store.get(chordFollowStatusAtom)).toBe("listening");
        expect(store.get(pitchListAtom)).toEqual(initial);

        act(() => {
            store.set(chordFollowEnabledAtom, false);
        });
    });

    it("解析が実行されていない間 (active=false) はトグル ON でも推定しない", async () => {
        mockDetectNotes.mockResolvedValue([
            frameNote(60),
            frameNote(64),
            frameNote(67),
        ]);
        const store = createStore();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        const { rerender } = renderHook(
            ({ active }: { active: boolean }) => useChordFollow({ active }),
            { wrapper, initialProps: { active: false } }
        );

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        // 少し待ってもキャプチャは始まらない
        await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
        expect(mockCaptureCreate).not.toHaveBeenCalled();
        expect(store.get(chordFollowStatusAtom)).toBe("idle");

        // 解析開始 (active=true) で追従が始まる
        rerender({ active: true });
        await waitFor(() => {
            expect(mockCaptureCreate).toHaveBeenCalled();
        });

        // 解析停止 (active=false) で追従も止まる
        rerender({ active: false });
        await waitFor(() => {
            expect(store.get(chordFollowStatusAtom)).toBe("idle");
        });
        expect(mockCaptureDispose).toHaveBeenCalled();
    });

    it("マイクアクセス拒否時はエラーを設定して追従を OFF にする", async () => {
        const notAllowed = new Error("Permission denied");
        notAllowed.name = "NotAllowedError";
        vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
            notAllowed
        );
        const store = setup();

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(store.get(chordFollowErrorAtom)).toContain(
                "マイクへのアクセスが拒否されました"
            );
        });
        expect(store.get(chordFollowEnabledAtom)).toBe(false);
        expect(store.get(chordFollowStatusAtom)).toBe("idle");
    });
});
