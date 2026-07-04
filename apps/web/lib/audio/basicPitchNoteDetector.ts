/**
 * BasicPitchNoteDetector - @spotify/basic-pitch による NoteDetector 実装
 *
 * TensorFlow.js ベースの basic-pitch モデルで、モノラル音声バッファから
 * 構成音 (MIDI ノートイベント) を推定する。
 *
 * - モデル (model.json + 重み) は vite-plugin-static-copy で
 *   /models/basic-pitch/ に配信される (vite.config.ts 参照)
 * - ライブラリ (@tensorflow/tfjs 込みで数百 KB gzip) は初回検出時に
 *   dynamic import で遅延ロードする
 */

import type {
    DetectedNoteEvent,
    NoteDetector,
} from "@chordlens/core/adapters/noteDetection";

/** basic-pitch モデルの要求サンプルレート (Hz) */
export const BASIC_PITCH_SAMPLE_RATE = 22050;

const MODEL_URL = "/models/basic-pitch/model.json";

/**
 * outputToNotesPoly の閾値。
 * モデルのフレームレートは約 86 fps (22050 / 256) のため、
 * minNoteLengthFrames = 11 は約 128ms に相当する。
 */
const ONSET_THRESHOLD = 0.4;
const FRAME_THRESHOLD = 0.3;
const MIN_NOTE_LENGTH_FRAMES = 11;

type BasicPitchModule = typeof import("@spotify/basic-pitch");

interface LoadedBasicPitch {
    module: BasicPitchModule;
    basicPitch: InstanceType<BasicPitchModule["BasicPitch"]>;
}

let loadPromise: Promise<LoadedBasicPitch> | null = null;

/** ライブラリとモデルを遅延ロードする (シングルトン) */
function loadBasicPitch(): Promise<LoadedBasicPitch> {
    if (!loadPromise) {
        loadPromise = import("@spotify/basic-pitch")
            .then((module) => ({
                module,
                basicPitch: new module.BasicPitch(MODEL_URL),
            }))
            .catch((err) => {
                // 失敗時は次回呼び出しで再試行できるようにする
                loadPromise = null;
                throw err;
            });
    }
    return loadPromise;
}

export class BasicPitchNoteDetector implements NoteDetector {
    readonly requiredSampleRate = BASIC_PITCH_SAMPLE_RATE;

    async detectNotes(monoAudio: Float32Array): Promise<DetectedNoteEvent[]> {
        const { module, basicPitch } = await loadBasicPitch();

        const frames: number[][] = [];
        const onsets: number[][] = [];
        await basicPitch.evaluateModel(
            monoAudio,
            (frameChunk, onsetChunk) => {
                frames.push(...frameChunk);
                onsets.push(...onsetChunk);
            },
            () => {
                // 進捗表示は不要
            }
        );

        const noteEvents = module.noteFramesToTime(
            module.outputToNotesPoly(
                frames,
                onsets,
                ONSET_THRESHOLD,
                FRAME_THRESHOLD,
                MIN_NOTE_LENGTH_FRAMES
            )
        );

        return noteEvents.map((event) => ({
            midiNote: event.pitchMidi,
            startTimeSeconds: event.startTimeSeconds,
            durationSeconds: event.durationSeconds,
            amplitude: event.amplitude,
        }));
    }
}
