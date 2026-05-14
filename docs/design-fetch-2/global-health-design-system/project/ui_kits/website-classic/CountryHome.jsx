// CountryHome.jsx — composes a country home page (Portugal as default content).

function CountryHome({ countryName = "Portugal", onBook, onSelectService }) {
  const services = [
    {
      title: "General consultation",
      description: "Talk to a registered GP — same day appointments, prescriptions online.",
      duration: "30 min",
      price: "From €50",
      icon: <Icons.IconStethoscope size={22} />,
    },
    {
      title: "Cardiology",
      description: "Specialist heart review, ECG interpretation, second opinions, online.",
      duration: "45 min",
      price: "From €120",
      icon: <Icons.IconHeart size={22} />,
    },
    {
      title: "Dermatology",
      description: "Skin, hair, and nail conditions reviewed by a registered dermatologist.",
      duration: "30 min",
      price: "From €95",
      icon: <Icons.IconShield size={22} />,
    },
    {
      title: "Mental health",
      description: "Confidential support from licensed psychologists and psychiatrists.",
      duration: "50 min",
      price: "From €110",
      icon: <Icons.IconUser size={22} />,
    },
    {
      title: "Online prescription",
      description: "Repeat prescriptions issued after a quick clinical review.",
      duration: "15 min",
      price: "From €25",
      icon: <Icons.IconPackage size={22} />,
    },
    {
      title: "Home health test",
      description: "At-home blood and urine tests with online results within 48 hours.",
      duration: "Sent to you",
      price: "From €65",
      icon: <Icons.IconCheckCircle size={22} />,
    },
  ];

  const steps = [
    {
      title: "Choose your country",
      description: `Pick the ${countryName} clinic and your preferred language — we route you to local doctors.`,
      icon: <Icons.IconMapPin size={26} />,
    },
    {
      title: "Pick a doctor and time",
      description: "Browse doctor profiles, see availability, and book a slot that suits you.",
      icon: <Icons.IconUser size={26} />,
    },
    {
      title: "Get cared for",
      description: "Join the video call from any device. Prescriptions and referrals follow by email.",
      icon: <Icons.IconMail size={26} />,
    },
  ];

  return (
    <>
      <QuickActions items={[
        { label: `${countryName} home` },
        { label: "Specialists" },
        { label: "Health tests" },
        { label: "Prescriptions" },
        { label: "Doctors" },
        { label: "FAQ" },
      ]} />
      <CountryHero countryName={countryName} onBook={onBook} />
      <Availability countryName={countryName} onBook={onBook} />
      <AboutSection countryName={countryName} />
      <SpecialtiesGrid services={services} onSelect={onSelectService} />
      <HowItWorks steps={steps} />
      <TrustBar />
      <DoctorSpotlight />
      <BookingCTA onBook={onBook} />
    </>
  );
}

window.CountryHome = CountryHome;
