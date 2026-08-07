"use client";

import { useState } from "react";
import { Btn } from "@/components/portal-atoms";
import { requestMembershipClaim } from "@/lib/api/me-memberships";

/**
 * Claim, step 1 (§5.3). Submitting mails a confirmation link to the address
 * the organisation enrolled — not to the person filling this in.
 *
 * There is intentionally **no** "we couldn't find that membership" state. The
 * backend answers identically for a hit and a miss because partner membership
 * numbers are often sequential; showing a distinct not-found message here
 * would hand back the enumeration oracle the backend just removed.
 */
export function MembershipClaimForm({ t }: { t: Record<string, string> }) {
  const [membershipId, setMembershipId] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await requestMembershipClaim({ membershipId: membershipId.trim(), email });
    setBusy(false);
    if (res.ok) {
      setSent(true);
      return;
    }
    // 403 is the one honest failure: it is about the caller's own account, not
    // about whether any membership matched.
    setError(res.status === 403 ? t.claimVerifyEmail : res.message);
  }

  if (sent) {
    return (
      <p className="gh-card p-5 text-sm" role="status">
        {t.claimSent}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="gh-card flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">{t.claimIdLabel}</span>
        <input
          className="gh-input"
          value={membershipId}
          onChange={(e) => setMembershipId(e.target.value)}
          required
          minLength={3}
          maxLength={64}
          autoComplete="off"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">{t.claimEmailLabel}</span>
        <input
          className="gh-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={320}
          autoComplete="email"
        />
      </label>

      {error ? (
        <p className="text-sm" role="alert" style={{ color: "var(--portal-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}

      {/* Form actions right-aligned, per the portal convention. */}
      <div className="flex justify-end">
        <Btn type="submit" disabled={busy}>
          {busy ? t.claimSending : t.claimSubmit}
        </Btn>
      </div>
    </form>
  );
}
