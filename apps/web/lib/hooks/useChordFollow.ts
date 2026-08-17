/**
 * useChordFollow - 構成音の自動追従
 *
 * chordFollowEnabledAtom が ON かつ active (= チューナーの解析実行中) の間、
 * 選択中のアルゴリズムに応じた方式で追従する。
 *
 * ストリーミング方式 (pitchplease):
 *   AudioWorklet (StreamingPcmCapture) で生 PCM を連続取得し、
 *   StreamingChordTracker が 0.25 秒フレームごとに解析、
 *   直近 1 秒のスライディングウィンドウ + ヒステリシスで確定した和音を
 *   pitchListAtom へ反映する。体感レイテンシは 1 秒未満。
 *
 * バッチ方式 (basic-pitch):
 *   1. 音量ゲート: 入力の RMS が閾値を超えるまで待機 (無音時は推論しない)
 *   2. 録音: マイクから数秒間録音し 22050 Hz モノラルにデコード
 *   3. 推定: basic-pitch でノートイベントを推定し Pitch[] へ変換
 *   4. 反映: pitchListAtom へ即時反映 (和音が変わらなければ更新しない)
 *   (TFJS 推論が重く短フレームの逐次解析に向かないため従来方式のまま)
 *
 * トグル UI (SettingsDrawer 内) はドロワーを閉じるとアンマウントされるため、
 * このフックは常駐するコンポーネント (App) で呼び、状態は atom で共有する。
 */

import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { noteEventsToPitchList } from "@chordlens/core/audio_analysis/chordToneEstimation";
import { StreamingChordTracker } from "@chordlens/core/audio_analysis/streamingChordTracker";
import {
    applyDetectedPitchListAtom,
    a4FreqAtom,
    chordFollowEnabledAtom,
    chordDetectionAlgorithmAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
} from "@/lib/store";
import {
    createNoteDetector,
    supportsStreaming,
    recommendedEstimationOptions,
} from "@/lib/audio/noteDetectorFactory";
import { recordMonoAudio } from "@/lib/audio/recordMonoAudio";
import { StreamingPcmCapture } from "@/lib/audio/pcmCapture";
import {
    SoundLevelMonitor,
    SOUND_RMS_THRESHOLD,
} from "@/lib/audio/soundLevelMonitor";

export interface UseChordFollowOptions {
    /**
     * 追従ループを動かすか。チューナーの解析実行中 (isProcessing) を渡し、
     * 解析していない間はトグル ON でも推定を行わない
     */
    active?: boolean;
    /** バッチ方式: 1 回の検出で録音する時間 (ms) デフォルト: 3000 */
    recordDurationMs?: number;
    /** バッチ方式: 検出サイクル間の待機時間 (ms) デフォルト: 500 */
    followIntervalMs?: number;
    /** バッチ方式: 楽器音とみなす RMS 閾値 デフォルト: SOUND_RMS_THRESHOLD */
    rmsThreshold?: number;
}

/** getUserMedia / 解析まわりのエラーをユーザー向けメッセージに変換する */
function toErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        if (
            err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError"
        ) {
            return "マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。";
        }
        if (err.name === "NotFoundError") {
            return "マイクが見つかりません。マイクが接続されているか確認してください。";
        }
        return `構成音の検出に失敗しました: ${err.message}`;
    }
    return "構成音の検出中に予期せぬエラーが発生しました。";
}

