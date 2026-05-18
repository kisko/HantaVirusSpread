// Extract region/province information from signal text for better localization
// Maps common region names/keywords to their respective countries

const REGION_KEYWORDS: Record<string, string[]> = {
  // Germany
  "Baden-Württemberg": [
    "Baden-Württemberg",
    "Baden Württemberg",
    "BW",
    "Black Forest",
    "Schwarzwald",
  ],
  Bavaria: ["Bavaria", "Bayern", "Bavarian"],
  "North Rhine-Westphalia": [
    "North Rhine-Westphalia",
    "Nordrhein-Westfalen",
    "NRW",
  ],
  Berlin: ["Berlin"],
  Hamburg: ["Hamburg"],
  Hesse: ["Hesse", "Hessen"],
  "Lower Saxony": ["Lower Saxony", "Niedersachsen"],
  "Rhineland-Palatinate": ["Rhineland-Palatinate", "Rheinland-Pfalz"],
  "Schleswig-Holstein": ["Schleswig-Holstein"],
  Thuringia: ["Thuringia", "Thüringen"],
  Saxony: ["Saxony", "Sachsen"],

  // Sweden
  Dalarna: ["Dalarna", "Dalarnas"],
  Gävleborg: ["Gävleborg"],
  "Värmland": ["Värmland"],
  Jämtland: ["Jämtland"],
  Västernorrland: ["Västernorrland"],
  Uppsala: ["Uppsala"],

  // Finland
  "Eastern Finland": ["Eastern Finland", "Itä-Suomi"],
  Karelia: ["Karelia", "Pohjois-Karjala", "North Karelia"],
  "North Ostrobothnia": ["North Ostrobothnia", "Pohjois-Pohjanmaa"],
  "Central Finland": ["Central Finland", "Keski-Suomi"],

  // Norway
  Innlandet: ["Innlandet", "Hedmark", "Oppland"],
  Trøndelag: ["Trøndelag", "Nord-Trøndelag", "Sør-Trøndelag"],
  Buskerud: ["Buskerud", "Viken"],
  "Eastern Norway": ["Eastern Norway", "Østlandet"],
  Telemark: ["Telemark"],
  Rogaland: ["Rogaland"],
  Hordaland: ["Hordaland", "Sogn og Fjordane"],

  // Poland
  Silesia: ["Silesia", "Śląskie"],
  Masovia: ["Masovia", "Mazowieckie"],
  "Greater Poland": ["Greater Poland", "Wielkopolskie"],
  Łódź: ["Łódź", "Łódzkie"],
  Pomerania: ["Pomerania", "Pomorskie"],

  // Czech Republic
  Moravia: ["Moravia", "Moravian", "Moravskoslezský"],
  Bohemia: ["Bohemia", "Bohemian"],
  Prague: ["Prague", "Praha"],
  "Central Bohemia": ["Central Bohemia", "Středočeský"],

  // Slovakia
  "Eastern Slovakia": ["Eastern Slovakia", "Prešov", "Košice"],
  "Central Slovakia": ["Central Slovakia", "Banská Bystrica"],
  "Western Slovakia": ["Western Slovakia", "Bratislava"],

  // Austria
  Tyrol: ["Tyrol", "Tirol"],
  Vorarlberg: ["Vorarlberg"],
  Salzburg: ["Salzburg"],
  Styria: ["Styria", "Steiermark"],
  Carinthia: ["Carinthia", "Kärnten"],
  Vienna: ["Vienna", "Wien"],

  // Russia
  "Ural": ["Ural", "Уральский"],
  Siberia: ["Siberia", "Сибирь"],
  "Far East": ["Far East", "Дальний Восток"],
};

/**
 * Extract region/province information from signal title and snippet
 * Returns the most specific region found, or undefined if none found
 */
export function extractRegionFromSignal(
  title: string,
  snippet: string
): string | undefined {
  const combinedText = `${title} ${snippet}`.toLowerCase();

  // Find all matching regions and return the first/most specific match
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        return region;
      }
    }
  }

  return undefined;
}

