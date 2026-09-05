import React, { useState } from "react";
import {
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonButton,
  IonIcon,
  IonText,
  IonAlert,
} from "@ionic/react";
import { musicalNotesOutline, trashOutline } from "ionicons/icons";
import { PitchPreset } from "@chordlens/core/types";
import { deletePreset, getRelativeTimeString } from "@/lib/presets";

import styles from "./PresetList.module.css";

interface PresetListProps {
  presets: PitchPreset[];
  onLoad: (preset: PitchPreset) => void;
  onDelete: () => void;
}

export const PresetList: React.FC<PresetListProps> = ({
  presets,
  onLoad,
  onDelete,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loadConfirmPreset, setLoadConfirmPreset] =
    useState<PitchPreset | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      const success = deletePreset(deleteConfirmId);
      if (success) {
        onDelete();
      }
    }
  };

  const handleLoadClick = (preset: PitchPreset) => {
    setLoadConfirmPreset(preset);
  };

  const handleLoadConfirm = () => {
    if (loadConfirmPreset) {
      onLoad(loadConfirmPreset);
    }
  };

  if (presets.length === 0) {
    return (
      <div className={styles.emptyState}>
        <IonIcon icon={musicalNotesOutline} className={styles.emptyIcon} />
        <IonText color="medium">
          <p>プリセットがありません</p>
          <p className={styles.emptyHint}>
            構成音を登録して「プリセット保存」ボタンをクリックしてください
          </p>
        </IonText>
      </div>
    );
  }

  return (
    <>
      <IonList>
        {presets.map((preset) => (
          <IonItem key={preset.id} lines="full">
            <IonLabel>
              <h3>{preset.name}</h3>
              <IonNote>
                {preset.pitchList.length}音 •{" "}
                {getRelativeTimeString(preset.createdAt)}
              </IonNote>
            </IonLabel>
            <IonButton
              fill="outline"
              size="small"
              slot="end"
              onClick={() => handleLoadClick(preset)}
            >
              読み込み
            </IonButton>
            <IonButton
              fill="clear"
              size="small"
              color="danger"
              slot="end"
              aria-label="削除"
              onClick={() => handleDeleteClick(preset.id)}
            >
              <IonIcon icon={trashOutline} slot="icon-only" />
            </IonButton>
          </IonItem>
        ))}
      </IonList>

      {/* 削除確認: jsdom では isOpen={true} を描画すると overlay 実装が
          "framework delegate is missing" の未処理 Promise 拒否を起こし
          テストランナー全体が落ちるため、テストではこの isOpen を true にしない */}
      <IonAlert
        isOpen={deleteConfirmId !== null}
        header="プリセット削除"
        message="このプリセットを削除しますか？この操作は取り消せません。"
        buttons={[
          { text: "キャンセル", role: "cancel" },
          {
            text: "削除",
            role: "destructive",
            handler: handleDeleteConfirm,
          },
        ]}
        onDidDismiss={() => setDeleteConfirmId(null)}
      />

      <IonAlert
        isOpen={loadConfirmPreset !== null}
        header="プリセット読み込み"
        message={`「${loadConfirmPreset?.name}」を読み込みます。現在の構成音リストは上書きされます。よろしいですか？`}
        buttons={[
          { text: "キャンセル", role: "cancel" },
          { text: "読み込み", handler: handleLoadConfirm },
        ]}
        onDidDismiss={() => setLoadConfirmPreset(null)}
      />
    </>
  );
};
