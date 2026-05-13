// Atoms.jsx — admin-specific atoms. Reuses tokens from colors_and_type.css.

const { useState: useS } = React;

/* ── Icons (Lucide-style, inline SVG) ─────────────────────── */
const ic = (path, vb = "0 0 24 24") => ({ size = 18, className = "", style = {} }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className={className} style={style} aria-hidden>{path}</svg>
);

const I = {
  Home:     ic(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>),
  Globe:    ic(<><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></>),
  Layers:   ic(<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>),
  Users:    ic(<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  Stethoscope: ic(<><path d="M4.8 2.3A.3.3 0 0 0 4.5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-.5a.3.3 0 0 0-.3.3v1.4a.3.3 0 0 0 .3.3H12a.3.3 0 0 1 .3.3V9a4 4 0 0 1-8 0V4.3A.3.3 0 0 1 4.5 4h.1a.3.3 0 0 0 .3-.3z"/><circle cx="20" cy="10" r="2"/><path d="M8 15v2a6 6 0 0 0 12 0v-5"/></>),
  Briefcase:ic(<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>),
  Shield:   ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>),
  Activity: ic(<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>),
  Calendar: ic(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
  Settings: ic(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>),
  Plus:     ic(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>),
  Search:   ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
  Filter:   ic(<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>),
  Grip:     ic(<><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></>),
  ChevronD: ic(<polyline points="6 9 12 15 18 9"/>),
  ChevronR: ic(<polyline points="9 18 15 12 9 6"/>),
  ChevronL: ic(<polyline points="15 18 9 12 15 6"/>),
  ArrowR:   ic(<><path d="M5 12h14M13 5l7 7-7 7"/></>),
  Edit:     ic(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>),
  Trash:    ic(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></>),
  More:     ic(<><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>),
  Check:    ic(<path d="M20 6 9 17l-5-5"/>),
  Close:    ic(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>),
  Upload:   ic(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>),
  Log:      ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></>),
  Eye:      ic(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>),
  Star:     ic(<polygon points="12 2 15 9 22 9 17 14 19 22 12 17 5 22 7 14 2 9 9 9 12 2"/>),
  Pkg:      ic(<><path d="M16 16h6v6h-6zM2 16h6v6H2zM16 2h6v6h-6zM2 2h6v6H2z"/><path d="M8 5h8M8 19h8M5 8v8M19 8v8"/></>),
  TestTube: ic(<><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><line x1="8" y1="2" x2="16" y2="2"/><line x1="9.5" y1="13" x2="14.5" y2="13"/></>),
  Heart:    ic(<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>),
  Bell:     ic(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>),
  Logout:   ic(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
};

window.I = I;

/* ── Buttons ──────────────────────────────────────────────── */

function Btn({ children, variant = "primary", size = "md", iconLeft, iconRight, onClick, type = "button", className = "", style = {} }) {
  const sizes = {
    sm: { minHeight: 36, padding: "0 14px", fontSize: 13 },
    md: { minHeight: 44, padding: "0 20px", fontSize: 14 },
    lg: { minHeight: 48, padding: "0 24px", fontSize: 14 },
  };
  const variants = {
    primary: { background: "var(--brand)", color: "#fff", border: "1px solid var(--brand)" },
    secondary: { background: "#fff", color: "var(--brand)", border: "1px solid var(--brand)" },
    soft:    { background: "var(--surface-soft)", color: "var(--brand)", border: "1px solid transparent" },
    ghost:   { background: "transparent", color: "var(--fg2)", border: "1px solid transparent" },
    accent:  { background: "var(--accent)", color: "#143B30", border: "1px solid transparent" },
    danger:  { background: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5" },
  };
  return (
    <button type={type} onClick={onClick} className={className} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      borderRadius: 999, fontWeight: 700, lineHeight: 1, cursor: "pointer",
      fontFamily: "inherit", boxShadow: "var(--shadow-soft)",
      transition: "all 180ms ease-out",
      whiteSpace: "nowrap", flexShrink: 0,
      ...sizes[size], ...variants[variant], ...style,
    }}>
      {iconLeft}<span style={{ whiteSpace: "nowrap" }}>{children}</span>{iconRight}
    </button>
  );
}

/* ── Status pill / chip ───────────────────────────────────── */

function Pill({ children, tone = "neutral", style = {} }) {
  const tones = {
    neutral:    { bg: "var(--surface-soft)", fg: "var(--fg2)", bd: "var(--border)" },
    published:  { bg: "rgba(200,230,160,0.30)", fg: "var(--brand)", bd: "transparent" },
    draft:      { bg: "#F5F5F4", fg: "#78716C", bd: "#E5E5E3" },
    pending:    { bg: "#FEF3C7", fg: "#92400E", bd: "#FDE68A" },
    active:     { bg: "#DCFCE7", fg: "#166534", bd: "#BBF7D0" },
    inactive:   { bg: "#FEE2E2", fg: "#991B1B", bd: "#FECACA" },
    brand:      { bg: "var(--brand)",  fg: "#fff", bd: "transparent" },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      whiteSpace: "nowrap", ...style,
    }}>{children}</span>
  );
}

