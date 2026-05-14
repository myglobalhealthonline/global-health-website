// App.jsx — Landing (country → language) → country site.

function App() {
  const [entered, setEntered] = React.useState(() => localStorage.getItem("gh_entered") === "1");
  const [country, setCountry] = React.useState(() => localStorage.getItem("gh_country2") || "pt");
  const [lang,    setLang]    = React.useState(() => localStorage.getItem("gh_lang") || "en");
  const [booking, setBooking] = React.useState(false);

  React.useEffect(() => { localStorage.setItem("gh_entered", entered ? "1" : "0"); }, [entered]);
  React.useEffect(() => { localStorage.setItem("gh_country2", country); }, [country]);
  React.useEffect(() => { localStorage.setItem("gh_lang", lang); }, [lang]);
  React.useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [entered]);

  const ctryName = { ie: "Ireland", pt: "Portugal", es: "Spain", cz: "Czechia", rm: "Romania" }[country];

  if (!entered) {
    return <Landing onEnter={(c, l) => { setCountry(c); setLang(l); setEntered(true); }} />;
  }

  return (
    <>
      <Header country={country} onCountry={setCountry} onBook={() => setBooking(true)} />
      <HomeHero country={country} onCountry={setCountry} onBook={() => setBooking(true)} />
      <TrustRibbon />
      <ServiceCatalog onBook={() => setBooking(true)} />
      <DoctorWall onBook={() => setBooking(true)} />
      <HowItWorks />
      <FinalCTA onBook={() => setBooking(true)} />
      <Footer />

      <BookingModal open={booking} onClose={() => setBooking(false)} defaultCountry={ctryName} />

      {/* Restart landing — pinned bottom-left for the prototype */}
      <button onClick={() => setEntered(false)} style={{
        position: "fixed", left: 20, bottom: 20, zIndex: 60,
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 16px", borderRadius: 999,
        background: "var(--surface-dark)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "var(--shadow-elevated)", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
        cursor: "pointer",
      }}>
        ← Country selector
      </button>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
