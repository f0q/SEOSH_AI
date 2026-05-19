// YooKassa webhook receiver.
// YooKassa POSTs notification.json events here; we re-fetch the canonical
// payment from their API (inside parseWebhook) before granting tokens, so
// a malicious POST cannot trick us into crediting an account.

import { NextResponse } from "next/server";
import { getProvider } from "@/server/services/billing/registry";
import { applyProviderUpdate } from "@/server/services/billing/paymentService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  try {
    const provider = await getProvider("yookassa");
    const event = await provider.parseWebhook({ rawBody, headers });
    await applyProviderUpdate({
      externalId: event.externalId,
      status: event.status === "PENDING" ? "WAITING" : event.status,
      rawPayload: event.rawPayload,
    });
    // YooKassa requires 200 OK to stop retrying.
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