/* ── Eyebrow ──────────────────────────────────────────────── */

function Eyebrow({ children, color = "var(--brand)" }) {
  return <span style={{
    fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
    textTransform: "uppercase", color,
  }}>{children}</span>;
}

/* ── Field (label + input/select/textarea) ────────────────── */

function Field({ label, hint, required, error, children, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>
          {label}{required && <span style={{ color: "#DC2626", marginLeft: 4 }}>*</span>}
        </label>
      )}
      {children}
      {(hint || error) && (
        <span style={{ fontSize: 12, color: error ? "#991B1B" : "var(--fg3)" }}>{error || hint}</span>
      )}
    </div>
  );
}

const inputBase = {
  width: "100%", minHeight: 44, padding: "10px 14px",
  border: "1px solid var(--border)", borderRadius: 12,
  background: "#fff", color: "var(--fg2)", fontSize: 14,
  lineHeight: 1.4, fontFamily: "inherit", outline: "none",
};

function Input({ style = {}, ...props }) {
  const [focused, setF] = React.useState(false);
  return <input {...props} onFocus={(e) => { setF(true); props.onFocus?.(e); }}
                 onBlur={(e) => { setF(false); props.onBlur?.(e); }}
                 style={{ ...inputBase,
                          borderColor: focused ? "var(--brand)" : "var(--border)",
                          boxShadow: focused ? "var(--shadow-focus)" : "none",
                          ...style }} />;
}

function TextArea({ style = {}, rows = 4, ...props }) {
  return <textarea rows={rows} {...props} style={{
    ...inputBase, minHeight: 90, padding: "12px 14px", resize: "vertical",
    fontFamily: "inherit", ...style,
  }} />;
}

function Select({ style = {}, children, ...props }) {
  return <select {...props} style={{
    ...inputBase, paddingRight: 36,
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231B4D3E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    ...style,
  }}>{children}</select>;
}

/* ── Toggle ───────────────────────────────────────────────── */

function Toggle({ on, onChange, size = 24 }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: size * 1.75, height: size, borderRadius: 999,
      background: on ? "var(--brand)" : "var(--border-strong)",
      border: "none", cursor: "pointer", padding: 2,
      position: "relative", transition: "background 180ms",
    }}>
      <span style={{
        position: "absolute", top: 2, left: on ? `calc(100% - ${size - 2}px)` : 2,
        width: size - 4, height: size - 4, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.20)",
        transition: "left 180ms ease-out",
      }} />
    </button>
  );
}

/* ── Flag badge (CSS-gradient approximations) ─────────────── */

const FLAGS = {
  ie: "linear-gradient(to right, #169B62 33%, #fff 33% 66%, #FF883E 66%)",
  pt: "linear-gradient(to right, #046A38 40%, #DA291C 40%)",
  es: "linear-gradient(to bottom, #AA151B 25%, #F1BF00 25% 75%, #AA151B 75%)",
  cz: "linear-gradient(to bottom, #fff 50%, #D7141A 50%)",
  rm: "linear-gradient(to right, #002B7F 33%, #FCD116 33% 66%, #CE1126 66%)",
  ro: "linear-gradient(to right, #002B7F 33%, #FCD116 33% 66%, #CE1126 66%)",
  all:"linear-gradient(135deg, #1B4D3E, #C8E6A0)",
};

function FlagBadge({ code, size = 18 }) {
  return <span title={code.toUpperCase()} style={{
    width: size + 8, height: size, borderRadius: 3,
    background: FLAGS[code] || "#e5e7eb",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
    flex: `0 0 ${size + 8}px`, display: "inline-block",
  }} />;
}

/* ── Country chip (flag + label) ──────────────────────────── */

function CountryChip({ code, name, onClick, removable, onRemove }) {
  return (
    <span onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "4px 10px 4px 8px", borderRadius: 999,
      background: "var(--surface-soft)", border: "1px solid var(--border)",
      fontSize: 12, fontWeight: 600, color: "var(--fg2)",
      cursor: onClick ? "pointer" : "default",
    }}>
      <FlagBadge code={code} size={14} />
      {name}
      {removable && (
        <button onClick={(e) => { e.stopPropagation(); onRemove?.(); }} style={{
          width: 14, height: 14, borderRadius: 999, border: "none",
          background: "var(--border)", color: "var(--fg3)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 0,
        }}>×</button>
      )}
    </span>
  );
}

/* ── Card ─────────────────────────────────────────────────── */

function Card({ children, style = {}, padding = 24 }) {
  return <div style={{
    background: "#fff", border: "1px solid var(--border)", borderRadius: 16,
    boxShadow: "var(--shadow-soft)", padding,
    ...style,
  }}>{children}</div>;
}

Object.assign(window, { Btn, Pill, Eyebrow, Field, Input, TextArea, Select, Toggle, FlagBadge, CountryChip, Card });
