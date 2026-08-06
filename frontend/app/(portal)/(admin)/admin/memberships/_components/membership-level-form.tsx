import type { MembershipLevel } from "@/lib/admin/memberships-api";

/** Small muted helper line under a field. */
function Help({ children }: { children: React.ReactNode }) {
  return <span className="text-xs leading-snug text-[var(--color-text-muted)]">{children}</span>;
}

/**
 * Level settings: identity, ordering, and the family rules (§11).
 *
 * `maxDependents` is only meaningful with `familyEnabled`, and the backend
 * rejects the combination — `parseMembershipLevelForm` zeroes it when family is
 * off so unticking the box can't bounce the save on a leftover number.
 */
export function MembershipLevelFields({ level }: { level: MembershipLevel }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Name</span>
          <input
            name="name"
            className="gh-input"
            required
            maxLength={200}
            defaultValue={level.name}
          />
          <Help>Internal label. Members see the translated name.</Help>
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Slug</span>
          <input
            name="slug"
            className="gh-input font-mono"
            required
            minLength={2}
            maxLength={60}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={level.slug}
          />
          <Help>Used by the CSV import&apos;s optional `level` column.</Help>
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            min={0}
            className="gh-input max-w-[140px]"
            defaultValue={level.sortOrder}
          />
        </label>

        <label className="flex items-center gap-2 self-end pb-2">
          <input
            type="checkbox"
            name="isActive"
            className="gh-checkbox"
            defaultChecked={level.isActive}
          />
          <span className="gh-field-label">Active</span>
        </label>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
        <legend className="gh-field-label px-1">Family</legend>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="familyEnabled"
            className="gh-checkbox"
            defaultChecked={level.familyEnabled}
          />
          <span className="text-sm">Members on this level can cover dependents</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Maximum dependents</span>
            <input
              name="maxDependents"
              type="number"
              min={0}
              max={20}
              className="gh-input max-w-[140px]"
              defaultValue={level.maxDependents}
            />
            <Help>Ignored unless the box above is ticked.</Help>
          </label>

          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Included consultations are…</span>
            <select
              name="allowancePool"
              className="gh-select"
              defaultValue={level.allowancePool}
            >
              <option value="PER_PERSON">Counted separately for each person</option>
              <option value="SHARED">Shared across the member and their dependents</option>
            </select>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
