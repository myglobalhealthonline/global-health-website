// Sections.jsx — new editorial-led content sections.

/* ── Trust ribbon — one line, not a 4-card grid ─────────────── */

function TrustRibbon() {
  const items = [
    { v: "50+", l: "Licensed doctors" },
    { v: "5",   l: "Countries · EU-registered" },
    { v: "GDPR",l: "Compliant by default" },
    { v: "4.94",l: "Doctify rating · 19 reviews" },
  ];
  return (
    <section style={{
      background: "var(--surface-soft)",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      padding: "20px 0",
    }}>
      <div style={{
        maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px)",
        display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between",
      }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "inline-flex", alignItems: "baseline", gap: 12, flex: "1 1 200px",
          }}>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800,
              color: "var(--brand)", letterSpacing: "-0.02em", lineHeight: 1,
            }}>{it.v}</span>
            <span style={{ fontSize: 13, color: "var(--fg3)", fontWeight: 600 }}>{it.l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Service catalog — filterable browse ────────────────────── */

function ServiceCatalog({ onBook }) {
  const [filter, setFilter] = React.useState("all");

  const SERVICES = [
    { type: "general",      title: "General consultation",   tag: "General",    price: 50,  dur: "30 min", icon: <Icons.IconStethoscope size={22} />, doctors: 14 },
    { type: "general",      title: "Travel health",          tag: "General",    price: 60,  dur: "30 min", icon: <Icons.IconGlobe size={22} />,       doctors: 11 },
    { type: "general",      title: "Weight loss",            tag: "General",    price: 80,  dur: "45 min", icon: <Icons.IconHeart size={22} />,       doctors:  5 },
    { type: "specialist",   title: "Cardiology",             tag: "Specialist", price: 120, dur: "45 min", icon: <Icons.IconHeart size={22} />,       doctors:  3 },
    { type: "specialist",   title: "Dermatology",            tag: "Specialist", price: 95,  dur: "30 min", icon: <Icons.IconShield size={22} />,      doctors:  4 },
    { type: "specialist",   title: "Mental health",          tag: "Specialist", price: 110, dur: "50 min", icon: <Icons.IconUser size={22} />,        doctors:  6 },
    { type: "prescription", title: "Repeat prescription",    tag: "Prescription", price: 25, dur: "15 min", icon: <Icons.IconPackage size={22} />,    doctors:  9 },
    { type: "prescription", title: "Contraceptive review",   tag: "Prescription", price: 35, dur: "20 min", icon: <Icons.IconPackage size={22} />,    doctors:  4 },
    { type: "test",         title: "Full blood panel",       tag: "Home test",    price: 65, dur: "Sent home", icon: <Icons.IconCheckCircle size={22} />, doctors: 0 },
    { type: "test",         title: "Thyroid panel",          tag: "Home test",    price: 55, dur: "Sent home", icon: <Icons.IconCheckCircle size={22} />, doctors: 0 },
    { type: "test",         title: "STI panel · confidential",tag:"Home test",    price: 80, dur: "Sent home", icon: <Icons.IconCheckCircle size={22} />, doctors: 0 },
    { type: "specialist",   title: "Pediatrics",             tag: "Specialist", price: 90,  dur: "30 min", icon: <Icons.IconUser size={22} />,        doctors:  2 },
  ];

  const FILTERS = [
    { id: "all",          label: "All",                count: SERVICES.length },
    { id: "general",      label: "General",            count: SERVICES.filter(s => s.type === "general").length },
    { id: "specialist",   label: "Specialist",         count: SERVICES.filter(s => s.type === "specialist").length },
    { id: "prescription", label: "Prescriptions",      count: SERVICES.filter(s => s.type === "prescription").length },
    { id: "test",         label: "Home tests",         count: SERVICES.filter(s => s.type === "test").length },
  ];

  const shown = filter === "all" ? SERVICES : SERVICES.filter(s => s.type === filter);

  return (
    <section style={{ padding: "96px 0 64px" }}>
      <div style={{
        maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          gap: 24, marginBottom: 36, flexWrap: "wrap",
        }}>
          <div>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--brand)",
            }}>What we treat</span>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800,
              letterSpacing: "-0.02em", lineHeight: 1.1,
              color: "var(--fg1)", margin: "12px 0 0", maxWidth: "16ch",
            }}>
              Browse {SERVICES.length} services.
            </h2>
          </div>
          <p style={{ color: "var(--fg3)", maxWidth: "32ch", margin: 0, fontSize: 16 }}>
            Every service is delivered by doctors registered in your country, billed
            in your currency, in your language.
          </p>
        </div>

        {/* Filter pills */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24,
          padding: "16px 0", borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: "10px 18px", borderRadius: 999,
              border: "1px solid " + (filter === f.id ? "var(--brand)" : "var(--border)"),
              background: filter === f.id ? "var(--brand)" : "#fff",
              color: filter === f.id ? "#fff" : "var(--fg2)",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              transition: "all 180ms ease-out",
            }}>
              {f.label}
              <span style={{
                background: filter === f.id ? "rgba(255,255,255,0.20)" : "var(--surface-soft)",
                color: filter === f.id ? "#fff" : "var(--fg3)",
                fontSize: 11, fontWeight: 800, padding: "2px 6px",
                borderRadius: 999, minWidth: 20, textAlign: "center",
              }}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Card grid */}
        <div style={{
          display: "grid", gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        }}>
          {shown.map(s => (
            <ServiceTile key={s.title} service={s} onBook={onBook} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceTile({ service: s, onBook }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button onClick={onBook}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", textAlign: "left", padding: 0,
        background: "#fff", border: "1px solid var(--border)",
        borderRadius: 20, overflow: "hidden", cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 180ms ease-out",
        boxShadow: hovered ? "var(--shadow-card-hover)" : "var(--shadow-soft)",
        transform: hovered ? "translateY(-2px)" : "none",
      }}>
      {/* Top stripe with icon + price */}
      <div style={{
        height: 90,
        background: s.type === "test"
          ? "linear-gradient(135deg, #C8E6A0 0%, #A4D177 100%)"
          : s.type === "specialist"
          ? "linear-gradient(135deg, var(--brand) 0%, #143B30 100%)"
          : s.type === "prescription"
          ? "linear-gradient(135deg, #2D3B36 0%, #0F2E25 100%)"
          : "linear-gradient(135deg, #1B4D3E 0%, #2D6A5A 100%)",
        color: s.type === "test" ? "var(--brand-dark)" : "#fff",
        padding: 16,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        position: "relative", overflow: "hidden",
      }}>
        <span style={{
          width: 44, height: 44, borderRadius: 12,
          background: s.type === "test" ? "rgba(20,59,48,0.10)" : "rgba(255,255,255,0.14)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>{s.icon}</span>
        <span style={{
          padding: "4px 10px", borderRadius: 999,
          background: s.type === "test" ? "rgba(20,59,48,0.12)" : "rgba(255,255,255,0.16)",
          fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{s.tag}</span>
      </div>
      {/* Body */}
      <div style={{ padding: "20px 22px 22px" }}>
        <h3 style={{
          fontFamily: "var(--font-display)",
          fontSize: 19, fontWeight: 800, color: "var(--fg1)",
          margin: "0 0 14px", letterSpacing: "-0.01em",
        }}>{s.title}</h3>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4,
          paddingTop: 14, borderTop: "1px solid var(--border)",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: "var(--fg3)",
                        letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
              From
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--fg1)",
                        fontVariantNumeric: "tabular-nums" }}>
              €{s.price}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 10, color: "var(--fg3)",
                        letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
              {s.type === "test" ? "Turnaround" : "Time"}
            </p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--fg2)" }}>
              {s.dur}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Doctor wall ───────────────────────────────────────────── */

function DoctorWall({ onBook }) {
  const [filter, setFilter] = React.useState("all");

  const DOCTORS = [
    { initials: "IC", name: "Dr. Inês Carvalho",  role: "GP",            country: "pt", langs: "PT · EN",       avail: "today",     yrs: 12 },
    { initials: "TM", name: "Dr. Tiago Mendes",   role: "Cardiologist",  country: "pt", langs: "PT · ES · EN",  avail: "today",     yrs: 18 },
    { initials: "SW", name: "Dr. Siobhán Walsh",  role: "GP",            country: "ie", langs: "EN",            avail: "today",     yrs:  7 },
    { initials: "MR", name: "Dr. María Rojas",    role: "Dermatologist", country: "es", langs: "ES · PT · EN",  avail: "tomorrow",  yrs: 14 },
    { initials: "TN", name: "Dr. Tomáš Novák",    role: "GP",            country: "cz", langs: "CS · EN",       avail: "today",     yrs:  9 },
    { initials: "AP", name: "Dr. Ana Popescu",    role: "Psychiatrist",  country: "rm", langs: "RO · EN",       avail: "today",     yrs: 11 },
    { initials: "JF", name: "Dr. James Foley",    role: "GP",            country: "ie", langs: "EN · GA",       avail: "today",     yrs:  5 },
    { initials: "LS", name: "Dr. Lara Santos",    role: "Endocrinologist", country: "pt", langs: "PT · EN",     avail: "tomorrow",  yrs: 16 },
  ];

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "ie",  label: "Ireland" },
    { id: "pt",  label: "Portugal" },
    { id: "es",  label: "Spain" },
    { id: "cz",  label: "Czechia" },
    { id: "rm",  label: "Romania" },
  ];

  const shown = filter === "all" ? DOCTORS : DOCTORS.filter(d => d.country === filter);

  return (
    <section style={{
      padding: "96px 0",
      background: "var(--brand-dark)",
      color: "#fff", position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: "28px",
      }} />
      <div style={{
        position: "relative",
        maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          gap: 24, marginBottom: 32, flexWrap: "wrap",
        }}>
          <div>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--accent)",
            }}>The team</span>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800,
              letterSpacing: "-0.02em", lineHeight: 1.1,
              color: "#fff", margin: "12px 0 0", maxWidth: "16ch",
            }}>
              Real doctors. Registered locally.
            </h2>
          </div>
          <p style={{ color: "rgba(255,255,255,0.65)", maxWidth: "32ch", margin: 0, fontSize: 16 }}>
            Pick a doctor by country, specialty, or language. We don't outsource — every consultation is with someone licensed where you are.
          </p>
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: "8px 16px", borderRadius: 999,
              border: "1px solid " + (filter === f.id ? "var(--accent)" : "rgba(255,255,255,0.20)"),
              background: filter === f.id ? "var(--accent)" : "transparent",
              color: filter === f.id ? "var(--brand-dark)" : "rgba(255,255,255,0.85)",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              {f.id !== "all" && <FlagBadge code={f.id === "rm" ? "ro" : f.id} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Doctor grid */}
        <div style={{
          display: "grid", gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        }}>
          {shown.map(d => (
            <div key={d.name} style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 20, padding: 20,
            }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
                <span style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "linear-gradient(135deg, var(--accent), var(--brand))",
                  color: "var(--brand-dark)", fontWeight: 800,
                  fontFamily: "var(--font-display)", fontSize: 18,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>{d.initials}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
                    {d.role}
                  </p>
                </div>
              </div>

              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 14,
                paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.10)",
              }}>
                <DKV k="Country" v={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <FlagBadge code={d.country === "rm" ? "ro" : d.country} /> {d.country.toUpperCase()}
                </span>} />
                <DKV k="Experience" v={d.yrs + " yrs"} />
                <DKV k="Languages" v={d.langs} />
                <DKV k="Available" v={
                  <span style={{
                    color: d.avail === "today" ? "var(--accent)" : "rgba(255,255,255,0.70)",
                    fontWeight: 700, fontSize: 12, textTransform: "capitalize",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: 999,
                      background: d.avail === "today" ? "#16A34A" : "rgba(255,255,255,0.40)",
                    }} /> {d.avail}
                  </span>
                } />
              </div>

              <button onClick={onBook} style={{
                width: "100%", padding: "10px 14px", borderRadius: 999,
                background: "rgba(255,255,255,0.10)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.16)",
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>Book with {d.name.split(" ")[1]} <Icons.IconArrowR size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DKV({ k, v }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.50)",
                  letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
        {k}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 13, color: "#fff", fontWeight: 600 }}>{v}</p>
    </div>
  );
}

