import { useEffect } from "react";
import { createWebScreenWakeLock } from "@/lib/screenWakeLock";

/** active が true の間、画面スリープを抑止する (停止・アンマウントで解放) */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const lock = createWebScreenWakeLock();
    void lock.acquire();
    return () => {
      void lock.release();
    };
  }, [active]);
}
