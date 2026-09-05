import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * FE-4: the doctor and service admin editors submitted through a plain
 * `<button type="submit">`. Nothing changed while the server action was in
 * flight, so a second click, a second Enter press, or an impatient
 * double-click sent the same payload again — and neither editor registered
 * with the shared unsaved-changes guard, so navigating away mid-edit
 * discarded the work silently.
 *
 * Both fixes reuse what the portal already has: `useFormStatus` +
 * the button's own native `disabled` (the same shape as the manual-booking
 * form's `SubmitButton`), and `useUnsavedChanges` + `UnsavedChangesGuard`
 * (the same pair the account and doctor portals mount).
 *
 * `disabled` is the whole mechanism, deliberately: a disabled submit button
 * fires no `click`, is skipped by keyboard activation, and is not an implicit
 * submitter for Enter — so all three repeat paths close with one attribute
 * and no bespoke click-guard state to get wrong.
 */

let pending = false;

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, useFormStatus: () => ({ pending }) };
});

/** `PortalTabs` (locale tabs inside the country-profile form) syncs the active
 *  tab to the URL, so it needs a router. Nothing under test reads it. */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/admin/doctors/doc-1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

import {
  ExternalSubmitButton,
  PendingSubmitButton,
  isFormPending,
  setFormPending,
} from "@/components/admin/pending-submit";
import { observeForm, type FormLike } from "@/components/admin/form-events";
import { UnsavedFormTracker } from "@/components/admin/unsaved-form-tracker";
import { BookingPauseCard } from "@/components/admin/BookingPauseCard";
import { ServiceLinksPanel } from "@/app/(portal)/(admin)/admin/services/_components/service-links-panel";
import { PeakPricingCard } from "@/app/(portal)/(admin)/admin/services/_components/peak-pricing-card";
import { CountryProfileTabs } from "@/app/(portal)/(admin)/admin/doctors/_components/country-profile-tabs";

afterEach(() => {
  pending = false;
  setFormPending("doctor-edit-form", false);
});

/** Minimal stand-in for the nodes `observeForm` attaches to — the unit suite
 *  has no DOM, and the helper only ever needs add/removeEventListener. */
function fakeNode() {
  const handlers = new Map<string, Set<EventListener>>();
  return {
    handlers,
    addEventListener(type: string, fn: EventListener) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: EventListener) {
      handlers.get(type)?.delete(fn);
    },
    /** `target` stands in for the control that emitted the event; its `.form`
     *  is what `observeForm` filters on, exactly as a real control's does. */
    fire(type: string, target: unknown = null) {
      for (const fn of handlers.get(type) ?? []) {
        fn({ type, target } as unknown as Event);
      }
    },
    count() {
      let n = 0;
      for (const set of handlers.values()) n += set.size;
      return n;
    },
  };
}

/** A form plus the document it is delegated from, as the tracker wires them. */
function fakeForm() {
  const form = fakeNode();
  const doc = fakeNode();
  return {
    form,
    doc,
    /** Attach the way `UnsavedFormTracker` does. */
    observe(onDirty: (dirty: boolean) => void) {
      return observeForm(form as unknown as FormLike, { onDirty }, doc as unknown as FormLike);
    },
    /** A control that belongs to this form — descendant or `form="…"` alike. */
    control() {
      return { form };
    },
  };
}

