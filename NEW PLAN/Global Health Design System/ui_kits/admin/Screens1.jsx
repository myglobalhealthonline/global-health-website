// Screens.jsx — login, dashboard, and the 4 list screens.

/* ── 1. Login ─────────────────────────────────────────────── */

function LoginScreen({ onLogin }) {
  const [email, setEmail] = React.useState("admin@myglobalhealth.online");
  const [pw, setPw] = React.useState("••••••••••");

  return (
    <div style={{
      minHeight: "100vh", display: "grid",
      gridTemplateColumns: "1.05fr 1fr",
    }}>
      {/* Left — dark brand */}
      <aside style={{
        background: "var(--brand-dark)", color: "#fff", padding: "48px 64px",
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div aria-hidden style={{
          position: "absolute", inset: 0, opacity: 0.05,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "28px",
        }} />
        <div style={{ position: "relative" }}>
          <img src="../../assets/logo/global-health-logo.png" alt="Global Health"
               style={{ height: 56, filter: "brightness(0) invert(1)" }} />
        </div>
        <div style={{ position: "relative" }}>
          <Eyebrow color="var(--accent)">Super admin portal</Eyebrow>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 800,
            letterSpacing: "-0.025em", lineHeight: 1.1, color: "#fff",
            margin: "16px 0 16px", maxWidth: 480,
          }}>
            Manage every country, doctor, and service from one place.
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", margin: 0, maxWidth: 440 }}>
            Sign in to add countries, publish services, and review patient bookings across the network.
          </p>
        </div>
        <p style={{ position: "relative", fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>
          v1.0 · Medicine without borders
        </p>
      </aside>

      {/* Right — login form */}
      <main style={{
        background: "var(--surface)", display: "grid", placeItems: "center", padding: 32,
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800,
            letterSpacing: "-0.015em", color: "var(--fg1)", margin: "0 0 6px",
          }}>Welcome back</h2>
          <p style={{ margin: "0 0 28px", color: "var(--fg3)" }}>
            Sign in to the Global Health admin portal.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} style={{ display: "grid", gap: 16 }}>
            <Field label="Email" required>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" required hint="Forgot password? Contact a super admin.">
              <Input type="password" value={pw} onChange={e => setPw(e.target.value)} />
            </Field>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg2)" }}>
              <input type="checkbox" defaultChecked style={{ accentColor: "var(--brand)" }} />
              Remember me on this device
            </label>
            <Btn type="submit" variant="primary" size="lg" style={{ marginTop: 8 }}>
              Sign in
            </Btn>
            <p style={{ fontSize: 12, color: "var(--fg3)", textAlign: "center", margin: "8px 0 0" }}>
              Sessions are JWT, secured with httpOnly cookies. All actions are logged.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

/* ── 2. Dashboard ─────────────────────────────────────────── */

function DashboardScreen() {
  const stats = [
    { label: "Active countries",   value: "5",  delta: "+1 this month",  icon: <I.Globe />, tone: "brand" },
    { label: "Doctors live",       value: "47", delta: "+3 this week",   icon: <I.Stethoscope />, tone: "neutral" },
    { label: "Services published", value: "132", delta: "12 drafts",     icon: <I.Briefcase />, tone: "neutral" },
    { label: "Bookings pending",   value: "8",  delta: "Avg 24h reply",  icon: <I.Calendar />, tone: "accent" },
  ];
  const activity = [
    { actor: "Hassaan A.", action: "published", entity: "Dermatology consultation (Portugal)", time: "2 min ago", country: "pt" },
    { actor: "Hassaan A.", action: "added",     entity: "Dr. Ines Carvalho",                   time: "18 min ago", country: "pt" },
    { actor: "Maria S.",   action: "edited",    entity: "Ireland hero copy",                   time: "1 hr ago",  country: "ie" },
    { actor: "Hassaan A.", action: "toggled",   entity: "Cardiology · Spain → active",         time: "3 hr ago",  country: "es" },
    { actor: "Maria S.",   action: "deactivated", entity: "Dr. Tomas Novak (Czechia)",         time: "Yesterday", country: "cz" },
    { actor: "Hassaan A.", action: "created",   entity: "Country: Romania",                    time: "2 days ago",country: "rm" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Good afternoon, Hassaan"
        description="Activity across all five countries. Pick a country in the top-right to scope the rest of the portal."
        actions={<>
          <Btn variant="secondary" iconLeft={<I.Eye size={14} />}>View public site</Btn>
          <Btn variant="primary" iconLeft={<I.Plus size={14} />}>New service</Btn>
        </>} />

      {/* Stat cards */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    marginBottom: 24 }}>
        {stats.map(s => (
          <Card key={s.label} padding={20}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--fg3)", fontWeight: 600 }}>{s.label}</p>
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                background: s.tone === "brand" ? "rgba(27,77,62,0.10)" :
                            s.tone === "accent" ? "rgba(200,230,160,0.30)" : "var(--surface-soft)",
                color: "var(--brand)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>{React.cloneElement(s.icon, { size: 18 })}</span>
            </div>
            <p style={{
              fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 800,
              letterSpacing: "-0.02em", color: "var(--fg1)", margin: "10px 0 4px",
            }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>{s.delta}</p>
          </Card>
        ))}
      </div>

      {/* Two-column */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.4fr 1fr" }}>
        <Card padding={0}>
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
                           margin: "0 0 2px", color: "var(--fg1)" }}>Recent activity</h3>
              <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>
                Last 24 hours · across all countries
              </p>
            </div>
            <Btn variant="ghost" size="sm" iconRight={<I.ChevronR size={12} />}>Audit log</Btn>
          </div>
          <div>
            {activity.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 20px",
                borderBottom: i < activity.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <FlagBadge code={a.country} size={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--fg2)" }}>
                    <strong style={{ color: "var(--fg1)" }}>{a.actor}</strong>{" "}
                    <span style={{ color: "var(--fg3)" }}>{a.action}</span>{" "}
                    <strong style={{ color: "var(--fg1)" }}>{a.entity}</strong>
                  </p>
                </div>
                <span style={{ fontSize: 12, color: "var(--fg3)", whiteSpace: "nowrap" }}>{a.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
                         margin: "0 0 2px", color: "var(--fg1)" }}>Quick actions</h3>
            <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>Shortcuts to common tasks</p>
          </div>
          <div style={{ padding: 16, display: "grid", gap: 8 }}>
            {[
              { icon: <I.Plus size={16} />, label: "Add a new doctor", sub: "Assign to one or more countries" },
              { icon: <I.Globe size={16} />, label: "Enable a new country", sub: "Hero, currency, languages" },
              { icon: <I.Briefcase size={16} />, label: "Publish a service", sub: "General, specialist, prescription, test" },
              { icon: <I.Calendar size={16} />, label: "Review bookings", sub: "8 pending across countries" },
            ].map(a => (
              <button key={a.label} style={{
                display: "flex", alignItems: "center", gap: 12, padding: 12,
                borderRadius: 10, border: "1px solid var(--border)", background: "#fff",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                transition: "all 150ms ease-out",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "var(--surface-soft)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "#fff"; }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "rgba(200,230,160,0.30)", color: "var(--brand)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>{a.label}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--fg3)" }}>{a.sub}</p>
                </div>
                <I.ChevronR size={14} style={{ color: "var(--fg3)" }} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ── 3. Countries list ────────────────────────────────────── */

function CountriesListScreen({ onEdit }) {
  const rows = [
    { code: "ie", name: "Ireland",  slug: "ireland",   currency: "EUR", langs: ["English"],            doctors: 14, services: 32, pub: true,  active: true,  order: 1 },
    { code: "pt", name: "Portugal", slug: "portugal",  currency: "EUR", langs: ["Portuguese"],         doctors: 11, services: 27, pub: true,  active: true,  order: 2 },
    { code: "es", name: "Spain",    slug: "spain",     currency: "EUR", langs: ["Spanish"],            doctors: 9,  services: 24, pub: true,  active: true,  order: 3 },
    { code: "cz", name: "Czechia",  slug: "czechia",   currency: "CZK", langs: ["Czech", "English"],   doctors: 7,  services: 18, pub: true,  active: true,  order: 4 },
    { code: "rm", name: "Romania",  slug: "romania",   currency: "RON", langs: ["Romanian"],           doctors: 6,  services: 17, pub: false, active: false, order: 5 },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Countries"
        description="The axis of the platform. Each country has its own hero copy, currency, doctors, and services."
        actions={<>
          <Btn variant="secondary" iconLeft={<I.Filter size={14} />}>Filter</Btn>
          <Btn variant="primary" iconLeft={<I.Plus size={14} />}>Add country</Btn>
        </>} />

      <Card padding={0}>
        {/* Toolbar */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)",
                      display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: "0 1 320px" }}>
            <I.Search size={14} style={{ position: "absolute", left: 12, top: 13, color: "var(--fg3)" }} />
            <Input placeholder="Search countries…" style={{ paddingLeft: 36, minHeight: 36 }} />
          </div>
          <span style={{ fontSize: 13, color: "var(--fg3)" }}>5 countries · 4 published</span>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-soft)" }}>
              <Th style={{ width: 40 }}></Th>
              <Th style={{ width: 40 }}>#</Th>
              <Th>Country</Th>
              <Th>Currency</Th>
              <Th>Languages</Th>
              <Th align="right">Doctors</Th>
              <Th align="right">Services</Th>
              <Th>Status</Th>
              <Th style={{ width: 80 }}></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} style={{ borderTop: "1px solid var(--border)" }}>
                <Td><I.Grip size={14} style={{ color: "var(--fg3)", cursor: "grab" }} /></Td>
                <Td><span style={{ fontSize: 12, color: "var(--fg3)" }}>{r.order}</span></Td>
                <Td>
                  <button onClick={onEdit} style={{
                    display: "inline-flex", alignItems: "center", gap: 10, border: "none",
                    background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
                  }}>
                    <FlagBadge code={r.code} size={18} />
                    <div style={{ textAlign: "left" }}>
                      <p style={{ margin: 0, fontWeight: 700, color: "var(--fg1)", fontSize: 14 }}>{r.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>/{r.slug}</p>
                    </div>
                  </button>
                </Td>
                <Td><span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 12, color: "var(--fg2)" }}>{r.currency}</span></Td>
                <Td><span style={{ fontSize: 13, color: "var(--fg2)" }}>{r.langs.join(", ")}</span></Td>
                <Td align="right"><span style={{ fontWeight: 700, color: "var(--fg1)" }}>{r.doctors}</span></Td>
                <Td align="right"><span style={{ fontWeight: 700, color: "var(--fg1)" }}>{r.services}</span></Td>
                <Td>
                  {r.active
                    ? <Pill tone={r.pub ? "published" : "draft"}>{r.pub ? "Published" : "Draft"}</Pill>
                    : <Pill tone="inactive">Inactive</Pill>}
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <IconBtn onClick={onEdit}><I.Edit size={14} /></IconBtn>
                    <IconBtn><I.More size={14} /></IconBtn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Th({ children, align = "left", style = {} }) {
  return <th style={{
    padding: "12px 16px", textAlign: align, fontSize: 11, fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg3)",
    ...style,
  }}>{children}</th>;
}
function Td({ children, align = "left", style = {} }) {
  return <td style={{ padding: "14px 16px", textAlign: align, verticalAlign: "middle", ...style }}>{children}</td>;
}
function IconBtn({ children, onClick }) {
  return <button onClick={onClick} style={{
    width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
    background: "#fff", cursor: "pointer", color: "var(--fg3)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  }}
  onMouseEnter={e => { e.currentTarget.style.color = "var(--brand)"; e.currentTarget.style.borderColor = "var(--brand)"; }}
  onMouseLeave={e => { e.currentTarget.style.color = "var(--fg3)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
    {children}
  </button>;
}

Object.assign(window, { LoginScreen, DashboardScreen, CountriesListScreen, Th, Td, IconBtn });
