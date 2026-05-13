import type { CasesConnector } from "@/lib/connectors/types";
import { parseCasesCsvToRecords } from "@/lib/ingestion/casesCsv";
import { getCountries } from "@/lib/storage";

export const ecdcCsvConnector: CasesConnector = {
  id: "ecdc-csv",
  async ingestCsv({ csvText, sourceOrg, sourceUrl }) {
    const countries = await getCountries();
    return parseCasesCsvToRecords({
      csvText,
      countries,
      sourceOrg: sourceOrg ?? "ECDC CSV upload",
      sourceUrl: sourceUrl ?? "https://www.ecdc.europa.eu/",
    });
  },
};
