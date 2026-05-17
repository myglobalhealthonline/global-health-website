import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { LoginForm, LoginFormFallback } from "./ui";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Sign in · Global Health admin",
  description: "Admin sign-in for the Global Health super-admin portal.",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getServerAuthUser();
  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/account");
  }

  return (
    <div className={styles.page}>
      {/* ── LEFT — dark brand panel ─────────────────────────── */}
      <aside className={styles.brandPanel}>
        <div aria-hidden className={styles.pattern} />

        <div className="relative" suppressHydrationWarning>
          <div className="flex items-center gap-2.5">
            <span className={styles.logoMark}>GH</span>
            <span className="text-[17px] font-bold leading-tight tracking-[-0.01em] text-white">
              Global Health
            </span>
          </div>
        </div>

        <div className="relative" suppressHydrationWarning>
          <p className={styles.eyebrow}>Super admin portal</p>
          <h1 className={styles.headline}>
            Manage every country, doctor, and service from one place.
          </h1>
          <p className={styles.lead}>
            Sign in to add countries, publish services, and review patient bookings across the
            network.
          </p>
        </div>

        <p className={styles.version} suppressHydrationWarning>
          v1.0 · Medicine without borders
        </p>
      </aside>

      {/* ── RIGHT — sign-in form ────────────────────────────── */}
      <main className={styles.formPanel}>
        <div className={styles.formInner} suppressHydrationWarning>
          <h2 className={styles.formTitle}>Welcome back</h2>
          <p className={styles.formSubtitle}>Sign in to the Global Health admin portal.</p>

          <div className={styles.formSlot}>
            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>
          </div>

          <p className={styles.formFootnote}>
            Sessions are JWT, secured with httpOnly cookies. All actions are logged.
          </p>
        </div>
      </main>
    </div>
  );
}
