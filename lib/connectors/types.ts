import type { ConfirmedCaseRecord, CountryEventRecord } from "@/types";
import type { NormalizedSignalInput } from "@/lib/storage";

export interface CasesConnector {
  id: string;
  ingestCsv(params: {
    csvText: string;
    sourceOrg?: string;
    sourceUrl?: string;
  }): Promise<ConfirmedCaseRecord[]>;
}

export interface EventsAdapter {
  id: string;
  fetchEvents(): Promise<Omit<CountryEventRecord, "id">[]>;
}

export interface SignalsAdapter {
  id: string;
  fetchSignals(): Promise<NormalizedSignalInput[]>;
}
