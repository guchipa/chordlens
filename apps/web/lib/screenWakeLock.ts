import type { ScreenWakeLock } from "@chordlens/core/adapters/wakeLock";

type WakeLockSentinelLike = {
  release(): Promise<void>;
  addEventListener(type: "release", listener: () => void): void;
};

/**
 * Screen Wake Lock API による ScreenWakeLock 実装。
 * ブラウザはタブ非表示時にロックを自動解放するため、
 * 要求中 (acquire 済み・release 前) に可視へ戻ったら再取得する。
 * 未対応・拒否時は何もしない (console.debug のみ)。
 */
export function createWebScreenWakeLock(): ScreenWakeLock {
  let wanted = false;
  let sentinel: WakeLockSentinelLike | null = null;
  let listening = false;

  const request = async () => {
    if (!wanted || sentinel) return;
    const wakeLock = (
      typeof navigator !== "undefined"
        ? (navigator as unknown as {
            wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> };
          }).wakeLock
        : undefined
    );
    if (!wakeLock) return;
    try {
      const s = await wakeLock.request("screen");
      if (!wanted) {
        // 取得待ちの間に release された
        await s.release().catch(() => {});
        return;
      }
      sentinel = s;
      s.addEventListener("release", () => {
        if (sentinel === s) sentinel = null;
      });
    } catch (e) {
      console.debug("[wakeLock] request failed", e);
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") void request();
  };

  return {
    async acquire() {
      wanted = true;
      if (!listening && typeof document !== "undefined") {
        document.addEventListener("visibilitychange", onVisibilityChange);
        listening = true;
      }
      await request();
    },
    async release() {
      wanted = false;
      if (listening) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        listening = false;
      }
      const s = sentinel;
      sentinel = null;
      if (s) await s.release().catch(() => {});
    },
  };
}
