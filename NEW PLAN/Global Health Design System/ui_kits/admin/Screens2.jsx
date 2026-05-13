// Screens2.jsx — Country edit, Categories matrix, Doctors list, Doctor edit.

/* ── 4. Country edit ──────────────────────────────────────── */

function CountryEditScreen({ onBack }) {
  const [active, setActive] = React.useState(true);
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 8, border: "none",
          background: "transparent", color: "var(--fg3)", cursor: "pointer",
          fontFamily: "inherit", fontSize: 13, fontWeight: 600,
        }}>
          <I.ChevronL size={14} /> Back to countries
        </button>
      </div>

      <PageHeader
        eyebrow={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FlagBadge code="pt" size={14} /> Edit country
        </span>}
        title="Portugal"
        description="This is the row that everything in Portugal hangs off — services, doctors, categories, appointments."
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
                         margin: "0 0 4px", color: "var(--fg1)" }}>Metadata</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--fg3)" }}>
              Identifiers used in URLs, billing, and DB joins.
            </p>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Country code" required hint="ISO 3166-1 alpha-2. Used internally.">
                <Input defaultValue="PT" style={{ fontFamily: "ui-monospace, monospace" }} />
              </Field>
              <Field label="URL slug" required hint="Used in /[slug] paths. Cannot change after first publish.">
                <Input defaultValue="pt" style={{ fontFamily: "ui-monospace, monospace" }} />
              </Field>
              <Field label="Display name" required>
                <Input defaultValue="Portugal" />
              </Field>
              <Field label="Currency" required>
                <Select defaultValue="EUR">
                  <option>EUR</option><option>GBP</option><option>USD</option><option>CZK</option><option>RON</option>
                </Select>
              </Field>
              <Field label="Languages" hint="Comma-separated. First language is default." style={{ gridColumn: "span 2" }}>
                <Input defaultValue="Portuguese, English" />
              </Field>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>Hero content</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--fg3)" }}>
              Shown on the public country home. Supports limited markdown.
            </p>
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="Hero title" required>
                <Input defaultValue="Online doctor consultations in Portugal" />
              </Field>
              <Field label="Hero subtitle" required>
                <TextArea defaultValue="Same-day video appointments with registered doctors. Prescriptions, referrals, and home health tests — all without leaving home." />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Primary CTA label">
                  <Input defaultValue="Book consultation" />
                </Field>
                <Field label="Primary CTA URL">
                  <Input defaultValue="/pt/book" style={{ fontFamily: "ui-monospace, monospace" }} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>Contact</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--fg3)" }}>
              Visible to patients on the country footer and contact forms.
            </p>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Phone"><Input defaultValue="+351 21 123 4567" /></Field>
              <Field label="WhatsApp"><Input defaultValue="+351 91 123 4567" /></Field>
              <Field label="Email" style={{ gridColumn: "span 2" }}>
                <Input defaultValue="portugal@myglobalhealth.online" />
              </Field>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>Visibility</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--fg3)" }}>
              Pull this country off the public site without losing data.
            </p>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 0", borderTop: "1px solid var(--border)" }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>Active</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>Visible on the public site</p>
              </div>
              <Toggle on={active} onChange={setActive} />
            </label>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 0", borderTop: "1px solid var(--border)" }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>Show in country picker</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>Homepage hero list</p>
              </div>
              <Toggle on={true} onChange={() => {}} />
            </label>
          </Card>

          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>Stats</h3>
            <div style={{ display: "grid", gap: 4, marginTop: 12 }}>
              {[
                ["Doctors assigned", "11"],
                ["Services published", "27"],
                ["Categories enabled", "16 / 18"],
                ["Pending bookings", "3"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between",
                                       padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--fg3)" }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800,
                         margin: "0 0 4px", color: "#991B1B" }}>Danger zone</h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "#991B1B" }}>
              Deleting cascades to all services and doctor assignments. Use Inactive to hide instead.
            </p>
            <Btn variant="danger" size="sm" iconLeft={<I.Trash size={13} />}>Delete country</Btn>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── 5. Categories matrix ─────────────────────────────────── */

