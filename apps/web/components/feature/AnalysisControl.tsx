import { IonButton } from "@ionic/react";

import styles from "./AnalysisControl.module.css";

interface AnalysisControlProps {
  isProcessing: boolean;
  startProcessing: () => void;
  stopProcessing: () => void;
  isPitchListEmpty: boolean;
}

export const AnalysisControl: React.FC<AnalysisControlProps> = ({ isProcessing, startProcessing, stopProcessing, isPitchListEmpty }) => {
  return (
    <IonButton
      className={styles.button}
      expand="block"
      size="large"
      color={isProcessing ? "danger" : "primary"}
      onClick={isProcessing ? stopProcessing : startProcessing}
      disabled={isPitchListEmpty && !isProcessing}
    >
      {isProcessing ? "解析停止" : "解析開始"}
    </IonButton>
  );
};
