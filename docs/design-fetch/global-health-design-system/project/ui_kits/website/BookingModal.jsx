// BookingModal.jsx — simple booking form modal.

function BookingModal({ open, onClose, defaultCountry = "Portugal" }) {
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState({
    name: "", email: "", country: defaultCountry, service: "General consultation", time: "Today 14:30",
  });

  React.useEffect(() => {
    if (open) { setStep(0); setForm(f => ({ ...f, country: defaultCountry })); }
  }, [open, defaultCountry]);

  if (!open) return null;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const inputStyle = {
    width: "100%", minHeight: 48, padding: "0 16px",
    border: "1px solid var(--border)", borderRadius: 12,
    background: "#fff", color: "var(--fg2)", fontSize: 15, lineHeight: 1.5,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 14, fontWeight: 700, color: "var(--fg1)", marginBottom: 6, display: "block" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(15,46,37,0.6)", backdropFilter: "blur(8px)",
      display: "grid", placeItems: "center", padding: "20px",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 24, maxWidth: 560, width: "100%",
        boxShadow: "var(--shadow-elevated)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: "var(--brand)", color: "#fff", padding: "28px 32px", position: "relative" }}>
          <div aria-hidden style={{
            position: "absolute", inset: 0, opacity: 0.06,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 28 28' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M14 9v10M9 14h10'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "28px",
          }} />
          <button onClick={onClose} aria-label="Close" style={{
            position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.20)", background: "rgba(255,255,255,0.10)",
            color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icons.IconClose size={18} />
          </button>
          <div style={{ position: "relative" }}>
            <Eyebrow dark>{step < 2 ? "New booking" : "All set"}</Eyebrow>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800,
              letterSpacing: "-0.015em", lineHeight: 1.15, color: "#fff", margin: "10px 0 4px",
            }}>
              {step === 0 && "Book a consultation"}
              {step === 1 && "Pick a time"}
              {step === 2 && "Booking confirmed"}
            </h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.85)" }}>
              {step === 0 && "Tell us who you are and what you need."}
              {step === 1 && "Choose a doctor and time that suits you."}
              {step === 2 && "We've sent a confirmation to your email."}
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 32 }}>
          {step === 0 && (
            <div style={{ display: "grid", gap: 18 }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="Your full name" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} value={form.email} onChange={set("email")} placeholder="you@example.com" type="email" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Clinic</label>
                  <select style={inputStyle} value={form.country} onChange={set("country")}>
                    {["Ireland", "Portugal", "Spain", "Czechia", "Romania"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Service</label>
                  <select style={inputStyle} value={form.service} onChange={set("service")}>
                    {["General consultation", "Cardiology", "Dermatology", "Mental health", "Online prescription", "Home health test"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <Btn variant="primary" iconRight onClick={() => setStep(1)}>Continue</Btn>
              <p style={{ fontSize: 12, color: "var(--fg3)", margin: 0 }}>
                Your data is processed under our Privacy Policy and stored under GDPR.
              </p>
            </div>
          )}
          {step === 1 && (
            <div style={{ display: "grid", gap: 14 }}>
              {["Today, 14:30 · Dr. Inês Carvalho", "Today, 17:00 · Dr. Tiago Mendes", "Tomorrow, 09:15 · Dr. Inês Carvalho", "Tomorrow, 11:45 · Dr. Lara Santos"].map((slot, i) => (
                <label key={slot} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: 16,
                  border: `1px solid ${form.time.startsWith(slot.split(" · ")[0]) ? "var(--brand)" : "var(--border)"}`,
                  borderRadius: 14, cursor: "pointer",
                  background: form.time.startsWith(slot.split(" · ")[0]) ? "var(--surface-soft)" : "#fff",
                }}>
                  <input type="radio" name="slot" value={slot} checked={form.time.startsWith(slot.split(" · ")[0])}
                         onChange={() => setForm({ ...form, time: slot.split(" · ")[0] })}
                         style={{ accentColor: "var(--brand)" }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--fg1)" }}>{slot.split(" · ")[0]}</p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--fg3)" }}>{slot.split(" · ")[1]}</p>
                  </div>
                  <Icons.IconClock size={18} style={{ color: "var(--brand)" }} />
                </label>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <Btn variant="outline" onClick={() => setStep(0)}>Back</Btn>
                <Btn variant="primary" iconRight onClick={() => setStep(2)}>Confirm booking</Btn>
              </div>
            </div>
          )}
          {step === 2 && (
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "grid", placeItems: "center", padding: "8px 0 16px" }}>
                <span style={{
                  width: 72, height: 72, borderRadius: 999, background: "var(--accent)",
                  color: "var(--brand)", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "var(--shadow-elevated)",
                }}>
                  <Icons.IconCheck size={36} />
                </span>
              </div>
              <div style={{
                border: "1px solid var(--border)", borderRadius: 16, padding: 18, background: "var(--surface-soft)",
              }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
                            textTransform: "uppercase", color: "var(--brand)" }}>
                  Your appointment
                </p>
                <p style={{ margin: "8px 0 4px", fontFamily: "var(--font-display)", fontSize: 22,
                            fontWeight: 800, color: "var(--fg1)" }}>{form.time}</p>
                <p style={{ margin: 0, color: "var(--fg3)" }}>
                  {form.service} · Medical Clinic {form.country}
                </p>
              </div>
              <Btn variant="primary" onClick={onClose}>Done</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.BookingModal = BookingModal;