describe("doctor / service editor submit button", () => {
  it("is disabled while the server action is pending", () => {
    pending = true;
    const html = renderToStaticMarkup(
      <PendingSubmitButton>Save changes</PendingSubmitButton>,
    );

    expect(html).toContain("disabled");
  });

  it("is interactive when idle, so a failed save can be retried", () => {
    pending = false;
    const html = renderToStaticMarkup(
      <PendingSubmitButton>Save changes</PendingSubmitButton>,
    );

    // Both editors' actions redirect on failure too, so the form comes back
    // freshly rendered and idle — the button must not latch disabled.
    expect(html).not.toContain("disabled");
    expect(html).toContain("Save changes");
  });

  it("keeps the busy state visible rather than looking unresponsive", () => {
    pending = true;
    const html = renderToStaticMarkup(
      <PendingSubmitButton busyLabel="Saving…">Save changes</PendingSubmitButton>,
    );

    expect(html).toContain("Saving…");
    expect(html).toContain('aria-busy="true"');
  });

  it("announces the busy state, which disabling alone never does", () => {
    // Disabling a focused button drops focus to <body>, and an attribute
    // change on an unfocused element is announced by nothing — so the label
    // needs a live region of its own.
    pending = true;
    const busy = renderToStaticMarkup(
      <PendingSubmitButton busyLabel="Saving…">Save changes</PendingSubmitButton>,
    );
    expect(busy).toContain('aria-live="polite"');
    expect(busy).toMatch(/aria-live="polite"[^>]*>Saving…</);

    pending = false;
    const idle = renderToStaticMarkup(
      <PendingSubmitButton busyLabel="Saving…">Save changes</PendingSubmitButton>,
    );
    // Empty when idle: a live region that already holds text announces
    // nothing when it reappears with the same text.
    expect(idle).not.toContain("Saving…");
  });

  it("stays a submit button, so the action and payload are unchanged", () => {
    const html = renderToStaticMarkup(
      <PendingSubmitButton>Save changes</PendingSubmitButton>,
    );

    expect(html).toContain('type="submit"');
    // No `name`/`value`: an extra named control would land in the FormData the
    // server action parses.
    expect(html).not.toContain("name=");
  });
});

describe("the doctor editor's second submit button, outside the form", () => {
  it("still targets the same form", () => {
    const html = renderToStaticMarkup(
      <ExternalSubmitButton formId="doctor-edit-form">
        Save changes
      </ExternalSubmitButton>,
    );

    expect(html).toContain('form="doctor-edit-form"');
    expect(html).toContain('type="submit"');
    expect(html).not.toContain("disabled");
  });

  it("renders idle on the server, whatever the store says", () => {
    // `useSyncExternalStore`'s server snapshot is fixed at "not pending":
    // pending only ever exists on the client, and rendering a disabled button
    // into the HTML would be a hydration mismatch over state the server never
    // had. So the SSR markup below cannot show the pending path — the store
    // assertions in the next test are what cover it.
    setFormPending("doctor-edit-form", true);
    const html = renderToStaticMarkup(
      <ExternalSubmitButton formId="doctor-edit-form">
        Save changes
      </ExternalSubmitButton>,
    );

    expect(html).not.toContain("disabled");
  });

  it("takes its pending flag from the form's own status, not from a submit event", () => {
    // The editor's failure branch redirects to the SAME route — a soft
    // navigation that preserves client state at this tree position. A locally
    // latched `pending` would leave this button dead until a hard reload, so
    // the flag has to come from the in-form button's `useFormStatus`, which
    // React clears when the action settles.
    setFormPending("doctor-edit-form", true);
    expect(isFormPending("doctor-edit-form")).toBe(true);

    setFormPending("doctor-edit-form", false);
    expect(isFormPending("doctor-edit-form")).toBe(false);
    expect(
      renderToStaticMarkup(
        <ExternalSubmitButton formId="doctor-edit-form">
          Save changes
        </ExternalSubmitButton>,
      ),
    ).not.toContain("disabled");
  });

  it("does not lock for an unrelated form's action", () => {
    setFormPending("some-other-form", true);
    const html = renderToStaticMarkup(
      <ExternalSubmitButton formId="doctor-edit-form">
        Save changes
      </ExternalSubmitButton>,
    );

    expect(html).not.toContain("disabled");
    setFormPending("some-other-form", false);
  });
});

