import { NextRequest, NextResponse } from "next/server";
import { ecdcCsvConnector } from "@/lib/connectors/ecdcCsvConnector";
import { insertConfirmedCases } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing CSV file. Expected form-data key 'file'." }, { status: 400 });
    }

    const sourceOrg = typeof form.get("sourceOrg") === "string" ? String(form.get("sourceOrg")) : undefined;
    const sourceUrl = typeof form.get("sourceUrl") === "string" ? String(form.get("sourceUrl")) : undefined;

    const csvText = await file.text();
    const records = await ecdcCsvConnector.ingestCsv({ csvText, sourceOrg, sourceUrl });
    const inserted = await insertConfirmedCases(records);

    return NextResponse.json({ inserted, totalParsed: records.length }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
