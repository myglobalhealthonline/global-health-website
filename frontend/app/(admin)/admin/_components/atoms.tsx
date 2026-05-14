/**
 * Admin atoms — reusable primitives that match the official design system.
 *
 * Specs come from `docs/design-fetch-2/global-health-design-system/project/`:
 *   • `ADMIN_DESIGN_BRIEF.md` (token + component conventions)
 *   • `ui_kits/admin/Atoms.jsx` (canonical reference implementations)
 *   • `ui_kits/admin/Screens1.jsx` (PageHeader + table patterns in context)
 *
 * Use these on every admin page so the visual rhythm stays consistent.
 */

import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from "react";

/* ─────────────────────────────────────────────────────────────
   Page header — eyebrow / title / description / actions
   ───────────────────────────────────────────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="gh-eyebrow inline-flex items-center gap-2">{eyebrow}</p>
        ) : null}
        <h1
          className="m-0 tracking-[-0.02em] text-[var(--color-text-primary)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.15,
            marginTop: eyebrow ? 10 : 0,
          }}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[15px] text-[var(--color-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   Eyebrow + SectionHeader (for in-card titles)
   ───────────────────────────────────────────────────────────── */

export function Eyebrow({
  children,
  onDark,
}: {
  children: ReactNode;
  onDark?: boolean;
}) {
  return (
    <span className={onDark ? "gh-eyebrow-on-dark" : "gh-eyebrow"}>{children}</span>
  );
}

export function SectionHeader({
  title,
  description,
  right,
}: {
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-background-soft)] px-5 py-4">
      <div className="min-w-0">
        <h3
          className="m-0 text-[var(--color-text-primary)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AdminCard — white surface, 16px radius, forest-tinted shadow
   ───────────────────────────────────────────────────────────── */

