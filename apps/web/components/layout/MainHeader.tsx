import { IonText } from "@ionic/react";

export function MainHeader() {
  return (
    <IonText color="medium" className="ion-text-center">
      <p>
        マイクから音声を入力し、設定した和音の純正律からの音程のズレをリアルタイムで解析します。
      </p>
    </IonText>
  );
}
