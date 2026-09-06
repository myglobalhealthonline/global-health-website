import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Batch 14 — accessible clickable table rows.
 *
 * The frontend has exactly one table-row primitive that turns a row into a
 * click target: `ColumnPriorityTable`, which wraps the FIRST cell of every
 * row in a native control when the caller passes `onRowClick`. Two defects
 * in that wrapping are asserted here.
 *
 *  ROW-1  The wrapper's accessible name. The default
 *         `aria-label="View details for {getRowKey(row)}"` OVERRIDES the
 *         visible identifying text of the cell it wraps — a patient name, a
 *         user's email, a booking reference — and replaces it with the row
 *         key, which is an opaque uuid on every caller. WCAG 2.2 §2.5.3
 *         *Label in Name* (Level A): the accessible name must contain the
 *         visible text. Screen-reader users get "View details for
 *         3f2a-…" for every row in the table and cannot tell them apart.
 *
 *  ROW-3  `corporate/employees` renders its own `<Link>` to
 *         `/corporate/employees/{id}` as the first cell's content, so
 *         `ColumnPriorityTable` wraps that anchor inside its `<button>`.
 *         An `<a>` inside a `<button>` is invalid HTML with undefined
 *         activation behaviour, and the button's aria-label hides the
 *         link's own name from assistive tech.
 *
 * ROW-2 below is a structural guard rather than a regression test: it pins the
 * shape a future "fix" must not reach for (a role/tabIndex on `<tr>`, or a
 * control wrapping the whole row).
 *
 * Rendering is `renderToStaticMarkup` — the pattern already used by
 * `corporate-boundaries.test.tsx` and `css-ownership-and-skip-link.test.tsx`,
 * so no jsdom or other dependency is introduced for this batch. All fixture
 * data below is synthetic.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/corporate/employees",
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * The three rendered components pull in large Next component graphs whose
 * transform dominates this file. Imported once here rather than inside the
 * `it`s so the cost is paid by the hook instead of landing inside a 5s test
 * timeout — measured 1.5s for the employees table under full-suite load, and
 * enough to exceed the timeout when a second test process competes for CPU.
 * Vitest hoists the `vi.mock` above this file's top-level code, so these
 * imports still see the mocked `next/navigation`.
 */
let EmployeesTable: typeof import("@/app/(portal)/(corporate)/corporate/employees/employees-table")["EmployeesTable"];
let AdminSubscriptionsTable: typeof import("@/app/(portal)/(admin)/admin/subscriptions/_components/admin-subscriptions-table")["AdminSubscriptionsTable"];
let PortalMobileCard: typeof import("@/components/PortalMobileCard")["PortalMobileCard"];

beforeAll(async () => {
  [{ EmployeesTable }, { AdminSubscriptionsTable }, { PortalMobileCard }] = await Promise.all([
    import("@/app/(portal)/(corporate)/corporate/employees/employees-table"),
    import("@/app/(portal)/(admin)/admin/subscriptions/_components/admin-subscriptions-table"),
    import("@/components/PortalMobileCard"),
  ]);
});

import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";

const FRONTEND = path.resolve(__dirname, "..", "..");

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** The markup of every `<button>…</button>` in `html`. Buttons cannot nest,
 *  so a non-greedy match per opening tag is exact. */
const buttons = (html: string) => html.match(/<button\b[\s\S]*?<\/button>/g) ?? [];

/** The markup of every `<a …>…</a>` in `html`. */
const links = (html: string) => html.match(/<a\b[\s\S]*?<\/a>/g) ?? [];

/** Only the desktop `<table>` half of a ColumnPriorityTable render — the
 *  mobile card list is a sibling `<div>` and is asserted separately. */
function tableHalf(html: string): string {
  const start = html.indexOf("<table");
  const end = html.indexOf("</table>");
  expect(start, "no <table> rendered").toBeGreaterThan(-1);
  return html.slice(start, end + "</table>".length);
}

const attr = (tag: string, name: string) =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

