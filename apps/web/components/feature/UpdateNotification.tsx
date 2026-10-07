import { useEffect, useState } from "react";
import { IonToast } from "@ionic/react";

export const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // 新しいService Workerが見つかったとき
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // 新しいバージョンが利用可能
                setShowUpdate(true);
              }
            });
          }
        });

        // 定期的に更新をチェック（1時間ごと）
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      });
    }
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  return (
    <IonToast
      isOpen={showUpdate}
      message="新しいバージョンが利用可能です"
      position="bottom"
      onDidDismiss={() => setShowUpdate(false)}
      buttons={[
        {
          text: "今すぐ更新",
          handler: handleUpdate,
        },
        {
          text: "後で",
          role: "cancel",
          handler: () => setShowUpdate(false),
        },
      ]}
    />
  );
};
