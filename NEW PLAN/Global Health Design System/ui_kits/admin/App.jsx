// App.jsx — admin portal click-through router.

function App() {
  // screens: login / dashboard / countries / country-edit / categories /
  //          doctors / doctor-edit / services / service-edit
  const [authed, setAuthed]   = React.useState(() => localStorage.getItem("gh_admin_authed") === "1");
  const [screen, setScreen]   = React.useState(() => localStorage.getItem("gh_admin_screen") || "dashboard");
  const [country, setCountry] = React.useState(() => localStorage.getItem("gh_admin_country") || "pt");
  const [svcType, setSvcType] = React.useState(() => localStorage.getItem("gh_admin_svctype") || "specialist");

  React.useEffect(() => { localStorage.setItem("gh_admin_authed",  authed ? "1" : "0"); }, [authed]);
  React.useEffect(() => { localStorage.setItem("gh_admin_screen",  screen); }, [screen]);
  React.useEffect(() => { localStorage.setItem("gh_admin_country", country); }, [country]);
  React.useEffect(() => { localStorage.setItem("gh_admin_svctype", svcType); }, [svcType]);
  React.useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [screen]);

  if (!authed) {
    return <LoginScreen onLogin={() => { setAuthed(true); setScreen("dashboard"); }} />;
  }

  // Map screen → component + breadcrumb
  const SCREENS = {
    "dashboard":             { breadcrumb: ["Dashboard"],                                  el: <DashboardScreen /> },
    "countries":             { breadcrumb: ["Countries"],                                  el: <CountriesListScreen onEdit={() => setScreen("country-edit")} /> },
    "country-edit":          { breadcrumb: ["Countries", "Portugal"],                      el: <CountryEditScreen onBack={() => setScreen("countries")} /> },
    "categories":            { breadcrumb: ["Categories"],                                 el: <CategoriesMatrixScreen /> },
    "doctors":               { breadcrumb: ["Doctors"],                                    el: <DoctorsListScreen onEdit={() => setScreen("doctor-edit")} /> },
    "doctor-edit":           { breadcrumb: ["Doctors", "Dr. Tiago Mendes"],                el: <DoctorEditScreen onBack={() => setScreen("doctors")} /> },
    "services-general":      { breadcrumb: ["Portugal", "General consultations"],          el: <ServicesListScreen type="general"       country={country} onTypeChange={mapTypeNav(setScreen, setSvcType)} onEdit={() => { setSvcType("general"); setScreen("service-edit"); }} /> },
    "services-specialist":   { breadcrumb: ["Portugal", "Specialist consultations"],       el: <ServicesListScreen type="specialist"    country={country} onTypeChange={mapTypeNav(setScreen, setSvcType)} onEdit={() => { setSvcType("specialist"); setScreen("service-edit"); }} /> },
    "services-prescriptions":{ breadcrumb: ["Portugal", "Online prescriptions"],           el: <ServicesListScreen type="prescriptions" country={country} onTypeChange={mapTypeNav(setScreen, setSvcType)} onEdit={() => { setSvcType("prescriptions"); setScreen("service-edit"); }} /> },
    "services-tests":        { breadcrumb: ["Portugal", "Health tests"],                   el: <ServicesListScreen type="tests"         country={country} onTypeChange={mapTypeNav(setScreen, setSvcType)} onEdit={() => { setSvcType("tests"); setScreen("service-edit"); }} /> },
    "service-edit":          { breadcrumb: ["Portugal", SERVICE_TYPES[svcType].label, "Edit"], el: <ServiceEditScreen type={svcType} country={country} onBack={() => setScreen("services-" + (svcType === "prescriptions" ? "prescriptions" : svcType === "tests" ? "tests" : svcType))} /> },
    // not-yet-built
    "admins":                { breadcrumb: ["Admin users"], el: <Placeholder label="Admin users" sub="Invite, set role, deactivate. Wireframe pending." /> },
    "audit":                 { breadcrumb: ["Audit log"],   el: <Placeholder label="Audit log" sub="Chronological event stream, filterable by user / entity / country." /> },
    "country-home":          { breadcrumb: ["Portugal", "Country home"], el: <Placeholder label="Portugal country home" sub="Same as Dashboard but scoped to Portugal." /> },
    "country-content":       { breadcrumb: ["Portugal", "Country content"], el: <CountryEditScreen onBack={() => setScreen("dashboard")} /> },
    "appointments":          { breadcrumb: ["Portugal", "Appointments"], el: <Placeholder label="Portugal · Appointments" sub="Booking intake queue, status updates, contact patient." /> },
  };

  const current = SCREENS[screen] || SCREENS.dashboard;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar activeScreen={screen} onNavigate={setScreen} activeCountry={country} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--surface-soft)" }}>
        <Topbar breadcrumb={current.breadcrumb} country={country} onCountry={setCountry} />
        <div style={{ padding: "32px 28px 64px", flex: 1, maxWidth: 1320, width: "100%", margin: "0 auto" }}>
          {current.el}
        </div>
      </main>

      {/* Floating sign-out for the demo */}
      <button onClick={() => setAuthed(false)} style={{
        position: "fixed", right: 20, bottom: 20, zIndex: 60,
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 16px", borderRadius: 999,
        background: "var(--surface-dark)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "var(--shadow-elevated)", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
        cursor: "pointer",
      }}>
        <I.Logout size={14} /> Sign out
      </button>
    </div>
  );
}

// Helper: when user clicks one of the 4 service-type tabs in the segmented control
function mapTypeNav(setScreen, setSvcType) {
  return (newType) => {
    setSvcType(newType);
    setScreen("services-" + newType);
  };
}

function Placeholder({ label, sub }) {
  return (
    <Card style={{ textAlign: "center", padding: 64 }}>
      <span style={{
        width: 56, height: 56, borderRadius: 16, margin: "0 auto 18px",
        background: "rgba(200,230,160,0.30)", color: "var(--brand)",
        display: "grid", placeItems: "center",
      }}>
        <I.Activity size={24} />
      </span>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800,
                   margin: "0 0 8px", color: "var(--fg1)" }}>{label}</h2>
      <p style={{ margin: 0, color: "var(--fg3)", maxWidth: 420, marginInline: "auto" }}>{sub}</p>
    </Card>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
