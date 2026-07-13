import { redirect } from "next/navigation";

/**
 * The "Page content" admin section moved to the structured Page Content CMS
 * (`/admin/page-content`) — see docs/plans/page-content-cms-implementation-prompt.md.
 * This shim keeps old bookmarks/links working.
 */
export default function AdminPagesRedirect() {
  redirect("/admin/page-content");
}
