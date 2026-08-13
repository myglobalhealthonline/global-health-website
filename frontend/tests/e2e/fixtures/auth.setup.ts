import { test as setup } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { storageStatePath } from "./storage-state.js";

/**
 * Security-audit phase 5 (docs/audits/security/audit-authz-matrix-2026-08-02.md):
 * one storageState file per role, produced once so portal-boundary specs
 * (e.g. authz-boundaries.spec.ts) can start already-authenticated instead of
 * repeating a login flow per test. Reuses the exact login-form selectors and
 * redirect wait already proven in patient-portal.spec.ts — this file does
 * not invent a new login flow.
 *
 * Credentials come from env vars matching backend/scripts/seed-test-accounts.ts
 * (extended in the same phase to create all 6 roles). A role whose env vars
 * are unset is skipped, not failed — so this file works whether 2 accounts
 * or all 8 are configured, matching this repo's existing test.skip()
 * convention for optional E2E credentials.
 *
 *   E2E_TEST_EMAIL / E2E_TEST_PASSWORD             → patient@globalhealthonline.com
 *   E2E_DOCTOR_EMAIL / E2E_DOCTOR_PASSWORD          → doctor@globalhealthonline.com
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD            → admin@globalhealthonline.com
 *   E2E_SUPER_ADMIN_EMAIL / E2E_SUPER_ADMIN_PASSWORD → superadmin@globalhealthonline.com
 *   E2E_LOCAL_ADMIN_EMAIL / E2E_LOCAL_ADMIN_PASSWORD → localadmin@globalhealthonline.com
 *   E2E_CORPORATE_ADMIN_EMAIL / E2E_CORPORATE_ADMIN_PASSWORD → corporateadmin@globalhealthonline.com
 */

const STORAGE_DIR = path.join(__dirname, "../.storage");

type RoleFixture = {
  role: string;
  emailEnv: string;
  passwordEnv: string;
  /** Where the authenticated session redirects to after a successful login. */
  landingUrlPattern: RegExp;
};

const ROLES: RoleFixture[] = [
  { role: "patient", emailEnv: "E2E_TEST_EMAIL", passwordEnv: "E2E_TEST_PASSWORD", landingUrlPattern: /\/account/ },
  { role: "doctor", emailEnv: "E2E_DOCTOR_EMAIL", passwordEnv: "E2E_DOCTOR_PASSWORD", landingUrlPattern: /\/doctor/ },
  { role: "admin", emailEnv: "E2E_ADMIN_EMAIL", passwordEnv: "E2E_ADMIN_PASSWORD", landingUrlPattern: /\/admin/ },
  {
    role: "super-admin",
    emailEnv: "E2E_SUPER_ADMIN_EMAIL",
    passwordEnv: "E2E_SUPER_ADMIN_PASSWORD",
    landingUrlPattern: /\/admin/,
  },
  {
    role: "local-admin",
    emailEnv: "E2E_LOCAL_ADMIN_EMAIL",
    passwordEnv: "E2E_LOCAL_ADMIN_PASSWORD",
    landingUrlPattern: /\/admin/,
  },
  {
    role: "corporate-admin",
    emailEnv: "E2E_CORPORATE_ADMIN_EMAIL",
    passwordEnv: "E2E_CORPORATE_ADMIN_PASSWORD",
    landingUrlPattern: /\/corporate/,
  },
];

for (const { role, emailEnv, passwordEnv, landingUrlPattern } of ROLES) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const email = process.env[emailEnv];
    const password = process.env[passwordEnv];
    setup.skip(!email || !password, `Set ${emailEnv} and ${passwordEnv} to produce the ${role} storageState`);

    if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true });

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);
    await page.click('button[type="submit"]');
    await page.waitForURL(landingUrlPattern, { timeout: 10_000 });
    await page.context().storageState({ path: storageStatePath(role) });
  });
}
