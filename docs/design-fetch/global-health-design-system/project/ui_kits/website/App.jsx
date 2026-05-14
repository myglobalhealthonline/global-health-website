// App.jsx — top-level screen router for the click-through UI kit.

function App() {
  const [screen, setScreen] = React.useState("home");        // "home" | "country"
  const [country, setCountry] = React.useState("Portugal");
  const [booking, setBooking] = React.useState(false);

  React.useEffect(() => {
    // restore on refresh
    const s = localStorage.getItem("gh_screen");
    const c = localStorage.getItem("gh_country");
    if (s) setScreen(s);
    if (c) setCountry(c);
  }, []);
  React.useEffect(() => { localStorage.setItem("gh_screen", screen); }, [screen]);
  React.useEffect(() => { localStorage.setItem("gh_country", country); }, [country]);

  // scroll back to top whenever screen changes
  React.useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [screen]);

  const goCountry = (code, name) => {
    setCountry(name);
    setScreen("country");
  };

  return (
    <>
      <SiteHeader currentScreen={screen} onNavigate={s => {
        if (s === "booking") setBooking(true);
        else setScreen(s);
      }} />

      {screen === "home" && <HomeHero onSelectCountry={goCountry} />}
      {screen === "country" && <CountryHome countryName={country} onBook={() => setBooking(true)} />}

      <Footer onNavigate={setScreen} />

      <BookingModal open={booking} onClose={() => setBooking(false)} defaultCountry={country} />

      {/* Floating "back to home" pill when on a country page */}
      {screen !== "home" && (
        <button onClick={() => setScreen("home")} style={{
          position: "fixed", left: 20, bottom: 20, zIndex: 60,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 999,
          background: "var(--surface-dark)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "var(--shadow-elevated)", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
          cursor: "pointer",
        }}>
          ← Country selector
        </button>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
