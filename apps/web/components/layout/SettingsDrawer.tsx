import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from "@ionic/react";

import { ChordFollowToggle } from "@/components/feature/ChordFollowToggle";
import { PitchSettingForm } from "@/components/feature/PitchSettingForm";
import { PitchList } from "@/components/feature/PitchList";
import { SettingsForm } from "@/components/feature/SettingsForm";
import { PresetManager } from "@/components/feature/PresetManager";
import { FeedbackTypeSelector } from "@/components/feature/FeedbackTypeSelector";

import styles from "./SettingsDrawer.module.css";

export function SettingsDrawer() {
  return (
    <IonMenu
      side="start"
      contentId="main-content"
      type="overlay"
      className={styles.menu}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>設定</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <ChordFollowToggle />
        <PitchSettingForm />
        <PitchList />
        <PresetManager />
        <FeedbackTypeSelector />
        <SettingsForm />
      </IonContent>
    </IonMenu>
  );
}
