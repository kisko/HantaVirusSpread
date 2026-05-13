import { NextResponse } from "next/server";
import { cache, DEFAULT_TTL_MS } from "@/lib/cache";
import { computeDashboardOverview } from "@/lib/storage";

export async function GET() {
  try {
    const data = await cache.getOrSet("overview:dashboard", async () => computeDashboardOverview(), DEFAULT_TTL_MS);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