/** Visible text of a fragment, tags stripped. */
const textOf = (fragment: string) =>
  fragment
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/* ── fixtures ────────────────────────────────────────────────────────────── */

type Row = { id: string; name: string; email: string };

const ROWS: Row[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Ada Lovelace", email: "ada@example.test" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Grace Hopper", email: "grace@example.test" },
];

const FIELDS: ColumnPriorityField<Row>[] = [
  {
    key: "person",
    label: "Person",
    priority: 1,
    cardPrimary: true,
    render: (r) => (
      <div>
        <span className="font-semibold">{r.name}</span>
        <span className="text-xs">{r.email}</span>
      </div>
    ),
  },
  { key: "status", label: "Status", priority: 1, render: () => "Active" },
];

const renderTable = (props: Partial<Parameters<typeof ColumnPriorityTable<Row>>[0]> = {}) =>
  renderToStaticMarkup(
    <ColumnPriorityTable<Row>
      fields={FIELDS}
      rows={ROWS}
      getRowKey={(r) => r.id}
      {...props}
    />,
  );

/* ── ROW-1 ───────────────────────────────────────────────────────────────── */

describe("ROW-1 — the row control is named by the text the user can see", () => {
  it("does not override the visible cell text with the row key", () => {
    const html = tableHalf(renderTable({ onRowClick: () => {} }));
    const rowButtons = buttons(html);
    expect(rowButtons).toHaveLength(ROWS.length);

    for (const [i, button] of rowButtons.entries()) {
      // An aria-label replaces the element's content as its accessible name.
      // Naming the row by its uuid makes every row in the table sound the
      // same and hides the one piece of text that identifies it. No label at
      // all is the passing state here — the cell's own text names the button.
      expect(attr(button, "aria-label") ?? "", `row ${i} aria-label`).not.toContain(
        ROWS[i].id,
      );
    }
  });

  it("leaves the visible identifying text as the control's accessible name", () => {
    const html = tableHalf(renderTable({ onRowClick: () => {} }));

    for (const [i, button] of buttons(html).entries()) {
      const name = attr(button, "aria-label") ?? textOf(button);
      // WCAG 2.5.3: the accessible name contains the visible label.
      expect(name, `row ${i} accessible name`).toContain(ROWS[i].name);
    }
  });

  it("still lets a caller supply an explicit row label", () => {
    // `lab-requisitions-queue` passes one; that must keep winning, because a
    // first cell whose visible text is only a date needs the extra context.
    const html = tableHalf(
      renderTable({
        onRowClick: () => {},
        getRowAriaLabel: (r) => `Open record for ${r.name}`,
      }),
    );

    for (const [i, button] of buttons(html).entries()) {
      expect(attr(button, "aria-label")).toBe(`Open record for ${ROWS[i].name}`);
    }
  });

  it("renders no control at all when the caller passes no row handler", () => {
    const html = tableHalf(renderTable());
    expect(buttons(html)).toHaveLength(0);
    expect(links(html)).toHaveLength(0);
  });
});

/* ── table semantics ─────────────────────────────────────────────────────── */

describe("ROW-2 — rows stay rows", () => {
  it("puts no role or tab stop on <tr> itself", () => {
    const html = tableHalf(renderTable({ onRowClick: () => {} }));
    const rows = html.match(/<tr\b[^>]*>/g) ?? [];
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      expect(row).not.toMatch(/\brole=/);
      expect(row).not.toMatch(/\btabindex=/i);
      expect(row).not.toMatch(/\bonkeydown=/i);
    }
  });

  it("keeps the row control inside the first cell, not around the row", () => {
    const html = tableHalf(renderTable({ onRowClick: () => {} }));
    // A control wrapping the whole row would have to sit outside <td>.
    expect(html).not.toMatch(/<tr\b[^>]*>\s*<(?:a|button)\b/);
  });
});

/* ── the corporate employees table ───────────────────────────────────────── */

