// Demo entry point — anyone can hit POST /api/demo/login and get signed in
// as a shared read-only demo user. All write tRPC operations are blocked by
// the enforceNonDemoForMutations middleware in server/trpc.ts, so the demo
// session can browse the interface but cannot mutate state.
//
// The demo user is created on first request and reused thereafter. Its
// password is irrelevant (anyone can request a session via this route), so
// it's hard-coded but isolated to this file.

import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/lib/auth";
import { ensureDemoProject } from "@/server/demo-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@seosh.aijam.pro";
const DEMO_PASSWORD = "seosh-demo-2026-readonly";
const DEMO_NAME = "Demo Visitor";

async function ensureDemoUserExists(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    if (!existing.isDemo) {
      await prisma.user.update({ where: { id: existing.id }, data: { isDemo: true } });
    }
    return existing.id;
  }
  // First request — provision the demo account via better-auth so the
  // password is properly hashed in the credential account record.
  try {
    await auth.api.signUpEmail({
      body: {
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      },
    });
  } catch (err) {
    // Race condition or already-exists — fine. Anything else, surface.
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes("already")) {
      throw err;
    }
  }
  const user = await prisma.user.update({
    where: { email: DEMO_EMAIL },
    data: { isDemo: true, emailVerified: true },
    select: { id: true },
  });
  return user.id;
}

export async function POST(req: Request) {
  try {
    const demoUserId = await ensureDemoUserExists();
    // Best-effort seed; if it fails we still let the user log in.
    try {
      await ensureDemoProject(demoUserId);
    } catch (seedErr) {
      console.error("[demo] failed to seed demo project:", seedErr);
    }
    const response = await auth.api.signInEmail({
      body: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
      headers: req.headers,
      asResponse: true,
    });
    // Forward set-cookie + body straight through so the browser stores the
    // session exactly as it would after a normal login.
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "demo login failed" },
      { status: 500 }
    );
  }
}
