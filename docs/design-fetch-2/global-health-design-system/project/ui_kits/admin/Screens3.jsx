// Screens3.jsx — Services list + Services edit (one form, four types).

const SERVICE_TYPES = {
  general:       { label: "General consultations",   noun: "general consultation",   icon: <I.Heart size={16} /> },
  specialist:    { label: "Specialist consultations", noun: "specialist consultation", icon: <I.Stethoscope size={16} /> },
  prescriptions: { label: "Online prescriptions",   noun: "prescription service",   icon: <I.Pkg size={16} /> },
  tests:         { label: "Health tests",           noun: "home health test",        icon: <I.TestTube size={16} /> },
};
window.SERVICE_TYPES = SERVICE_TYPES;

/* ── 8. Services list ─────────────────────────────────────── */

function ServicesListScreen({ type = "general", country = "pt", onTypeChange, onEdit }) {
  const t = SERVICE_TYPES[type];
  const ctryName = COUNTRIES.find(c => c.code === country)?.name || "Portugal";

  const DATA = {
    general: [
      { slug: "general-consultation", title: "General consultation",       cat: "General practice", price: "€50",  dur: "30 min", doctors: 4, pub: true,  feat: true,  order: 1 },
      { slug: "follow-up",            title: "Follow-up consultation",     cat: "General practice", price: "€35",  dur: "15 min", doctors: 4, pub: true,  feat: false, order: 2 },
      { slug: "weight-loss",          title: "Weight loss consultation",   cat: "Weight loss",      price: "€80",  dur: "45 min", doctors: 2, pub: true,  feat: false, order: 3 },
      { slug: "travel-health",        title: "Travel health consultation", cat: "General practice", price: "€60",  dur: "30 min", doctors: 3, pub: false, feat: false, order: 4 },
    ],
    specialist: [
      { slug: "cardiology",      title: "Cardiology consultation",        cat: "Cardiology",      price: "€120", dur: "45 min", doctors: 2, pub: true,  feat: true,  order: 1 },
      { slug: "dermatology",     title: "Dermatology consultation",       cat: "Dermatology",     price: "€95",  dur: "30 min", doctors: 2, pub: true,  feat: true,  order: 2 },
      { slug: "endocrinology",   title: "Endocrinology consultation",     cat: "Endocrinology",   price: "€110", dur: "45 min", doctors: 1, pub: true,  feat: false, order: 3 },
      { slug: "mental-health",   title: "Mental health assessment",       cat: "Mental health",   price: "€110", dur: "50 min", doctors: 3, pub: true,  feat: false, order: 4 },
    ],
    prescriptions: [
      { slug: "repeat-prescription",    title: "Repeat prescription",       cat: "—", price: "€25", dur: "15 min", doctors: 4, pub: true, feat: false, order: 1 },
      { slug: "contraceptive-pill",     title: "Contraceptive pill review", cat: "—", price: "€35", dur: "20 min", doctors: 3, pub: true, feat: false, order: 2 },
      { slug: "weight-loss-rx",         title: "Weight-loss medication",    cat: "—", price: "€60", dur: "30 min", doctors: 2, pub: false, feat: false, order: 3 },
    ],
    tests: [
      { slug: "full-blood-panel",  title: "Full blood panel (home kit)",  cat: "—", price: "€65", dur: "Sent home", doctors: 0, pub: true, feat: true,  order: 1 },
      { slug: "thyroid-panel",     title: "Thyroid panel",                cat: "—", price: "€55", dur: "Sent home", doctors: 0, pub: true, feat: false, order: 2 },
      { slug: "sti-panel",         title: "STI panel (confidential)",     cat: "—", price: "€80", dur: "Sent home", doctors: 0, pub: true, feat: false, order: 3 },
      { slug: "vitamin-d",         title: "Vitamin D test",               cat: "—", price: "€30", dur: "Sent home", doctors: 0, pub: false, feat: false, order: 4 },
    ],
  };
  const rows = DATA[type];

  return (
    <>
      <PageHeader
        eyebrow={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FlagBadge code={country} size={14} /> {ctryName}
        </span>}
        title={t.label}
        description={`Manage all ${t.noun}s in ${ctryName}. One form, conditional category dropdown for general/specialist.`}
        actions={<>
          <Btn variant="secondary" iconLeft={<I.Filter size={14} />}>Filter</Btn>
          <Btn variant="primary" iconLeft={<I.Plus size={14} />}>New {t.noun}</Btn>
        </>} />

      {/* Type segmented control */}
      <div style={{
        display: "inline-flex", padding: 4, gap: 4, marginBottom: 16,
        background: "var(--surface-soft)", borderRadius: 12, border: "1px solid var(--border)",
      }}>
        {Object.entries(SERVICE_TYPES).map(([k, v]) => (
          <button key={k} onClick={() => onTypeChange(k)} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 8, border: "none",
            background: type === k ? "#fff" : "transparent",
            color: type === k ? "var(--brand)" : "var(--fg3)",
            fontFamily: "inherit", fontSize: 13, fontWeight: 700,
            cursor: "pointer", boxShadow: type === k ? "var(--shadow-soft)" : "none",
            transition: "all 150ms ease-out",
          }}>{v.icon} {v.label}</button>
        ))}
      </div>

      <Card padding={0}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)",
                      display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: "0 1 320px" }}>
            <I.Search size={14} style={{ position: "absolute", left: 12, top: 13, color: "var(--fg3)" }} />
            <Input placeholder={`Search ${t.noun}s…`} style={{ paddingLeft: 36, minHeight: 36 }} />
          </div>
          <span style={{ fontSize: 13, color: "var(--fg3)" }}>
            {rows.length} {t.noun}s · {rows.filter(r => r.pub).length} published
          </span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-soft)" }}>
              <Th style={{ width: 40 }}></Th>
              <Th>Title</Th>
              {type !== "prescriptions" && type !== "tests" && <Th>Category</Th>}
              <Th align="right">Price</Th>
              <Th>Duration</Th>
              {type !== "tests" && <Th align="right">Doctors</Th>}
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.slug} style={{ borderTop: "1px solid var(--border)" }}>
                <Td><I.Grip size={14} style={{ color: "var(--fg3)", cursor: "grab" }} /></Td>
                <Td>
                  <button onClick={onEdit} style={{
                    border: "none", background: "none", cursor: "pointer", padding: 0,
                    fontFamily: "inherit", textAlign: "left",
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--fg1)", fontSize: 14,
                                display: "flex", alignItems: "center", gap: 8 }}>
                      {r.title}
                      {r.feat && <Pill tone="brand" style={{ fontSize: 9, padding: "2px 8px" }}>★ Featured</Pill>}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>/{r.slug}</p>
                  </button>
                </Td>
                {type !== "prescriptions" && type !== "tests" && (
                  <Td><span style={{ fontSize: 13, color: "var(--fg2)" }}>{r.cat}</span></Td>
                )}
                <Td align="right"><span style={{ fontWeight: 700, color: "var(--fg1)" }}>{r.price}</span></Td>
                <Td><span style={{ fontSize: 13, color: "var(--fg2)" }}>{r.dur}</span></Td>
                {type !== "tests" && (
                  <Td align="right"><span style={{ fontSize: 13, color: "var(--fg2)" }}>{r.doctors}</span></Td>
                )}
                <Td><Pill tone={r.pub ? "published" : "draft"}>{r.pub ? "Published" : "Draft"}</Pill></Td>
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

