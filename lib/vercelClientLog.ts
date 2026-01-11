import type { Pitch } from "@/lib/types";

export type AudioAnalysisClientLogPayload = {
    type: "audio-analysis";
    sessionId: string;
    t: number; // epoch ms
    settings: {
        a4Freq: number;
        evalRangeCents: number;
        evalThreshold: number;
        fftSize: number;
        smoothingTimeConstant: number;
    };
    components: Array<{
        pitch: Pitch;
        deviation: number | null;
        centDeviation: number | null;
        expectedFreqHz: number | null;
        detectedFreqHz: number | null;
        detectedDb: number | null;
    }>;
};

function isEnabled(): boolean {
    return process.env.NEXT_PUBLIC_VERCEL_CLIENT_LOG === "1";
}

export function getClientLogFps(defaultFps = 1): number {
    const raw = process.env.NEXT_PUBLIC_VERCEL_CLIENT_LOG_FPS;
    const n = raw ? Number(raw) : defaultFps;
    return Number.isFinite(n) ? n : defaultFps;
}

export function sendVercelClientLog(payload: AudioAnalysisClientLogPayload) {
    if (typeof window === "undefined") return;
    if (!isEnabled()) return;

    const url = "/api/client-log";
    const body = JSON.stringify(payload);

    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return;
    }

    fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
    }).catch(() => { });
}
