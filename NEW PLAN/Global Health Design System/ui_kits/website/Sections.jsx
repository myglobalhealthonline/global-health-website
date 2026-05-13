// Sections.jsx — repeatable building blocks for country home & service pages.

const { useState: useStateS } = React;

/* ── Quick action nav strip ───────────────────────────────── */

function QuickActions({ items = [] }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "#fff" }}>
      <Container>
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          overflowX: "auto", padding: "10px 0", fontSize: 14, fontWeight: 600,
        }}>
          {items.map((it, i) => (
            <a key={it.label} href="#" onClick={e => e.preventDefault()} style={{
              flexShrink: 0, padding: "8px 16px", borderRadius: 999,
              color: i === 0 ? "var(--brand)" : "var(--fg3)",
              background: i === 0 ? "var(--surface-soft)" : "transparent",
              textDecoration: "none",
            }}>{it.label}</a>
          ))}
        </nav>
      </Container>
    </div>
  );
}

/* ── Dark country hero with rating, CTA, and image frame ──── */

function CountryHero({ countryName, onBook }) {
  return (
    <section style={{
      position: "relative", overflow: "hidden", background: "var(--brand)",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: 0.05,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: "28px",
      }} />
      <Container style={{ position: "relative", padding: "48px clamp(20px,4vw,48px) 80px" }}>
        <div style={{
          display: "grid", gap: 48, alignItems: "center",
          gridTemplateColumns: "1fr",
        }} className="hero-grid">
          <div style={{ color: "#fff", maxWidth: 640 }}>
            <Eyebrow dark>{countryName} clinic</Eyebrow>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 800,
              letterSpacing: "-0.025em", lineHeight: 1.05, color: "#fff",
              margin: "20px 0 0",
            }}>
              Online doctor consultations in {countryName}
            </h1>
            <p style={{
              marginTop: 20, fontSize: 18, lineHeight: 1.6,
              color: "rgba(255,255,255,0.85)", maxWidth: 540,
            }}>
              Same-day video appointments with registered doctors. Prescriptions,
              referrals, and home health tests — all without leaving home.
            </p>

            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
              <Stars />
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.70)" }}>— doctify</span>
            </div>

            <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Btn variant="accent" onClick={onBook}>Book consultation</Btn>
              <Btn variant="ghost">See doctors</Btn>
            </div>

            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["GDPR-compliant", "Registered in " + countryName, "EU-wide doctors"].map(b => (
                <Chip key={b} variant="dark">{b}</Chip>
              ))}
            </div>
          </div>

          {/* Image frame */}
          <div style={{ width: "100%", maxWidth: 560, justifySelf: "center" }} className="hero-card">
            <div style={{
              position: "relative", aspectRatio: "16/10", overflow: "hidden",
              borderRadius: 20, background: "rgba(255,255,255,0.10)", padding: 8,
              boxShadow: "var(--shadow-elevated)",
            }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: 14,
                background: "url(../../assets/brand/business-card-mockup.png) center/cover #f4f1ed",
              }} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── Availability banner ──────────────────────────────────── */

function Availability({ countryName, onBook }) {
  return (
    <section style={{ background: "#fff", padding: "40px 0" }}>
      <Container>
        <div style={{
          borderRadius: 20, background: "var(--brand)", color: "#fff",
          padding: "32px 36px", boxShadow: "var(--shadow-elevated)",
          display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flex: "1 1 320px" }}>
            <span style={{
              width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.15)",
              color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icons.IconClock size={24} />
            </span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)",
                          textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
                AVAILABLE TODAY
              </p>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, margin: "4px 0 4px", color: "#fff" }}>
                Next appointment in {countryName}: today, 14:30
              </h2>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.85)" }}>3 doctors are accepting bookings right now.</p>
            </div>
          </div>
          <Btn variant="ghost-dark" onClick={onBook}>Book consultation</Btn>
        </div>
      </Container>
    </section>
  );
}

/* ── Specialty grid ───────────────────────────────────────── */

