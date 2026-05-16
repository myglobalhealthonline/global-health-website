import { cookies } from "next/headers";
import {
  AdminCard,
  Btn,
  PageHeader,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

const DEFAULT_API = "http://localhost:4000";

function adminApiBase() {
  return (
    process.env.ADMIN_API_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    DEFAULT_API
  );
}

type Subscriber = {
  id: string;
  email: string;
  countryCode: string | null;
  locale: string | null;
  source: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

async function fetchSubscribers(): Promise<
  | { ok: true; items: Subscriber[] }
  | { ok: false; message: string }
> {
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  try {
    const res = await fetch(`${adminApiBase()}/api/admin/newsletter`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      message?: string;
      data?: { items?: Subscriber[] };
    };
    if (!res.ok || !json.ok || !json.data?.items) {
      return { ok: false, message: json.message ?? "Could not load subscribers" };
    }
    return { ok: true, items: json.data.items };
  } catch {
    return { ok: false, message: "Admin backend unavailable" };
  }
}

export default async function AdminNewsletterPage() {
  const result = await fetchSubscribers();

  return (
    <>
      {/* Download CSV uses the same-origin Next route handler at
          /api/admin/newsletter.csv which forwards the session cookie to
          the backend. A direct cross-origin <a href> would 401 because
          the browser doesn't send cookies on cross-site navigations. */}
      <PageHeader
        eyebrow="Marketing"
        title="Newsletter subscribers"
        description="People who signed up via the public footer form. Export CSV for your mailer."
        actions={
          <Btn
            href="/api/admin/newsletter.csv"
            variant="primary"
            size="md"
          >
            Download CSV
          </Btn>
        }
      />

      {!result.ok ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </AdminCard>
      ) : result.items.length === 0 ? (
        <AdminCard>
          <p className="text-sm text-[var(--color-text-muted)]">
            No subscribers yet. Once visitors use the footer form they&apos;ll
            land here.
          </p>
        </AdminCard>
      ) : (
        <AdminCard padding={0}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-background-soft)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Country</th>
                <th className="px-4 py-3 font-semibold">Locale</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Signed up</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.items.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-semibold text-[var(--color-text-primary)]">{s.email}</td>
                  <td className="px-4 py-2">{s.countryCode ?? "—"}</td>
                  <td className="px-4 py-2">{s.locale ?? "—"}</td>
                  <td className="px-4 py-2">{s.source ?? "—"}</td>
                  <td className="px-4 py-2">
                    {new Date(s.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2">
                    {s.unsubscribedAt ? (
                      <span className="text-rose-700">Unsubscribed</span>
                    ) : (
                      <span className="text-emerald-700">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}
    </>
  );
}