export function useChordFollow(options: UseChordFollowOptions = {}): void {
    const {
        active = true,
        recordDurationMs = 3000,
        followIntervalMs = 500,
        rmsThreshold = SOUND_RMS_THRESHOLD,
    } = options;

    const enabled = useAtomValue(chordFollowEnabledAtom);
    const algorithm = useAtomValue(chordDetectionAlgorithmAtom);
    const a4Freq = useAtomValue(a4FreqAtom);
    const setEnabled = useSetAtom(chordFollowEnabledAtom);
    const setStatus = useSetAtom(chordFollowStatusAtom);
    const setError = useSetAtom(chordFollowErrorAtom);
    const applyDetectedPitchList = useSetAtom(applyDetectedPitchListAtom);

    useEffect(() => {
        if (!enabled || !active) {
            return;
        }

        const session: {
            cancelled: boolean;
            onCancel: (() => void) | null;
        } = { cancelled: false, onCancel: null };
        let stream: MediaStream | null = null;
        let monitor: SoundLevelMonitor | null = null;
        let capture: StreamingPcmCapture | null = null;

        const fail = (err: unknown) => {
            if (!session.cancelled) {
                setError(toErrorMessage(err));
                setEnabled(false);
            }
        };

        (async () => {
            setError(null);
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    },
                });
                if (session.cancelled) return;

                if (supportsStreaming(algorithm)) {
                    // ストリーミング方式: チャンク到着ごとに push + poll。
                    // poll は tracker 内で直列化されるため多重呼び出しでよい
                    let tracker: StreamingChordTracker | null = null;
                    capture = await StreamingPcmCapture.create(
                        stream,
                        (chunk) => {
                            if (session.cancelled || !tracker) return;
                            tracker.push(chunk);
                            tracker
                                .poll()
                                .then(({ silent, changed }) => {
                                    if (session.cancelled) return;
                                    setStatus(silent ? "listening" : "tracking");
                                    if (changed) {
                                        applyDetectedPitchList(changed);
                                    }
                                })
                                .catch(fail);
                        }
                    );
                    const detector = createNoteDetector(algorithm, {
                        a4Freq,
                        sampleRate: capture.sampleRate,
                    });
                    // streaming は legacy (durationAmplitude) のまま:
                    // 倍音残差の出現は呼吸・強弱と同じ 1〜2 秒スケールで自己相関し、
                    // 短い集約窓では medianSalience が機能しない (batch は複数呼吸
                    // サイクルを平均できるため機能する)。estimationOptions は
                    // 上書きせず StreamingChordTracker の既定 (STREAMING_CHORD_
                    // ESTIMATION_DEFAULTS) に委ねる
                    tracker = new StreamingChordTracker({
                        detector,
                        sampleRate: capture.sampleRate,
                    });
                    setStatus("listening");

                    // キャンセル (トグル OFF / アンマウント) まで維持する
                    await new Promise<void>((resolve) => {
                        session.onCancel = resolve;
                        if (session.cancelled) resolve();
                    });
                    return;
                }

                // バッチ方式
                const detector = createNoteDetector(algorithm, { a4Freq });
                monitor = new SoundLevelMonitor(stream);

                while (!session.cancelled) {
                    // 音量ゲート: 楽器音を検出するまで推論を回さない
                    setStatus("listening");
                    const heardSound = await monitor.waitForSound({
                        rmsThreshold,
                        isCancelled: () => session.cancelled,
                    });
                    if (!heardSound) break;

                    setStatus("recording");
                    const monoAudio = await recordMonoAudio({
                        durationMs: recordDurationMs,
                        targetSampleRate: detector.requiredSampleRate,
                        stream,
                    });
                    if (session.cancelled) break;

                    setStatus("processing");
                    const noteEvents = await detector.detectNotes(monoAudio);
                    const pitchList = noteEventsToPitchList(
                        noteEvents,
                        recommendedEstimationOptions(algorithm)
                    );

                    // 何も検出できなかった場合は現在のリストを保持する
                    if (pitchList.length > 0) {
                        applyDetectedPitchList(pitchList);
                    }
                    if (session.cancelled) break;

                    await new Promise((resolve) =>
                        setTimeout(resolve, followIntervalMs)
                    );
                }
            } catch (err) {
                fail(err);
            } finally {
                monitor?.dispose();
                capture?.dispose();
                stream?.getTracks().forEach((track) => track.stop());
                setStatus("idle");
            }
        })();

        return () => {
            session.cancelled = true;
            session.onCancel?.();
        };
    }, [
        enabled,
        active,
        algorithm,
        a4Freq,
        recordDurationMs,
        followIntervalMs,
        rmsThreshold,
        setEnabled,
        setStatus,
        setError,
        applyDetectedPitchList,
    ]);
}