const EMPLOYEE_LOCALE = {
  colName: "Name",
  colEmail: "Email",
  colDepartment: "Department",
  colStatus: "Status",
  colBeneficiaries: "Beneficiaries",
  colActions: "Actions",
  emptyTitle: "No employees",
  emptyDescription: "Invite someone to get started.",
  employeeActionsAriaLabel: "Employee actions",
  viewDetails: "View details",
  resendInvite: "Resend invite",
  reactivate: "Reactivate",
  suspend: "Suspend",
  remove: "Remove",
  drawerEyebrow: "Employee",
  detailLoadError: "Could not load employee.",
} as const;

const EMPLOYEES = [
  {
    id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    jobTitle: "Analyst",
    department: "Engineering",
    status: "ACTIVE",
    beneficiaryCount: 0,
  },
  {
    id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    firstName: "Grace",
    lastName: "Hopper",
    email: "grace@example.test",
    jobTitle: null,
    department: null,
    status: "INVITED",
    beneficiaryCount: 2,
  },
];

function renderEmployeesTable(): string {
  return renderToStaticMarkup(
    <EmployeesTable
      // Synthetic rows only; the component's props are structurally typed
      // against the corporate DTO.
      employees={EMPLOYEES as never}
      employeeRowAction={() => {}}
      getEmployeeDetail={async () => null}
      t={EMPLOYEE_LOCALE as never}
    />,
  );
}

describe("ROW-3 — corporate employees rows expose one native link, unnested", () => {
  it("never nests an anchor inside the row control", () => {
    const html = tableHalf(renderEmployeesTable());

    for (const button of buttons(html)) {
      // `<a>` inside `<button>` is invalid HTML: activation behaviour is
      // undefined and the outer control's name masks the link's own.
      expect(button, "anchor nested in a button").not.toMatch(/<a\b/);
    }
  });

  it("gives each row a native link to the employee, named by the visible name", () => {
    const html = tableHalf(renderEmployeesTable());

    for (const employee of EMPLOYEES) {
      const rowLink = links(html).find(
        (a) => attr(a, "href") === `/corporate/employees/${employee.id}`,
      );
      expect(rowLink, `no row link for ${employee.id}`).toBeDefined();
      const name = attr(rowLink!, "aria-label") ?? textOf(rowLink!);
      expect(name).toContain(`${employee.firstName} ${employee.lastName}`);
    }
  });

  it("keeps the per-row action controls outside that link", () => {
    const html = tableHalf(renderEmployeesTable());

    for (const link of links(html)) {
      expect(link).not.toMatch(/<button\b/);
      expect(link).not.toMatch(/<input\b/);
      expect(link).not.toMatch(/<form\b/);
    }
  });

  it("still renders the row's own action forms as real submit controls", () => {
    const html = tableHalf(renderEmployeesTable());
    // The desktop actions cell posts to the existing server action; this
    // batch must not touch it.
    expect(html).toContain('name="employeeId"');
    expect(buttons(html).some((b) => /type="submit"/.test(b))).toBe(true);
  });
});

/* ── the corporate employees drawer keeps a desktop entry point ──────────── */

