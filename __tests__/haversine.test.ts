import { describe, it, expect } from "@jest/globals";
import { haversineKm } from "@/lib/haversine";

describe("haversineKm", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineKm(60, 20, 60, 20)).toBeCloseTo(0, 1);
  });

  it("returns ~111 km per degree of latitude", () => {
    const d = haversineKm(0, 0, 1, 0);
    expect(d).toBeCloseTo(111.2, 0);
  });

  it("Oslo to Berlin is approximately 800–950 km", () => {
    const d = haversineKm(59.91, 10.75, 52.52, 13.405);
    expect(d).toBeGreaterThan(750);
    expect(d).toBeLessThan(1000);
  });

  it("Oslo to Helsinki is approximately 750–900 km", () => {
    const d = haversineKm(59.91, 10.75, 60.17, 24.93);
    expect(d).toBeGreaterThan(700);
    expect(d).toBeLessThan(950);
  });

  it("Sydney to London is approximately 16,000 km", () => {
    const d = haversineKm(-33.87, 151.21, 51.51, -0.13);
    expect(d).toBeGreaterThan(15000);
    expect(d).toBeLessThan(17000);
  });
});
