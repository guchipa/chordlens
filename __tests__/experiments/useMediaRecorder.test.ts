/**
 * @jest-environment jsdom
 */
import { pickSupportedMimeType } from "@/lib/hooks/experiments/useMediaRecorder";

describe("pickSupportedMimeType", () => {
  const originalRecorder = (global as unknown as { MediaRecorder?: unknown })
    .MediaRecorder;

  afterEach(() => {
    (global as unknown as { MediaRecorder?: unknown }).MediaRecorder =
      originalRecorder;
  });

  it("WebM/Opus が利用可能ならそれを選ぶ", () => {
    (global as unknown as { MediaRecorder: unknown }).MediaRecorder = {
      isTypeSupported: (t: string) => t === "audio/webm;codecs=opus",
    };
    expect(pickSupportedMimeType()).toBe("audio/webm;codecs=opus");
  });

  it("WebM が無いときは mp4/aac にフォールバック", () => {
    (global as unknown as { MediaRecorder: unknown }).MediaRecorder = {
      isTypeSupported: (t: string) => t === "audio/mp4;codecs=mp4a.40.2",
    };
    expect(pickSupportedMimeType()).toBe("audio/mp4;codecs=mp4a.40.2");
  });

  it("MediaRecorder 自体が無い環境では null", () => {
    (global as unknown as { MediaRecorder: undefined }).MediaRecorder =
      undefined;
    expect(pickSupportedMimeType()).toBeNull();
  });

  it("どの MIME も対応しない場合は null", () => {
    (global as unknown as { MediaRecorder: unknown }).MediaRecorder = {
      isTypeSupported: () => false,
    };
    expect(pickSupportedMimeType()).toBeNull();
  });
});
