// Header.jsx — sticky dark header with logo, nav, mobile menu button.

function SiteHeader({ onNavigate, currentScreen }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { label: "Clinics",     dropdown: true },
    { label: "About",       dropdown: true },
    { label: "Blog" },
    { label: "FAQ" },
    { label: "eGift Card" },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40, width: "100%",
      background: scrolled ? "rgba(15,46,37,0.95)" : "var(--surface-dark)",
      backdropFilter: scrolled ? "blur(10px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
      transition: "all 300ms ease-out",
    }}>
      <Container style={{
        height: "var(--header-height)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center", gap: 16,
      }}>
        {/* Logo */}
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate("home"); }} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="../../assets/logo/global-health-logo.png" alt="Global Health"
               style={{ height: 44, width: "auto", filter: "brightness(0) invert(1)" }} />
        </a>

        {/* Desktop nav */}
        <nav style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center",
                      paddingLeft: 16 }}
             className="desktop-only">
          {navItems.map((item) => (
            <a key={item.label} href="#" style={{
              padding: "10px 14px", borderRadius: 12, color: "rgba(255,255,255,0.85)",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onClick={(e) => e.preventDefault()}>
              {item.label}
              {item.dropdown && <Icons.IconChevronD size={14} />}
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="#" onClick={(e) => e.preventDefault()} style={{
            color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 600, textDecoration: "none",
            padding: "8px 12px",
          }} className="desktop-only">Log in</a>
          <Btn variant="accent" onClick={() => onNavigate("booking")} className="desktop-only">
            Book consultation
          </Btn>
          <button onClick={() => setMobileOpen(true)} className="mobile-only" style={{
            background: "rgba(255,255,255,0.10)", color: "#fff", border: "none",
            width: 44, height: 44, borderRadius: 12, display: "none", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <Icons.IconMenu size={22} />
          </button>
        </div>
      </Container>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,46,37,0.98)" }}
             onClick={() => setMobileOpen(false)}>
          <Container style={{ padding: "20px 24px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24 }}>
              <img src="../../assets/logo/global-health-logo.png" alt="Global Health"
                   style={{ height: 36, filter: "brightness(0) invert(1)" }} />
              <button onClick={() => setMobileOpen(false)} style={{
                background: "rgba(255,255,255,0.10)", color: "#fff", border: "none",
                width: 44, height: 44, borderRadius: 12, display: "inline-flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}><Icons.IconClose size={22} /></button>
            </div>
            {navItems.map((i) => (
              <a key={i.label} href="#" onClick={(e) => { e.preventDefault(); setMobileOpen(false); }} style={{
                display: "block", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.10)",
                color: "#fff", fontSize: 18, fontWeight: 600, textDecoration: "none",
              }}>{i.label}</a>
            ))}
            <div style={{ marginTop: 24 }}>
              <Btn variant="accent" onClick={() => { setMobileOpen(false); onNavigate("booking"); }}>
                Book consultation
              </Btn>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}

window.SiteHeader = SiteHeader;
