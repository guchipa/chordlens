/**
 * プラットフォーム判定 (ブラウザ依存のため core ではなく apps/web に置く)。
 */

interface PlatformEnv {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}

function readEnv(): PlatformEnv {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  };
}

/** iPhone / iPad (iPadOS 13+ は Mac を名乗るため maxTouchPoints で見分ける) */
export function isIOS(env: PlatformEnv = readEnv()): boolean {
  if (/iPhone|iPad|iPod/.test(env.userAgent)) return true;
  return env.platform === "MacIntel" && env.maxTouchPoints > 1;
}

/** ホーム画面に追加された PWA (standalone) として起動しているか */
export function isStandalonePWA(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari 独自プロパティ (display-mode 非対応の古い iOS 向け)
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * 画面左端からのスワイプでドロワーを開いてよいか。
 *
 * iOS の Safari では、左端からの右スワイプがブラウザの「戻る」ジェスチャで、
 * アプリ側では横取りできず競合する。そのため iOS はブラウザのタブ内では無効にし、
 * ブラウザの戻るジェスチャが存在しないインストール済み PWA (standalone) のみ有効にする。
 * それ以外のプラットフォーム (Android 等) では常に有効。
 */
export function canUseEdgeSwipe(): boolean {
  if (typeof window === "undefined") return false;
  return !isIOS() || isStandalonePWA();
}
