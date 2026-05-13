// Components.jsx — small atoms used everywhere in the UI kit.

const { useState } = React;

/* ── Icons (Lucide-style, inline SVG) ─────────────────────── */
const ic = (path, vb = "0 0 24 24") => ({ size = 18, className = "", style = {} }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className={className} style={style} aria-hidden>{path}</svg>
);

const IconGlobe        = ic(<><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></>);
const IconHeart        = ic(<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>);
const IconShield       = ic(<><path d="M9 12l2 2 4-4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>);
const IconLock         = ic(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>);
const IconZap          = ic(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>);
const IconClock        = ic(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>);
const IconMapPin       = ic(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></>);
const IconUser         = ic(<><circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/></>);
const IconMail         = ic(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></>);
const IconPackage      = ic(<><path d="M16 16h6v6h-6zM2 16h6v6H2zM16 2h6v6h-6zM2 2h6v6H2z"/><path d="M8 5h8M8 19h8M5 8v8M19 8v8"/></>);
const IconCheck        = ic(<path d="M20 6 9 17l-5-5"/>);
const IconCheckCircle  = ic(<><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></>);
const IconStar         = ic(<polygon points="12 2 15 9 22 9 17 14 19 22 12 17 5 22 7 14 2 9 9 9 12 2"/>);
const IconChevronR     = ic(<polyline points="9 18 15 12 9 6"/>);
const IconChevronD     = ic(<polyline points="6 9 12 15 18 9"/>);
const IconArrowR       = ic(<><path d="M5 12h14M13 5l7 7-7 7"/></>);
const IconMenu         = ic(<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>);
const IconClose        = ic(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>);
const IconTag          = ic(<><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7" cy="7" r="1.4"/></>);
const IconStethoscope  = ic(<><path d="M4.8 2.3A.3.3 0 0 0 4.5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-.5a.3.3 0 0 0-.3.3v1.4a.3.3 0 0 0 .3.3H12a.3.3 0 0 1 .3.3V9a4 4 0 0 1-8 0V4.3A.3.3 0 0 1 4.5 4h.1a.3.3 0 0 0 .3-.3z"/><circle cx="20" cy="10" r="2"/><path d="M8 15v2a6 6 0 0 0 12 0v-5"/></>);

window.Icons = { IconGlobe, IconHeart, IconShield, IconLock, IconZap, IconClock,
  IconMapPin, IconUser, IconMail, IconPackage, IconCheck, IconCheckCircle,
  IconStar, IconChevronR, IconChevronD, IconArrowR, IconMenu, IconClose,
  IconTag, IconStethoscope };

/* ── Atoms ────────────────────────────────────────────────── */

function Btn({ children, variant = "primary", as: As = "button", iconRight, onClick, href, className = "" }) {
  const base = "gh-btn";
  const styles = {
    primary: { background: "var(--brand)", color: "#fff", border: "2px solid var(--brand)" },
    outline: { background: "#fff", color: "var(--brand)", border: "2px solid var(--brand)" },
    soft:    { background: "var(--surface-soft)", color: "var(--brand)", border: "2px solid transparent" },
    accent:  { background: "var(--accent)", color: "#143B30", border: "2px solid transparent" },
    "ghost-dark": { background: "#fff", color: "var(--brand)", border: "2px solid transparent" },
    ghost:   { background: "rgba(255,255,255,0.10)", color: "#fff", border: "2px solid rgba(255,255,255,0.30)" },
  };
  const props = {
    onClick, href,
    className: `${base} ${className}`,
    style: {
      minHeight: 48, display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, padding: "0 24px", borderRadius: 999, fontSize: 14, fontWeight: 700,
      lineHeight: 1, textDecoration: "none", cursor: "pointer",
      boxShadow: "var(--shadow-soft)",
      transition: "all 180ms ease-out",
      ...styles[variant],
    }
  };
  const inner = <>{children}{iconRight && <Icons.IconArrowR size={16} />}</>;
  if (href) return <a {...props}>{inner}</a>;
  return <As {...props}>{inner}</As>;
}

function Eyebrow({ children, dark = false, className = "" }) {
  return (
    <span className={`gh-eyebrow ${className}`} style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
      color: dark ? "var(--accent)" : "var(--brand)",
    }}>{children}</span>
  );
}

