import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from "@ionic/react";
import { ExperimentSessionProvider } from "@/components/feature/experiments/ExperimentSessionProvider";

import styles from "./ExperimentsLayout.module.css";

export function ExperimentsLayout() {
  return (
    <Suspense fallback={null}>
      <ExperimentSessionProvider>
        <IonPage>
          <IonHeader>
            <IonToolbar>
              <IonTitle>ChordLens 実験</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className={styles.container}>
              <Outlet />
            </div>
          </IonContent>
        </IonPage>
      </ExperimentSessionProvider>
    </Suspense>
  );
}
