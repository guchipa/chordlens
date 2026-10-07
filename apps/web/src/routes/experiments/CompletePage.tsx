import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from "@ionic/react";

export function CompletePage() {
  return (
    <main>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>実験お疲れ様でした</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>ご協力ありがとうございました。</p>
          <p>
            すべての録音・解析データ・アンケート回答が送信されました。
            このタブは閉じていただいて問題ありません。
          </p>
        </IonCardContent>
      </IonCard>
    </main>
  );
}
