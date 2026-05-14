// HomeHero.jsx — Editorial type-first hero. No stock photo. Big statement,
// live country picker with availability data baked in.

function HomeHero({ country, onCountry, onBook }) {
  const CTRY_DATA = {
    ie: { name: "Ireland",  doctors: 14, next: "today 14:30", lang: "English" },
    pt: { name: "Portugal", doctors: 11, next: "today 11:15", lang: "Portuguese" },
    es: { name: "Spain",    doctors:  9, next: "today 16:00", lang: "Spanish"   },
    cz: { name: "Czechia",  doctors:  7, next: "tomorrow 09:00", lang: "Czech"  },
    rm: { name: "Romania",  doctors:  6, next: "today 17:30", lang: "Romanian"  },
  };
  const c = CTRY_DATA[country];

  return (
    <section style={{
      position: "relative", overflow: "hidden",
      paddingBottom: 64, paddingTop: 64,
    }}>
      {/* Decorative — single bold horizontal rule of medical-pattern texture */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%231B4D3E' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: "28px",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 1320, margin: "0 auto",
        padding: "0 clamp(20px, 4vw, 40px)",
      }}>
        {/* Tiny eyebrow + the headline */}
        <div style={{
          fontSize: 12, fontWeight: 700, color: "var(--brand)",
          letterSpacing: "0.18em", textTransform: "uppercase",
          display: "inline-flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--brand)" }} />
          Medicine without borders
        </div>

        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(48px, 9vw, 128px)",
          fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.92,
          margin: "20px 0 0", color: "var(--fg1)",
          maxWidth: "14ch",
        }}>
          See a doctor.{" "}
          <span style={{
            background: "linear-gradient(180deg, transparent 64%, var(--accent) 64% 92%, transparent 92%)",
            paddingInline: "0.05em",
          }}>From anywhere.</span>
        </h1>

        <p style={{
          marginTop: 28, fontSize: "clamp(17px, 1.4vw, 22px)",
          lineHeight: 1.55, color: "var(--fg3)", maxWidth: "44ch",
        }}>
          Online video consultations with locally-registered doctors in
          Ireland, Portugal, Spain, Czechia, and Romania. Same day, in your
          language, from your sofa.
        </p>

        {/* Live country strip — pulls the country switcher into the page body */}
        <div style={{
          marginTop: 48,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
        }} className="hero-bottom">
          {/* Left: current country detail */}
          <div style={{
            border: "1px solid var(--border)",
            borderRadius: 24, background: "#fff",
            padding: 28,
            boxShadow: "var(--shadow-card)",
            display: "flex", flexDirection: "column", gap: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{
                width: 56, height: 56, borderRadius: 16,
                background: "var(--surface-soft)",
                border: "1px solid var(--border)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <FlagBadge code={country === "rm" ? "ro" : country} />
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)",
                            letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                  Booking in
                </p>
                <p style={{ margin: 0, fontFamily: "var(--font-display)",
                            fontSize: 28, fontWeight: 800, color: "var(--fg1)",
                            letterSpacing: "-0.015em", lineHeight: 1.1 }}>
                  {c.name}
                </p>
              </div>
              <span style={{
                width: 10, height: 10, borderRadius: 999,
                background: "#16A34A",
                boxShadow: "0 0 0 4px rgba(22,163,74,0.18)",
                animation: "pulse 2s ease-out infinite",
              }} />
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12, padding: "16px 0", borderTop: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
            }}>
              <Stat label="Doctors" value={c.doctors} />
              <Stat label="Language" value={c.lang} />
              <Stat label="Next slot" value={c.next} highlight />
            </div>

            <Btn variant="primary" size="lg" onClick={onBook} iconRight>
              Book consultation in {c.name}
            </Btn>
          </div>

          {/* Right: visual rhythm — a "right now" feed */}
          <div style={{
            borderRadius: 24, background: "var(--brand-dark)", color: "#fff",
            padding: 28, position: "relative", overflow: "hidden",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div aria-hidden style={{
              position: "absolute", inset: 0, opacity: 0.06,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: "28px",
            }} />
            <div style={{ position: "relative" }}>
              <p style={{ margin: 0, fontSize: 11, color: "var(--accent)",
                          letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
                Right now
              </p>
              <p style={{ margin: "4px 0 0", fontFamily: "var(--font-display)",
                          fontSize: 22, fontWeight: 800, color: "#fff",
                          letterSpacing: "-0.015em", lineHeight: 1.2 }}>
                47 doctors online across Europe
              </p>
            </div>

            <div style={{
              position: "relative",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {[
                { who: "Dr. Inês C.", role: "GP, Portugal",  in: "9 min" },
                { who: "Dr. Siobhán W.", role: "GP, Ireland", in: "16 min" },
                { who: "Dr. María R.", role: "Dermatology, Spain", in: "24 min" },
              ].map(d => (
                <div key={d.who} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 14, padding: "10px 14px",
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: "linear-gradient(135deg, var(--accent), var(--brand))",
                    color: "var(--brand-dark)", fontWeight: 800, fontSize: 11,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>{d.who.match(/[A-Z]/g).slice(0,2).join("")}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {d.who}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{d.role}</p>
                  </div>
                  <span style={{
                    padding: "4px 10px", borderRadius: 999,
                    background: "rgba(200,230,160,0.16)", color: "var(--accent)",
                    fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                  }}>in {d.in}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(22,163,74,0.18); }
          50% { box-shadow: 0 0 0 8px rgba(22,163,74,0.05); }
        }
        @media (min-width: 900px) {
          .hero-bottom { grid-template-columns: 1.1fr 1fr !important; gap: 20px !important; }
        }
      `}</style>
    </section>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, color: "var(--fg3)",
                  letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700,
                  color: highlight ? "var(--brand)" : "var(--fg1)",
                  fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
    </div>
  );
}

window.HomeHero = HomeHero;