function SpecialtiesGrid({ services, onSelect }) {
  return (
    <Section variant="soft">
      <Container>
        <div style={{
          marginBottom: 48, display: "flex", flexWrap: "wrap", gap: 16,
          alignItems: "flex-end", justifyContent: "space-between",
        }}>
          <div style={{ maxWidth: 540 }}>
            <Eyebrow>Specialties</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                         fontWeight: 800, letterSpacing: "-0.015em", lineHeight: 1.15,
                         color: "var(--fg1)", margin: "12px 0 8px" }}>
              Care for the conditions that matter most
            </h2>
            <p style={{ fontSize: 17, color: "var(--fg3)", margin: 0 }}>
              Book a video consultation with licensed specialists across general practice,
              cardiology, dermatology, and mental health.
            </p>
          </div>
          <Btn variant="outline">View all specialties</Btn>
        </div>

        <div style={{
          display: "grid", gap: 24,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}>
          {services.map(s => (
            <button key={s.title} onClick={() => onSelect && onSelect(s)} style={{
              textAlign: "left", border: "1px solid var(--border)", borderRadius: 20,
              background: "#fff", padding: 28, boxShadow: "var(--shadow-card)",
              transition: "all 180ms ease-out", cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.borderColor = "rgba(27,77,62,0.20)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = "var(--shadow-card)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.borderColor = "var(--border)";
            }}>
              <IconTile>{s.icon}</IconTile>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800,
                           color: "var(--fg1)", margin: "16px 0 6px", letterSpacing: "-0.01em" }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--fg3)", margin: 0, flex: 1 }}>
                {s.description}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <Chip variant="light" icon={<Icons.IconClock size={13} style={{ color: "var(--brand)" }} />}>{s.duration}</Chip>
                <Chip variant="brand" icon={<Icons.IconTag size={13} />}>{s.price}</Chip>
              </div>
              <span style={{
                marginTop: 18, display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 14, fontWeight: 700, color: "var(--brand)",
              }}>Learn more <Icons.IconArrowR size={14} /></span>
            </button>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* ── How it works (3 steps with sticky illustration) ──────── */

function HowItWorks({ steps }) {
  const [active, setActive] = useStateS(0);
  return (
    <Section variant="white" pattern>
      <Container>
        <div style={{ textAlign: "center", margin: "0 auto 48px", maxWidth: 720 }}>
          <Eyebrow>How it works</Eyebrow>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                       fontWeight: 800, lineHeight: 1.15, color: "var(--fg1)",
                       margin: "12px 0 0", letterSpacing: "-0.015em" }}>
            Simple scheduling in 3 steps
          </h2>
        </div>

        <div style={{ display: "grid", gap: 48, maxWidth: 1080, margin: "0 auto",
                      gridTemplateColumns: "1fr" }} className="how-grid">
          {/* Illustration card */}
          <div className="how-card">
            <div style={{
              position: "relative", borderRadius: 28, padding: 12, background: "#fff",
              border: "1px solid var(--border)", boxShadow: "var(--shadow-elevated)",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 32, right: 32, height: 1,
                background: "linear-gradient(to right, transparent, var(--accent), transparent)",
              }} />
              <div style={{
                aspectRatio: "4/3", borderRadius: 20, background: "var(--surface-soft)",
                display: "grid", placeItems: "center", overflow: "hidden", position: "relative",
              }}>
                {steps.map((s, i) => (
                  <div key={i} style={{
                    position: "absolute", inset: 0, display: "grid", placeItems: "center",
                    transition: "opacity 500ms",
                    opacity: active === i ? 1 : 0,
                    transform: active === i ? "scale(1)" : "scale(1.02)",
                    padding: 40,
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <span style={{
                        display: "inline-flex", width: 96, height: 96, borderRadius: 28,
                        background: "var(--brand)", color: "#fff",
                        alignItems: "center", justifyContent: "center", marginBottom: 16,
                        boxShadow: "var(--shadow-elevated)",
                      }}>{s.icon}</span>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800,
                                  color: "var(--fg1)", margin: 0 }}>
                        {s.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
                {steps.map((_, i) => (
                  <button key={i} onClick={() => setActive(i)} style={{
                    height: 8, borderRadius: 999, border: "none", cursor: "pointer",
                    background: active === i ? "var(--brand)" : "var(--border-strong)",
                    transition: "background 180ms",
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {steps.map((s, i) => (
              <div key={i} onMouseEnter={() => setActive(i)} style={{
                display: "flex", gap: 20, padding: 22, borderRadius: 20,
                background: active === i ? "#fff" : "rgba(255,255,255,0.6)",
                border: `1px solid ${active === i ? "rgba(27,77,62,0.25)" : "transparent"}`,
                boxShadow: active === i ? "var(--shadow-card-hover)" : "none",
                transition: "all 300ms ease-out",
              }}>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{
                    width: 56, height: 56, borderRadius: 16, display: "inline-flex",
                    alignItems: "center", justifyContent: "center",
                    background: active === i ? "var(--brand)" : "var(--surface-panel)",
                    color: active === i ? "#fff" : "var(--brand)",
                    transition: "all 200ms",
                  }}>{s.icon}</span>
                  {i < steps.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 12, background: "var(--border-strong)" }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)",
                                 letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    Step {i + 1}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800,
                               color: "var(--fg1)", margin: "4px 0 6px" }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--fg3)", margin: 0 }}>
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ── Trust bar (on dark) ──────────────────────────────────── */

function TrustBar() {
  const items = [
    { Icon: Icons.IconShield, label: "Licensed Doctors", desc: "Qualified and registered doctors in your country." },
    { Icon: Icons.IconLock,   label: "Secure & Confidential", desc: "Your data is protected under strict GDPR standards." },
    { Icon: Icons.IconZap,    label: "Fast Access",     desc: "Book in minutes, get care when you need it." },
    { Icon: Icons.IconGlobe,  label: "Across Europe",   desc: "Trusted by patients in 5 EU countries." },
  ];
  return (
    <section style={{
      background: "var(--brand)", padding: "72px 0", position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: 0.05,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: "28px",
      }} />
      <Container style={{ position: "relative" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto",
                      display: "grid", gap: 32,
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))" }}>
          {items.map(it => (
            <div key={it.label}>
              <span style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(200,230,160,0.20)", color: "var(--accent)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <it.Icon size={20} />
              </span>
              <p style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: "#fff" }}>{it.label}</p>
              <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.70)" }}>{it.desc}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ── Doctor spotlight ─────────────────────────────────────── */

function DoctorSpotlight() {
  return (
    <Section variant="brand">
      <Container>
        <div style={{ display: "grid", gap: 48, alignItems: "center",
                      gridTemplateColumns: "1fr",
                      maxWidth: 1080, margin: "0 auto" }} className="doctor-grid">
          <div style={{ aspectRatio: "3/4", maxWidth: 360, width: "100%", justifySelf: "center",
                        borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-elevated)",
                        background: "linear-gradient(135deg, #C8E6A0, #8FB021)",
                        display: "grid", placeItems: "center", color: "var(--brand)" }}>
            <Icons.IconStethoscope size={120} />
          </div>
          <div style={{ color: "#fff" }}>
            <Eyebrow dark>Doctor profile</Eyebrow>
            <blockquote style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.5rem, 2.8vw, 2rem)", fontWeight: 800, lineHeight: 1.2,
              letterSpacing: "-0.015em", margin: "20px 0 24px",
            }}>
              "Telemedicine lets me give the same focus I'd give in clinic — without
              the travel, the waiting room, or the awkward small talk."
            </blockquote>
            <div style={{
              borderRadius: 20, border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.10)", padding: 20,
            }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Dr. Inês Carvalho</p>
              <p style={{ margin: "2px 0", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>General Practitioner</p>
              <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.70)" }}>
                Ordem dos Médicos #57821 · 12 yrs experience
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ── About section ────────────────────────────────────────── */

function AboutSection({ countryName }) {
  return (
    <Section variant="soft">
      <Container>
        <div style={{ display: "grid", gap: 48, alignItems: "center",
                      gridTemplateColumns: "1fr", maxWidth: 1100, margin: "0 auto" }} className="about-grid">
          <div style={{
            borderRadius: 32, border: "1px solid var(--border)",
            background: "linear-gradient(to bottom, #fafaf7, var(--surface-panel))",
            padding: 16, boxShadow: "var(--shadow-elevated)",
          }}>
            <div style={{
              aspectRatio: "4/3", borderRadius: 20, background: "#fff",
              padding: 14, boxShadow: "inset 0 0 0 1px rgba(216,224,216,0.6)",
              display: "grid", placeItems: "center", overflow: "hidden",
            }}>
              <img src="../../assets/logo/global-health-logo.png" alt="" style={{
                maxWidth: "70%", maxHeight: "70%", objectFit: "contain",
              }} />
            </div>
          </div>
          <div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 14px", borderRadius: 999, background: "#fff",
              border: "1px solid var(--border)", boxShadow: "var(--shadow-soft)",
            }}>
              <Icons.IconHeart size={14} style={{ color: "var(--brand)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
                             textTransform: "uppercase", color: "var(--brand)" }}>
                Local clinic
              </span>
            </span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                         fontWeight: 800, letterSpacing: "-0.015em", lineHeight: 1.12,
                         color: "var(--fg1)", margin: "24px 0 0" }}>
              Healthcare designed around your life in {countryName}
            </h2>
            <div style={{ marginTop: 24, maxWidth: 540 }}>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--fg2)", margin: 0 }}>
                Our {countryName} clinic connects you with locally-registered doctors over
                video. No travel, no waiting rooms, no calling at 8am to chase an
                appointment. Just clear, qualified medical advice when you need it.
              </p>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--fg2)", margin: "16px 0 0" }}>
                When something needs in-person care, we refer you locally and stay in
                the loop with your file.
              </p>
            </div>
            <blockquote style={{
              maxWidth: 540, marginTop: 32, padding: "4px 20px",
              borderLeft: "3px solid var(--accent)",
              borderRadius: "0 12px 12px 0", background: "rgba(255,255,255,0.7)",
              boxShadow: "var(--shadow-soft)",
              fontSize: 16, fontWeight: 500, fontStyle: "italic",
              color: "var(--brand)", lineHeight: 1.6,
            }}>
              "Healthcare that respects your time and your privacy."
            </blockquote>
            <div style={{ marginTop: 24 }}>
              <Btn variant="primary" iconRight>Meet the {countryName} team</Btn>
            </div>
            <div style={{
              marginTop: 32, padding: 14, borderRadius: 16,
              border: "1px solid var(--border)", background: "#fff",
              display: "flex", alignItems: "center", gap: 12, maxWidth: 540,
              boxShadow: "var(--shadow-soft)",
            }}>
              <Stars />
              <span style={{ fontSize: 12, color: "var(--fg3)", borderLeft: "1px solid var(--border)", paddingLeft: 12 }}>
                Based on 19 reviews, verified by Doctify
              </span>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ── Final booking CTA strip (footer) ─────────────────────── */

function BookingCTA({ onBook }) {
  return (
    <section style={{ background: "var(--brand)", color: "#fff", padding: "80px 0 96px",
                      position: "relative", overflow: "hidden",
                      borderTop: "1px solid rgba(255,255,255,0.10)" }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: 0.05,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: "28px",
      }} />
      <Container style={{ position: "relative" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ maxWidth: 560 }}>
            <Eyebrow dark>Start your online consultation</Eyebrow>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2.4rem)",
                         fontWeight: 800, color: "#fff", letterSpacing: "-0.015em", lineHeight: 1.15,
                         margin: "16px 0 16px" }}>
              Choose your country and connect with a licensed doctor in minutes
            </h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", margin: "0 0 20px" }}>
              Trusted by patients across Ireland, Portugal, Spain, Czechia, and Romania.
            </p>
            <ul style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: 0, margin: 0, listStyle: "none" }}>
              {["100% online", "No waiting rooms", "Confidential"].map(p => (
                <li key={p} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.10)", padding: "8px 16px", borderRadius: 999,
                  fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.90)",
                }}>
                  <Icons.IconCheck size={16} style={{ color: "var(--accent)" }} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <Btn variant="ghost-dark" onClick={onBook}>Book consultation</Btn>
        </div>
      </Container>
    </section>
  );
}

