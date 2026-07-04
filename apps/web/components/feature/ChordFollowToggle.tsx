"use client";

import { useAtom, useAtomValue } from "jotai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    CHORD_DETECTION_ALGORITHMS,
    CHORD_DETECTION_ALGORITHM_LABELS,
    CHORD_DETECTION_ALGORITHM_DESCRIPTIONS,
} from "@chordlens/core/constants";
import {
    chordFollowEnabledAtom,
    chordDetectionAlgorithmAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
    type ChordFollowStatus,
} from "@/lib/store";

function statusLabel(status: ChordFollowStatus): string | null {
    switch (status) {
        case "listening":
            return "楽器音を待機中...";
        case "recording":
            return "録音中...";
        case "processing":
            return "構成音を推定中...";
        default:
            return null;
    }
}

/**
 * 構成音の自動追従トグル (SettingsDrawer 内)
 *
 * ON にすると選択中のアルゴリズムによる検出サイクルが回り、演奏した和音に
 * 構成音リストが自動で追従する。追従ループ本体は useChordFollow (App 常駐) が
 * 担うため、ドロワーを閉じても追従は継続する。
 */
export function ChordFollowToggle() {
    const [enabled, setEnabled] = useAtom(chordFollowEnabledAtom);
    const [algorithm, setAlgorithm] = useAtom(chordDetectionAlgorithmAtom);
    const status = useAtomValue(chordFollowStatusAtom);
    const error = useAtomValue(chordFollowErrorAtom);

    const label = statusLabel(status);

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>構成音の自動検出</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Switch
                            id="chord-follow-switch"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                        <Label htmlFor="chord-follow-switch" className="cursor-pointer">
                            自動追従モード
                        </Label>
                    </div>
                    <p className="text-xs text-gray-500">
                        解析の実行中に、演奏した和音から構成音を自動で推定し、
                        リストに反映します。楽器音を検出したときだけ推定を行います。
                    </p>
                    {enabled && label && (
                        <p className="text-sm text-blue-600">{label}</p>
                    )}
                    {enabled && !label && (
                        <p className="text-sm text-gray-500">
                            解析を開始すると追従が始まります
                        </p>
                    )}
                    {error && (
                        <p className="text-sm font-medium text-red-600">{error}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="chord-detection-algorithm">検出アルゴリズム</Label>
                    <Select
                        value={algorithm}
                        onValueChange={(v) => setAlgorithm(v as typeof algorithm)}
                    >
                        <SelectTrigger id="chord-detection-algorithm">
                            <SelectValue placeholder="アルゴリズムを選択" />
                        </SelectTrigger>
                        <SelectContent>
                            {CHORD_DETECTION_ALGORITHMS.map((alg) => (
                                <SelectItem key={alg} value={alg}>
                                    {CHORD_DETECTION_ALGORITHM_LABELS[alg]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-1">
                        {CHORD_DETECTION_ALGORITHM_DESCRIPTIONS[algorithm]}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
