import { describe, it, expect, afterEach, vi } from "vitest";
import { canUseEdgeSwipe, isIOS } from "@/lib/platform";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

function mockEnv(userAgent: string, standalone: boolean, platform = "Linux armv8l") {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
  Object.defineProperty(navigator, "standalone", {
    configurable: true,
    value: standalone,
  });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
}

describe("platform", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as { standalone?: boolean }).standalone;
  });

  it("isIOS: iPhone UA と iPadOS (MacIntel + タッチ) を判定する", () => {
    expect(isIOS({ userAgent: IPHONE_UA, platform: "iPhone", maxTouchPoints: 5 })).toBe(true);
    expect(isIOS({ userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
    expect(isIOS({ userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 0 })).toBe(false);
    expect(isIOS({ userAgent: ANDROID_UA, platform: "Linux", maxTouchPoints: 5 })).toBe(false);
  });

  it("Android では常に左端スワイプを有効にする", () => {
    mockEnv(ANDROID_UA, false);
    expect(canUseEdgeSwipe()).toBe(true);
  });

  it("iOS のブラウザタブでは無効 (Safari の戻るジェスチャと競合)", () => {
    mockEnv(IPHONE_UA, false, "iPhone");
    expect(canUseEdgeSwipe()).toBe(false);
  });

  it("iOS でもインストール済み PWA では有効", () => {
    mockEnv(IPHONE_UA, true, "iPhone");
    expect(canUseEdgeSwipe()).toBe(true);
  });
});
