import type { AppLifecycle } from "@chordlens/core/adapters/appLifecycle";

/**
 * visibilitychange / pagehide / pageshow による AppLifecycle 実装。
 * iOS Safari はアプリ切替やロックで visibilitychange が来ないことがあるため pagehide も購読する。
 * 同じ遷移が両方から通知されることがあるので、利用側は冪等に扱う。
 */
export const webAppLifecycle: AppLifecycle = {
  onBackground(callback) {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") callback();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", callback);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", callback);
    };
  },
  onForeground(callback) {
    const onVisibility = () => {
      if (document.visibilityState === "visible") callback();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", callback);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", callback);
    };
  },
};
