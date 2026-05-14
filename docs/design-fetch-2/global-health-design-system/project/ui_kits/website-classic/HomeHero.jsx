// HomeHero.jsx — the country/language picker hero from HomeHero.tsx.

function HomeHero({ onSelectCountry }) {
  const [lang, setLang] = React.useState("en");
  const [langOpen, setLangOpen] = React.useState(false);

  const LOCALES = [
    { code: "en", name: "English",    flag: "gb" },
    { code: "pt", name: "Portugues",  flag: "pt" },
    { code: "es", name: "Espanol",    flag: "es" },
    { code: "cs", name: "Cestina",    flag: "cz" },
    { code: "ro", name: "Romana",     flag: "ro" },
  ];

  const COUNTRIES = [
    { code: "cz", flag: "cz", name: "Czechia" },
    { code: "ie", flag: "ie", name: "Ireland" },
    { code: "pt", flag: "pt", name: "Portugal" },
    { code: "ro", flag: "ro", name: "Romania" },
    { code: "es", flag: "es", name: "Spain" },
  ];

  const selectedLocale = LOCALES.find(l => l.code === lang);

  return (
    <section style={{
      position: "relative", isolation: "isolate", overflow: "hidden",
      minHeight: "calc(100vh - var(--header-height))",
    }}>
      {/* Warm photo background — using the brand book laptop mockup as a stand-in. */}
      <div aria-hidden style={{
        position: "absolute", inset: 0,
        background: "url(../../assets/brand/laptop-mockup.png) center/cover no-repeat #1c1410",
        transform: "scale(1.05)",
      }} />
      {/* Forest gradient overlay */}
      <div aria-hidden style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(120deg, rgba(10,52,42,0.85) 0%, rgba(14,76,60,0.78) 45%, rgba(18,96,76,0.70) 100%)",
      }} />
      {/* Medical pattern */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: 0.05,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: "28px",
      }} />

      <Container style={{
        position: "relative", zIndex: 2,
        display: "grid", gap: 56, alignItems: "center",
        minHeight: "calc(100vh - var(--header-height))",
        padding: "48px clamp(20px,4vw,48px) 64px",
        gridTemplateColumns: "1fr",
      }} className="hero-grid">
        {/* LEFT — copy */}
        <div style={{ color: "#fff", maxWidth: 640 }}>
          <Chip variant="dark-strong" icon={<Icons.IconGlobe size={14} style={{ color: "var(--accent)" }} />}>
            5 Countries · Online Care
          </Chip>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
            fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em",
            margin: "32px 0 0",
          }}>
            Medical Consultations<br/>
            <span style={{ color: "var(--accent)" }}>Wherever You Are</span>
          </h1>
          <p style={{
            marginTop: 20, fontSize: 19, lineHeight: 1.55, color: "rgba(255,255,255,0.85)", maxWidth: 540,
          }}>
            Choose your country and language to enter your local clinic.
            Expert doctors, online prescriptions, and health tests — all from home.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            {[
              { v: "50+", l: "Expert Doctors", e: "👨‍⚕️" },
              { v: "5",   l: "Countries",      e: "🌍"   },
              { v: "24/7",l: "Available",      e: "⚡"    },
            ].map(s => (
              <span key={s.l} style={{
                display: "inline-flex", alignItems: "center", gap: 12,
                background: "rgba(15,46,37,0.72)", border: "1px solid rgba(255,255,255,0.20)",
                borderRadius: 999, padding: "10px 20px", backdropFilter: "blur(8px)",
              }}>
                <span style={{ fontSize: 18 }}>{s.e}</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{s.v}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.60)" }}>{s.l}</span>
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT — glass card with language + country pickers */}
        <div style={{ width: "100%", maxWidth: 520, justifySelf: "stretch" }} className="hero-card">
          <div style={{
            borderRadius: 20, border: "1px solid rgba(255,255,255,0.20)",
            background: "rgba(15,46,37,0.72)", padding: 28, color: "#fff",
            boxShadow: "0 24px 60px rgba(4,22,17,0.34)",
            backdropFilter: "blur(16px)",
          }}>
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>
              <Icons.IconGlobe size={20} style={{ color: "var(--accent)" }} />
              Select Your Language
            </p>

            <div style={{ position: "relative", marginBottom: 24 }}>
              <button onClick={() => setLangOpen(!langOpen)} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                minHeight: 48, padding: "0 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)",
                color: "#fff", cursor: "pointer", fontSize: 15, fontFamily: "inherit",
              }}>
                <FlagBadge code={selectedLocale.flag} />
                <span style={{ fontWeight: 700 }}>{selectedLocale.name}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)", textTransform: "uppercase", letterSpacing: "0.06em" }}>({lang})</span>
                <Icons.IconChevronD size={16} style={{
                  marginLeft: "auto", color: "rgba(255,255,255,0.70)",
                  transition: "transform 200ms", transform: langOpen ? "rotate(180deg)" : "none",
                }} />
              </button>
              {langOpen && (
                <div style={{
                  position: "absolute", inset: "calc(100% + 8px) 0 auto 0", zIndex: 20,
                  overflow: "hidden", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.20)",
                  background: "rgba(15,46,37,0.96)", backdropFilter: "blur(10px)",
                  boxShadow: "var(--shadow-elevated)",
                }}>
                  {LOCALES.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }} style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                      background: l.code === lang ? "rgba(255,255,255,0.10)" : "transparent",
                      border: "none", color: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    }}>
                      <FlagBadge code={l.flag} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{l.name}</span>
                      {l.code === lang && <span style={{ marginLeft: "auto", color: "var(--accent)", fontWeight: 800, fontSize: 12 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p style={{
              fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.80)",
              textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 12px",
            }}>Choose Your Clinic</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {COUNTRIES.map(c => (
                <button key={c.code} onClick={() => onSelectCountry(c.code, c.name)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, minHeight: 56, padding: "0 16px 0 18px",
                  borderRadius: 14, background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 15, textAlign: "left",
                  transition: "all 180ms ease-out",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.18)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.30)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                    <FlagBadge code={c.flag} />
                    <span style={{ fontWeight: 700 }}>Medical Clinic {c.name}</span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <img src={`../../assets/countries/${c.code === "es" ? "sp" : c.code === "ro" ? "rm" : c.code}-menu.png`}
                         alt="" width={36} height={36} style={{
                      width: 36, height: 36, borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.20)", objectFit: "cover",
                    }} onError={e => { e.currentTarget.style.display = "none"; }} />
                    <Icons.IconChevronR size={16} style={{ color: "var(--accent)" }} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

window.HomeHero = HomeHero;
