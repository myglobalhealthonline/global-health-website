/**
 * Human labels for the two doctor-initiated approval queues. Shared so the
 * bell feed, the sidebar badge tooltip and the Doctors list all describe the
 * same request in the same words.
 */

export function serviceKindLabel(kind: string): string {
  switch (kind) {
    case "GENERAL":
      return "GP consultation";
    case "SPECIALIST":
      return "Specialist consultation";
    case "PRESCRIPTION":
      return "Prescription";
    default:
      return "Service";
  }
}

export function profileChangeFieldLabel(field: string): string {
  switch (field) {
    case "fullName":
      return "name";
    case "qualifications":
      return "qualifications";
    case "bio":
      return "bio";
    case "registration":
      return "registration";
    case "photo":
      return "photo";
    default:
      return "profile";
  }
}
