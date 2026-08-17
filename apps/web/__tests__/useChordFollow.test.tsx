import { vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { useChordFollow } from "@/lib/hooks/useChordFollow";
import { pitchListAtom } from "@/lib/store/pitchListAtoms";
import {
    chordFollowEnabledAtom,
    chordDetectionAlgorithmAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
} from "@/lib/store/chordDetectionAtoms";
import type { DetectedNoteEvent } from "@chordlens/core/adapters/noteDetection";
import {
    CHORD_DETECTION_ALGORITHM_DEFAULT,
    type ChordDetectionAlgorithm,
} from "@chordlens/core/constants";

// 録音・basic-pitch 推論・音量ゲートをモックする
const mockRecordMonoAudio = vi.fn();
vi.mock("@/lib/audio/recordMonoAudio", () => ({
    recordMonoAudio: (...args: unknown[]) => mockRecordMonoAudio(...args),
}));

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
    supportsStreaming: (algorithm: string) => algorithm === "pitchplease",
    recommendedEstimationOptions: (algorithm: string) =>
        algorithm === "pitchplease" ? { scoreMode: "medianSalience" } : {},
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

const mockWaitForSound = vi.fn();
const mockDispose = vi.fn();
vi.mock("@/lib/audio/soundLevelMonitor", () => ({
    SOUND_RMS_THRESHOLD: 0.01,
    SoundLevelMonitor: class {
        waitForSound(...args: unknown[]) {
            return mockWaitForSound(...args);
        }
        dispose = mockDispose;
    },
}));

/** テスト用ノートイベント */
function note(midiNote: number): DetectedNoteEvent {
    return { midiNote, startTimeSeconds: 0, durationSeconds: 1, amplitude: 0.8 };
}

describe("useChordFollow", () => {
    /**
     * 検出アルゴリズムは明示的に指定する。
     * どちらの経路 (バッチ / ストリーミング) を検証しているかを、
     * アプリの既定値 (CHORD_DETECTION_ALGORITHM_DEFAULT) に依存させないため
     */
    const setup = (algorithm: ChordDetectionAlgorithm = "basicpitch") => {
        const store = createStore();
        store.set(chordDetectionAlgorithmAtom, algorithm);
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        renderHook(() => useChordFollow({ followIntervalMs: 10 }), { wrapper });
        return store;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        capturedOnChunk = null;
        mockRecordMonoAudio.mockResolvedValue(new Float32Array(22050));
        mockWaitForSound.mockResolvedValue(true);
        mockDetectNotes.mockResolvedValue([]);
    });

    it("既定のアルゴリズムではストリーミング経路に乗る", async () => {
        // 既定は pitchplease。バッチ経路 (録音 + 音量ゲート) は使わない
        const store = createStore();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        renderHook(() => useChordFollow({ followIntervalMs: 10 }), { wrapper });

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(mockCaptureCreate).toHaveBeenCalled();
        });
        expect(mockCreateNoteDetector).toHaveBeenCalledWith(
            CHORD_DETECTION_ALGORITHM_DEFAULT,
            expect.anything()
        );
        expect(mockRecordMonoAudio).not.toHaveBeenCalled();
        expect(mockWaitForSound).not.toHaveBeenCalled();

        act(() => {
            store.set(chordFollowEnabledAtom, false);
        });
        await waitFor(() => {
            expect(store.get(chordFollowStatusAtom)).toBe("idle");
        });
    });

    it("追従 ON で検出した和音 (C-E-G) を pitchList に反映し、OFF で停止する", async () => {
        mockDetectNotes.mockResolvedValue([note(60), note(64), note(67)]);
        const store = setup();

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            const pitchList = store.get(pitchListAtom);
            expect(
                pitchList.map((p) => `${p.pitchName}${p.octaveNum}`)
            ).toEqual(["C4", "E4", "G4"]);
        });
        expect(store.get(pitchListAtom).find((p) => p.isRoot)?.pitchName).toBe(
            "C"
        );
        // 指定したアルゴリズム (basicpitch) と A4 設定で検出器を生成する
        expect(mockCreateNoteDetector).toHaveBeenCalledWith("basicpitch", {
            a4Freq: 442,
        });

        act(() => {
            store.set(chordFollowEnabledAtom, false);
        });

        await waitFor(() => {
            expect(store.get(chordFollowStatusAtom)).toBe("idle");
        });
        expect(mockDispose).toHaveBeenCalled();
    });

    it("無音の間 (音量ゲート未通過) は録音・推定を行わない", async () => {
        // 無音をシミュレート: キャンセルされるまで待ち続け false を返す
        mockWaitForSound.mockImplementation(
            ({ isCancelled }: { isCancelled: () => boolean }) =>
                new Promise((resolve) => {
                    const timer = setInterval(() => {
                        if (isCancelled()) {
                            clearInterval(timer);
                            resolve(false);
                        }
                    }, 5);
                })
        );
        const store = setup();

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(store.get(chordFollowStatusAtom)).toBe("listening");
        });
        expect(mockWaitForSound).toHaveBeenCalled();
        expect(mockRecordMonoAudio).not.toHaveBeenCalled();
        expect(mockDetectNotes).not.toHaveBeenCalled();

        act(() => {
            store.set(chordFollowEnabledAtom, false);
        });

        await waitFor(() => {
            expect(store.get(chordFollowStatusAtom)).toBe("idle");
        });
        expect(mockRecordMonoAudio).not.toHaveBeenCalled();
    });

    it("何も検出できなかった場合は既存の pitchList を保持する", async () => {
        mockDetectNotes.mockResolvedValue([]);
        const store = setup();
        const initial = store.get(pitchListAtom);

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        await waitFor(() => {
            expect(mockDetectNotes).toHaveBeenCalled();
        });
        expect(store.get(pitchListAtom)).toEqual(initial);

        act(() => {
            store.set(chordFollowEnabledAtom, false);
        });
    });

    it("解析が実行されていない間 (active=false) はトグル ON でも推定しない", async () => {
        mockDetectNotes.mockResolvedValue([note(60), note(64), note(67)]);
        const store = createStore();
        store.set(chordDetectionAlgorithmAtom, "basicpitch");
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        const { rerender } = renderHook(
            ({ active }: { active: boolean }) =>
                useChordFollow({ followIntervalMs: 10, active }),
            { wrapper, initialProps: { active: false } }
        );

        act(() => {
            store.set(chordFollowEnabledAtom, true);
        });

        // 少し待っても検出サイクルは動かない
        await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
        expect(mockWaitForSound).not.toHaveBeenCalled();
        expect(mockRecordMonoAudio).not.toHaveBeenCalled();
        expect(store.get(chordFollowStatusAtom)).toBe("idle");

        // 解析開始 (active=true) で追従が始まる
        rerender({ active: true });
        await waitFor(() => {
            expect(mockDetectNotes).toHaveBeenCalled();
        });

        // 解析停止 (active=false) で追従も止まる
        rerender({ active: false });
        await waitFor(() => {
            expect(store.get(chordFollowStatusAtom)).toBe("idle");
        });
        expect(mockDispose).toHaveBeenCalled();
    });

    describe("ストリーミング方式 (pitchplease)", () => {
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

        it("持続する和音を確定して pitchList に反映し、OFF で停止する", async () => {
            mockDetectNotes.mockResolvedValue([
                frameNote(60),
                frameNote(64),
                frameNote(67),
            ]);
            const store = setup("pitchplease");

            act(() => {
                store.set(chordFollowEnabledAtom, true);
            });

            await waitFor(() => {
                expect(capturedOnChunk).not.toBeNull();
            });
            // AudioContext のネイティブレートで検出器を生成する
            expect(mockCreateNoteDetector).toHaveBeenCalledWith("pitchplease", {
                a4Freq: 442,
                sampleRate: CAPTURE_SAMPLE_RATE,
            });
            // 録音ベースのバッチ経路は使わない
            expect(mockRecordMonoAudio).not.toHaveBeenCalled();
            expect(mockWaitForSound).not.toHaveBeenCalled();

            // フレーム1: 発音 0.25s < 0.4 で未確定、フレーム2: 初回推定、
            // フレーム3: 2 回一致 → 確定
            await injectFrame();
            await injectFrame();
            await injectFrame();

            await waitFor(() => {
                const pitchList = store.get(pitchListAtom);
                expect(
                    pitchList.map((p) => `${p.pitchName}${p.octaveNum}`)
                ).toEqual(["C4", "E4", "G4"]);
            });
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
            const store = setup("pitchplease");
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