export function AdminCard({
  children,
  padding = 24,
  className = "",
  style = {},
}: {
  children: ReactNode;
  padding?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`bg-[var(--color-background-page)] ${className}`}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        boxShadow: "var(--shadow-soft)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   StatCard — dashboard 4-up grid
   ───────────────────────────────────────────────────────────── */

export type StatTone = "brand" | "accent" | "neutral";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: StatTone;
  href?: string;
}) {
  const tileBg =
    tone === "brand"
      ? "rgba(27,77,62,0.10)"
      : tone === "accent"
        ? "rgba(200,230,160,0.30)"
        : "var(--color-background-soft)";

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <p className="m-0 text-[13px] font-semibold text-[var(--color-text-muted)]">
          {label}
        </p>
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: tileBg,
            color: "var(--color-brand-primary)",
          }}
        >
          {icon}
        </span>
      </div>
      <p
        className="m-0 mt-2.5 text-[var(--color-text-primary)]"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {hint ? (
        <p className="m-0 mt-1 text-[12px] text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[var(--shadow-card-hover)]"
        style={{
          background: "var(--color-background-page)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          boxShadow: "var(--shadow-soft)",
          padding: 20,
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {inner}
      </Link>
    );
  }
  return <AdminCard padding={20}>{inner}</AdminCard>;
}

/* ─────────────────────────────────────────────────────────────
   Pill — status badge with tones
   ───────────────────────────────────────────────────────────── */

export type PillTone =
  | "neutral"
  | "published"
  | "draft"
  | "pending"
  | "active"
  | "inactive"
  | "brand";

const PILL_TONES: Record<PillTone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: "var(--color-background-soft)", fg: "var(--color-text-body)", bd: "var(--color-border)" },
  published: { bg: "rgba(200,230,160,0.30)", fg: "var(--color-brand-primary)", bd: "transparent" },
  draft: { bg: "#F5F5F4", fg: "#78716C", bd: "#E5E5E3" },
  pending: { bg: "#FEF3C7", fg: "#92400E", bd: "#FDE68A" },
  active: { bg: "#DCFCE7", fg: "#166534", bd: "#BBF7D0" },
  inactive: { bg: "#FEE2E2", fg: "#991B1B", bd: "#FECACA" },
  brand: { bg: "var(--color-brand-primary)", fg: "#fff", bd: "transparent" },
};

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: PillTone;
}) {
  const t = PILL_TONES[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
      }}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Table primitives — surface-soft header row, 11px caps labels
   ───────────────────────────────────────────────────────────── */

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 14,
      }}
    >
      {children}
    </table>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr style={{ background: "var(--color-background-soft)" }}>{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  style = {},
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  style?: CSSProperties;
}) {
  return (
    <th
      style={{
        padding: "12px 16px",
        textAlign: align,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  style = {},
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  style?: CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "14px 16px",
        textAlign: align,
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr style={{ borderTop: "1px solid var(--color-border)" }}>{children}</tr>;
}

/* ─────────────────────────────────────────────────────────────
   IconBtn — 30×30 outline action button, used in table row ends
   ───────────────────────────────────────────────────────────── */

type IconBtnBaseProps = {
  children: ReactNode;
  ariaLabel: string;
};

type IconBtnButtonProps = IconBtnBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">;

type IconBtnLinkProps = IconBtnBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href" | "aria-label"> & {
    href: string;
  };

export function IconBtn(props: IconBtnButtonProps | IconBtnLinkProps) {
  const sharedStyle: CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid var(--color-border)",
    background: "var(--color-background-page)",
    color: "var(--color-text-muted)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "color 120ms, border-color 120ms",
  };

  if ("href" in props) {
    const { children, ariaLabel, href, style, ...rest } = props;
    return (
      <Link href={href} aria-label={ariaLabel} {...rest} style={{ ...sharedStyle, ...style }}>
        {children}
      </Link>
    );
  }
  const { children, ariaLabel, style, type, ...rest } = props;
  return (
    <button type={type ?? "button"} aria-label={ariaLabel} {...rest} style={{ ...sharedStyle, ...style }}>
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Toggle — on/off switch (form-submit-on-click)
   Renders as a <button type="submit" name=… value=…> inside a form.
   ───────────────────────────────────────────────────────────── */

export function Toggle({
  on,
  size = 22,
  name,
  value,
  ariaLabel,
  formAction,
}: {
  on: boolean;
  size?: number;
  name?: string;
  value?: string;
  ariaLabel: string;
  formAction?: (formData: FormData) => void;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      aria-label={ariaLabel}
      formAction={formAction}
      style={{
        width: size * 1.75,
        height: size,
        borderRadius: 999,
        background: on ? "var(--color-brand-primary)" : "var(--color-border-strong)",
        border: "none",
        cursor: "pointer",
        padding: 2,
        position: "relative",
        transition: "background 180ms",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: on ? `calc(100% - ${size - 2}px)` : 2,
          width: size - 4,
          height: size - 4,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.20)",
          transition: "left 180ms ease-out",
        }}
      />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Btn — pill button with variants
   ───────────────────────────────────────────────────────────── */

export type BtnVariant = "primary" | "secondary" | "soft" | "ghost" | "accent" | "danger";
export type BtnSize = "sm" | "md" | "lg";

const BTN_SIZES: Record<BtnSize, { minHeight: number; padding: string; fontSize: number }> = {
  sm: { minHeight: 36, padding: "0 14px", fontSize: 13 },
  md: { minHeight: 44, padding: "0 20px", fontSize: 14 },
  lg: { minHeight: 48, padding: "0 24px", fontSize: 14 },
};

const BTN_VARIANTS: Record<BtnVariant, CSSProperties> = {
  primary: {
    background: "var(--color-brand-primary)",
    color: "#fff",
    border: "1px solid var(--color-brand-primary)",
  },
  secondary: {
    background: "var(--color-background-page)",
    color: "var(--color-brand-primary)",
    border: "1px solid var(--color-brand-primary)",
  },
  soft: {
    background: "var(--color-background-soft)",
    color: "var(--color-brand-primary)",
    border: "1px solid transparent",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text-body)",
    border: "1px solid transparent",
  },
  accent: {
    background: "var(--color-accent)",
    color: "#143B30",
    border: "1px solid transparent",
  },
  danger: {
    background: "#FEE2E2",
    color: "#991B1B",
    border: "1px solid #FCA5A5",
  },
};

type BtnBaseProps = {
  children: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

type BtnButtonProps = BtnBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

type BtnLinkProps = BtnBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & {
    href: string;
  };

export function Btn(props: BtnButtonProps | BtnLinkProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const { iconLeft, iconRight, children } = props;
  const inner = (
    <>
      {iconLeft}
      <span className="whitespace-nowrap">{children}</span>
      {iconRight}
    </>
  );
  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    fontWeight: 700,
    lineHeight: 1,
    fontFamily: "inherit",
    boxShadow: "var(--shadow-soft)",
    transition: "all 180ms ease-out",
    whiteSpace: "nowrap",
    cursor: "pointer",
    textDecoration: "none",
    ...BTN_SIZES[size],
    ...BTN_VARIANTS[variant],
  };

  if ("href" in props) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variant: _v, size: _s, iconLeft: _il, iconRight: _ir, children: _c, href, style, ...rest } = props;
    return (
      <Link href={href} style={{ ...baseStyle, ...style }} {...rest}>
        {inner}
      </Link>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _v, size: _s, iconLeft: _il, iconRight: _ir, children: _c, style, type, ...rest } = props;
  return (
    <button type={type ?? "button"} style={{ ...baseStyle, ...style }} {...rest}>
      {inner}
    </button>
  );
}
