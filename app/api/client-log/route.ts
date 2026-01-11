import { NextResponse } from "next/server";

const MAX_BODY_CHARS = 20_000;

export async function POST(req: Request) {
    const ip =
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "unknown";

    const contentType = req.headers.get("content-type") ?? "";

    // JSON以外は無視（クライアント側を落とさない）
    if (!contentType.includes("application/json")) {
        return NextResponse.json({ ok: true });
    }

    let body: unknown = null;
    try {
        // 大きすぎるpayloadでログが壊れるのを避ける
        const text = await req.text();
        if (text.length > MAX_BODY_CHARS) {
            console.warn("[client-log] payload too large", {
                ip,
                ua: req.headers.get("user-agent"),
                length: text.length,
            });
            return NextResponse.json({ ok: true });
        }
        body = JSON.parse(text);
    } catch {
        return NextResponse.json({ ok: true });
    }

    console.log("[client-log]", {
        ip,
        ua: req.headers.get("user-agent"),
        body,
    });

    return NextResponse.json({ ok: true });
}