/* ── How it works — vertical narrative, big numbers ─────────── */

function HowItWorks() {
  const STEPS = [
    {
      n: "01",
      title: "Pick your country",
      lede: "We connect you with doctors registered in your country — so referrals, prescriptions, and follow-ups all work locally.",
    },
    {
      n: "02",
      title: "Choose what you need",
      lede: "Browse 30+ services across general, specialist, prescriptions, and home tests. Filter by language, urgency, or price.",
    },
    {
      n: "03",
      title: "Talk to a doctor",
      lede: "Join the consultation from any device. Receive prescriptions and referrals by email within the hour.",
    },
  ];

  return (
    <section style={{ padding: "120px 0" }}>
      <div style={{
        maxWidth: 1320, margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px)",
        display: "grid", gridTemplateColumns: "1fr",
        gap: 64,
      }} className="how-grid">
        <div style={{ position: "sticky", top: 120, height: "fit-content" }} className="how-sticky">
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--brand)",
          }}>How it works</span>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 800,
            letterSpacing: "-0.025em", lineHeight: 1.0,
            color: "var(--fg1)", margin: "16px 0 24px",
          }}>
            Three steps.<br/>Roughly two&nbsp;minutes.
          </h2>
          <p style={{ color: "var(--fg3)", fontSize: 17, lineHeight: 1.55, maxWidth: "32ch", margin: 0 }}>
            From landing on the page to a confirmed appointment, we built the
            shortest path. No accounts, no questionnaires, no upsells.
          </p>
        </div>

        <ol style={{ listStyle: "none", padding: 0, margin: 0,
                     display: "flex", flexDirection: "column", gap: 48 }}>
          {STEPS.map((s, i) => (
            <li key={s.n} style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: 28,
              alignItems: "flex-start",
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
              paddingTop: i === 0 ? 0 : 48,
            }}>
              <span style={{
                fontFamily: "var(--font-display)",
                fontSize: 64, fontWeight: 800, color: "var(--brand)",
                letterSpacing: "-0.03em", lineHeight: 0.9,
                opacity: 0.85,
              }}>{s.n}</span>
              <div>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28, fontWeight: 800, color: "var(--fg1)",
                  letterSpacing: "-0.015em", lineHeight: 1.15,
                  margin: "0 0 10px",
                }}>{s.title}</h3>
                <p style={{
                  fontSize: 17, lineHeight: 1.6, color: "var(--fg3)",
                  margin: 0, maxWidth: "44ch",
                }}>{s.lede}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <style>{`
        @media (min-width: 900px) {
          .how-grid { grid-template-columns: 1fr 1.4fr !important; gap: 96px !important; }
        }
      `}</style>
    </section>
  );
}

