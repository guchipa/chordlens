"use client";

import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { usePitchDetection, type UsePitchDetectionOptions } from "@/lib/hooks/usePitchDetection";
import type { PitchCandidate } from "@/lib/audio_analysis/pitchDetection";
import { useEffect } from "react";

interface MicInputButtonProps {
    /** 検出完了時のコールバック */
    onDetectionComplete: (candidates: PitchCandidate[]) => void;
    /** A4基準周波数 (Hz) */
    a4Freq?: number;
    /** 無効化 */
    disabled?: boolean;
    /** 録音時間 (ms) */
    recordDuration?: number;
}

/**
 * マイク入力ボタン
 *
 * ホバーで「マイクで入力」と表示し、クリックで録音開始。
 * 録音中は赤色のパルスアニメーション、処理中はスピナーを表示。
 */
export function MicInputButton({
    onDetectionComplete,
    a4Freq,
    disabled = false,
    recordDuration = 1500,
}: MicInputButtonProps) {
    const options: UsePitchDetectionOptions = {
        a4Freq,
        recordDuration,
    };

    const {
        isListening,
        isProcessing,
        candidates,
        error,
        startListening,
        reset,
    } = usePitchDetection(options);

    // 検出完了時にコールバックを呼び出す
    useEffect(() => {
        if (!isListening && !isProcessing && candidates.length > 0) {
            onDetectionComplete(candidates);
            reset();
        }
    }, [isListening, isProcessing, candidates, onDetectionComplete, reset]);

    const handleClick = async () => {
        if (isListening || isProcessing) {
            return;
        }
        await startListening();
    };

    const isActive = isListening || isProcessing;

    return (
        <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleClick}
                    disabled={disabled || isActive}
                    className={`relative ${isListening
                            ? "border-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900"
                            : ""
                        }`}
                    aria-label="マイクで入力"
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Mic
                                className={`h-4 w-4 ${isListening ? "text-red-500" : ""}`}
                            />
                            {isListening && (
                                <span className="absolute inset-0 animate-ping rounded-md bg-red-400 opacity-30" />
                            )}
                        </>
                    )}
                </Button>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-auto p-2">
                <p className="text-sm">
                    {error ? (
                        <span className="text-red-500">{error}</span>
                    ) : isListening ? (
                        "録音中..."
                    ) : isProcessing ? (
                        "解析中..."
                    ) : (
                        "マイクで入力"
                    )}
                </p>
            </HoverCardContent>
        </HoverCard>
    );
}
