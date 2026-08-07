"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/portal-atoms";
import { confirmMembershipClaim } from "@/lib/api/me-memberships";

/**
 * Claim, step 2 (§5.3).
 *
 * **The confirmation fires on a button press, never on page load.** The token
 * is single-use, and corporate mail scanners (SafeLinks and friends) fetch
 * every link in an inbound message — auto-confirming on render would let a
 * scanner burn the token before the member ever clicked, turning a valid claim
 * into a dead one. The property that matters is preserved: the request still
 * carries the session cookie, and the backend refuses any session but the one
 * that asked for the link.
 */
export function MembershipClaimConfirm({
  token,
  t,
}: {
  token: string | null;
  t: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  if (!token) {
    return (
      <p className="gh-card p-5 text-sm" role="alert">
        {t.confirmMissingToken}
      </p>
    );
  }

  async function onConfirm() {
    setBusy(true);
    const res = await confirmMembershipClaim(token!);
    setBusy(false);
    if (!res.ok) {
      setState("failed");
      return;
    }
    setState("done");
    router.refresh();
  }

  if (state === "done") {
    return (
      <div className="gh-card flex flex-col gap-4 p-5">
        <p className="text-sm" role="status">
          {t.confirmSuccess}
        </p>
        <div className="flex justify-end">
          <Btn onClick={() => router.push("/account/membership")}>{t.viewMembership}</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="gh-card flex flex-col gap-4 p-5">
      <p className="text-sm">{state === "failed" ? t.confirmFailed : t.confirmBody}</p>
      {state === "failed" ? null : (
        <div className="flex justify-end">
          <Btn onClick={onConfirm} disabled={busy}>
            {busy ? t.confirmWorking : t.confirmCta}
          </Btn>
        </div>
      )}
    </div>
  );
}
