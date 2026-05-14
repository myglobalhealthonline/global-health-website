// Header.jsx — minimal nav: wordmark left, country tabs centre, CTA right.

function Header({ country, onCountry, onBook }) {
  const COUNTRIES = [
    { code: "ie", name: "Ireland",   tz: "GMT" },
    { code: "pt", name: "Portugal",  tz: "WET" },
    { code: "es", name: "Spain",     tz: "CET" },
    { code: "cz", name: "Czechia",   tz: "CET" },
    { code: "rm", name: "Romania",   tz: "EET" },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        maxWidth: 1320, margin: "0 auto",
        padding: "16px clamp(20px, 4vw, 40px)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center", gap: 32,
      }}>
        {/* Brand wordmark */}
        <a href="#" style={{
          textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 6,
            background: "var(--brand)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontFamily: "var(--font-display)",
            fontSize: 14, fontWeight: 800,
          }}>g</span>
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: 17, fontWeight: 800,
            color: "var(--fg1)", letterSpacing: "-0.02em",
          }}>
            Global Health
          </span>
        </a>

        {/* Country tabs */}
        <nav style={{
          display: "flex", justifyContent: "center", gap: 4,
          background: "var(--surface-soft)",
          padding: 4, borderRadius: 999,
          width: "fit-content",
          margin: "0 auto",
          border: "1px solid var(--border)",
        }} className="country-tabs">
          {COUNTRIES.map(c => (
            <button key={c.code} onClick={() => onCountry(c.code)} style={{
              padding: "8px 16px", borderRadius: 999, border: "none",
              background: country === c.code ? "#fff" : "transparent",
              color: country === c.code ? "var(--fg1)" : "var(--fg3)",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              boxShadow: country === c.code ? "var(--shadow-soft)" : "none",
              transition: "all 180ms ease-out",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              <FlagBadge code={c.code === "rm" ? "ro" : c.code === "es" ? "es" : c.code} />
              {c.name}
            </button>
          ))}
        </nav>

        {/* Right side: minimal */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="#" style={{
            fontSize: 14, fontWeight: 600, color: "var(--fg2)", textDecoration: "none",
          }} className="desktop-only">Log in</a>
          <Btn variant="primary" onClick={onBook}>Book</Btn>
        </div>
      </div>
    </header>
  );
}

window.Header = Header;
