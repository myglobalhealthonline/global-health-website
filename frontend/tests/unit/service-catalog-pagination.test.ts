import { describe, expect, it } from "vitest";

const PAGE_SIZE_FEATURED = 5;
const PAGE_SIZE_REGULAR = 6;

/** Mirrors the pagination math in ServiceCatalog.tsx / ServicesGrid.tsx:
 *  page 0 renders PAGE_SIZE_FEATURED items, every later page renders
 *  PAGE_SIZE_REGULAR. Regression coverage for the bug where a plain
 *  `page * pageSize` offset (assuming a uniform page size) silently
 *  dropped the item at index PAGE_SIZE_FEATURED once you paginated
 *  past page 0 — e.g. Ireland's 16 GENERAL services lost item #6
 *  (weight-management-consultation) from every page. */
function paginate(itemCount: number, canFeatureFirst: boolean) {
  const firstPageSize = canFeatureFirst ? PAGE_SIZE_FEATURED : PAGE_SIZE_REGULAR;
  const totalPages =
    itemCount <= firstPageSize
      ? 1
      : 1 + Math.ceil((itemCount - firstPageSize) / PAGE_SIZE_REGULAR);
  const pages: Array<[number, number]> = [];
  for (let page = 0; page < totalPages; page++) {
    const start = page === 0 ? 0 : firstPageSize + (page - 1) * PAGE_SIZE_REGULAR;
    const end = page === 0 ? firstPageSize : start + PAGE_SIZE_REGULAR;
    pages.push([start, end]);
  }
  return pages;
}

function coveredIndexes(itemCount: number, canFeatureFirst: boolean): number[] {
  const covered: number[] = [];
  for (const [start, end] of paginate(itemCount, canFeatureFirst)) {
    for (let i = start; i < Math.min(end, itemCount); i++) covered.push(i);
  }
  return covered;
}

describe("service grid pagination", () => {
  it.each([0, 1, 4, 5, 6, 10, 11, 15, 16, 17, 23])(
    "covers every item exactly once for %d items (featured first page)",
    (itemCount) => {
      const covered = coveredIndexes(itemCount, true);
      expect(covered).toEqual(Array.from({ length: itemCount }, (_, i) => i));
    },
  );

  it.each([0, 1, 4, 5, 6, 10, 11, 12, 17])(
    "covers every item exactly once for %d items (no featured page)",
    (itemCount) => {
      const covered = coveredIndexes(itemCount, false);
      expect(covered).toEqual(Array.from({ length: itemCount }, (_, i) => i));
    },
  );

  it("reproduces the Ireland GP page case: 16 items, item #6 (index 5) must render", () => {
    const covered = coveredIndexes(16, true);
    expect(covered).toContain(5);
    expect(covered).toHaveLength(16);
  });
});
