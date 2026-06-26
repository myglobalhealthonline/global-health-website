/**
 * Pure family-usage gate (§ appointment-claim, req #5). Decides whether a
 * consultation booked for a dependent may draw on the primary subscriber's
 * plan benefit. NO I/O — the service layer loads the FamilyMember row (filtered
 * by primaryUserId) and the snapshot flags, then passes them here.
 *
 * The gate combines, in order:
 *   1. ownership      — member belongs to the logged-in user (spoof guard)
 *   2. plan family    — snapshot.familyEnabled (Premium-only, write-gated)
 *   3. service family — rule.familyUsable for this service
 *   4. member allowed — member.canUseCredits ("approved to use benefits")
 *
 * Self-use (no family member) is always eligible — the per-line benefit
 * selection still decides whether a credit/discount is actually applied.
 */

export type FamilyIneligibleReason =
  | "NOT_OWNED" // member.primaryUserId !== userId (spoof / removed)
  | "FAMILY_NOT_ENABLED" // snapshot.familyEnabled === false (→ non-Premium)
  | "SERVICE_NOT_FAMILY_USABLE" // rule.familyUsable === false
  | "MEMBER_NOT_ALLOWED"; // member.canUseCredits === false

export interface FamilyEligibilityInput {
  /** True when the line targets a dependent (familyMemberId set). */
  forFamilyMember: boolean;
  /** Logged-in primary subscriber id. */
  userId: string;
  /** The loaded dependent, or null when not found / not owned. */
  member: { primaryUserId: string; canUseCredits: boolean } | null;
  /** snapshot.familyEnabled — Premium proof (G4 write-gates this to PREMIUM). */
  snapshotFamilyEnabled: boolean;
  /** The service rule's familyUsable flag from the snapshot. */
  ruleFamilyUsable: boolean;
}

export interface FamilyEligibilityResult {
  eligible: boolean;
  reason?: FamilyIneligibleReason;
}

export function resolveFamilyEligibility(
  input: FamilyEligibilityInput,
): FamilyEligibilityResult {
  if (!input.forFamilyMember) return { eligible: true }; // self-use
  if (!input.member || input.member.primaryUserId !== input.userId) {
    return { eligible: false, reason: "NOT_OWNED" };
  }
  if (!input.snapshotFamilyEnabled) {
    return { eligible: false, reason: "FAMILY_NOT_ENABLED" };
  }
  if (!input.ruleFamilyUsable) {
    return { eligible: false, reason: "SERVICE_NOT_FAMILY_USABLE" };
  }
  if (!input.member.canUseCredits) {
    return { eligible: false, reason: "MEMBER_NOT_ALLOWED" };
  }
  return { eligible: true };
}
