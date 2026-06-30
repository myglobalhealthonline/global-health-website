import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs", "portal-redesign");

const areas = {
  admin: {
    label: "Admin",
    portal: "Admin",
    base: path.join(root, "frontend", "app", "(admin)", "admin"),
    routePrefix: "/admin",
    auditFile: "admin-portal-audit.md",
    batch: 3,
  },
  doctor: {
    label: "Doctor",
    portal: "Doctor",
    base: path.join(root, "frontend", "app", "(doctor)", "doctor"),
    routePrefix: "/doctor",
    auditFile: "doctor-portal-audit.md",
    batch: 4,
  },
  patient: {
    label: "Patient/account",
    portal: "Patient/account",
    base: path.join(root, "frontend", "app", "(auth)", "account"),
    routePrefix: "/account",
    auditFile: "patient-portal-audit.md",
    batch: 5,
  },
};

const sharedRoots = [
  path.join(root, "frontend", "components"),
  ...Object.values(areas).map((area) => area.base),
];

const portalKeywords =
  /PortalShell|AdminShell|Doctor|Patient|Account|Tabs|Tab|Table|Card|Modal|Drawer|Dialog|Form|Input|Select|Badge|Pill|Appointment|Payment|Invoice|Medical|Verification|Profile|Settings|Calendar|Slot|Booking|Notification|Order|Prescription|Subscription|Family|Security|Availability|Payout|Document/i;

function toPosix(filePath) {
  return filePath.replaceAll(path.sep, "/");
}

function rel(filePath) {
  return toPosix(path.relative(root, filePath));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out.sort((a, b) => rel(a).localeCompare(rel(b)));
}