describe("unsaved-change protection on the admin editors", () => {
  it("registers dirty on the first edit", () => {
    const f = fakeForm();
    const states: boolean[] = [];
    f.observe((d) => states.push(d));

    f.doc.fire("input", f.control());

    expect(states).toEqual([true]);
  });

  it("sees edits to controls submitted from OUTSIDE the form element", () => {
    // The doctor editor's profile-photo card and practising-in checkboxes are
    // tied to the form by `form="doctor-edit-form"`. That governs submission,
    // not event propagation, so their events never bubble through the form —
    // listening on the form alone loses exactly the fields the page goes out
    // of its way to submit.
    const f = fakeForm();
    const states: boolean[] = [];
    f.observe((d) => states.push(d));

    f.doc.fire("change", f.control());

    expect(states).toEqual([true]);
  });

  it("ignores edits to a different form on the same page", () => {
    const f = fakeForm();
    const states: boolean[] = [];
    f.observe((d) => states.push(d));

    // The service editor renders two independent forms; the price form's
    // keystrokes must not mark the main editor dirty.
    f.doc.fire("input", { form: fakeNode() });

    expect(states).toEqual([]);
  });

  it("clears the warning on submit, so a successful save leaves nothing stale", () => {
    const f = fakeForm();
    const states: boolean[] = [];
    f.observe((d) => states.push(d));

    f.doc.fire("input", f.control());
    f.form.fire("submit");

    expect(states).toEqual([true, false]);
  });

  it("clears the warning when the form is reset back to its saved values", () => {
    const f = fakeForm();
    const states: boolean[] = [];
    f.observe((d) => states.push(d));

    f.doc.fire("change", f.control());
    f.form.fire("reset");

    expect(states).toEqual([true, false]);
  });

  it("detaches every listener on unmount", () => {
    const f = fakeForm();
    const stop = f.observe(() => {});

    expect(f.form.count() + f.doc.count()).toBeGreaterThan(0);
    stop();
    expect(f.form.count() + f.doc.count()).toBe(0);
  });

  it("contributes no markup and no form field to the editor it sits in", () => {
    const html = renderToStaticMarkup(<UnsavedFormTracker />);

    // It has to live inside the <form> to find it, so it must not add a
    // named control (which would change the submitted payload) or anything
    // the layout can see.
    expect(html).not.toContain("name=");
    expect(html).not.toContain("<input");
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * The rest of the mutating forms on the four editor pages.
 *
 * The main editors' own Save buttons are covered above. Auditing the four
 * pages turned up five more forms that post a server action and had no
 * duplicate-submit protection at all: the booking-pause card's Save and
 * Clear (rendered on BOTH the doctor and service editors), the service-links
 * panel, the peak-pricing card, and the per-country profile form on the
 * doctor editor. Each now uses the same `PendingSubmitButton`.
 *
 * These render the real widgets rather than asserting on their source: what
 * matters is the markup the browser gets — a submit button that carries
 * `disabled` while the action runs, sits inside its own <form>, and posts
 * exactly the fields it posted before.
 *
 * No jsdom: `renderToStaticMarkup` plus the `useFormStatus` mock above is
 * enough, because `disabled` IS the mechanism. What a DOM would add is the
 * browser's own rule that a disabled submit button dispatches nothing —
 * which is spec, not app behaviour, and is modelled explicitly in
 * `submitRepeatedly` below.
 * ──────────────────────────────────────────────────────────────────────── */

const market = {
  id: "market-1",
  doctorId: "doc-1",
  countryId: "country-1",
  active: true,
  sortOrder: 0,
  country: { id: "country-1", code: "ie", name: "Ireland", slug: "ireland", defaultLocale: "en" },
  supportedLocales: [{ code: "en", isDefault: true }],
  chamberEntity: null,
  registrationNumber: null,
  registrationUrl: null,
  division: null,
  isVerified: false,
  verifiedAt: null,
  translations: [],
  bank: { accountHolder: null, bic: null, ibanLast4: null, ibanMasked: null, ibanSet: false },
  createdAt: "2026-01-01T00:00:00.000Z",
};

const noop = () => {};
const asyncNoop = async () => {};

const pauseValue = { from: "2026-01-01T10:00:00.000Z", reasonCode: "LEAVE" } as const;

function renderPauseCard() {
  return renderToStaticMarkup(
    <BookingPauseCard
      value={pauseValue}
      saveAction={asyncNoop}
      clearAction={asyncNoop}
      timeZone="Europe/Dublin"
    />,
  );
}

/** Split rendered markup into its <form> blocks. Forms cannot nest, and none
 *  of these widgets try to, so the non-greedy match is exact. */
function formsIn(html: string): string[] {
  return [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map((m) => m[0]);
}

/** The opening tag of the form's submit button — the thing `disabled` has to
 *  land on. Scoped to `type="submit"` deliberately: the peak-pricing card
 *  renders a `type="button"` Remove that is legitimately disabled when only
 *  one window is left, and a looser check would read that as a pass. */
function submitTag(formHtml: string): string {
  const tags = [...formHtml.matchAll(/<button\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((t) => t.includes('type="submit"'));
  expect(tags).toHaveLength(1);
  return tags[0];
}

function isLocked(formHtml: string): boolean {
  return /\bdisabled\b/.test(submitTag(formHtml));
}

/** Every `name` the form posts, in document order — the payload contract. */
function fieldNames(formHtml: string): string[] {
  return [...formHtml.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
}

/**
 * The browser's rule, applied to the real rendered markup: activating a
 * disabled submit button (click, Enter, or Space alike) dispatches nothing,
 * so the action never starts a second time. `pending` flips the way React
 * flips it — on when the action starts, and left on until it settles.
 *
 * Returns how many submissions actually reached the server action.
 */
function submitRepeatedly(render: () => string, attempts: number): number {
  let dispatched = 0;
  for (let i = 0; i < attempts; i += 1) {
    if (isLocked(render())) continue;
    dispatched += 1;
    pending = true;
  }
  return dispatched;
}

type Widget = { name: string; render: () => string; fields: string[] };

/** One entry per mutating form on the four editor pages that this batch had
 *  to guard. `render` returns just that form's markup. */
const WIDGETS: Widget[] = [
  {
    name: "booking pause — save",
    render: () => formsIn(renderPauseCard())[0],
    fields: ["from", "until", "reasonCode"],
  },
  {
    name: "booking pause — clear",
    render: () => formsIn(renderPauseCard())[1],
    fields: [],
  },
  {
    name: "service links panel",
    render: () =>
      formsIn(
        renderToStaticMarkup(
          <ServiceLinksPanel
            defaultLocale="en"
            locales={[{ code: "en", isDefault: true }]}
            services={[]}
            initial={[]}
            action={noop}
          />,
        ),
      )[0],
    fields: ["payload"],
  },
  {
    name: "peak pricing card",
    render: () =>
      formsIn(
        renderToStaticMarkup(
          <PeakPricingCard action={noop} config={null} defaultCurrency="EUR" />,
        ),
      )[0],
    fields: [
      "enabled",
      "peakStart",
      "peakEnd",
      "peakWindowPrice",
      "peakPrice",
      "offPeakPrice",
      "currencyCode",
    ],
  },
  {
    name: "doctor country profile",
    render: () =>
      formsIn(
        renderToStaticMarkup(
          <CountryProfileTabs markets={[market]} saveMarket={asyncNoop} />,
        ),
      )[0],
    // `bio_EN` is absent on purpose: the bio is a `next/dynamic` rich-text
    // field with `ssr: false`, so server markup carries its placeholder and
    // the control appears only after hydration. Everything the server render
    // does emit is pinned here.
    fields: [
      "countryId",
      "countryCode",
      "locales",
      "active",
      "isVerified",
      "sortOrder",
      "chamberEntity",
      "registrationNumber",
      "division",
      "registrationUrl",
      "title_EN",
      "seoTitle_EN",
      "seoKeywords_EN",
      "seoDescription_EN",
    ],
  },
];

describe.each(WIDGETS)("$name", ({ render, fields }) => {
  it("locks its submit button while its action is in flight", () => {
    pending = true;
    const form = render();

    expect(isLocked(form)).toBe(true);
    expect(submitTag(form)).toContain('aria-busy="true"');
    // The live region is what makes the lock perceivable: disabling a focused
    // button drops focus to <body>, which announces nothing on its own.
    expect(form).toContain('aria-live="polite"');
  });

  it("turns two rapid submissions into one action", () => {
    pending = false;

    expect(submitRepeatedly(render, 2)).toBe(1);
  });

  it("restores interaction when the action fails", () => {
    // Every one of these actions redirects back to the same route on failure
    // (a soft navigation), so React settles `useFormStatus` and the form comes
    // back idle. The button must follow it back, not latch.
    pending = true;
    expect(isLocked(render())).toBe(true);

    pending = false;
    expect(isLocked(render())).toBe(false);
    // …and the retry goes through.
    expect(submitRepeatedly(render, 1)).toBe(1);
  });

  it("keeps its submit inside its own form, so the lock cannot spread", () => {
    pending = false;
    const form = render();

    // `useFormStatus` reads the nearest ancestor <form>. A submit that lives
    // inside the form it posts is therefore scoped by construction — no
    // `formId`, and so no entry in the cross-island store that the doctor
    // editor's sidebar button subscribes to.
    expect(form).toMatch(/^<form\b/);
    expect(submitTag(form)).not.toContain("form=");
  });

  it("is not locked by another form's pending action", () => {
    pending = false;
    setFormPending("doctor-edit-form", true);
    setFormPending("some-other-form", true);

    expect(isLocked(render())).toBe(false);

    setFormPending("some-other-form", false);
  });

  it("posts exactly the fields it posted before the guard", () => {
    pending = false;
    const idle = render();
    pending = true;
    const busy = render();

    // The guard adds a <span> live region, never a form control — so the
    // FormData the server action parses is the same set of names, and is the
    // same whether or not the action is running.
    expect(fieldNames(idle)).toEqual(fields);
    expect(fieldNames(busy)).toEqual(fields);
  });
});

describe("the booking-pause card's two forms, side by side", () => {
  it("gives each form its own submit, so Clear stays live while Save runs", () => {
    pending = false;
    const forms = formsIn(renderPauseCard());

    // Two independent forms, one submit each. Neither button carries a
    // `form="…"` attribute, so neither can be activated from the other's
    // pending state — the scoping is structural, not a runtime check.
    expect(forms).toHaveLength(2);
    for (const form of forms) expect(submitTag(form)).not.toContain("form=");
  });
});

describe("the doctor editor's sidebar Save, alongside the newly guarded widgets", () => {
  it("still follows only the form it is bound to", () => {
    // The widgets above sit on the same pages. None of them publishes into
    // the cross-island store (they pass no `formId`), so the only thing that
    // can lock this button is `doctor-edit-form` itself.
    setFormPending("doctor-edit-form", false);
    renderToStaticMarkup(
      <PeakPricingCard action={noop} config={null} defaultCurrency="EUR" />,
    );
    renderPauseCard();
    expect(isFormPending("doctor-edit-form")).toBe(false);

    setFormPending("doctor-edit-form", true);
    expect(isFormPending("doctor-edit-form")).toBe(true);
    // Its own form pending, and nothing else, is what disables it — asserted
    // through the store because `useSyncExternalStore`'s server snapshot is
    // pinned to "not pending" (see the SSR test above).
    expect(isFormPending("peak-pricing")).toBe(false);
  });
});
