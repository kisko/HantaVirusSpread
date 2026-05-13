import { NextRequest, NextResponse } from "next/server";
import { cache, DEFAULT_TTL_MS } from "@/lib/cache";
import { loadConfirmed, filterByDays } from "@/lib/dataLoaders";
import { DaysParamSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const daysRaw = req.nextUrl.searchParams.get("days") ?? "30";
    const daysResult = DaysParamSchema.safeParse(daysRaw);
    if (!daysResult.success) {
      return NextResponse.json({ error: "Invalid 'days' parameter" }, { status: 400 });
    }
    const days = daysResult.data;

    const cacheKey = `confirmed:${days}`;
    const data = await cache.getOrSet(
      cacheKey,
      async () => {
        const all = await loadConfirmed();
        return filterByDays(all, days);
      },
      DEFAULT_TTL_MS
    );

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
