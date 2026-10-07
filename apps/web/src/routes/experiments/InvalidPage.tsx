import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
} from "@ionic/react";

export function InvalidPage() {
  return (
    <main>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>URL が無効です</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>
            URL に必要なパラメータ (<code>cond</code> と <code>pairId</code>) が含まれていません。
          </p>
          <p>
            実験者から配布された URL を再度確認してください。
          </p>
          <IonText color="medium">
            <p>
              例: <code>/experiments/?cond=with&amp;pairId=PR01</code>
            </p>
          </IonText>
        </IonCardContent>
      </IonCard>
    </main>
  );
}
