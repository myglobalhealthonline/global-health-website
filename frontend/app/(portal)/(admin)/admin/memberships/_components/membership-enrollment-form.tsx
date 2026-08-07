import type { MembershipEnrollment, MembershipLevel } from "@/lib/admin/memberships-api";

/**
 * Enrollment fields, shared by "add a member" and the member detail editor.
 *
 * A server component: nothing here depends on the value of another field, so
 * there is no reason to ship it to the browser.
 */
export function MembershipEnrollmentFields({
  levels,
  enrollment,
}: {
  levels: Pick<MembershipLevel, "id" | "name" | "isDefault" | "isActive">[];
  enrollment?: MembershipEnrollment;
}) {
  const day = (value: string | null | undefined): string =>
    value ? new Date(value).toISOString().slice(0, 10) : "";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Membership ID</span>
        <input
          name="membershipId"
          className="gh-input font-mono"
          required
          minLength={3}
          maxLength={64}
          defaultValue={enrollment?.membershipId ?? ""}
          placeholder="MEMS-00123"
        />
        <span className="text-xs text-[var(--color-text-muted)]">
          The partner&apos;s own number. Unique across every programme.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Email</span>
        <input
          name="email"
          type="email"
          className="gh-input"
          required
          maxLength={320}
          defaultValue={enrollment?.email ?? ""}
        />
        <span className="text-xs text-[var(--color-text-muted)]">
          Benefits attach to this address once the member signs in with a verified account.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">First name</span>
        <input
          name="firstName"
          className="gh-input"
          required
          maxLength={100}
          defaultValue={enrollment?.firstName ?? ""}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Last name</span>
        <input
          name="lastName"
          className="gh-input"
          required
          maxLength={100}
          defaultValue={enrollment?.lastName ?? ""}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Phone (optional)</span>
        <input
          name="phone"
          className="gh-input"
          maxLength={60}
          defaultValue={enrollment?.phone ?? ""}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Date of birth (optional)</span>
        <input
          name="dateOfBirth"
          type="date"
          className="gh-input"
          defaultValue={day(enrollment?.dateOfBirth)}
        />
      </label>

      {enrollment?.memberType === "DEPENDENT" ? (
        <p className="sm:col-span-2 rounded-[var(--radius-card-sm)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          This is a dependent: its level and term follow the primary member and cannot be set here.
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Level</span>
            <select
              name="levelId"
              className="gh-select"
              defaultValue={enrollment?.levelId ?? levels.find((l) => l.isDefault)?.id ?? ""}
            >
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                  {level.isDefault ? " (default)" : ""}
                  {level.isActive ? "" : " — inactive"}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Term starts</span>
              <input
                name="startDate"
                type="date"
                className="gh-input"
                required
                defaultValue={day(enrollment?.startDate) || new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Term ends</span>
              <input
                name="endDate"
                type="date"
                className="gh-input"
                defaultValue={day(enrollment?.endDate)}
              />
              <span className="text-xs text-[var(--color-text-muted)]">Leave blank for open-ended.</span>
            </label>
          </div>
        </>
      )}

      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="gh-field-label">Internal notes (optional)</span>
        <textarea
          name="adminNotes"
          className="gh-input min-h-[80px]"
          maxLength={5000}
          defaultValue={enrollment?.adminNotes ?? ""}
        />
        <span className="text-xs text-[var(--color-text-muted)]">
          Staff only — never shown to the member.
        </span>
      </label>
    </div>
  );
}
