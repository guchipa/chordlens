/**
 * useChordFollow - 構成音の自動追従
 *
 * chordFollowEnabledAtom が ON かつ active (= チューナーの解析実行中) の間、
 * チューナー本体の音声グラフに AudioWorklet (StreamingPcmCapture) をぶら下げて
 * 生 PCM を連続取得し、StreamingChordTracker が 0.25 秒フレームごとに解析、
 * 直近 1 秒のスライディングウィンドウ + ヒステリシスで確定した和音を
 * pitchListAtom へ反映する。体感レイテンシは 1 秒未満。
 *
 * マイクストリームと AudioContext は自前で取得せず、useAudioAnalysis が
 * 持つものを共有する (二重に確保すると CPU・バッテリーを余分に食い、
 * 入力デバイスの同時利用制限にも当たるため)。
 *
 * トグル UI (SettingsDrawer 内) はドロワーを閉じるとアンマウントされるため、
 * このフックは常駐するコンポーネント (App) で呼び、状態は atom で共有する。
 */

import { useEffect, type RefObject } from "react";
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
import type { AudioNodes } from "@/lib/hooks/audio/useAudioContext";

export interface UseChordFollowOptions {
    /**
     * 追従ループを動かすか。チューナーの解析実行中 (isProcessing) を渡し、
     * 解析していない間はトグル ON でも推定を行わない
     */
    active?: boolean;
    /**
     * チューナー本体の音声グラフ (useAudioAnalysis の audioNodesRef)。
     * ここから PCM を分岐するため、解析停止中 (null) は追従も動かない
     */
    audioNodesRef: RefObject<AudioNodes | null>;
}

/** 解析まわりのエラーをユーザー向けメッセージに変換する */
function toErrorMessage(err: unknown): string {
    if (err instanceof Error) {
        return `構成音の検出に失敗しました: ${err.message}`;
    }
    return "構成音の検出中に予期せぬエラーが発生しました。";
}

export function useChordFollow(options: UseChordFollowOptions): void {
    const { active = true, audioNodesRef } = options;

    const enabled = useAtomValue(chordFollowEnabledAtom);
    const a4Freq = useAtomValue(a4FreqAtom);
    const setEnabled = useSetAtom(chordFollowEnabledAtom);
    const setStatus = useSetAtom(chordFollowStatusAtom);
    const setError = useSetAtom(chordFollowErrorAtom);
    const applyDetectedPitchList = useSetAtom(applyDetectedPitchListAtom);

    useEffect(() => {
        // チューナーが解析中でなければグラフがないので何もしない
        const nodes = audioNodesRef.current;
        if (!enabled || !active || !nodes) {
            return;
        }

        const session: {
            cancelled: boolean;
            onCancel: (() => void) | null;
        } = { cancelled: false, onCancel: null };
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
                // チャンク到着ごとに push + poll。
                // poll は tracker 内で直列化されるため多重呼び出しでよい
                let tracker: StreamingChordTracker | null = null;
                capture = await StreamingPcmCapture.attach(
                    {
                        context: nodes.audioContext,
                        source: nodes.mediaStreamSource,
                    },
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
                // AudioContext とマイクストリームはチューナー本体の持ち物なので
                // ここでは自分が張った接続だけを外す
                capture?.dispose();
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
        audioNodesRef,
        setEnabled,
        setStatus,
        setError,
        applyDetectedPitchList,
    ]);
}
