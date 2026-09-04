"use client";

import { useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    chordFollowEnabledAtom,
    chordFollowStatusAtom,
    chordFollowErrorAtom,
    type ChordFollowStatus,
} from "@/lib/store";

function statusLabel(status: ChordFollowStatus): string | null {
    switch (status) {
        case "listening":
            return "楽器音を待機中...";
        case "tracking":
            return "追従中...";
        default:
            return null;
    }
}

/**
 * 構成音の自動追従トグル (SettingsDrawer 内)
 *
 * ON にするとマイク入力の解析が回り、演奏した和音に構成音リストが自動で
 * 追従する。追従ループ本体は useChordFollow (App 常駐) が担うため、
 * ドロワーを閉じても追従は継続する。
 */
export function ChordFollowToggle() {
    const [enabled, setEnabled] = useAtom(chordFollowEnabledAtom);
    const status = useAtomValue(chordFollowStatusAtom);
    const error = useAtomValue(chordFollowErrorAtom);
    const setError = useSetAtom(chordFollowErrorAtom);

    /**
     * 失敗時は useChordFollow が自動でトグルを OFF に戻すため、
     * 次のセッション開始時の setError(null) には到達しない。
     * ユーザーが操作した時点でここでエラー表示を消す
     */
    const handleToggle = useCallback(
        (next: boolean) => {
            setError(null);
            setEnabled(next);
        },
        [setError, setEnabled]
    );

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
                            onCheckedChange={handleToggle}
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
            </CardContent>
        </Card>
    );
}
