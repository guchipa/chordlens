/**
 * useChordFollow - 構成音の自動追従
 *
 * chordFollowEnabledAtom が ON かつ active (= チューナーの解析実行中) の間、
 * AudioWorklet (StreamingPcmCapture) で生 PCM を連続取得し、
 * StreamingChordTracker が 0.25 秒フレームごとに解析、
 * 直近 1 秒のスライディングウィンドウ + ヒステリシスで確定した和音を
 * pitchListAtom へ反映する。体感レイテンシは 1 秒未満。
 *
 * トグル UI (SettingsDrawer 内) はドロワーを閉じるとアンマウントされるため、
 * このフックは常駐するコンポーネント (App) で呼び、状態は atom で共有する。
 */

import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { StreamingChordTracker } from "@chordlens/core/audio_analysis/streamingChordTracker";
import {
    applyDetectedPitchListAtom,
    a4FreqAtom,
    chordFollowEnabledAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
} from "@/lib/store";
import { createNoteDetector } from "@/lib/audio/noteDetectorFactory";
import { StreamingPcmCapture } from "@/lib/audio/pcmCapture";

export interface UseChordFollowOptions {
    /**
     * 追従ループを動かすか。チューナーの解析実行中 (isProcessing) を渡し、
     * 解析していない間はトグル ON でも推定を行わない
     */
    active?: boolean;
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
    const { active = true } = options;

    const enabled = useAtomValue(chordFollowEnabledAtom);
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

                // チャンク到着ごとに push + poll。
                // poll は tracker 内で直列化されるため多重呼び出しでよい
                let tracker: StreamingChordTracker | null = null;
                capture = await StreamingPcmCapture.create(stream, (chunk) => {
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
                });
                const detector = createNoteDetector({
                    a4Freq,
                    sampleRate: capture.sampleRate,
                });
                // estimationOptions は上書きせず StreamingChordTracker の既定
                // (STREAMING_CHORD_ESTIMATION_DEFAULTS) に委ねる。streaming は
                // batch と違い継続時間フィルタなどのちらつき対策を含む
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
            } catch (err) {
                fail(err);
            } finally {
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
        a4Freq,
        setEnabled,
        setStatus,
        setError,
        applyDetectedPitchList,
    ]);
}
