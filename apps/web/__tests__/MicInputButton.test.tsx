/**
 * MicInputButton のテスト。
 * 録音 → 構成音検出 → onDetect という非同期の入力経路と、
 * 検出できなかった場合・マイク権限が拒否された場合の分岐を確認する。
 */

import { vi } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { MicInputButton } from "@/components/feature/MicInputButton";
import { a4FreqAtom } from "@/lib/store/audioSettingsAtoms";
import type { DetectedNoteEvent } from "@chordlens/core/adapters/noteDetection";

// vi.mock はファイル冒頭へホイストされるため、ファクトリが参照する値も
// vi.hoisted で巻き上げる
const DETECTOR_SAMPLE_RATE = 22050;
const mocks = vi.hoisted(() => ({
    detectNotes: vi.fn(),
    createNoteDetector: vi.fn(),
    recordMonoAudio: vi.fn(),
}));

// 検出器は差し替え、集約オプション (BATCH_ESTIMATION_OPTIONS) は実物を使う
vi.mock("@/lib/audio/noteDetectorFactory", async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import("@/lib/audio/noteDetectorFactory")
        >();
    return {
        ...actual,
        createNoteDetector: (...args: unknown[]) => {
            mocks.createNoteDetector(...args);
            return {
                requiredSampleRate: 22050,
                detectNotes: (...detectArgs: unknown[]) =>
                    mocks.detectNotes(...detectArgs),
            };
        },
    };
});

// MediaRecorder / decodeAudioData は jsdom にないため録音そのものを差し替える
vi.mock("@/lib/audio/recordMonoAudio", () => ({
    recordMonoAudio: (...args: unknown[]) => mocks.recordMonoAudio(...args),
}));

describe("MicInputButton", () => {
    /** 指定の MIDI ノートが 1 秒続いたことにする検出イベント */
    const sustainedNote = (midiNote: number): DetectedNoteEvent[] =>
        Array.from({ length: 4 }, (_, i) => ({
            midiNote,
            startTimeSeconds: i * 0.25,
            durationSeconds: 0.25,
            amplitude: 0.8,
        }));

    const renderButton = (onDetect = vi.fn()) => {
        const store = createStore();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        render(<MicInputButton onDetect={onDetect} recordDurationMs={10} />, {
            wrapper,
        });
        return { onDetect, store };
    };

    const clickMic = async () => {
        await act(async () => {
            fireEvent.click(screen.getByLabelText("マイクで入力"));
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.recordMonoAudio.mockResolvedValue(new Float32Array(22050));
        mocks.detectNotes.mockResolvedValue([]);
    });

    it("検出した音を onDetect に渡す", async () => {
        mocks.detectNotes.mockResolvedValue(sustainedNote(69)); // A4
        const { onDetect } = renderButton();

        await clickMic();

        await waitFor(() => {
            expect(onDetect).toHaveBeenCalledTimes(1);
        });
        expect(onDetect).toHaveBeenCalledWith(
            expect.objectContaining({
                pitchName: "A",
                octaveNum: 4,
                // 単音入力なので根音扱いにはしない
                isRoot: false,
            })
        );
        // 録音は検出器の要求サンプルレートで行う
        expect(mocks.recordMonoAudio).toHaveBeenCalledWith(
            expect.objectContaining({ targetSampleRate: DETECTOR_SAMPLE_RATE })
        );
    });

    it("音を検出できなければ onDetect を呼ばない", async () => {
        mocks.detectNotes.mockResolvedValue([]);
        const { onDetect } = renderButton();

        await clickMic();

        await waitFor(() => {
            expect(mocks.detectNotes).toHaveBeenCalled();
        });
        expect(onDetect).not.toHaveBeenCalled();
        // 処理が終わればもう一度試せる
        await customElements.whenDefined("ion-button");
        await waitFor(() => {
            expect(screen.getByLabelText("マイクで入力")).not.toHaveAttribute(
                "disabled"
            );
        });
    });

    it("マイク権限が拒否されたら解析まで進まず、ボタンは再び押せる", async () => {
        const notAllowed = new Error("Permission denied");
        notAllowed.name = "NotAllowedError";
        mocks.recordMonoAudio.mockRejectedValue(notAllowed);
        const { onDetect } = renderButton();

        await clickMic();

        await waitFor(() => {
            expect(mocks.recordMonoAudio).toHaveBeenCalled();
        });
        expect(mocks.detectNotes).not.toHaveBeenCalled();
        expect(onDetect).not.toHaveBeenCalled();
        await customElements.whenDefined("ion-button");
        await waitFor(() => {
            expect(screen.getByLabelText("マイクで入力")).not.toHaveAttribute(
                "disabled"
            );
        });
    });

    it("A4 設定を検出器に渡す", async () => {
        mocks.detectNotes.mockResolvedValue(sustainedNote(69));
        const { store } = renderButton();
        await act(async () => {
            store.set(a4FreqAtom, 440);
        });

        await clickMic();

        await waitFor(() => {
            expect(mocks.createNoteDetector).toHaveBeenCalledWith({
                a4Freq: 440,
            });
        });
    });
});