function read(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function isTsSource(filePath) {
  return /\.(tsx|ts)$/.test(filePath);
}

function isRouteFile(filePath) {
  return /(page|layout|loading|error|not-found)\.tsx$/.test(filePath);
}

function isPageFile(filePath) {
  return /page\.tsx$/.test(filePath);
}

function routeFromFile(filePath, area) {
  const relative = toPosix(path.relative(area.base, filePath));
  const parts = relative.split("/");
  const file = parts.pop();
  const routeParts = parts.filter((part) => !part.startsWith("_"));
  const base = `${area.routePrefix}${routeParts.length ? `/${routeParts.join("/")}` : ""}`;

  if (file === "page.tsx") return base;
  if (file === "layout.tsx") return `${base || area.routePrefix} (layout)`;
  if (file === "loading.tsx") return `${base || area.routePrefix} (loading state)`;
  if (file === "error.tsx") return `${base || area.routePrefix} (error state)`;
  if (file === "not-found.tsx") return `${base || area.routePrefix} (not-found state)`;

  const componentRoute = routeParts.includes("_components")
    ? routeParts.slice(0, routeParts.indexOf("_components")).join("/")
    : routeParts.filter((part) => !part.startsWith("_components")).join("/");
  const route = `${area.routePrefix}${componentRoute ? `/${componentRoute}` : ""}`;
  return `${route} (component)`;
}

function componentName(filePath) {
  const base = path.basename(filePath).replace(/\.(tsx|ts)$/, "");
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function importsFor(filePath) {
  const source = read(filePath);
  const imports = [];
  const re = /from\s+["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(source))) {
    const value = match[1];
    if (
      value.includes("_components") ||
      value.startsWith("@/components") ||
      value.includes("portal") ||
      value.includes("calendar") ||
      value.includes("chat") ||
      value.includes("subscription") ||
      value.includes("payments")
    ) {
      imports.push(value);
    }
  }
  return [...new Set(imports)].slice(0, 10);
}

function classifyWork(filePath, source) {
  const name = rel(filePath).toLowerCase();
  const checks = [];
  if (/table|tbody|thead|<td|<th|admintable/i.test(source) || name.includes("table")) {
    checks.push("table density, overflow, row actions");
  }
  if (/form|input|select|textarea|checkbox|zod/i.test(source) || name.includes("form") || name.includes("fields")) {
    checks.push("form layout, labels, controls, validation states");
  }
  if (/tabs|tablist|aria-selected/i.test(source) || name.includes("tab")) {
    checks.push("tabs, panel spacing, mobile wrapping");
  }
  if (/modal|dialog|drawer/i.test(source) || /modal|dialog|drawer/.test(name)) {
    checks.push("modal/dialog sizing, focus, mobile overflow");
  }
  if (/card|stat|panel/i.test(source) || /card|panel/.test(name)) {
    checks.push("cards, section hierarchy, empty states");
  }
  if (/calendar|slot|availability/i.test(source) || /calendar|slot|availability/.test(name)) {
    checks.push("calendar/slot layout and responsive controls");
  }
  if (/appointment|booking|consultation/i.test(source) || /appointment|booking|consult/.test(name)) {
    checks.push("appointment workflow and status surfaces");
  }
  if (/payment|invoice|order|subscription/i.test(source) || /payment|invoice|order|subscription/.test(name)) {
    checks.push("payment/order/invoice surfaces");
  }
  if (/medical|document|file|prescription|verification|insurance/i.test(source) || /medical|document|file|prescription|verification|insurance/.test(name)) {
    checks.push("medical/verification document states");
  }
  if (isRouteFile(filePath)) checks.unshift("page-level spacing and responsive composition");
  if (!checks.length) checks.push("visual consistency, spacing, responsive states");
  return [...new Set(checks)].join("; ");
}

function batchFor(filePath, area) {
  const relative = toPosix(path.relative(area.base, filePath));
  if (relative === "layout.tsx") return 1;
  if (relative.startsWith("_components/admin-shell") || relative.includes("shell")) return 1;
  return area.batch;
}

function rowForPortalFile(filePath, area) {
  const source = read(filePath);
  const imports = importsFor(filePath);
  const route = routeFromFile(filePath, area);
  const screenshot = isPageFile(filePath)
    ? "Yes: 320, 390, 430, 768, 1024, 1280, 1440, 1920"
    : isRouteFile(filePath)
      ? "State screenshot when reachable"
      : "Component screenshot via owning route";
  const kind = isRouteFile(filePath) ? "route" : "component";
  return {
    status: "Not started",
    batch: batchFor(filePath, area),
    route,
    file: rel(filePath),
    components: imports.length ? imports.join("<br>") : kind === "component" ? componentName(filePath) : "None detected",
    redesign: classifyWork(filePath, source),
    screenshot,
    notes: kind === "component" ? "Route-local component; inspect with owning page." : "Inspect actual rendered route before marking complete.",
  };
}

function mdEscape(value) {
  return String(value)
    .replaceAll("\r", "")
    .replaceAll("\n", "<br>")
    .replaceAll("|", "\\|");
}

function portalAudit(area) {
  const files = walk(area.base, isTsSource);
  const rows = files.map((filePath) => rowForPortalFile(filePath, area));
  const pageCount = rows.filter((row) => row.file.endsWith("page.tsx")).length;
  const componentCount = rows.length - pageCount;
  const lines = [
    `# ${area.label} Portal Audit`,
    "",
    `Source root: \`${rel(area.base)}\``,
    "",
    `Inventory generated from the actual file tree. Page rows: ${pageCount}. Component/state rows: ${componentCount}.`,
    "",
    "| Status | Batch | Route | File path | Components used | What must be redesigned | Screenshot required | Notes |",
    "|---|---:|---|---|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.status} | ${row.batch} | ${mdEscape(row.route)} | \`${mdEscape(row.file)}\` | ${mdEscape(row.components)} | ${mdEscape(row.redesign)} | ${mdEscape(row.screenshot)} | ${mdEscape(row.notes)} |`,
    ),
    "",
  ];
  return { markdown: lines.join("\n"), rows };
}

function allPortalFiles() {
  return Object.values(areas).flatMap((area) => walk(area.base, isTsSource));
}

function sharedComponentRows() {
  const portalFiles = allPortalFiles();
  const portalSources = portalFiles.map((file) => ({ file, source: read(file) }));
  const frontendComponents = walk(path.join(root, "frontend", "components"), isTsSource);
  const appComponents = Object.values(areas).flatMap((area) =>
    walk(area.base, isTsSource).filter((file) => rel(file).includes("/_components/")),
  );
  const candidates = [...frontendComponents, ...appComponents];

  return candidates
    .filter((filePath) => {
      const file = rel(filePath);
      if (file.includes("/_components/")) return true;
      if (file.includes("frontend/components/portal")) return true;
      if (file === "frontend/components/NotificationPopover.tsx") return true;
      const alias = `@/${file.replace(/^frontend\//, "").replace(/\.(tsx|ts)$/, "")}`;
      return portalSources.some(({ source }) => source.includes(alias));
    })
    .map((filePath) => {
      const source = read(filePath);
      const file = rel(filePath);
      const alias = `@/${file.replace(/^frontend\//, "").replace(/\.(tsx|ts)$/, "")}`;
      const usedBy = portalSources
        .filter(({ source }) => source.includes(alias) || source.includes(path.basename(filePath).replace(/\.(tsx|ts)$/, "")))
        .map(({ file }) => rel(file))
        .filter((value) => value !== file)
        .slice(0, 8);
      const area = Object.values(areas).find((candidate) => filePath.startsWith(candidate.base));
      return {
        status: "Not started",
        batch: area ? area.batch : 2,
        component: componentName(filePath),
        file,
        usedBy: usedBy.length ? usedBy.join("<br>") : area ? routeFromFile(filePath, area) : "Search/import review required",
        issue: "Needs audit against portal spacing, state, accessibility, and responsive rules.",
        redesign: classifyWork(filePath, source),
        notes: area ? "Role-local portal component." : "Shared component under frontend/components.",
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

function sharedAudit(rows) {
  const lines = [
    "# Shared Portal Components Audit",
    "",
    "Reusable and role-local portal components discovered from `frontend/components/**` and portal `_components/**` folders.",
    "",
    `Total component rows: ${rows.length}.`,
    "",
    "| Status | Batch | Component | File path | Used by pages | Current issue | Required redesign | Notes |",
    "|---|---:|---|---|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.status} | ${row.batch} | ${mdEscape(row.component)} | \`${mdEscape(row.file)}\` | ${mdEscape(row.usedBy)} | ${mdEscape(row.issue)} | ${mdEscape(row.redesign)} | ${mdEscape(row.notes)} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

function readme() {
  return [
    "# Portal Redesign Audit",
    "",
    "## Goal",
    "",
    "Create complete coverage for the admin, doctor, and patient/account portals before continuing the redesign. The redesign must cover real route pages, nested dynamic routes, route-local components, shared shells, forms, tables, cards, tabs, modals, calendars, appointment workflows, payment/invoice areas, medical record areas, verification/profile sections, loading states, and error states.",
    "",
    "## Consistency Rules",
    "",
    "- Every portal page must use the same page width, horizontal padding, vertical rhythm, section spacing, and card/table density.",
    "- Shell, sidebar, topbar, mobile drawer, and main content wrappers must align across admin, doctor, and patient/account portals.",
    "- Shared atoms and route-local components must not fight each other. If a route has custom controls, they must follow the shared portal system.",
    "- Page-specific files and nested `_components` must be inspected and updated. Global CSS and shell-only changes are not enough.",
    "",
    "## Responsiveness Rules",
    "",
    "- Review mobile, tablet, laptop, desktop, and ultra-wide layouts.",
    "- Required widths: 320, 360, 390, 430, 640, 768, 1024, 1280, 1440, 1536, 1920, and 2560.",
    "- Fix horizontal overflow, clipped content, inconsistent padding, narrow centered pages, stretched pages, oversized cards, giant buttons, awkward wrapping, broken tables, bad mobile tabs, modal overflow, dropdown overflow, and forms that do not stack properly.",
    "",
    "## Definition Of Done",
    "",
    "- Every portal page appears in the audit markdown.",
    "- Every reusable or route-local portal component appears in the shared component audit.",
    "- Every row has a final status of `Completed` or `Inaccessible — reason documented` before the redesign is considered done.",
    "- Every actual route page and component file has been inspected.",
    "- The redesign touches actual route pages and route-local components, not only `frontend/app/globals.css`, shell files, or atom files.",
    "- Responsive review and screenshot review are documented.",
    "- Build, lint, and typecheck results are reported.",
    "",
    "## Status Labels",
    "",
    "Use only: `Not started`, `In progress`, `Needs review`, `Completed`, `Inaccessible — reason documented`.",
    "",
  ].join("\n");
}

function batchPlan(portalAudits, sharedRows) {
  const pageRows = Object.fromEntries(
    Object.entries(portalAudits).map(([key, audit]) => [
      key,
      audit.rows.filter((row) => row.file.endsWith("page.tsx")),
    ]),
  );
  const componentRows = Object.fromEntries(
    Object.entries(portalAudits).map(([key, audit]) => [
      key,
      audit.rows.filter((row) => !row.file.endsWith("page.tsx")),
    ]),
  );

  const section = (title, items) => [
    `## ${title}`,
    "",
    ...items.map((item) => `- ${item}`),
    "",
  ];

  const lines = [
    "# Portal Redesign Batch Plan",
    "",
    "Each batch must update the relevant audit markdown as work is completed.",
    "",
    ...section("Batch 0 - Inventory only", [
      "Create `docs/portal-redesign/README.md`.",
      "Create admin, doctor, patient/account, shared component, batch plan, and screenshot checklist markdown files.",
      "No UI redesign work in this batch.",
      "Validation: audit files exist and include source-tree-derived rows.",
    ]),
    ...section("Batch 1 - Layout system and shell", [
      "Routes included: all `/admin/**`, `/doctor/**`, and `/account/**` routes.",
      "Expected shell/layout files: `frontend/components/portal-shell.tsx`, `frontend/app/(admin)/admin/_components/admin-shell.tsx`, `frontend/app/(admin)/admin/layout.tsx`, `frontend/app/(doctor)/doctor/layout.tsx`, `frontend/app/(auth)/account/layout.tsx`, `frontend/app/globals.css`.",
      "Fix shared page container, max-width, padding, section spacing, grid rhythm, sidebar, topbar, main wrapper, and mobile drawer behavior.",
      "Validation: representative routes at 390, 768, 1440, and 1920 have aligned content widths and no horizontal overflow.",
      "Screenshot required: `/admin`, `/doctor`, `/account`.",
      "Completion checklist: update all shell/shared-layout rows in the audits.",
    ]),
    ...section("Batch 2 - Shared component system", [
      `Components included: ${sharedRows.map((row) => `\`${row.file}\``).join(", ")}`,
      "Fix buttons, cards, stat cards, tables, forms, inputs, selects, textareas, tabs, badges, pills, modals/dialogs, drawers, alerts, empty states, loading states, errors, pagination, breadcrumbs, filters, calendars, profile blocks, appointment cards, payment/invoice cards, and medical record cards.",
      "Validation: typecheck and component-level screenshot review through owning routes.",
      "Screenshot required: owning route for every changed component.",
      "Completion checklist: update `shared-components-audit.md` after each component family is completed.",
    ]),
    ...section("Batch 3 - Admin portal pages", [
      `Exact routes included: ${pageRows.admin.map((row) => `\`${row.route}\``).join(", ")}`,
      `Expected page/component files: ${[...pageRows.admin, ...componentRows.admin].map((row) => `\`${row.file}\``).join(", ")}`,
      "Validation: every admin audit row is `Completed` or `Inaccessible — reason documented`.",
      "Screenshot required: every admin page row in the screenshot checklist.",
      "Completion checklist: update `admin-portal-audit.md` after each sub-batch.",
    ]),
    ...section("Batch 4 - Doctor portal pages", [
      `Exact routes included: ${pageRows.doctor.map((row) => `\`${row.route}\``).join(", ")}`,
      `Expected page/component files: ${[...pageRows.doctor, ...componentRows.doctor].map((row) => `\`${row.file}\``).join(", ")}`,
      "Validation: every doctor audit row is `Completed` or `Inaccessible — reason documented`.",
      "Screenshot required: every doctor page row in the screenshot checklist.",
      "Completion checklist: update `doctor-portal-audit.md` after each sub-batch.",
    ]),
    ...section("Batch 5 - Patient/account portal pages", [
      `Exact routes included: ${pageRows.patient.map((row) => `\`${row.route}\``).join(", ")}`,
      `Expected page/component files: ${[...pageRows.patient, ...componentRows.patient].map((row) => `\`${row.file}\``).join(", ")}`,
      "Validation: every patient/account audit row is `Completed` or `Inaccessible — reason documented`.",
      "Screenshot required: every patient/account page row in the screenshot checklist.",
      "Completion checklist: update `patient-portal-audit.md` after each sub-batch.",
    ]),
    ...section("Batch 6 - Responsive pass", [
      "Review every audited route at 320, 360, 390, 430, 640, 768, 1024, 1280, 1440, 1536, 1920, and 2560.",
      "Fix overflow, clipping, inconsistent padding, table wrapping, modal overflow, dropdown overflow, tab wrapping, and form stacking.",
      "Validation: screenshot checklist is updated with issues and fixes.",
    ]),
    ...section("Batch 7 - Screenshot review and polish", [
      "Take screenshots for every audited route or document the exact inaccessible reason.",
      "Update `docs/portal-redesign/screenshot-checklist.md`.",
      "Run build, lint if available, and typecheck.",
      "Final response must report counts, changed files, reviewed routes, checks, and inaccessible pages.",
    ]),
  ];
  return lines.join("\n");
}

function screenshotChecklist(portalAudits) {
  const lines = [
    "# Portal Screenshot Checklist",
    "",
    "Every listed route needs screenshots at 320px, 390px, 430px, 768px, 1024px, 1280px, 1440px, and 1920px. Batch 6 additionally checks 360px, 640px, 1536px, and 2560px.",
    "",
    "| Status | Portal | Route | Desktop screenshot | Tablet screenshot | Mobile screenshot | Issues found | Fixed |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const [key, audit] of Object.entries(portalAudits)) {
    const portal = areas[key].portal;
    for (const row of audit.rows.filter((item) => item.file.endsWith("page.tsx"))) {
      lines.push(
        `| Not started | ${mdEscape(portal)} | ${mdEscape(row.route)} | Required: 1024, 1280, 1440, 1920 | Required: 768 | Required: 320, 390, 430 | Not reviewed | No |`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

ensureDir(docsDir);

const portalAudits = {};
for (const [key, area] of Object.entries(areas)) {
  portalAudits[key] = portalAudit(area);
  fs.writeFileSync(path.join(docsDir, area.auditFile), portalAudits[key].markdown);
}

const sharedRows = sharedComponentRows();

fs.writeFileSync(path.join(docsDir, "README.md"), readme());
fs.writeFileSync(path.join(docsDir, "shared-components-audit.md"), sharedAudit(sharedRows));
fs.writeFileSync(path.join(docsDir, "batch-plan.md"), batchPlan(portalAudits, sharedRows));
fs.writeFileSync(path.join(docsDir, "screenshot-checklist.md"), screenshotChecklist(portalAudits));

const summary = {
  adminRows: portalAudits.admin.rows.length,
  adminPages: portalAudits.admin.rows.filter((row) => row.file.endsWith("page.tsx")).length,
  doctorRows: portalAudits.doctor.rows.length,
  doctorPages: portalAudits.doctor.rows.filter((row) => row.file.endsWith("page.tsx")).length,
  patientRows: portalAudits.patient.rows.length,
  patientPages: portalAudits.patient.rows.filter((row) => row.file.endsWith("page.tsx")).length,
  sharedComponents: sharedRows.length,
};

console.log(JSON.stringify(summary, null, 2));
