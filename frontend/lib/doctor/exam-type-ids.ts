/**
 * Line-aligned catalogue ids for the exams-prescription textarea.
 *
 * The textarea stays the single source of truth — the doctor can reorder,
 * reword or delete lines freely — so catalogue ids are matched back to it by
 * exact label at submit time rather than tracked positionally while typing.
 * Each pick is consumed once, so ordering the same test twice maps to one id
 * per line instead of doubling up on the first.
 *
 * The backend reads this as one entry per exams line, blank for anything the
 * doctor typed by hand. Alignment is by index, which is why blank entries are
 * preserved rather than filtered out.
 *
 * Returns "" when nothing was picked, so the field is omitted entirely.
 */
export function buildExamTypeIdsField(
  exams: string,
  picked: { id: string; name: string }[],
): string {
  if (picked.length === 0) return "";
  const remaining = [...picked];
  const ids = exams.split(/\r?\n/).map((line) => {
    const label = line.trim();
    if (!label) return "";
    const hit = remaining.findIndex((p) => p.name.trim() === label);
    if (hit === -1) return "";
    return remaining.splice(hit, 1)[0]!.id;
  });
  return ids.some(Boolean) ? ids.join("\n") : "";
}
