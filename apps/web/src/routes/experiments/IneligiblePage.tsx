import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from "@ionic/react";

export function IneligiblePage() {
  return (
    <main>
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>参加条件外です</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>
            本実験は演奏歴 1 年以上の管楽器経験者を対象としています。
            ご回答いただいた内容では参加条件を満たさないため、ここで終了とさせていただきます。
          </p>
          <p>ご協力ありがとうございました。</p>
        </IonCardContent>
      </IonCard>
    </main>
  );
}
