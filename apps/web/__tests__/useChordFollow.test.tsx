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
    const setup = () => {
        const store = createStore();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        renderHook(() => useChordFollow({ followIntervalMs: 10 }), { wrapper });
        return store;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockRecordMonoAudio.mockResolvedValue(new Float32Array(22050));
        mockWaitForSound.mockResolvedValue(true);
        mockDetectNotes.mockResolvedValue([]);
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
        // デフォルトのアルゴリズム (basicpitch) と A4 設定で検出器を生成する
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
