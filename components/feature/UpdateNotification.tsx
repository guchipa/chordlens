"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
    setShowUpdate(false);
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border-2 border-primary rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-primary-foreground"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              新しいバージョンが利用可能です
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              アプリを更新して最新機能をお楽しみください。
            </p>
            <div className="flex gap-2">
              <Button onClick={handleUpdate} size="sm" className="flex-1">
                今すぐ更新
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                後で
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
