export type DoctorProfileSeoContext = Readonly<{
  name: string;
  title: string;
  country: string;
  languages: readonly string[];
  specialties: readonly string[];
}>;

function compactList(values: readonly string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function joinForSnippet(values: readonly string[], fallback: string): string {
  const cleaned = compactList(values);
  if (cleaned.length === 0) return fallback;
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned[0]}, ${cleaned[1]} and more`;
}

export function buildDoctorProfileSeoReplacements(
  context: DoctorProfileSeoContext,
): Record<string, string> {
  return {
    name: context.name,
    title: context.title,
    country: context.country,
    languages: joinForSnippet(context.languages, context.title),
    specialties: joinForSnippet(context.specialties, context.title),
  };
}

export function fillDoctorProfileSeoTemplate(
  template: string,
  context: DoctorProfileSeoContext,
): string {
  let out = template;
  for (const [key, value] of Object.entries(buildDoctorProfileSeoReplacements(context))) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}
