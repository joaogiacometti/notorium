import { NextResponse } from "next/server";
import { getServerEnv } from "@/env";
import { optimizeAutomaticFsrsParameters } from "@/features/flashcards/fsrs/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const env = getServerEnv();

  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Cron endpoint is not configured." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await optimizeAutomaticFsrsParameters();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "fsrs_automatic_optimization_failed",
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return NextResponse.json(
      { error: "Internal error while optimizing FSRS parameters." },
      { status: 500 },
    );
  }
}
