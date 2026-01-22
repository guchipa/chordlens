"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PitchCandidate } from "@/lib/audio_analysis/pitchDetection";
import { PITCH_COLOR_MAP } from "@/lib/constants";

interface PitchConfirmDialogProps {
    /** ダイアログの開閉状態 */
    open: boolean;
    /** 開閉状態の変更コールバック */
    onOpenChange: (open: boolean) => void;
    /** 推定された音名候補 */
    candidates: PitchCandidate[];
    /** 追加確定時のコールバック */
    onConfirm: (selected: PitchCandidate) => void;
    /** キャンセル時のコールバック */
    onCancel: () => void;
}

/**
 * 音名推定結果の確認ダイアログ
 *
 * 上位3候補を信頼度順に表示し、各候補に「追加」ボタンを表示。
 */
export function PitchConfirmDialog({
    open,
    onOpenChange,
    candidates,
    onConfirm,
    onCancel,
}: PitchConfirmDialogProps) {
    const handleConfirm = (candidate: PitchCandidate) => {
        onConfirm(candidate);
        onOpenChange(false);
    };

    const handleCancel = () => {
        onCancel();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-xl">🎵</span>
                        音名を検出しました
                    </DialogTitle>
                    <DialogDescription>
                        この音を構成音に追加しますか？
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {candidates.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground">
                            音名を検出できませんでした。もう一度お試しください。
                        </p>
                    ) : (
                        candidates.map((candidate, index) => {
                            const confidencePercent = Math.round(candidate.confidence * 100);
                            const pitchColor = PITCH_COLOR_MAP[candidate.pitchName] || "#666";

                            return (
                                <div
                                    key={`${candidate.pitchName}${candidate.octaveNum}`}
                                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-medium text-muted-foreground">
                                            {index + 1}.
                                        </span>
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-full text-white font-bold"
                                            style={{ backgroundColor: pitchColor }}
                                        >
                                            {candidate.pitchName}
                                        </div>
                                        <div>
                                            <span className="text-lg font-semibold">
                                                {candidate.pitchName}
                                                {candidate.octaveNum}
                                            </span>
                                            <span className="ml-2 text-sm text-muted-foreground">
                                                ({confidencePercent}%)
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleConfirm(candidate)}
                                    >
                                        追加
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={handleCancel}>
                        キャンセル
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
