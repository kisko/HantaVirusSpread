import type { EventsAdapter } from "@/lib/connectors/types";

export const whoEventsAdapter: EventsAdapter = {
  id: "who-manual-placeholder",
  async fetchEvents() {
    return [];
  },
};
