/**
 * useChordFollow - basic-pitch による構成音の自動追従
 *
 * chordFollowEnabledAtom が ON の間、以下のサイクルを回す:
 *
 *   1. 音量ゲート: 入力の RMS が閾値を超えるまで待機 (無音時は推論しない)
 *   2. 録音: マイクから数秒間録音し 22050 Hz モノラルにデコード
 *   3. 推定: basic-pitch でノートイベントを推定し Pitch[] へ変換
 *   4. 反映: pitchListAtom へ即時反映 (和音が変わらなければ更新しない)
 *
 * トグル UI (SettingsDrawer 内) はドロワーを閉じるとアンマウントされるため、
 * このフックは常駐するコンポーネント (App) で呼び、状態は atom で共有する。
 */

import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { noteEventsToPitchList } from "@chordlens/core/audio_analysis/chordToneEstimation";
import {
    applyDetectedPitchListAtom,
    chordFollowEnabledAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
} from "@/lib/store";
import { BasicPitchNoteDetector } from "@/lib/audio/basicPitchNoteDetector";
import { recordMonoAudio } from "@/lib/audio/recordMonoAudio";
import {
    SoundLevelMonitor,
    SOUND_RMS_THRESHOLD,
} from "@/lib/audio/soundLevelMonitor";

export interface UseChordFollowOptions {
    /** 1 回の検出で録音する時間 (ms) デフォルト: 3000 */
    recordDurationMs?: number;
    /** 検出サイクル間の待機時間 (ms) デフォルト: 500 */
    followIntervalMs?: number;
    /** 楽器音とみなす RMS 閾値 デフォルト: SOUND_RMS_THRESHOLD */
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
        recordDurationMs = 3000,
        followIntervalMs = 500,
        rmsThreshold = SOUND_RMS_THRESHOLD,
    } = options;

    const enabled = useAtomValue(chordFollowEnabledAtom);
    const setEnabled = useSetAtom(chordFollowEnabledAtom);
    const setStatus = useSetAtom(chordFollowStatusAtom);
    const setError = useSetAtom(chordFollowErrorAtom);
    const applyDetectedPitchList = useSetAtom(applyDetectedPitchListAtom);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const session = { cancelled: false };
        let stream: MediaStream | null = null;
        let monitor: SoundLevelMonitor | null = null;

        (async () => {
            setError(null);
            try {
                const detector = new BasicPitchNoteDetector();
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    },
                });
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
                    const pitchList = noteEventsToPitchList(noteEvents);

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
                if (!session.cancelled) {
                    setError(toErrorMessage(err));
                    setEnabled(false);
                }
            } finally {
                monitor?.dispose();
                stream?.getTracks().forEach((track) => track.stop());
                setStatus("idle");
            }
        })();

        return () => {
            session.cancelled = true;
        };
    }, [
        enabled,
        recordDurationMs,
        followIntervalMs,
        rmsThreshold,
        setEnabled,
        setStatus,
        setError,
        applyDetectedPitchList,
    ]);
}