/* ── Footer column ────────────────────────────────────────── */

function Footer({ onNavigate }) {
  const cols = [
    { h: "Company",     links: ["About", "Careers", "Press", "Contact"] },
    { h: "Clinics",     links: ["Ireland", "Portugal", "Spain", "Czechia", "Romania"] },
    { h: "Information", links: ["Blog", "FAQ", "Plans & Pricing", "Gift cards"] },
    { h: "Legal",       links: ["Privacy", "Cookies", "GDPR", "Legal notices"] },
  ];
  return (
    <footer style={{ background: "var(--surface-dark)", color: "rgba(255,255,255,0.80)", padding: "64px 0 32px" }}>
      <Container>
        <div style={{
          display: "grid", gap: 40,
          gridTemplateColumns: "1.6fr repeat(4, 1fr)",
        }} className="footer-grid">
          <div>
            <img src="../../assets/logo/global-health-logo.png" alt="Global Health"
                 style={{ height: 44, filter: "brightness(0) invert(1)" }} />
            <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}>
              Medicine without borders. Online medical consultations with locally-registered
              doctors across Europe.
            </p>
            <p style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              info@myglobalhealth.online
            </p>
          </div>
          {cols.map(c => (
            <div key={c.h}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#fff",
                          letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 14px" }}>
                {c.h}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {c.links.map(l => (
                  <li key={l}>
                    <a href="#" onClick={e => e.preventDefault()} style={{
                      color: "rgba(255,255,255,0.75)", fontSize: 14, textDecoration: "none",
                    }}>{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.10)",
                      display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                      fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
          <span>© {new Date().getFullYear()} Global Health · Medicine without borders</span>
          <span>EU registered telemedicine provider</span>
        </div>
      </Container>
    </footer>
  );
}

Object.assign(window, {
  QuickActions, CountryHero, Availability, SpecialtiesGrid,
  HowItWorks, TrustBar, DoctorSpotlight, AboutSection,
  BookingCTA, Footer,
});
