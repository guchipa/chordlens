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
 * - モデルの取得元は options.model で差し替えられる。オフライン評価 CLI は
 *   ここにローカルから読んだ GraphModel を渡し、ブラウザと同じ検出実装を
 *   Node で走らせる (apps/web/scripts/lib/basicPitchNodeModel.ts)
 */

import type { GraphModel } from "@tensorflow/tfjs";

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

/** ライブラリとモデルを遅延ロードする */
function loadBasicPitch(
    model: BasicPitchModelSource
): Promise<LoadedBasicPitch> {
    return import("@spotify/basic-pitch").then((module) => ({
        module,
        basicPitch: new module.BasicPitch(model),
    }));
}

/** 既定 (ブラウザ) 経路のロードはシングルトンにする */
function loadDefaultBasicPitch(): Promise<LoadedBasicPitch> {
    if (!loadPromise) {
        loadPromise = loadBasicPitch(MODEL_URL).catch((err: unknown) => {
            // 失敗時は次回呼び出しで再試行できるようにする
            loadPromise = null;
            throw err;
        });
    }
    return loadPromise;
}

/**
 * モデルの取得元。URL 文字列なら BasicPitch 側が fetch し、
 * GraphModel の Promise ならそれをそのまま使う
 */
export type BasicPitchModelSource = string | Promise<GraphModel>;

export interface BasicPitchNoteDetectorOptions {
    /**
     * モデルの取得元。省略時はブラウザから MODEL_URL を fetch する。
     * Node からのオフライン評価では fetch("/models/...") が使えないため、
     * ローカルから読んだ GraphModel を渡す
     */
    model?: BasicPitchModelSource;
}

export class BasicPitchNoteDetector implements NoteDetector {
    readonly requiredSampleRate = BASIC_PITCH_SAMPLE_RATE;

    private readonly modelSource?: BasicPitchModelSource;
    private loaded: Promise<LoadedBasicPitch> | null = null;

    constructor(options: BasicPitchNoteDetectorOptions = {}) {
        this.modelSource = options.model;
    }

    /** 初回の detectNotes まで読み込みを遅延させる */
    private load(): Promise<LoadedBasicPitch> {
        if (this.modelSource === undefined) {
            return loadDefaultBasicPitch();
        }
        if (!this.loaded) {
            this.loaded = loadBasicPitch(this.modelSource).catch(
                (err: unknown) => {
                    // 失敗時は次回呼び出しで再試行できるようにする
                    this.loaded = null;
                    throw err;
                }
            );
        }
        return this.loaded;
    }

    async detectNotes(monoAudio: Float32Array): Promise<DetectedNoteEvent[]> {
        const { module, basicPitch } = await this.load();

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
