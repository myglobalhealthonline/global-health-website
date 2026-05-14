// Landing.jsx — Two-step entry: pick country → pick language → enter site.

function Landing({ onEnter }) {
  const [step, setStep] = React.useState(0);             // 0 = country, 1 = language
  const [country, setCountry] = React.useState(null);
  const [lang, setLang] = React.useState(null);

  const COUNTRIES = [
    { code: "ie", name: "Ireland",  capital: "Dublin",   doctors: 14, langs: ["en"] },
    { code: "pt", name: "Portugal", capital: "Lisbon",   doctors: 11, langs: ["pt", "en"] },
    { code: "es", name: "Spain",    capital: "Madrid",   doctors:  9, langs: ["es", "en"] },
    { code: "cz", name: "Czechia",  capital: "Prague",   doctors:  7, langs: ["cs", "en"] },
    { code: "rm", name: "Romania",  capital: "Bucharest",doctors:  6, langs: ["ro", "en"] },
  ];
  const LANG_NAMES = { en: "English", pt: "Português", es: "Español", cs: "Čeština", ro: "Română" };
  const LANG_HELLO = { en: "Hello.",  pt: "Olá.",      es: "Hola.",   cs: "Ahoj.",   ro: "Salut." };

  const chosenCountry = COUNTRIES.find(c => c.code === country);

  const pickCountry = (code) => {
    setCountry(code);
    setStep(1);
  };
  const enter = (langCode) => {
    setLang(langCode);
    onEnter(country, langCode);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--brand-dark)", color: "#fff",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      {/* Texture */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: "28px",
      }} />
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(900px 400px at 80% -10%, rgba(200,230,160,0.10), transparent 60%), radial-gradient(700px 400px at 0% 110%, rgba(176,241,34,0.06), transparent 70%)",
      }} />

      {/* Top — wordmark only */}
      <header style={{
        position: "relative", padding: "28px clamp(20px,4vw,48px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: "var(--accent)", color: "var(--brand-dark)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800,
          }}>g</span>
          <span style={{
            fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800,
            color: "#fff", letterSpacing: "-0.02em",
          }}>Global Health</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)",
                    letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
          Medicine without borders
        </p>
      </header>

      {/* Step pager */}
      <div style={{
        position: "relative", padding: "0 clamp(20px,4vw,48px)",
        maxWidth: 1080, margin: "0 auto", width: "100%",
      }}>
        <ol style={{
          listStyle: "none", padding: 0, margin: 0,
          display: "flex", gap: 32, fontSize: 12,
          color: "rgba(255,255,255,0.55)", fontWeight: 600,
        }}>
          {[
            { n: 1, label: "Country" },
            { n: 2, label: "Language" },
            { n: 3, label: "Enter" },
          ].map((s, i) => (
            <li key={s.n} style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              color: i === step ? "#fff" : (i < step ? "var(--accent)" : "rgba(255,255,255,0.40)"),
              fontWeight: i === step ? 700 : 600,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 999,
                border: "1.5px solid currentColor",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800,
                background: i < step ? "var(--accent)" : "transparent",
                color: i < step ? "var(--brand-dark)" : "currentColor",
              }}>{i < step ? "✓" : s.n}</span>
              {s.label}
            </li>
          ))}
        </ol>
      </div>

      {/* Body */}
      <main style={{
        position: "relative", flex: 1, display: "flex", alignItems: "center",
        padding: "48px clamp(20px,4vw,48px) 96px",
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>

          {step === 0 && (
            <>
              <h1 style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 800,
                letterSpacing: "-0.03em", lineHeight: 0.96,
                color: "#fff", margin: 0, maxWidth: "16ch",
              }}>
                Where are <span style={{
                  background: "linear-gradient(180deg, transparent 60%, rgba(200,230,160,0.30) 60% 92%, transparent 92%)",
                  paddingInline: "0.05em",
                }}>you</span>?
              </h1>
              <p style={{
                marginTop: 20, fontSize: 18, lineHeight: 1.55,
                color: "rgba(255,255,255,0.70)", maxWidth: "44ch",
              }}>
                We connect you with doctors registered in your country. Pick yours to continue.
              </p>

              <div style={{
                marginTop: 56, display: "grid", gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              }}>
                {COUNTRIES.map(c => (
                  <button key={c.code} onClick={() => pickCountry(c.code)} style={{
                    textAlign: "left", padding: 22,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 20, color: "#fff",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 180ms ease-out",
                    display: "flex", flexDirection: "column", gap: 16,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(200,230,160,0.10)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                    e.currentTarget.style.transform = "none";
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: "rgba(255,255,255,0.10)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}><FlagBadge code={c.code === "rm" ? "ro" : c.code} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontFamily: "var(--font-display)",
                                    fontSize: 20, fontWeight: 800, letterSpacing: "-0.015em",
                                    lineHeight: 1.1, color: "#fff" }}>{c.name}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                          {c.capital}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)",
                    }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
                        <strong style={{ color: "#fff", fontWeight: 700 }}>{c.doctors}</strong> doctors
                      </span>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 12, color: "var(--accent)", fontWeight: 700,
                      }}>
                        Enter <Icons.IconArrowR size={14} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && chosenCountry && (
            <>
              <button onClick={() => { setStep(0); setCountry(null); }} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 12px 8px 8px", borderRadius: 999,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.80)", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                cursor: "pointer", marginBottom: 32,
              }}>
                <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}>
                  <Icons.IconArrowR size={14} />
                </span>
                Change country · {chosenCountry.name}
              </button>

              <h1 style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 800,
                letterSpacing: "-0.03em", lineHeight: 0.96,
                color: "#fff", margin: 0, maxWidth: "18ch",
              }}>
                Choose your <span style={{
                  background: "linear-gradient(180deg, transparent 60%, rgba(200,230,160,0.30) 60% 92%, transparent 92%)",
                  paddingInline: "0.05em",
                }}>language</span>
              </h1>
              <p style={{
                marginTop: 20, fontSize: 18, lineHeight: 1.55,
                color: "rgba(255,255,255,0.70)", maxWidth: "44ch",
              }}>
                Your consultation, your prescriptions, and the website — all in the language you pick.
              </p>

              <div style={{
                marginTop: 48, display: "grid", gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                maxWidth: 720,
              }}>
                {chosenCountry.langs.map(l => (
                  <button key={l} onClick={() => enter(l)} style={{
                    textAlign: "left", padding: "22px 24px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 20, color: "#fff",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 180ms ease-out",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(200,230,160,0.10)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                  }}>
                    <div>
                      <p style={{ margin: 0, fontFamily: "var(--font-display)",
                                  fontSize: 22, fontWeight: 800, letterSpacing: "-0.015em",
                                  color: "#fff" }}>{LANG_HELLO[l]}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.60)" }}>
                        {LANG_NAMES[l]} · {l.toUpperCase()}
                      </p>
                    </div>
                    <Icons.IconArrowR size={18} style={{ color: "var(--accent)" }} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer note */}
      <footer style={{
        position: "relative", padding: "20px clamp(20px,4vw,48px) 28px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        fontSize: 12, color: "rgba(255,255,255,0.40)",
        display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between",
      }}>
        <span>© {new Date().getFullYear()} Global Health · EU-registered telemedicine provider</span>
        <span>GDPR compliant · Doctors registered locally in 5 countries</span>
      </footer>
    </div>
  );
}

window.Landing = Landing;