/* ── 9. Service edit ──────────────────────────────────────── */

function ServiceEditScreen({ type = "specialist", country = "pt", onBack }) {
  const t = SERVICE_TYPES[type];
  const ctryName = COUNTRIES.find(c => c.code === country)?.name || "Portugal";
  const hasCategory = type === "general" || type === "specialist";
  const hasDoctors = type !== "tests";
  const [featured, setFeatured] = React.useState(true);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 8, border: "none",
          background: "transparent", color: "var(--fg3)", cursor: "pointer",
          fontFamily: "inherit", fontSize: 13, fontWeight: 600,
        }}>
          <I.ChevronL size={14} /> Back to {t.label.toLowerCase()}
        </button>
      </div>

      <PageHeader
        eyebrow={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FlagBadge code={country} size={14} /> {ctryName} · {t.label}
        </span>}
        title="Cardiology consultation"
        description="One form serves all four service types — fields adapt based on type."
        actions={<>
          <Pill tone="published">Published</Pill>
          <Btn variant="secondary">Save draft</Btn>
          <Btn variant="primary">Save & publish</Btn>
        </>} />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        {/* Main column */}
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>Basics</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--fg3)" }}>
              Shown in lists and cards across the public site.
            </p>
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Title" required>
                <Input defaultValue="Cardiology consultation" />
              </Field>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
                <Field label="URL slug" required hint="Unique within this country.">
                  <Input defaultValue="cardiology-consultation" style={{ fontFamily: "ui-monospace, monospace" }} />
                </Field>
                <Field label="Service type" hint="Switching reorganises the form.">
                  <Select defaultValue={type} disabled>
                    {Object.entries(SERVICE_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              {hasCategory && (
                <Field label="Category" required hint="Only categories enabled for this country are listed.">
                  <Select defaultValue="cardiology">
                    <option value="cardiology">Cardiology</option>
                    <option value="dermatology">Dermatology</option>
                    <option value="endocrinology">Endocrinology</option>
                    <option value="mental-health">Mental health</option>
                  </Select>
                </Field>
              )}
              <Field label="Summary" required hint="One-line description shown in cards.">
                <TextArea rows={2} defaultValue="Specialist review of heart symptoms, ECG interpretation, and second opinions, online." />
              </Field>
              <Field label="Full description" required hint="Markdown supported. Includes patient-facing detail.">
                <TextArea rows={7} defaultValue={`A 45-minute online consultation with a board-certified cardiologist.\n\nUse this consultation for: review of heart palpitations, blood pressure management, second opinions on prior cardiac findings, ECG and Holter interpretation. Not suitable for emergencies — call 112 for chest pain or shortness of breath.\n\nA prescription or referral letter is issued by email after the consultation when clinically appropriate.`} />
              </Field>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>Pricing &amp; logistics</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--fg3)" }}>
              Currency defaults to the country (EUR for Portugal).
            </p>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr 1fr" }}>
              <Field label="Price" required>
                <Input defaultValue="120" type="number" />
              </Field>
              <Field label="Currency">
                <Select defaultValue="EUR"><option>EUR</option><option>USD</option><option>GBP</option></Select>
              </Field>
              <Field label={type === "tests" ? "Turnaround" : "Duration"} required>
                <Input defaultValue={type === "tests" ? "48 hours" : "45 min"} />
              </Field>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>SEO</h3>
            <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
              <Field label="Meta title" hint="Falls back to title.">
                <Input defaultValue="Cardiology consultation in Portugal | Global Health" />
              </Field>
              <Field label="Meta description" hint="155 chars max recommended.">
                <TextArea rows={2} defaultValue="Online cardiology consultations with a registered cardiologist in Portugal. 45-minute video appointments, prescriptions and referrals included." />
              </Field>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 12px", color: "var(--fg1)" }}>Cover image</h3>
            <div style={{
              aspectRatio: "4/3", borderRadius: 12,
              background: "var(--surface-soft)", border: "1px dashed var(--border-strong)",
              display: "grid", placeItems: "center", color: "var(--fg3)",
              fontSize: 12, textAlign: "center", padding: 12,
            }}>
              <div>
                <I.Upload size={24} />
                <p style={{ margin: "8px 0 2px", color: "var(--fg2)", fontWeight: 600 }}>Drop image here</p>
                <p style={{ margin: 0 }}>1200×800 recommended · max 4MB</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 12px", color: "var(--fg1)" }}>Visibility</h3>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 0", borderTop: "1px solid var(--border)" }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>Active</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>Listed on the public site</p>
              </div>
              <Toggle on={true} onChange={() => {}} />
            </label>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 0", borderTop: "1px solid var(--border)" }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>Featured</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>Pinned on country home</p>
              </div>
              <Toggle on={featured} onChange={setFeatured} />
            </label>
          </Card>

          {hasDoctors && (
            <Card>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                           margin: "0 0 4px", color: "var(--fg1)" }}>Assigned doctors</h3>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--fg3)" }}>
                Who can take this booking. Filtered to {ctryName}.
              </p>
              {[
                { img: "TM", name: "Dr. Tiago Mendes", role: "Cardiologist" },
                { img: "MR", name: "Dr. María Rojas",  role: "Dermatologist" },
              ].map(d => (
                <div key={d.name} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", borderTop: "1px solid var(--border)",
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: "linear-gradient(135deg, var(--brand), var(--accent))",
                    color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 11,
                  }}>{d.img}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>{d.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--fg3)" }}>{d.role}</p>
                  </div>
                  <IconBtn><I.Close size={12} /></IconBtn>
                </div>
              ))}
              <Btn variant="ghost" size="sm" iconLeft={<I.Plus size={13} />}
                   style={{ width: "100%", marginTop: 10, color: "var(--brand)" }}>
                Assign doctor
              </Btn>
            </Card>
          )}

          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 12px", color: "var(--fg1)" }}>Recent audit</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { who: "Hassaan A.", what: "published", when: "2 min ago" },
                { who: "Hassaan A.", what: "edited summary", when: "10 min ago" },
                { who: "Maria S.",   what: "assigned Dr. Mendes", when: "1 hr ago" },
              ].map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--fg3)" }}>
                  <span style={{ color: "var(--fg1)", fontWeight: 700 }}>{e.who}</span>{" "}{e.what}
                  <span style={{ display: "block", color: "var(--fg3)", fontSize: 11 }}>{e.when}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ServicesListScreen, ServiceEditScreen });