function IconTile({ children, size = 44, dark = false }) {
  const bg = dark ? "rgba(255,255,255,0.12)" : "rgba(200,230,160,0.30)";
  const fg = dark ? "var(--accent)" : "var(--brand)";
  return (
    <span style={{
      width: size, height: size, borderRadius: 12, background: bg, color: fg,
      display: "inline-flex", alignItems: "center", justifyContent: "center", flex: `0 0 ${size}px`,
    }}>{children}</span>
  );
}

function Chip({ children, variant = "light", icon }) {
  const s = {
    light:  { background: "var(--surface-soft)", color: "var(--fg3)", border: "1px solid var(--border)" },
    brand:  { background: "rgba(200,230,160,0.30)", color: "var(--brand)", border: "1px solid transparent" },
    dark:   { background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.90)", border: "1px solid rgba(255,255,255,0.20)" },
    "dark-strong": { background: "rgba(255,255,255,0.10)", color: "#fff", border: "1px solid rgba(255,255,255,0.20)", padding: "8px 16px" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
      borderRadius: 999, fontSize: 12, fontWeight: 600, lineHeight: 1.4,
      whiteSpace: "nowrap", ...s[variant],
    }}>{icon}{children}</span>
  );
}

function Stars({ value = 4.94 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-flex", gap: 2 }}>
        {[1,2,3,4,5].map(i => (
          <Icons.IconStar key={i} size={14} style={{ fill: "#f59e0b", color: "#f59e0b" }} />
        ))}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "currentColor" }}>{value}</span>
    </span>
  );
}

function FlagBadge({ code }) {
  // Real flags would use the flag-icons sprite. Simple CSS gradients are enough for the demo.
  const FLAGS = {
    ie: "linear-gradient(to right, #169B62 33%, #fff 33% 66%, #FF883E 66%)",
    pt: "linear-gradient(to right, #046A38 40%, #DA291C 40%)",
    es: "linear-gradient(to bottom, #AA151B 25%, #F1BF00 25% 75%, #AA151B 75%)",
    cz: "linear-gradient(to bottom, #fff 50%, #D7141A 50%), linear-gradient(135deg, #11457E 50%, transparent 50%)",
    ro: "linear-gradient(to right, #002B7F 33%, #FCD116 33% 66%, #CE1126 66%)",
    gb: "linear-gradient(135deg, #012169 0%, #fff 50%, #C8102E 100%)",
  };
  return (
    <span title={code.toUpperCase()} style={{
      width: 28, height: 20, borderRadius: 3,
      background: FLAGS[code] || "#e5e7eb",
      backgroundBlendMode: code === "cz" ? "normal" : "normal",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
      flex: "0 0 28px",
    }} />
  );
}

/* ── Containers ───────────────────────────────────────────── */

function Container({ children, className = "", style = {} }) {
  return (
    <div className={className} style={{
      maxWidth: "var(--container-width)", margin: "0 auto",
      padding: "0 clamp(20px, 4vw, 48px)", ...style,
    }}>{children}</div>
  );
}

function Section({ children, variant = "white", pattern = false, style = {} }) {
  const bg = {
    white: "var(--surface)",
    soft:  "var(--surface-soft)",
    brand: "var(--brand)",
    dark:  "var(--surface-dark)",
  }[variant];
  const color = variant === "brand" || variant === "dark" ? "#fff" : "inherit";
  return (
    <section style={{
      position: "relative", background: bg, color,
      padding: "clamp(64px, 9vw, 112px) 0",
      overflow: "hidden",
      ...style,
    }}>
      {pattern && (
        <div aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: variant === "brand" || variant === "dark"
            ? `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`
            : `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%231b4d3e' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "28px 28px",
          opacity: variant === "brand" || variant === "dark" ? 0.06 : 0.022,
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </section>
  );
}

Object.assign(window, { Btn, Eyebrow, IconTile, Chip, Stars, FlagBadge, Container, Section });