/**
 * Get common region centroids for better map positioning
 * Returns approximate lat/lon for known regions
 */
export function getRegionCentroid(
  region: string,
  countryCode: string
): { lat: number; lon: number } | undefined {
  // Regional centroids (approximate)
  const regionCentroids: Record<string, Record<string, { lat: number; lon: number }>> = {
    DE: {
      "Baden-Württemberg": { lat: 48.5, lon: 9.0 },
      Bavaria: { lat: 48.5, lon: 11.5 },
      "North Rhine-Westphalia": { lat: 51.5, lon: 7.5 },
      Berlin: { lat: 52.52, lon: 13.405 },
      Hamburg: { lat: 53.55, lon: 10.0 },
      Hesse: { lat: 50.1, lon: 9.5 },
      "Lower Saxony": { lat: 52.5, lon: 9.5 },
      "Rhineland-Palatinate": { lat: 50.0, lon: 7.5 },
      "Schleswig-Holstein": { lat: 54.0, lon: 10.0 },
      Thuringia: { lat: 50.5, lon: 11.0 },
      Saxony: { lat: 51.0, lon: 13.5 },
    },
    SE: {
      Dalarna: { lat: 61.5, lon: 15.5 },
      Gävleborg: { lat: 61.5, lon: 16.5 },
      Värmland: { lat: 60.5, lon: 13.5 },
      Jämtland: { lat: 63.5, lon: 15.5 },
      Västernorrland: { lat: 64.5, lon: 18.5 },
      Uppsala: { lat: 59.86, lon: 17.64 },
    },
    FI: {
      "Eastern Finland": { lat: 63.0, lon: 29.0 },
      Karelia: { lat: 63.5, lon: 30.5 },
      "North Ostrobothnia": { lat: 64.5, lon: 27.0 },
      "Central Finland": { lat: 62.5, lon: 25.5 },
    },
    NO: {
      Innlandet: { lat: 60.5, lon: 11.5 },
      Trøndelag: { lat: 64.0, lon: 12.0 },
      Buskerud: { lat: 60.5, lon: 10.0 },
      Telemark: { lat: 59.5, lon: 8.5 },
      Rogaland: { lat: 59.0, lon: 6.0 },
      Hordaland: { lat: 60.5, lon: 5.5 },
    },
    PL: {
      Silesia: { lat: 50.3, lon: 19.0 },
      Masovia: { lat: 52.2, lon: 21.0 },
      "Greater Poland": { lat: 52.1, lon: 16.8 },
      Łódź: { lat: 51.78, lon: 19.46 },
      Pomerania: { lat: 54.3, lon: 18.5 },
    },
    CZ: {
      Moravia: { lat: 49.5, lon: 17.5 },
      Bohemia: { lat: 50.0, lon: 14.5 },
      Prague: { lat: 50.08, lon: 14.44 },
      "Central Bohemia": { lat: 50.0, lon: 14.5 },
    },
    SK: {
      "Eastern Slovakia": { lat: 48.7, lon: 21.3 },
      "Central Slovakia": { lat: 48.7, lon: 19.1 },
      "Western Slovakia": { lat: 48.1, lon: 17.1 },
    },
    AT: {
      Tyrol: { lat: 47.5, lon: 11.5 },
      Vorarlberg: { lat: 47.5, lon: 10.0 },
      Salzburg: { lat: 47.8, lon: 13.0 },
      Styria: { lat: 47.5, lon: 15.5 },
      Carinthia: { lat: 46.5, lon: 14.5 },
      Vienna: { lat: 48.21, lon: 16.37 },
    },
    RU: {
      Ural: { lat: 60.0, lon: 60.0 },
      Siberia: { lat: 65.0, lon: 90.0 },
      "Far East": { lat: 60.0, lon: 130.0 },
    },
  };

  return regionCentroids[countryCode]?.[region];
}
