import { useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonToggle,
    IonText,
    IonNote,
} from "@ionic/react";

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
        (e: CustomEvent<{ checked: boolean }>) => {
            setError(null);
            setEnabled(e.detail.checked);
        },
        [setError, setEnabled]
    );

    const label = statusLabel(status);

    return (
        <IonCard>
            <IonCardHeader>
                <IonCardTitle>構成音の自動検出</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
                <IonItem lines="none">
                    <IonToggle
                        checked={enabled}
                        labelPlacement="end"
                        onIonChange={handleToggle}
                    >
                        自動追従モード
                    </IonToggle>
                </IonItem>
                <IonNote>
                    解析の実行中に、演奏した和音から構成音を自動で推定し、
                    リストに反映します。楽器音を検出したときだけ推定を行います。
                </IonNote>
                {enabled && label && (
                    <p>
                        <IonText color="tertiary">{label}</IonText>
                    </p>
                )}
                {enabled && !label && (
                    <p>
                        <IonNote>解析を開始すると追従が始まります</IonNote>
                    </p>
                )}
                {error && (
                    <p>
                        <IonText color="danger">{error}</IonText>
                    </p>
                )}
            </IonCardContent>
        </IonCard>
    );
}