/* ── CTA — minimal closer ───────────────────────────────────── */

function FinalCTA({ onBook }) {
  return (
    <section style={{ padding: "96px 0", background: "var(--surface-soft)" }}>
      <div style={{
        maxWidth: 920, margin: "0 auto",
        padding: "0 clamp(20px, 4vw, 40px)",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 0.95,
          color: "var(--fg1)", margin: 0,
        }}>
          Same care. <span style={{ color: "var(--brand)" }}>Less waiting.</span>
        </h2>
        <p style={{
          marginTop: 24, fontSize: 19, lineHeight: 1.5, color: "var(--fg3)",
          maxWidth: "44ch", marginInline: "auto",
        }}>
          You'll be on a video call with a registered doctor in under an hour, most days.
        </p>
        <div style={{ marginTop: 36, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Btn variant="primary" size="lg" onClick={onBook}>
            Book a consultation
          </Btn>
          <Btn variant="outline" size="lg">See full pricing</Btn>
        </div>
      </div>
    </section>
  );
}

/* ── Footer — quiet ─────────────────────────────────────────── */

function Footer() {
  return (
    <footer style={{
      background: "var(--brand-dark)", color: "rgba(255,255,255,0.70)",
      padding: "64px 0 28px",
    }}>
      <div style={{
        maxWidth: 1320, margin: "0 auto",
        padding: "0 clamp(20px, 4vw, 40px)",
      }}>
        <div style={{
          display: "grid", gap: 40,
          gridTemplateColumns: "1.5fr repeat(4, 1fr)",
        }} className="footer-grid">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--accent)",
                color: "var(--brand-dark)", fontFamily: "var(--font-display)",
                fontSize: 17, fontWeight: 800,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>g</span>
              <span style={{
                fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800,
                color: "#fff", letterSpacing: "-0.02em",
              }}>Global Health</span>
            </div>
            <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}>
              Medicine without borders. Online medical consultations with locally-registered
              doctors across Europe.
            </p>
            <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.50)" }}>
              info@myglobalhealth.online
            </p>
          </div>
          {[
            { h: "Care",        l: ["General","Specialist","Prescriptions","Home tests"] },
            { h: "Clinics",     l: ["Ireland","Portugal","Spain","Czechia","Romania"] },
            { h: "Company",     l: ["About","Doctors","Blog","Careers"] },
            { h: "Legal",       l: ["Privacy","Cookies","GDPR","Terms"] },
          ].map(c => (
            <div key={c.h}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#fff",
                          letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 14px" }}>
                {c.h}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0,
                          display: "flex", flexDirection: "column", gap: 10 }}>
                {c.l.map(li => (
                  <li key={li}>
                    <a href="#" onClick={e => e.preventDefault()} style={{
                      color: "rgba(255,255,255,0.70)", fontSize: 14, textDecoration: "none",
                    }}>{li}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 56, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.10)",
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
          fontSize: 12, color: "rgba(255,255,255,0.45)",
        }}>
          <span>© {new Date().getFullYear()} Global Health · Medicine without borders</span>
          <span>EU-registered telemedicine provider · GDPR compliant</span>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

Object.assign(window, { TrustRibbon, ServiceCatalog, DoctorWall, HowItWorks, FinalCTA, Footer });
