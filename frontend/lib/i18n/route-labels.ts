import type { LocaleCode } from "@/lib/i18n/types";
import type { PublicRouteRegistryEntry } from "@/lib/routing/public-route-registry";

import enRoutes from "@/locales/en/routes.json";
import ptRoutes from "@/locales/pt/routes.json";
import esRoutes from "@/locales/es/routes.json";
import csRoutes from "@/locales/cs/routes.json";
import roRoutes from "@/locales/ro/routes.json";
import deRoutes from "@/locales/de/routes.json";

type RouteLabelEntry = {
  pageLabel?: string;
  navigationLabel?: string;
  pageTitle?: string;
  shortDescription?: string;
};

type RouteLabelsBundle = {
  labels: Record<string, RouteLabelEntry>;
};

const routeLabelsByLocale: Record<LocaleCode, RouteLabelsBundle> = {
  en: enRoutes,
  pt: ptRoutes,
  es: esRoutes,
  cs: csRoutes,
  ro: roRoutes,
  de: deRoutes,
};

export function getRouteLabels(
  route: PublicRouteRegistryEntry,
  locale: LocaleCode,
): Required<RouteLabelEntry> {
  const localeLabels = routeLabelsByLocale[locale].labels[route.routeKey] ?? {};
  const fallbackLabels = routeLabelsByLocale.en.labels[route.routeKey] ?? {};

  return {
    pageLabel: localeLabels.pageLabel ?? fallbackLabels.pageLabel ?? route.labels.pageLabel,
    navigationLabel:
      localeLabels.navigationLabel ?? fallbackLabels.navigationLabel ?? route.labels.navigationLabel,
    pageTitle: localeLabels.pageTitle ?? fallbackLabels.pageTitle ?? route.labels.pageTitle,
    shortDescription:
      localeLabels.shortDescription ??
      fallbackLabels.shortDescription ??
      route.labels.shortDescription,
  };
}
