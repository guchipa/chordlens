/**
 * LogExportButton - ログエクスポートボタンコンポーネント
 *
 * ログ記録の開始/停止、エクスポート、クリアを行うUIを提供
 */

import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonNote,
  IonButton,
  IonIcon,
} from "@ionic/react";
import {
  ellipse,
  square,
  downloadOutline,
  trashOutline,
  bulbOutline,
} from "ionicons/icons";
import type { LogSession } from "@chordlens/core/types";
import { exportLogSession } from "@/lib/utils/exportLog";

import styles from "./LogExportButton.module.css";

interface LogExportButtonProps {
  /** ログ記録中かどうか */
  isRecording: boolean;
  /** 記録されたエントリ数 */
  entryCount: number;
  /** 現在のセッション情報 */
  session: LogSession | null;
  /** ログ記録を開始 */
  onStartRecording: () => void;
  /** ログ記録を停止 */
  onStopRecording: () => void;
  /** ログをクリア */
  onClearLog: () => void;
}

export function LogExportButton({
  isRecording,
  entryCount,
  session,
  onStartRecording,
  onStopRecording,
  onClearLog,
}: LogExportButtonProps) {
  const handleExport = () => {
    if (!session) return;
    exportLogSession(session);
  };

  return (
    <IonCard className={styles.card}>
      <IonCardHeader>
        <IonCardTitle>📊 ログ記録コントロール</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {/* ステータス表示 */}
        <IonItem lines="none" className={styles.statusItem}>
          {isRecording ? (
            <IonIcon icon={ellipse} color="danger" slot="start" />
          ) : (
            <IonIcon icon={square} color="medium" slot="start" />
          )}
          <IonLabel>
            <h3>{isRecording ? "記録中" : "停止中"}</h3>
            <p>
              記録エントリ数: <IonNote>{entryCount}</IonNote>
            </p>
          </IonLabel>
        </IonItem>

        {/* コントロールボタン */}
        <div className={styles.buttonRow}>
          {!isRecording ? (
            <IonButton onClick={onStartRecording} color="danger" size="small">
              <IonIcon icon={ellipse} slot="start" />
              記録開始
            </IonButton>
          ) : (
            <IonButton onClick={onStopRecording} fill="outline" size="small">
              <IonIcon icon={square} slot="start" />
              記録停止
            </IonButton>
          )}

          <IonButton
            onClick={handleExport}
            fill="outline"
            size="small"
            disabled={!session || entryCount === 0}
          >
            <IonIcon icon={downloadOutline} slot="start" />
            CSVエクスポート
          </IonButton>

          <IonButton
            onClick={onClearLog}
            fill="outline"
            size="small"
            disabled={entryCount === 0}
          >
            <IonIcon icon={trashOutline} slot="start" />
            ログクリア
          </IonButton>
        </div>

        {/* 使い方のヒント */}
        <IonItem lines="none" className={styles.hintItem}>
          <IonIcon icon={bulbOutline} slot="start" />
          <IonNote>
            <strong>使い方:</strong>
            解析を開始してから「記録開始」を押すと、1フレームごとに解析結果が記録されます。
            記録停止後、「CSVエクスポート」でデータをダウンロードできます。
          </IonNote>
        </IonItem>
      </IonCardContent>
    </IonCard>
  );
}
