"use client";

import { useState, useCallback } from "react";
import { useAtomValue } from "jotai";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { noteEventsToPitchList } from "@chordlens/core/audio_analysis/chordToneEstimation";
import type { Pitch } from "@chordlens/core/types";
import {
    createNoteDetector,
    BATCH_ESTIMATION_OPTIONS,
} from "@/lib/audio/noteDetectorFactory";
import { recordMonoAudio } from "@/lib/audio/recordMonoAudio";
import { a4FreqAtom } from "@/lib/store";

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
 * 録音中は赤色のパルスアニメーション、処理中はスピナーを表示。
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

    return (
        <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleClick}
                    disabled={disabled || isActive}
                    className={`relative ${status === "recording"
                            ? "border-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900"
                            : ""
                        }`}
                    aria-label="マイクで入力"
                >
                    {status === "processing" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Mic
                                className={`h-4 w-4 ${status === "recording" ? "text-red-500" : ""}`}
                            />
                            {status === "recording" && (
                                <span className="absolute inset-0 animate-ping rounded-md bg-red-400 opacity-30" />
                            )}
                        </>
                    )}
                </Button>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-auto p-2">
                <p className="text-sm">
                    {message ? (
                        <span className="text-red-500">{message}</span>
                    ) : status === "recording" ? (
                        "録音中..."
                    ) : status === "processing" ? (
                        "解析中..."
                    ) : (
                        "マイクで入力"
                    )}
                </p>
            </HoverCardContent>
        </HoverCard>
    );
}
