import { NextResponse } from "next/server";
import { getServerEnv } from "@/env";
import { sweepOrphanBlobs } from "@/features/attachments/blob-gc";

export const dynamic = "force-dynamic";

// Safety-net garbage collector for orphaned blobs. Mutations delete blobs
// synchronously; this catches leaks from cascade deletes and transient delete
// failures. Pass `?dryRun=1` to report orphans without deleting them.
export async function GET(request: Request): Promise<NextResponse> {
  const env = getServerEnv();

  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Cron endpoint is not configured." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  try {
    const report = await sweepOrphanBlobs({ dryRun });

    if (!report) {
      return NextResponse.json(
        { error: "Media storage is not configured." },
        { status: 503 },
      );
    }

    // The safety circuit breaker fired: orphans exceeded the safe share of the
    // store, so nothing was deleted. Return a failure status so the scheduled
    // workflow (curl --fail-with-body) goes red and a human investigates a
    // suspected regression instead of silently shedding most of the store.
    if (report.aborted) {
      console.error("Blob sweep aborted by safety circuit breaker:", report);
      return NextResponse.json(report, { status: 409 });
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error("Failed to sweep orphaned blobs:", error);
    return NextResponse.json(
      { error: "Internal error while sweeping orphaned blobs." },
      { status: 500 },
    );
  }
}
