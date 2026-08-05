import { redirect } from "next/navigation";

/**
 * The breadcrumb trail links every path prefix, so "/admin/integrations" has to
 * resolve to something — without this page the "Integrations" crumb on the SÚKL
 * console 404s (tests/unit/portal-breadcrumb-routes.test.ts).
 *
 * SÚKL is the only integration, so a hub listing one card would be noise: send
 * the crumb to it. Turn this into a real index when a second one lands.
 */
export default function AdminIntegrationsPage() {
  redirect("/admin/integrations/sukl");
}
