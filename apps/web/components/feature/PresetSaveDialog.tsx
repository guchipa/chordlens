import React, { useRef, useState } from "react";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonInput,
  IonNote,
  IonText,
} from "@ionic/react";
import { savePreset, isDuplicatePresetName } from "@/lib/presets";
import type { Pitch } from "@chordlens/core/types";

import styles from "./PresetSaveDialog.module.css";

interface PresetSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pitchList: Pitch[];
  onSaveSuccess: () => void;
}

export const PresetSaveDialog: React.FC<PresetSaveDialogProps> = ({
  open,
  onOpenChange,
  pitchList,
  onSaveSuccess,
}) => {
  const [presetName, setPresetName] = useState("");
  const [error, setError] = useState("");
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const inputRef = useRef<HTMLIonInputElement>(null);

  const handleSave = () => {
    setError("");

    // バリデーション
    if (!presetName.trim()) {
      setError("プリセット名を入力してください");
      return;
    }

    if (presetName.length > 30) {
      setError("プリセット名は30文字以内で入力してください");
      return;
    }

    // 重複チェック
    if (isDuplicatePresetName(presetName) && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true);
      return;
    }

    // 保存実行
    const result = savePreset(presetName, pitchList);

    if (result.success) {
      // 成功
      setPresetName("");
      setShowOverwriteConfirm(false);
      onOpenChange(false);
      onSaveSuccess();
    } else {
      // エラー
      setError(result.error);
      setShowOverwriteConfirm(false);
    }
  };

  const handleCancel = () => {
    setPresetName("");
    setError("");
    setShowOverwriteConfirm(false);
    onOpenChange(false);
  };

  const handleCancelOverwrite = () => {
    setShowOverwriteConfirm(false);
  };

  return (
    <IonModal
      isOpen={open}
      onDidDismiss={() => onOpenChange(false)}
      onDidPresent={() => {
        inputRef.current?.setFocus();
      }}
      initialBreakpoint={0.5}
      breakpoints={[0, 0.5, 0.9]}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            {showOverwriteConfirm ? "上書き確認" : "プリセット保存"}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!showOverwriteConfirm ? (
          <>
            <IonText color="medium">
              <p>現在の構成音リストをプリセットとして保存します。</p>
            </IonText>
            <IonInput
              ref={inputRef}
              label="プリセット名"
              labelPlacement="stacked"
              placeholder="例: Cメジャートライアド"
              value={presetName}
              maxlength={30}
              onIonInput={(e) => setPresetName(e.detail.value ?? "")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
            {error && <IonNote color="danger">{error}</IonNote>}
            <IonNote color="medium" className={styles.charCount}>
              {presetName.length} / 30 文字
            </IonNote>
          </>
        ) : (
          <IonText>
            <p>「{presetName}」は既に存在します。上書きしますか？</p>
          </IonText>
        )}
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              fill="outline"
              onClick={
                showOverwriteConfirm ? handleCancelOverwrite : handleCancel
              }
            >
              キャンセル
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton
              onClick={handleSave}
              disabled={!showOverwriteConfirm && pitchList.length === 0}
            >
              {showOverwriteConfirm ? "上書き保存" : "保存"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
};
