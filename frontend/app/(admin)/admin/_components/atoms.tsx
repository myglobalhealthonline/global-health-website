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
import { BarChart3 } from "lucide-react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  MouseEvent,
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
  icon,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Icon badge rendered left of the title group (design brief §1). Optional
   *  — omitting it renders the banner without a badge, unchanged layout. */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`gh-portal-page-header relative mb-5 flex flex-wrap items-center justify-between gap-4 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span aria-hidden className="gh-portal-icon-badge gh-portal-icon-badge--header">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <>
              <p className="gh-eyebrow inline-flex items-center gap-2">
                <span aria-hidden className="gh-portal-eyebrow-dot" />
                {eyebrow}
              </p>
              <span aria-hidden className="gh-portal-eyebrow-hairline" />
            </>
          ) : null}
          <h1
            className="m-0 tracking-[-0.02em]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(24px, 2vw, 34px)",
              fontWeight: 800,
              lineHeight: 1.08,
              marginTop: eyebrow ? 10 : 0,
              color: "var(--portal-text)",
            }}
          >
            {title}
          </h1>
          {description ? (
            <p
              className="mt-2 text-portal-body leading-relaxed"
              style={{ color: "var(--portal-text-2)", maxWidth: "68ch" }}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="gh-portal-page-header-actions flex flex-wrap items-center gap-2.5">{actions}</div>
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
    <div className="gh-portal-section-header flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="gh-portal-section-rule" />
          <h3
            className="m-0"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "var(--portal-text)",
            }}
          >
            {title}
          </h3>
        </div>
        {description ? (
          <p className="mt-1 pl-[14px] text-portal-meta" style={{ color: "var(--portal-muted)" }}>
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
    <div className={`gh-admin-card ${className}`} style={{ padding, ...style }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   StatCard — dashboard 4-up grid
   ───────────────────────────────────────────────────────────── */

export type AdminSummaryTone = "brand" | "success" | "warning" | "neutral";

export function AdminSummaryStrip({
  items,
  className = "",
}: {
  items: Array<{
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    tone?: AdminSummaryTone;
    /** Icon badge on the top-right of the card (design brief §2). Optional
     *  — without it the top row is just the label, unchanged layout. */
    icon?: ReactNode;
  }>;
  className?: string;
}) {
  return (
    <section
      className={`gh-admin-summary-strip ${className}`}
      style={{ "--card-count": items.length } as CSSProperties}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={`gh-admin-summary-item gh-admin-summary-item--${item.tone ?? "neutral"}`}
        >
          <div className="gh-admin-summary-item__top">
            <span className="gh-admin-summary-label">{item.label}</span>
            <span aria-hidden className="gh-portal-icon-badge">
              {item.icon ?? <BarChart3 />}
            </span>
          </div>
          <strong>{item.value}</strong>
          {item.hint ? <span className="gh-admin-summary-hint">{item.hint}</span> : null}
        </div>
      ))}
    </section>
  );
}

/** One-line orientation counts for list/detail pages (audit Rule S3:
 *  AdminSummaryStrip stays on true dashboards; everywhere else counts render
 *  as this plain meta line so content stays above the fold). */
export function MetaLine({
  items,
  className = "",
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
  className?: string;
}) {
  return (
    <p className={`gh-portal-meta-line ${className}`}>
      {items.map((item, index) => (
        <span key={index} className="gh-portal-meta-line__item">
          <strong className="gh-portal-meta-line__value">{item.value}</strong> {item.label}
        </span>
      ))}
    </p>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
  icon,
  assetSrc,
  tone = "neutral",
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  assetSrc?: string;
  /** "danger" = root error.tsx anatomy (DESIGN.md §16 DoD); neutral = normal empty list. */
  tone?: "neutral" | "danger";
  className?: string;
}) {
  return (
    <div className={`gh-admin-empty-state ${className}`}>
      {assetSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetSrc}
          alt=""
          aria-hidden="true"
          className="gh-admin-empty-state__asset"
          loading="lazy"
        />
      ) : icon ? (
        <span
          className={`gh-admin-empty-state__icon ${tone === "danger" ? "gh-admin-empty-state__icon--danger" : ""}`}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        {action ? <div className="gh-admin-empty-state__action">{action}</div> : null}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CommandBand — the signature (DESIGN.md §5.3). Dashboard pages only
   (/admin, /doctor, /account). Presentational: role pages fetch data
   and pass it in; the atom never fetches.
   ───────────────────────────────────────────────────────────── */

export type CommandBandMetric = {
  label: string;
  value: ReactNode;
  /** Renders the numeral in --portal-signal with a glow — the ONE most
   *  important metric on the band. At most one per band. */
  signal?: boolean;
  /** "consultation live" / "next appointment in Xm" — renders the lime
   *  live tick. At most one live element per band (§8 motion budget). */
  live?: ReactNode;
};

export function CommandBand({
  context,
  title,
  chip,
  metrics,
  action,
  loading = false,
}: {
  context: ReactNode;
  title: ReactNode;
  chip?: ReactNode;
  metrics: CommandBandMetric[];
  action?: ReactNode;
  loading?: boolean;
}) {
  return (
    <section className={`gh-command-band${loading ? " gh-command-band--skeleton" : ""}`}>
      <div className="min-w-0">
        <p className="gh-command-band__context">{context}</p>
        <h2 className="gh-command-band__title">{title}</h2>
        {chip ? <span className="gh-command-band__chip">{chip}</span> : null}
      </div>
      <div className="gh-command-band__metrics">
        {metrics.map((metric, index) => (
          <div key={index} className="gh-command-band__metric">
            <p className="gh-command-band__metric-label">{metric.label}</p>
            <p
              className={`gh-command-band__metric-value${
                metric.signal ? " gh-command-band__metric-value--signal" : ""
              }`}
            >
              {metric.value}
            </p>
            {metric.live ? (
              <span className="gh-command-band__live">
                <span aria-hidden className="gh-command-band__live-dot" />
                {metric.live}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}

export type StatTone = "brand" | "accent" | "success" | "warning" | "neutral";

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
  icon?: ReactNode;
  /** The semantic tone drives the icon badge, border, and subtle card wash. */
  tone?: StatTone;
  href?: string;
}) {
  const inner = (
    <div className="relative">
      <div className="relative flex items-start justify-between">
        <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--portal-muted)" }}>
          {label}
        </p>
        <span
          className="gh-stat-card__icon-tile inline-flex items-center justify-center"
          style={{
            width: "clamp(30px, 2.6vw, 34px)",
            height: "clamp(30px, 2.6vw, 34px)",
            borderRadius: "var(--portal-radius)",
          }}
        >
          {icon ?? <BarChart3 />}
        </span>
      </div>
      <p className="gh-stat-card__value relative m-0 mt-3">{value}</p>
      {hint ? (
        <p className="m-0 mt-1.5 text-portal-meta font-medium" style={{ color: "var(--portal-muted)" }}>
          {hint}
        </p>
      ) : null}
      {href ? <span aria-hidden className="gh-stat-card__underline" /> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`gh-stat-card gh-stat-card--${tone} block`} style={{ padding: "clamp(14px, 1.6vw, 18px)", textDecoration: "none", color: "inherit" }}>
        {inner}
      </Link>
    );
  }
  return (
    <AdminCard padding={18} className={`gh-stat-card gh-stat-card--${tone}`}>
      {inner}
    </AdminCard>
  );
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
  | "brand"
  | "live"
  | "info";

/** One tone map feeding both Pill and raw `.gh-badge-*` usage (DESIGN.md
 *  §5.7) — existing semantics preserved: pending→warning, active/published→
 *  success, inactive→danger, draft/neutral→neutral, brand→brand. `live` is
 *  the only glowing tone ("happening now" — active consult, online, unread). */
const PILL_TONES: Record<PillTone, { bg: string; fg: string; bd: string; dot?: string }> = {
  neutral: { bg: "var(--portal-well)", fg: "var(--portal-text-2)", bd: "transparent", dot: "var(--portal-muted)" },
  published: { bg: "var(--portal-success-soft)", fg: "var(--portal-success-text)", bd: "transparent", dot: "var(--portal-success)" },
  draft: { bg: "var(--portal-well)", fg: "var(--portal-text-2)", bd: "transparent", dot: "var(--portal-muted)" },
  pending: { bg: "var(--portal-warning-soft)", fg: "var(--portal-warning-text)", bd: "transparent", dot: "var(--portal-warning)" },
  active: { bg: "var(--portal-success-soft)", fg: "var(--portal-success-text)", bd: "transparent", dot: "var(--portal-success)" },
  inactive: { bg: "var(--portal-danger-soft)", fg: "var(--portal-danger-text)", bd: "transparent", dot: "var(--portal-danger)" },
  brand: { bg: "var(--portal-primary-soft)", fg: "var(--portal-primary)", bd: "transparent", dot: "var(--portal-primary)" },
  live: { bg: "var(--portal-signal-soft)", fg: "var(--portal-text-2)", bd: "transparent", dot: "var(--portal-signal)" },
  info: { bg: "var(--portal-info-soft)", fg: "var(--portal-info-text)", bd: "transparent", dot: "var(--portal-info)" },
};

export function Pill({
  children,
  tone = "neutral",
  withDot = false,
}: {
  children: ReactNode;
  tone?: PillTone;
  withDot?: boolean;
}) {
  const t = PILL_TONES[tone];
  return (
    <span
      className={`gh-pill gh-pill-${tone} inline-flex items-center gap-1.5 whitespace-nowrap`}
      style={{
        padding: "3px 10px",
        borderRadius: "var(--portal-radius-pill)",
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${t.dot ?? "var(--portal-muted)"} 18%, transparent)`,
      }}
    >
      {withDot && t.dot ? (
        <span
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: t.dot,
            boxShadow:
              tone === "live"
                ? "0 0 0 2px var(--portal-signal-glow)"
                : `0 0 0 3px color-mix(in srgb, ${t.dot} 25%, transparent)`,
          }}
        />
      ) : null}
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Table primitives — surface-soft header row, 11px caps labels
   ───────────────────────────────────────────────────────────── */

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="gh-admin-table-wrap">
      <table className="gh-admin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr style={{ background: "transparent", borderBottom: "1px solid var(--portal-line-strong)" }}>
        {children}
      </tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  className,
  style = {},
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <th
      className={className}
      style={{
        padding: "13px 16px",
        textAlign: align,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--portal-muted)",
        fontVariantNumeric: align === "right" ? "tabular-nums" : undefined,
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
  className,
  style = {},
  onClick,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLTableCellElement>) => void;
}) {
  return (
    <td
      className={className}
      onClick={onClick}
      style={{
        padding: "14px 16px",
        textAlign: align,
        verticalAlign: "middle",
        color: "var(--portal-text-2)",
        fontVariantNumeric: align === "right" ? "tabular-nums" : undefined,
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLTableRowElement>) => void;
}) {
  return (
    <tr className={className ? `gh-admin-row ${className}` : "gh-admin-row"} onClick={onClick}>
      {children}
    </tr>
  );
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
    width: 32,
    height: 32,
    borderRadius: 9,
    border: "none",
    background: "transparent",
    color: "var(--portal-text)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "opacity 160ms, background 160ms, box-shadow 160ms, transform 160ms",
  };

  if ("href" in props) {
    const { children, ariaLabel, href, style, className, ...rest } = props;
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className={`gh-icon-btn ${className ?? ""}`}
        {...rest}
        style={{ ...sharedStyle, ...style }}
      >
        {children}
      </Link>
    );
  }
  const { children, ariaLabel, style, type, className, ...rest } = props;
  return (
    <button
      type={type ?? "button"}
      aria-label={ariaLabel}
      className={`gh-icon-btn ${className ?? ""}`}
      {...rest}
      style={{ ...sharedStyle, ...style }}
    >
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
  const trackWidth = size * 1.75;
  const trackHeight = size;
  const knobSize = size - 4;
  const padding = 2;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      formAction={formAction}
      className="gh-admin-toggle"
      style={{
        width: trackWidth,
        height: trackHeight,
        borderRadius: 999,
        background: on ? "var(--portal-primary)" : "var(--portal-line-strong)",
        border: "none",
        cursor: "pointer",
        padding,
        position: "relative",
        transition: "background 180ms",
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: padding,
          left: on ? trackWidth - knobSize - padding : padding,
          width: knobSize,
          height: knobSize,
          borderRadius: "50%",
          background: "var(--portal-surface)",
          boxShadow: "var(--portal-shadow)",
          transition: "left 180ms ease-out",
        }}
      />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Btn — pill button with variants
   ───────────────────────────────────────────────────────────── */

export type BtnVariant = "primary" | "secondary" | "soft" | "ghost" | "accent" | "danger" | "on-chrome";
export type BtnSize = "sm" | "md" | "lg";

/** Sizes only (DESIGN.md §5.8) — variant fills/borders/hovers live in CSS
 *  (`.gh-portal-shell .gh-btn-*`, scoped so the public site keeps its own
 *  `.gh-btn-*` styling per hard rule #10). The atom keeps only layout. */
const BTN_SIZES: Record<BtnSize, { minHeight: number; padding: string; fontSize: number }> = {
  sm: { minHeight: 32, padding: "0 14px", fontSize: 13 },
  md: { minHeight: 40, padding: "0 20px", fontSize: 14 },
  lg: { minHeight: 44, padding: "0 24px", fontSize: 14 },
};

type BtnBaseProps = {
  children: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** 16px spinner replaces iconLeft; label stays (§7 states matrix). */
  loading?: boolean;
  /** One-shot success border pulse after a save resolves. */
  success?: boolean;
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
  const { iconLeft, iconRight, children, loading, success } = props;
  const inner = (
    <>
      {loading ? <span aria-hidden className="gh-btn__spinner" /> : iconLeft}
      <span className="whitespace-nowrap">{children}</span>
      {iconRight}
    </>
  );
  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
    lineHeight: 1,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    cursor: loading ? "default" : "pointer",
    textDecoration: "none",
    ...BTN_SIZES[size],
  };
  const stateClass = success ? " gh-btn--success-pulse" : "";

  if ("href" in props) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variant: _v, size: _s, iconLeft: _il, iconRight: _ir, children: _c, loading: _l, success: _sc, href, style, className, ...rest } = props;
    return (
      <Link
        href={href}
        className={`gh-btn gh-btn-${variant}${stateClass} ${className ?? ""}`}
        style={{ ...baseStyle, ...style }}
        aria-busy={loading || undefined}
        {...rest}
      >
        {inner}
      </Link>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _v, size: _s, iconLeft: _il, iconRight: _ir, children: _c, loading: _l, success: _sc, style, type, className, disabled, ...rest } = props;
  return (
    <button
      type={type ?? "button"}
      className={`gh-btn gh-btn-${variant}${stateClass} ${className ?? ""}`}
      style={{ ...baseStyle, ...style }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {inner}
    </button>
  );
}
