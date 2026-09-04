export function countryGpFeature3Subtitle(code: string, locale: string, fallback: string): string {
  return code.toLowerCase() === "cz" && locale.toLowerCase() === "cs"
    ? "Termíny se zobrazují podle aktuální dostupnosti."
    : fallback;
}
