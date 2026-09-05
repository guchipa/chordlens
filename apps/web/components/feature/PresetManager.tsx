import { useAtom, useSetAtom } from "jotai";
import { useState, useEffect } from "react";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
} from "@ionic/react";
import { saveOutline } from "ionicons/icons";

import { PresetSaveDialog } from "@/components/feature/PresetSaveDialog";
import { PresetList } from "@/components/feature/PresetList";
import type { PitchPreset } from "@chordlens/core/types";
import { getPresets, isLocalStorageAvailable } from "@/lib/presets";
import { pitchListAtom, loadPresetAtom } from "@/lib/store";

import styles from "./PresetManager.module.css";

export function PresetManager() {
  const [pitchList] = useAtom(pitchListAtom);
  const loadPreset = useSetAtom(loadPresetAtom);
  const [presets, setPresets] = useState<PitchPreset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [localStorageAvailable, setLocalStorageAvailable] = useState(true);

  // プリセット一覧を読み込み
  const loadPresets = () => {
    setPresets(getPresets());
  };

  useEffect(() => {
    // localStorageの可用性チェック
    setLocalStorageAvailable(isLocalStorageAvailable());

    // 初回読み込み
    loadPresets();
  }, []);

  const handleSaveClick = () => {
    if (pitchList.length === 0) {
      return;
    }
    setSaveDialogOpen(true);
  };

  const handleSaveSuccess = () => {
    loadPresets();
  };

  const handleLoadPreset = (preset: PitchPreset) => {
    loadPreset(preset.pitchList);
  };

  const handleDeletePreset = () => {
    loadPresets();
  };

  if (!localStorageAvailable) {
    return (
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>プリセット機能</IonCardTitle>
          <IonCardSubtitle>
            localStorageが利用できないため、プリセット機能は使用できません。
          </IonCardSubtitle>
        </IonCardHeader>
      </IonCard>
    );
  }

  return (
    <>
      <IonCard>
        <IonCardHeader className={styles.header}>
          <div>
            <IonCardTitle>プリセット</IonCardTitle>
            <IonCardSubtitle>
              構成音リストを保存・読み込みできます
            </IonCardSubtitle>
          </div>
          <IonButton
            onClick={handleSaveClick}
            disabled={pitchList.length === 0}
            size="small"
          >
            <IonIcon icon={saveOutline} slot="start" />
            保存
          </IonButton>
        </IonCardHeader>
        <IonCardContent>
          <PresetList
            presets={presets}
            onLoad={handleLoadPreset}
            onDelete={handleDeletePreset}
          />
        </IonCardContent>
      </IonCard>

      <PresetSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        pitchList={pitchList}
        onSaveSuccess={handleSaveSuccess}
      />
    </>
  );
}
