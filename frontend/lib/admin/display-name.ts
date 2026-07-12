// ponytail: display-only EN preference for admin staff; base name/title
// columns stay in the entity's default locale and are unchanged by this.
export function displayNameFrom<T extends string | null | undefined>(
  base: T,
  translations: { locale: string; name?: T; title?: T }[] | undefined,
  field: "name" | "title" = "name",
): T {
  const en = translations?.find((t) => t.locale.toUpperCase() === "EN");
  return (en?.[field] as T) || base;
}