function CategoriesMatrixScreen() {
  const [grid, setGrid] = React.useState(() => {
    const cats = [
      { slug: "cardiology",    name: "Cardiology",         type: "SPECIALIST" },
      { slug: "dermatology",   name: "Dermatology",        type: "SPECIALIST" },
      { slug: "endocrinology", name: "Endocrinology",      type: "SPECIALIST" },
      { slug: "gastroenterology", name: "Gastroenterology",type: "SPECIALIST" },
      { slug: "general",       name: "General practice",   type: "GENERAL" },
      { slug: "mental-health", name: "Mental health",      type: "SPECIALIST" },
      { slug: "neurology",     name: "Neurology",          type: "SPECIALIST" },
      { slug: "pediatrics",    name: "Pediatrics",         type: "SPECIALIST" },
      { slug: "weight-loss",   name: "Weight loss",        type: "GENERAL" },
    ];
    return cats.map(c => ({ ...c,
      enabled: { ie: true, pt: c.slug !== "neurology", es: c.slug !== "pediatrics" && c.slug !== "neurology", cz: ["general", "cardiology", "dermatology", "mental-health"].includes(c.slug), rm: ["general", "cardiology", "weight-loss"].includes(c.slug) }
    }));
  });

  const toggle = (i, code) => setGrid(g => g.map((row, idx) =>
    idx === i ? { ...row, enabled: { ...row.enabled, [code]: !row.enabled[code] } } : row
  ));

  const cols = ["ie", "pt", "es", "cz", "rm"];

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Categories"
        description="One global pool of specialties. Toggle the cells to enable a category in a specific country."
        actions={<>
          <Btn variant="secondary" iconLeft={<I.Filter size={14} />}>Type: All</Btn>
          <Btn variant="primary" iconLeft={<I.Plus size={14} />}>New category</Btn>
        </>} />

      <Card padding={0}>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface-soft)" }}>
                <Th>Category</Th>
                <Th>Type</Th>
                {cols.map(c => (
                  <th key={c} style={{
                    padding: "12px 16px", textAlign: "center", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg3)",
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <FlagBadge code={c} size={14} />
                      {COUNTRIES.find(co => co.code === c).name}
                    </span>
                  </th>
                ))}
                <Th align="right">In use</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => (
                <tr key={row.slug} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td style={{ minWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: "rgba(200,230,160,0.30)", color: "var(--brand)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {row.type === "GENERAL" ? <I.Heart size={16} /> : <I.Stethoscope size={16} />}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: "var(--fg1)", fontSize: 14, whiteSpace: "nowrap" }}>{row.name}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)", whiteSpace: "nowrap" }}>/{row.slug}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Pill tone={row.type === "GENERAL" ? "neutral" : "published"}>
                      {row.type.toLowerCase()}
                    </Pill>
                  </Td>
                  {cols.map(c => (
                    <td key={c} style={{ padding: "14px 0", textAlign: "center" }}>
                      <Toggle on={row.enabled[c]} onChange={() => toggle(i, c)} size={22} />
                    </td>
                  ))}
                  <Td align="right">
                    <span style={{ fontSize: 12, color: "var(--fg3)" }}>
                      {Object.values(row.enabled).filter(Boolean).length} / 5
                    </span>
                  </Td>
                  <Td><IconBtn><I.More size={14} /></IconBtn></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ── 6. Doctors list ──────────────────────────────────────── */

function DoctorsListScreen({ onEdit }) {
  const rows = [
    { slug: "ines-carvalho",  name: "Dr. Inês Carvalho", title: "GP",          countries: ["pt"], img: "IC", exp: 12, langs: ["Portuguese", "English"], active: true,  pub: true },
    { slug: "tiago-mendes",   name: "Dr. Tiago Mendes",  title: "Cardiologist",countries: ["pt", "es"], img: "TM", exp: 18, langs: ["Portuguese", "Spanish"], active: true,  pub: true },
    { slug: "siobhan-walsh",  name: "Dr. Siobhán Walsh", title: "GP",          countries: ["ie"], img: "SW", exp: 7, langs: ["English"], active: true, pub: true },
    { slug: "maria-rojas",    name: "Dr. María Rojas",   title: "Dermatologist", countries: ["es", "pt"], img: "MR", exp: 14, langs: ["Spanish", "Portuguese", "English"], active: true, pub: true },
    { slug: "tomas-novak",    name: "Dr. Tomáš Novák",   title: "GP",          countries: ["cz"], img: "TN", exp: 9, langs: ["Czech", "English"], active: false, pub: true },
    { slug: "ana-popescu",    name: "Dr. Ana Popescu",   title: "Psychiatrist", countries: ["rm", "cz"], img: "AP", exp: 11, langs: ["Romanian", "English"], active: true, pub: false },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Doctors"
        description="Doctors are shared across countries. Each row below is one person, possibly licensed in multiple clinics."
        actions={<>
          <Btn variant="secondary" iconLeft={<I.Filter size={14} />}>Country: All</Btn>
          <Btn variant="primary" iconLeft={<I.Plus size={14} />}>Add doctor</Btn>
        </>} />

      <Card padding={0}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)",
                      display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: "0 1 320px" }}>
            <I.Search size={14} style={{ position: "absolute", left: 12, top: 13, color: "var(--fg3)" }} />
            <Input placeholder="Search by name, slug, or registration…" style={{ paddingLeft: 36, minHeight: 36 }} />
          </div>
          <span style={{ fontSize: 13, color: "var(--fg3)" }}>{rows.length} doctors · 5 published</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface-soft)" }}>
              <Th>Doctor</Th>
              <Th>Title</Th>
              <Th>Practicing in</Th>
              <Th>Languages</Th>
              <Th align="right">Yrs</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.slug} style={{ borderTop: "1px solid var(--border)" }}>
                <Td>
                  <button onClick={onEdit} style={{
                    display: "inline-flex", alignItems: "center", gap: 12, border: "none",
                    background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
                  }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: 999,
                      background: "linear-gradient(135deg, var(--brand), var(--accent))",
                      color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 13,
                    }}>{r.img}</span>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ margin: 0, fontWeight: 700, color: "var(--fg1)", fontSize: 14 }}>{r.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>/{r.slug}</p>
                    </div>
                  </button>
                </Td>
                <Td><span style={{ fontSize: 13, color: "var(--fg2)" }}>{r.title}</span></Td>
                <Td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {r.countries.map(c => (
                      <CountryChip key={c} code={c} name={COUNTRIES.find(co => co.code === c).name} />
                    ))}
                  </div>
                </Td>
                <Td><span style={{ fontSize: 13, color: "var(--fg2)" }}>{r.langs.join(", ")}</span></Td>
                <Td align="right"><span style={{ fontWeight: 700, color: "var(--fg1)" }}>{r.exp}</span></Td>
                <Td>
                  {r.active
                    ? <Pill tone={r.pub ? "published" : "draft"}>{r.pub ? "Published" : "Draft"}</Pill>
                    : <Pill tone="inactive">Suspended</Pill>}
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

/* ── 7. Doctor edit ───────────────────────────────────────── */

function DoctorEditScreen({ onBack }) {
  const [assignments, setAssignments] = React.useState([
    { code: "pt", name: "Portugal", active: true,  order: 1 },
    { code: "es", name: "Spain",    active: true,  order: 2 },
    { code: "ie", name: "Ireland",  active: false, order: null },
  ]);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 8, border: "none",
          background: "transparent", color: "var(--fg3)", cursor: "pointer",
          fontFamily: "inherit", fontSize: 13, fontWeight: 600,
        }}>
          <I.ChevronL size={14} /> Back to doctors
        </button>
      </div>

      <PageHeader
        eyebrow="Edit doctor"
        title="Dr. Tiago Mendes"
        description="One doctor, multiple countries. Toggle active per-country to suspend in one place without hiding everywhere."
        actions={<>
          <Pill tone="published">Published</Pill>
          <Btn variant="secondary">Save draft</Btn>
          <Btn variant="primary">Save & publish</Btn>
        </>} />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        {/* Main form */}
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>Profile</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--fg3)" }}>
              Public-facing profile shown on every country's team page.
            </p>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Full name" required style={{ gridColumn: "span 2" }}>
                <Input defaultValue="Dr. Tiago Mendes" />
              </Field>
              <Field label="Title / specialty" required>
                <Input defaultValue="Cardiologist" />
              </Field>
              <Field label="URL slug" required hint="Unique across all doctors.">
                <Input defaultValue="tiago-mendes" style={{ fontFamily: "ui-monospace, monospace" }} />
              </Field>
              <Field label="Years of experience">
                <Input defaultValue="18" type="number" />
              </Field>
              <Field label="Registration number" hint="Local medical board ID.">
                <Input defaultValue="OM-57821" />
              </Field>
              <Field label="Languages" hint="Comma-separated." style={{ gridColumn: "span 2" }}>
                <Input defaultValue="Portuguese, Spanish, English" />
              </Field>
              <Field label="Short bio" style={{ gridColumn: "span 2" }}>
                <TextArea rows={5} defaultValue="Tiago is a board-certified cardiologist with 18 years of experience in non-invasive cardiology. He focuses on hypertension management, ECG interpretation, and second opinions for patients across Iberia." />
              </Field>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>Profile photo</h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--fg3)" }}>
              800×800 recommended. Uploaded to Railway bucket.
            </p>
            <div style={{
              aspectRatio: "1/1", width: "100%", borderRadius: 16,
              background: "linear-gradient(135deg, var(--brand), var(--accent))",
              color: "#fff", display: "grid", placeItems: "center",
              fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 800,
            }}>TM</div>
            <Btn variant="secondary" size="sm" iconLeft={<I.Upload size={13} />}
                 style={{ width: "100%", marginTop: 10 }}>
              Replace photo
            </Btn>
          </Card>

          <Card>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                         margin: "0 0 4px", color: "var(--fg1)" }}>Practicing in</h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--fg3)" }}>
              Many-to-many. Active controls visibility per country; sort order ranks the doctor on each country's team page.
            </p>
            {assignments.map((a, i) => (
              <div key={a.code} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 0", borderTop: "1px solid var(--border)",
              }}>
                <FlagBadge code={a.code} size={16} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--fg1)" }}>{a.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--fg3)" }}>
                    {a.order ? `Sort order: ${a.order}` : "Not assigned"}
                  </p>
                </div>
                <Toggle on={a.active}
                        onChange={(v) => setAssignments(arr => arr.map((x, j) =>
                          j === i ? { ...x, active: v, order: v && !x.order ? arr.filter(z => z.active).length + 1 : x.order } : x))}
                        size={22} />
              </div>
            ))}
            <Btn variant="ghost" size="sm" iconLeft={<I.Plus size={13} />}
                 style={{ width: "100%", marginTop: 10, color: "var(--brand)" }}>
              Add country assignment
            </Btn>
          </Card>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { CountryEditScreen, CategoriesMatrixScreen, DoctorsListScreen, DoctorEditScreen });
