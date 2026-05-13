import { NextRequest, NextResponse } from "next/server";
import { loadEvents } from "@/lib/dataLoaders";
import { insertEvent } from "@/lib/storage";
import { CreateEventSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const countryCode = req.nextUrl.searchParams.get("countryCode") ?? undefined;
    const data = await loadEvents(countryCode ?? undefined);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const created = await insertEvent(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
