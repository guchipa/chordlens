const MAX_BODY_CHARS = 20_000;

export const onRequestPost: PagesFunction = async ({ request }) => {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const contentType = request.headers.get("content-type") ?? "";

  // JSON以外は無視（クライアント側を落とさない）
  if (!contentType.includes("application/json")) {
    return Response.json({ ok: true });
  }

  let body: unknown = null;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      console.warn("[client-log] payload too large", {
        ip,
        ua: request.headers.get("user-agent"),
        length: text.length,
      });
      return Response.json({ ok: true });
    }
    body = JSON.parse(text);
  } catch {
    return Response.json({ ok: true });
  }

  console.log("[client-log]", {
    ip,
    ua: request.headers.get("user-agent"),
    body,
  });

  return Response.json({ ok: true });
};
