// Owner-only download endpoint for the generated llms.txt. Served as
// text/plain so the user can right-click → Save As, or `curl -O` it onto
// their server. Auth comes from the session cookie; no anonymous access.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { llmsTxt: true, name: true },
  });

  if (!project) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!project.llmsTxt) {
    return new NextResponse("llms.txt has not been generated yet", { status: 404 });
  }

  return new NextResponse(project.llmsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="llms.txt"`,
      "Cache-Control": "private, no-store",
    },
  });
}
