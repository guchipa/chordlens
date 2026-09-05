import { useState, useCallback } from "react";
import { useAtomValue } from "jotai";
import { IonButton, IonIcon, IonSpinner, IonNote } from "@ionic/react";
import { micOutline } from "ionicons/icons";

import { noteEventsToPitchList } from "@chordlens/core/audio_analysis/chordToneEstimation";
import type { Pitch } from "@chordlens/core/types";
import {
    createNoteDetector,
    BATCH_ESTIMATION_OPTIONS,
} from "@/lib/audio/noteDetectorFactory";
import { recordMonoAudio } from "@/lib/audio/recordMonoAudio";
import { a4FreqAtom } from "@/lib/store";

import styles from "./MicInputButton.module.css";

interface MicInputButtonProps {
    /** 検出完了時のコールバック (最有力の 1 音) */
    onDetect: (pitch: Pitch) => void;
    /** 無効化 */
    disabled?: boolean;
    /** 録音時間 (ms) */
    recordDurationMs?: number;
}

type DetectionStatus = "idle" | "recording" | "processing";

/**
 * マイク入力ボタン (単音)
 *
 * クリックで短時間録音し、構成音検出で推定した最有力の 1 音を
 * 即座にコールバックへ渡す。
 * 録音中はボタンを危険色に、処理中はスピナーを表示。
 * ホバーカードの代わりに、メッセージ (エラー/録音中/解析中) はボタン直下に表示する
 * (モバイルにホバーはないため)。
 */
export function MicInputButton({
    onDetect,
    disabled = false,
    recordDurationMs = 1500,
}: MicInputButtonProps) {
    const [status, setStatus] = useState<DetectionStatus>("idle");
    const [message, setMessage] = useState<string | null>(null);
    const a4Freq = useAtomValue(a4FreqAtom);

    const handleClick = useCallback(async () => {
        if (status !== "idle") {
            return;
        }
        setMessage(null);

        try {
            // sampleRate は検出器の既定 (48kHz = 評価スクリプトと同じ動作点)
            // に委ね、録音側をその requiredSampleRate に合わせる。
            // ここで低いレートを渡すとデシメーションが効かず、高音域の
            // 倍音ビンを落としたまま解析することになる
            const detector = createNoteDetector({ a4Freq });

            setStatus("recording");
            const monoAudio = await recordMonoAudio({
                durationMs: recordDurationMs,
                targetSampleRate: detector.requiredSampleRate,
            });

            setStatus("processing");
            const noteEvents = await detector.detectNotes(monoAudio);
            const [pitch] = noteEventsToPitchList(noteEvents, {
                ...BATCH_ESTIMATION_OPTIONS,
                maxNotes: 1,
            });

            if (pitch) {
                onDetect({ ...pitch, isRoot: false });
            } else {
                setMessage("音を検出できませんでした。もう一度お試しください。");
            }
        } catch (err) {
            if (
                err instanceof Error &&
                (err.name === "NotAllowedError" ||
                    err.name === "PermissionDeniedError")
            ) {
                setMessage(
                    "マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。"
                );
            } else {
                setMessage("音の検出中にエラーが発生しました。");
            }
        } finally {
            setStatus("idle");
        }
    }, [status, recordDurationMs, onDetect, a4Freq]);

    const isActive = status !== "idle";

    const statusText = message
        ? message
        : status === "recording"
            ? "録音中..."
            : status === "processing"
                ? "解析中..."
                : null;

    return (
        <div className={styles.wrapper}>
            <IonButton
                type="button"
                fill="outline"
                size="small"
                color={status === "recording" ? "danger" : undefined}
                onClick={handleClick}
                disabled={disabled || isActive}
                aria-label="マイクで入力"
            >
                {status === "processing" ? (
                    <IonSpinner name="crescent" slot="icon-only" />
                ) : (
                    <IonIcon icon={micOutline} slot="icon-only" />
                )}
            </IonButton>
            {statusText && (
                <IonNote color={message ? "danger" : undefined}>
                    {statusText}
                </IonNote>
            )}
        </div>
    );
}
