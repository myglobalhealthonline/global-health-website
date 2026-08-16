import { env } from "../../config/env.js";

const GOOGLE_API_TIMEOUT_MS = 15_000;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export type SeoDateRange = {
  startDate: string;
  endDate: string;
};

type GoogleApiError = {
  error?: {
    message?: string;
    status?: string;
  };
};

export type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type SearchConsoleSegment = "revenue" | "tools" | "informational" | "legacy" | "other";

export type SearchConsoleSummary = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  pages: number;
};

const SEARCH_CONSOLE_SEGMENTS: SearchConsoleSegment[] = [
  "revenue",
  "tools",
  "informational",
  "legacy",
  "other",
];

const legacyPathPatterns = [
  /^\/(?:[a-z]{2}\/)?(?:ireland|czechia|portugal|spain|brazil|romania)-doctors(?:\/|$)/,
  /^\/(?:service-page|product-page|post|online-prescriptions)(?:\/|$)/,
  /^\/(?:[a-z]{2}\/)?home(?:-[a-z]{2})?(?:\/|$)/,
  /^\/(?:[a-z]{2}\/)?(?:about|faq)\/?$/,
  /^\/ireland-(?:specialist-consultations|sick-leave)(?:\/|$)/,
];

export function classifySearchConsolePage(page: string): SearchConsoleSegment {
  let path: string;
  try {
    path = new URL(page).pathname;
  } catch {
    return "other";
  }

  if (legacyPathPatterns.some((pattern) => pattern.test(path))) return "legacy";
  if (path.includes("/tools/")) return "tools";
  if (path === "/blog" || /\/blog(?:\/|$)/.test(path)) return "informational";
  if (path === "/") return "revenue";
  if (/^\/(?:ireland|czechia|portugal|spain|brazil|romania)\/(?:en|cs|pt|es|ro|de)\/?$/.test(path)) {
    return "revenue";
  }
  if (/\/(?:services|doctors|lab-tests)(?:\/|$)/.test(path)) return "revenue";
  if (/\/(?:gp-consultation-online|see-a-specialist)\/?$/.test(path)) return "revenue";
  return "other";
}

export function summarizeSearchConsoleRows(rows: SearchConsoleRow[]): SearchConsoleSummary {
  const clicks = rows.reduce((total, row) => total + (row.clicks ?? 0), 0);
  const impressions = rows.reduce((total, row) => total + (row.impressions ?? 0), 0);
  const weightedPosition = rows.reduce(
    (total, row) => total + (row.position ?? 0) * (row.impressions ?? 0),
    0,
  );

  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: impressions > 0 ? weightedPosition / impressions : 0,
    pages: rows.length,
  };
}

export function defaultSearchConsoleRange(now = new Date()): SeoDateRange {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { startDate: format(start), endDate: format(end) };
}

export type Ga4Row = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

function googleClientId(): string | undefined {
  return env.GOOGLE_CLIENT_ID?.trim() || env.GOOGLE_OAUTH_CLIENT_ID?.trim();
}

function googleClientSecret(): string | undefined {
  return env.GOOGLE_CLIENT_SECRET?.trim() || env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
}

function requireConfig(): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
} {
  const clientId = googleClientId();
  const clientSecret = googleClientSecret();
  const refreshToken = env.GOOGLE_SEO_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google SEO reporting is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_SEO_REFRESH_TOKEN.",
    );
  }

  return { clientId, clientSecret, refreshToken };
}

function assertDateRange(range: SeoDateRange): void {
  if (!datePattern.test(range.startDate) || !datePattern.test(range.endDate)) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }
  if (range.endDate < range.startDate) {
    throw new Error("endDate must be on or after startDate.");
  }
}

async function parseGoogleResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & GoogleApiError;
  if (!response.ok) {
    const message = data.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Google API request failed: ${message}`);
  }
  return data as T;
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = requireConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
  });
  const data = await parseGoogleResponse<{ access_token?: string }>(response);
  if (!data.access_token) throw new Error("Google OAuth response did not include an access token.");
  return data.access_token;
}

async function querySearchAnalytics(
  token: string,
  siteUrl: string,
  body: Record<string, unknown>,
): Promise<SearchConsoleRow[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
  });
  const data = await parseGoogleResponse<{ rows?: SearchConsoleRow[] }>(response);
  return data.rows ?? [];
}

export function isGoogleSeoConfigured(): boolean {
  return Boolean(
    googleClientId() &&
      googleClientSecret() &&
      env.GOOGLE_SEO_REFRESH_TOKEN?.trim() &&
      env.GOOGLE_GSC_SITE_URL?.trim() &&
      env.GOOGLE_GA4_PROPERTY_ID?.trim(),
  );
}

export async function querySearchConsole(
  range: SeoDateRange,
): Promise<{
  rows: SearchConsoleRow[];
  pages: SearchConsoleRow[];
  totals: SearchConsoleSummary;
  segments: Record<SearchConsoleSegment, SearchConsoleSummary>;
}> {
  assertDateRange(range);
  const siteUrl = env.GOOGLE_GSC_SITE_URL?.trim();
  if (!siteUrl) throw new Error("GOOGLE_GSC_SITE_URL is not configured.");

  const token = await getAccessToken();
  const baseQuery = {
    startDate: range.startDate,
    endDate: range.endDate,
    type: "web",
    dataState: "all",
  };
  const [totalRows, rows, pages] = await Promise.all([
    querySearchAnalytics(token, siteUrl, { ...baseQuery, rowLimit: 1 }),
    querySearchAnalytics(token, siteUrl, { ...baseQuery, dimensions: ["date"], rowLimit: 1_000 }),
    querySearchAnalytics(token, siteUrl, { ...baseQuery, dimensions: ["page"], rowLimit: 25_000 }),
  ]);
  const aggregate = totalRows[0];
  const totals: SearchConsoleSummary = {
    clicks: aggregate?.clicks ?? 0,
    impressions: aggregate?.impressions ?? 0,
    ctr: aggregate?.ctr ?? 0,
    position: aggregate?.position ?? 0,
    pages: pages.length,
  };
  const segments = Object.fromEntries(
    SEARCH_CONSOLE_SEGMENTS.map((segment) => [
      segment,
      summarizeSearchConsoleRows(
        pages.filter((row) => classifySearchConsolePage(row.keys?.[0] ?? "") === segment),
      ),
    ]),
  ) as Record<SearchConsoleSegment, SearchConsoleSummary>;

  return { rows, pages, totals, segments };
}

export async function queryGa4(
  range: SeoDateRange,
): Promise<{ rows: Ga4Row[]; dimensionHeaders: string[]; metricHeaders: string[] }> {
  assertDateRange(range);
  const propertyId = env.GOOGLE_GA4_PROPERTY_ID?.trim();
  if (!propertyId) throw new Error("GOOGLE_GA4_PROPERTY_ID is not configured.");

  const token = await getAccessToken();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
      dimensions: [
        { name: "date" },
        { name: "sessionDefaultChannelGroup" },
      ],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "eventCount" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: "10000",
    }),
    signal: AbortSignal.timeout(GOOGLE_API_TIMEOUT_MS),
  });

  const data = await parseGoogleResponse<{
    dimensionHeaders?: Array<{ name?: string }>;
    metricHeaders?: Array<{ name?: string }>;
    rows?: Ga4Row[];
  }>(response);

  return {
    dimensionHeaders: (data.dimensionHeaders ?? []).map((header) => header.name ?? ""),
    metricHeaders: (data.metricHeaders ?? []).map((header) => header.name ?? ""),
    rows: data.rows ?? [],
  };
}
