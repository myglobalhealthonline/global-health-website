// Shell.jsx — sidebar, topbar, country picker, page header.

const COUNTRIES = [
  { code: "all", name: "All countries" },
  { code: "ie", name: "Ireland" },
  { code: "pt", name: "Portugal" },
  { code: "es", name: "Spain" },
  { code: "cz", name: "Czechia" },
  { code: "rm", name: "Romania" },
];
window.COUNTRIES = COUNTRIES;

/* ── Sidebar ──────────────────────────────────────────────── */

function Sidebar({ activeScreen, onNavigate, activeCountry }) {
  const globalNav = [
    { id: "dashboard",  label: "Dashboard",   icon: <I.Home size={16} /> },
    { id: "countries",  label: "Countries",   icon: <I.Globe size={16} /> },
    { id: "categories", label: "Categories",  icon: <I.Layers size={16} /> },
    { id: "doctors",    label: "Doctors",     icon: <I.Stethoscope size={16} /> },
    { id: "admins",     label: "Admin users", icon: <I.Users size={16} /> },
    { id: "audit",      label: "Audit log",   icon: <I.Log size={16} /> },
  ];
  const ctry = COUNTRIES.find(c => c.code === activeCountry) || COUNTRIES[0];
  const isAll = activeCountry === "all";
  const countryNav = [
    { id: "country-home",     label: "Country home" },
    { id: "country-content",  label: "Country content" },
    { id: "services-general", label: "General consultations" },
    { id: "services-specialist", label: "Specialist consultations" },
    { id: "services-prescriptions", label: "Online prescriptions" },
    { id: "services-tests",   label: "Health tests" },
    { id: "appointments",     label: "Appointments" },
  ];

  return (
    <aside style={{
      width: 260, flexShrink: 0, background: "var(--surface-dark)",
      color: "rgba(255,255,255,0.85)", minHeight: "100vh",
      display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="../../assets/logo/global-health-logo.png" alt="" style={{
            height: 36, width: "auto", filter: "brightness(0) invert(1)",
          }} />
        </div>
        <p style={{ marginTop: 8, fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.22em", textTransform: "uppercase",
                    color: "var(--accent)" }}>
          Super admin
        </p>
      </div>

      {/* Global */}
      <SidebarSection label="Global" />
      <div style={{ padding: "4px 12px" }}>
        {globalNav.map(item => (
          <SidebarItem key={item.id} {...item} active={activeScreen === item.id}
                       onClick={() => onNavigate(item.id)} />
        ))}
      </div>

      {/* Country-scoped */}
      <SidebarSection label={isAll ? "Country" : ctry.name}>
        {!isAll && <FlagBadge code={ctry.code} size={14} />}
      </SidebarSection>
      <div style={{ padding: "4px 12px 24px", opacity: isAll ? 0.45 : 1, pointerEvents: isAll ? "none" : "auto" }}>
        {countryNav.map(item => (
          <SidebarItem key={item.id} {...item} active={activeScreen === item.id}
                       onClick={() => onNavigate(item.id)}
                       icon={<span style={{ width: 4, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.4)" }} />} />
        ))}
      </div>

      <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
        v1.0 · medicine without borders
      </div>
    </aside>
  );
}

function SidebarSection({ label, children }) {
  return (
    <div style={{
      padding: "16px 24px 6px", display: "flex", alignItems: "center", gap: 8,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.50)",
    }}>
      <span>{label}</span>{children}
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "9px 12px", borderRadius: 10, border: "none", textAlign: "left",
      background: active ? "rgba(200,230,160,0.16)" : "transparent",
      color: active ? "var(--accent)" : "rgba(255,255,255,0.80)",
      fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer",
      fontFamily: "inherit",
      transition: "all 150ms",
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      <span style={{ display: "inline-flex", width: 16, justifyContent: "center" }}>{icon}</span>
      {label}
    </button>
  );
}

/* ── Country picker ───────────────────────────────────────── */

function CountryPicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const current = COUNTRIES.find(c => c.code === value) || COUNTRIES[0];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "8px 12px 8px 14px", borderRadius: 10,
        background: "#fff", border: "1px solid var(--border)",
        cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "var(--fg1)",
        fontWeight: 600,
      }}>
        <FlagBadge code={current.code} size={16} />
        <span>{current.name}</span>
        <I.ChevronD size={14} style={{ color: "var(--fg3)" }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 30,
          }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 31,
            background: "#fff", borderRadius: 12, border: "1px solid var(--border)",
            boxShadow: "var(--shadow-elevated)", padding: 6, minWidth: 220,
          }}>
            {COUNTRIES.map(c => (
              <button key={c.code} onClick={() => { onChange(c.code); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "8px 10px", borderRadius: 8, border: "none",
                background: c.code === value ? "var(--surface-soft)" : "transparent",
                color: "var(--fg1)", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                cursor: "pointer", textAlign: "left",
              }}>
                <FlagBadge code={c.code} size={16} />
                {c.name}
                {c.code === value && <I.Check size={14} style={{ marginLeft: "auto", color: "var(--brand)" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Topbar ───────────────────────────────────────────────── */

function Topbar({ breadcrumb, country, onCountry }) {
  return (
    <header style={{
      height: 64, background: "#fff", borderBottom: "1px solid var(--border)",
      padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg3)",
                    flexWrap: "nowrap", minWidth: 0, overflow: "hidden" }}>
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            <span style={{ color: i === breadcrumb.length - 1 ? "var(--fg1)" : "var(--fg3)",
                           fontWeight: i === breadcrumb.length - 1 ? 700 : 500,
                           whiteSpace: "nowrap" }}>{b}</span>
            {i < breadcrumb.length - 1 && <I.ChevronR size={12} style={{ flexShrink: 0 }} />}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <CountryPicker value={country} onChange={onCountry} />
        <button style={{
          width: 40, height: 40, borderRadius: 10, border: "1px solid var(--border)",
          background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative",
        }}>
          <I.Bell size={16} style={{ color: "var(--fg2)" }} />
          <span style={{
            position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 999,
            background: "var(--accent-vivid)", border: "2px solid #fff",
          }} />
        </button>
        <button style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 6px",
          borderRadius: 999, border: "1px solid var(--border)", background: "#fff",
          cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "var(--fg1)", fontWeight: 600,
        }}>
          <span style={{
            width: 30, height: 30, borderRadius: 999, background: "var(--brand)",
            color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 12,
          }}>HA</span>
          Hassaan
          <I.ChevronD size={12} style={{ color: "var(--fg3)" }} />
        </button>
      </div>
    </header>
  );
}

/* ── Page header (above content) ──────────────────────────── */

function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      gap: 24, marginBottom: 24, flexWrap: "wrap",
    }}>
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.15, color: "var(--fg1)",
          margin: eyebrow ? "10px 0 6px" : "0 0 6px",
        }}>{title}</h1>
        {description && (
          <p style={{ margin: 0, color: "var(--fg3)", fontSize: 15, maxWidth: 640 }}>{description}</p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, CountryPicker, PageHeader });
