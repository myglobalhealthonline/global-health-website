import Image from "next/image";

const LOGO_SRC = "/logos/global-health-official.png";

export function ComingSoon() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F2E25] px-6 py-16 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-8 text-center">
        <Image
          src={LOGO_SRC}
          alt="Global Health"
          width={220}
          height={94}
          priority
          className="h-auto w-44 sm:w-52"
        />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B0F122]">
          New site coming soon
        </p>
        <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          We&rsquo;re rebuilding to bring you a faster, calmer experience.
        </h1>
        <p className="max-w-md text-base leading-7 text-white/75 sm:text-lg">
          Online consultations with licensed doctors will be back here shortly.
          For urgent matters, please contact your local emergency services.
        </p>
        <a
          href="mailto:hello@myglobalhealth.online"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#B0F122] px-7 text-sm font-bold text-[#0F2E25] transition hover:-translate-y-px hover:shadow-lg"
        >
          Email us
        </a>
      </div>
    </main>
  );
}
