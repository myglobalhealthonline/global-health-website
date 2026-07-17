/**
 * Canonical profile-image `Asset.key` for a doctor. One row per doctor, keyed
 * stably so admin edits and doctor uploads update the same asset instead of
 * racing competing UUID rows. Public selectors read this row.
 */
export function doctorProfileImageKey(doctorId: string): string {
  return `doctor-${doctorId}-profile`;
}

/**
 * Asset key holding a doctor's uploaded-but-not-yet-approved profile photo.
 * Always `isActive: false`, so no public/admin selector picks it up; approving
 * the matching DoctorProfileChangeRequest copies its `path` onto the canonical
 * row above. Re-uploading while a request is pending overwrites this same row.
 */
export function doctorPendingProfileImageKey(doctorId: string): string {
  return `doctor-${doctorId}-profile-pending`;
}
