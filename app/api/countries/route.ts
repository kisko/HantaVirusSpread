import { NextResponse } from "next/server";
import { cache, DEFAULT_TTL_MS } from "@/lib/cache";
import { loadCountries } from "@/lib/dataLoaders";

export async function GET() {
  try {
    const data = await cache.getOrSet(
      "countries:all",
      async () => await loadCountries(),
      DEFAULT_TTL_MS
    );
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