describe("ROW-4 — removing the row handler did not strand the quick view", () => {
  it("offers a native link to ?employee=<id> in the desktop actions cell", () => {
    const html = tableHalf(renderEmployeesTable());

    for (const employee of EMPLOYEES) {
      // The drawer's open state is derived from this param, so the quick view
      // is a real destination and a plain <a> reaches it — no handler needed.
      const quickView = links(html).find((a) =>
        (attr(a, "href") ?? "").includes(`employee=${employee.id}`),
      );
      expect(quickView, `no desktop quick-view link for ${employee.id}`).toBeDefined();
      expect(textOf(quickView!)).toBe(EMPLOYEE_LOCALE.viewDetails);
      // Distinct from the row's link to the full employee page.
      expect(attr(quickView!, "href")).not.toBe(`/corporate/employees/${employee.id}`);
    }
  });

  it("keeps the two row links pointing at different destinations", () => {
    const html = tableHalf(renderEmployeesTable());
    const hrefs = links(html).map((a) => attr(a, "href"));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

/* ── callers whose first cell does not identify the row ──────────────────── */

describe("ROW-5 — tables whose first cell repeats pass an explicit label", () => {
  it.each([
    [
      "duplicate patient groups",
      "app/(portal)/(admin)/admin/patients/duplicates/_components/duplicate-groups-table.tsx",
    ],
    [
      "doctor appointment medical notes",
      "app/(portal)/(doctor)/doctor/appointments/[id]/_components/appointment-medical-notes-section.tsx",
    ],
    [
      "patient consultation history",
      "app/(portal)/(doctor)/doctor/patients/[email]/_components/consultation-history-panel.tsx",
    ],
  ])(
    "%s names its row control explicitly",
    async (_name, file) => {
      // These three wrap a match-reason pill or a session date — text that
      // repeats across rows, so the cell alone cannot name the control. Read
      // as source: rendering them needs their live API payloads.
      const src = readFileSync(path.join(FRONTEND, file), "utf8");
      const rowClicks = src.match(/onRowClick=/g) ?? [];
      const labels = src.match(/getRowAriaLabel=/g) ?? [];
      expect(rowClicks.length).toBeGreaterThan(0);
      expect(labels.length, `${file}: one label per row handler`).toBe(rowClicks.length);
    },
  );
});

/* ── the mobile card ─────────────────────────────────────────────────────── */

/** Only the mobile card list of a ColumnPriorityTable render — the sibling of
 *  the `<table>` half, keyed off the class the list carries in portal.css. */
function mobileHalf(html: string): string {
  const start = html.indexOf('class="gh-admin-mobile-list');
  expect(start, "no mobile card list rendered").toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<div", start));
}

/** Every `gh-portal-mobile-card` opening tag in `html`. The trailing space
 *  requirement keeps the card's own BEM children (`…__title-row`) out. */
const cardTags = (html: string) =>
  html.match(/<(?:div|a)\b[^>]*class="gh-portal-mobile-card(?: [^"]*)?"[^>]*>/g) ?? [];

describe("ROW-6 — the mobile card is not a fake button", () => {
  it("renders a plain, non-interactive container around its own controls", () => {
    const html = renderToStaticMarkup(
      <PortalMobileCard title="Ada Lovelace" actions={<button type="button">Open</button>} />,
    );
    const [card] = cardTags(html);
    expect(card, "no card rendered").toBeDefined();
    expect(card).toMatch(/^<div\b/);
    expect(card, "card must not claim a widget role").not.toMatch(/\brole=/);
    expect(card, "card must not be a tab stop").not.toMatch(/\btabindex=/i);
    // A card that contains buttons/links/forms must not itself be a control:
    // ARIA forbids interactive descendants inside role="button", and the
    // nesting makes activation ambiguous for pointer AND keyboard users.
    expect(buttons(html).length).toBeGreaterThan(0);
  });

  it("no longer accepts a whole-card click handler at all", () => {
    // Deleted rather than deprecated: any surviving `onClick` prop would let a
    // caller re-introduce the interactive wrapper. The guard that used to make
    // the wrapper survivable (the keydown target check) goes with it.
    const src = readFileSync(
      path.join(FRONTEND, "components", "PortalMobileCard.tsx"),
      "utf8",
    );
    expect(src, "PortalMobileCard still declares an onClick prop").not.toMatch(
      /\bonClick\b/,
    );
    expect(src).not.toMatch(/role="button"/);
    expect(src).not.toMatch(/\btabIndex\b/);
    expect(src).not.toMatch(/\bonKeyDown\b/);
    expect(src, "target guard should be gone with the wrapper").not.toContain(
      "e.target !== e.currentTarget",
    );
  });

  it("still renders a native link card when `href` is given", () => {
    const html = renderToStaticMarkup(
      <PortalMobileCard title="Ada Lovelace" href="/admin/patients/ada" />,
    );
    const [card] = cardTags(html);
    expect(card, "no card rendered").toBeDefined();
    expect(card).toMatch(/^<a\b/);
    expect(attr(card!, "href")).toBe("/admin/patients/ada");
  });
});

describe("ROW-7 — every row action stays reachable on mobile", () => {
  it("gives the default card an explicit native control for the row handler", () => {
    const html = mobileHalf(renderTable({ onRowClick: () => {} }));
    for (const card of cardTags(html)) {
      expect(card).not.toMatch(/\brole=/);
      expect(card).not.toMatch(/\btabindex=/i);
    }
    // One "View" button per row — the card body itself is inert now, so this
    // button is the only mobile entry point and must exist.
    const viewButtons = buttons(html).filter((b) => textOf(b).startsWith("View"));
    expect(viewButtons).toHaveLength(ROWS.length);
  });

  it("renders no card control when there is no row handler", () => {
    const html = mobileHalf(renderTable());
    expect(buttons(html)).toHaveLength(0);
  });

  it("carries the caller's row label into the card button's accessible name", () => {
    // Rendered, not grepped: the desktop button applied `getRowAriaLabel` and
    // the mobile one did not, so every card in a list said only "View" —
    // exactly the ambiguity the label exists to remove, on the breakpoint
    // these tables are used at most.
    const html = mobileHalf(
      renderTable({
        onRowClick: () => {},
        getRowAriaLabel: (r) => `Open record for ${r.name}`,
      }),
    );
    const cardButtons = buttons(html);
    expect(cardButtons).toHaveLength(ROWS.length);

    for (const [i, button] of cardButtons.entries()) {
      const name = attr(button, "aria-label") ?? textOf(button);
      expect(name, `card ${i} accessible name`).toContain(`Open record for ${ROWS[i]!.name}`);
      // …and the visible word survives in it (WCAG 2.2 §2.5.3), which an
      // aria-label carrying only the row label would have destroyed.
      expect(name, `card ${i} keeps its visible label`).toContain("View");
    }
  });

  it("leaves the card button unlabelled when the caller passes no row label", () => {
    const html = mobileHalf(renderTable({ onRowClick: () => {} }));
    for (const button of buttons(html)) {
      expect(attr(button, "aria-label")).toBeUndefined();
      expect(button).not.toMatch(/sr-only/);
    }
  });

  it.each([
    [
      "duplicate patient groups",
      "app/(portal)/(admin)/admin/patients/duplicates/_components/duplicate-groups-table.tsx",
    ],
    [
      "doctor appointment medical notes",
      "app/(portal)/(doctor)/doctor/appointments/[id]/_components/appointment-medical-notes-section.tsx",
    ],
  ])(
    "%s disambiguates its own cardActions button too",
    (_name, file) => {
      // A caller that supplies `cardActions` opts out of the default button,
      // so it owns the same problem: these two give the desktop row an
      // explicit label precisely because the row text repeats, and their card
      // button repeats just as much.
      const src = readFileSync(path.join(FRONTEND, file as string), "utf8");
      const cardActions = src.slice(src.indexOf("cardActions="));
      expect(cardActions, `${file}: card button has no per-row context`).toContain(
        'className="sr-only"',
      );
    },
  );

  it.each([
    [
      "admin patients",
      "app/(portal)/(admin)/admin/patients/_components/admin-patients-table.tsx",
    ],
    ["admin users", "app/(portal)/(admin)/admin/users/_components/admin-users-table.tsx"],
  ])(
    "%s replaces the removed whole-card click with a real quick-view control",
    (_name, file) => {
      // These two pass `cardActions`, which REPLACES the default View button.
      // Their action was a link to the full record page — a different
      // destination from the row handler's quick-view drawer — so dropping
      // whole-card activation would strand the drawer on mobile unless the
      // actions row gains its own control for it.
      const src = readFileSync(path.join(FRONTEND, file), "utf8");
      const cardActions = src.slice(src.indexOf("cardActions="));
      expect(cardActions).toContain("openQuickView");
      expect(cardActions).toMatch(/Quick view/);
    },
  );
});

/* ── the admin subscriptions mobile card ─────────────────────────────────── */

const SUBSCRIPTIONS = [
  {
    id: "cccccccc-1111-4111-8111-cccccccccccc",
    status: "ACTIVE",
    cancelAtPeriodEnd: false,
    startedAt: "2026-01-05T00:00:00.000Z",
    canceledAt: null,
    currentPeriodStart: "2026-08-05T00:00:00.000Z",
    currentPeriodEnd: "2026-09-05T00:00:00.000Z",
    paidMonthsCount: 8,
    countryCode: "ie",
    user: { id: "u-1", fullName: "Ada Lovelace", email: "ada@example.test" },
    plan: { id: "p-1", name: "Essential", monthlyPriceCents: 2900, currencyCode: "eur" },
    planSnapshot: null,
    balances: [
      { kind: "CONSULTATION", balance: 2 },
      { kind: "WELLNESS", balance: 1 },
    ],
  },
  {
    id: "dddddddd-2222-4222-8222-dddddddddddd",
    status: "PAST_DUE",
    cancelAtPeriodEnd: true,
    startedAt: "2026-02-05T00:00:00.000Z",
    canceledAt: null,
    currentPeriodStart: "2026-08-05T00:00:00.000Z",
    currentPeriodEnd: "2026-09-05T00:00:00.000Z",
    paidMonthsCount: 3,
    countryCode: "pt",
    user: { id: "u-2", fullName: null, email: "grace@example.test" },
    plan: { id: "p-2", name: "Family", monthlyPriceCents: 4900, currencyCode: "eur" },
    planSnapshot: null,
    balances: [],
  },
];

function renderSubscriptionsTable(): string {
  return renderToStaticMarkup(
    <AdminSubscriptionsTable
      // Synthetic rows only — no real subscriber or payment data.
      items={SUBSCRIPTIONS as never}
      canAdjustCredits={false}
      resyncAction={() => {}}
      regrantAction={() => {}}
      refundAction={() => {}}
    />,
  );
}

describe("ROW-8 — admin subscriptions keeps its quick view without a clickable card", () => {
  it("renders the mobile card as an inert container", () => {
    const html = mobileHalf(renderSubscriptionsTable());
    const cards = cardTags(html);
    expect(cards).toHaveLength(SUBSCRIPTIONS.length);
    for (const card of cards) {
      expect(card).toMatch(/^<div\b/);
      expect(card).not.toMatch(/\brole=/);
      expect(card).not.toMatch(/\btabindex=/i);
    }
  });

  it("offers one labelled Quick view control per card", () => {
    const html = mobileHalf(renderSubscriptionsTable());
    const quickView = buttons(html).filter((b) => /Quick view/.test(textOf(b)));
    expect(quickView).toHaveLength(SUBSCRIPTIONS.length);
    for (const button of quickView) {
      expect(attr(button, "type")).toBe("button");
      // Named per row, not "Quick view" xN with nothing to tell them apart.
      const name = attr(button, "aria-label") ?? textOf(button);
      expect(name.length).toBeGreaterThan("Quick view".length);
    }
  });

  it("keeps the repair actions as their own submit controls, not drawer openers", () => {
    const html = mobileHalf(renderSubscriptionsTable());
    // Each repair action is a <form> posting to an existing server action. It
    // used to sit inside the card's onClick wrapper, so a click that missed a
    // button opened the drawer; the inert card removes that path entirely.
    expect(html).toContain('name="subscriptionId"');
    const submits = buttons(html).filter((b) => attr(b, "type") === "submit");
    expect(submits.length).toBeGreaterThanOrEqual(SUBSCRIPTIONS.length * 2);
    for (const submit of submits) {
      expect(textOf(submit)).not.toMatch(/Quick view/);
    }
  });

  it("opens the quick view through the param-preserving handler", () => {
    // No jsdom in this suite (environment: "node"), so the URL contract is
    // asserted on the source: `openQuickView` clones the CURRENT search params
    // before setting `sub`, which is what keeps the page's status/country
    // filters alive when the drawer opens.
    const src = readFileSync(
      path.join(
        FRONTEND,
        "app/(portal)/(admin)/admin/subscriptions/_components/admin-subscriptions-table.tsx",
      ),
      "utf8",
    );
    const fn = src.slice(src.indexOf("function openQuickView"));
    expect(fn).toContain("new URLSearchParams(searchParams.toString())");
    expect(fn).toContain('next.set("sub", id)');
    // …and the mobile Quick view button is wired to exactly that handler,
    // inside the card's `actions` row rather than on the card itself (the
    // inert-container assertion above is what proves the wrapper is gone).
    const mobile = src.slice(src.indexOf("gh-admin-mobile-list"));
    expect(mobile).toContain("openQuickView(sub.id)");
    expect(mobile).toMatch(/actions=\{[\s\S]*?openQuickView\(sub\.id\)/);
  });
});

/* ── disclosure state ────────────────────────────────────────────────────── */

describe("ROW-9 — disclosure rows report their open/closed state", () => {
  const renderDisclosure = (openId: string) =>
    renderTable({
      onRowClick: () => {},
      isRowExpanded: (r: Row) => r.id === openId,
    });

  it("marks the desktop row control aria-expanded on both sides", () => {
    const html = tableHalf(renderDisclosure(ROWS[0].id));
    const rowButtons = buttons(html);
    expect(rowButtons).toHaveLength(ROWS.length);
    expect(attr(rowButtons[0]!, "aria-expanded")).toBe("true");
    expect(attr(rowButtons[1]!, "aria-expanded")).toBe("false");
  });

  it("marks the default mobile View button aria-expanded on both sides", () => {
    const html = mobileHalf(renderDisclosure(ROWS[1].id));
    const viewButtons = buttons(html).filter((b) => textOf(b).startsWith("View"));
    expect(viewButtons).toHaveLength(ROWS.length);
    expect(attr(viewButtons[0]!, "aria-expanded")).toBe("false");
    expect(attr(viewButtons[1]!, "aria-expanded")).toBe("true");
  });

  it("leaves ordinary row controls with no aria-expanded at all", () => {
    // A drawer/dialog/navigation row is not a disclosure. Announcing
    // "collapsed" on one is a lie about what activating it does.
    const desktop = tableHalf(renderTable({ onRowClick: () => {} }));
    const mobile = mobileHalf(renderTable({ onRowClick: () => {} }));
    for (const button of [...buttons(desktop), ...buttons(mobile)]) {
      expect(button, "non-disclosure control got aria-expanded").not.toMatch(
        /aria-expanded/,
      );
    }
  });

  it.each([
    [
      "doctor appointment medical notes",
      "app/(portal)/(doctor)/doctor/appointments/[id]/_components/appointment-medical-notes-section.tsx",
      1,
    ],
    [
      "patient consultation history",
      "app/(portal)/(doctor)/doctor/patients/[email]/_components/consultation-history-panel.tsx",
      2,
    ],
  ])("%s wires its existing expansion state through", (_name, file, count) => {
    const src = readFileSync(path.join(FRONTEND, file as string), "utf8");
    // One `isRowExpanded` per disclosure table, reading the SAME state the
    // row handler toggles — no second source of truth.
    expect((src.match(/isRowExpanded=/g) ?? []).length).toBe(count);
    expect((src.match(/onRowClick=/g) ?? []).length).toBe(count);
  });

  it("marks the medical-notes card action as the disclosure it is", () => {
    // That table replaces the default View button with its own View/Hide
    // note toggle, so the state has to be declared on that button directly.
    const src = readFileSync(
      path.join(
        FRONTEND,
        "app/(portal)/(doctor)/doctor/appointments/[id]/_components/appointment-medical-notes-section.tsx",
      ),
      "utf8",
    );
    const cardActions = src.slice(src.indexOf("cardActions="));
    expect(cardActions).toMatch(/aria-expanded=\{expandedId === n\.id\}/);
  });
});
