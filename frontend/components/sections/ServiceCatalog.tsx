"use client";

/**
 * Filterable service catalogue.
 *
 * Mirrors `ui_kits/website/Sections.jsx ServiceCatalog`:
 *   • Section header — eyebrow + h2 + side description
 *   • Filter pills bordered top/bottom with counts
 *   • Card grid auto-fill minmax(280px, 1fr)
 *   • Each tile: gradient stripe top with icon tile + tag pill,
 *     body with title and Price / Time grid
 */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Globe,
  Heart,
  Package,
  Shield,
  Stethoscope,
  User,
} from "lucide-react";

type ServiceType = "general" | "specialist" | "prescription" | "test";

type Service = {
  type: ServiceType;
  title: string;
  tag: string;
  price: number;
  dur: string;
  icon: ReactNode;
  href: string;
};

const SERVICES: Service[] = [
  { type: "general", title: "General consultation", tag: "General", price: 50, dur: "30 min", icon: <Stethoscope className="size-[22px]" aria-hidden />, href: "/book-online?type=general" },
  { type: "general", title: "Travel health", tag: "General", price: 60, dur: "30 min", icon: <Globe className="size-[22px]" aria-hidden />, href: "/book-online?type=general" },
  { type: "general", title: "Weight loss", tag: "General", price: 80, dur: "45 min", icon: <Heart className="size-[22px]" aria-hidden />, href: "/book-online?type=general" },
  { type: "specialist", title: "Cardiology", tag: "Specialist", price: 120, dur: "45 min", icon: <Heart className="size-[22px]" aria-hidden />, href: "/book-online?type=specialist" },
  { type: "specialist", title: "Dermatology", tag: "Specialist", price: 95, dur: "30 min", icon: <Shield className="size-[22px]" aria-hidden />, href: "/book-online?type=specialist" },
  { type: "specialist", title: "Mental health", tag: "Specialist", price: 110, dur: "50 min", icon: <User className="size-[22px]" aria-hidden />, href: "/book-online?type=specialist" },
  { type: "prescription", title: "Repeat prescription", tag: "Prescription", price: 25, dur: "15 min", icon: <Package className="size-[22px]" aria-hidden />, href: "/online-prescription" },
  { type: "prescription", title: "Contraceptive review", tag: "Prescription", price: 35, dur: "20 min", icon: <Package className="size-[22px]" aria-hidden />, href: "/online-prescription" },
  { type: "test", title: "Full blood panel", tag: "Home test", price: 65, dur: "Sent home", icon: <CheckCircle2 className="size-[22px]" aria-hidden />, href: "/home-health-tests" },
  { type: "test", title: "Thyroid panel", tag: "Home test", price: 55, dur: "Sent home", icon: <CheckCircle2 className="size-[22px]" aria-hidden />, href: "/home-health-tests" },
  { type: "test", title: "STI panel · confidential", tag: "Home test", price: 80, dur: "Sent home", icon: <CheckCircle2 className="size-[22px]" aria-hidden />, href: "/home-health-tests" },
  { type: "specialist", title: "Pediatrics", tag: "Specialist", price: 90, dur: "30 min", icon: <User className="size-[22px]" aria-hidden />, href: "/book-online?type=specialist" },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "general", label: "General" },
  { id: "specialist", label: "Specialist" },
  { id: "prescription", label: "Prescriptions" },
  { id: "test", label: "Home tests" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function ServiceCatalog() {
  const [filter, setFilter] = useState<FilterId>("all");
  const shown =
    filter === "all" ? SERVICES : SERVICES.filter((s) => s.type === filter);

  return (
    <section style={{ padding: "96px 0 64px" }}>
      <div
        className="mx-auto"
        style={{
          maxWidth: 1320,
          padding: "0 clamp(20px, 4vw, 40px)",
        }}
      >
        {/* Header */}
        <div
          className="flex flex-wrap items-end justify-between gap-6"
          style={{ marginBottom: 36 }}
        >
          <div>
            <span
              className="uppercase"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "var(--color-brand-primary)",
              }}
            >
              What we treat
            </span>
            <h2
              className="text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                margin: "12px 0 0",
                maxWidth: "16ch",
              }}
            >
              Browse {SERVICES.length} services.
            </h2>
          </div>
          <p
            className="m-0 text-[var(--color-text-muted)]"
            style={{ maxWidth: "32ch", fontSize: 16 }}
          >
            Every service is delivered by doctors registered in your country,
            billed in your currency, in your language.
          </p>
        </div>

        {/* Filter pills */}
        <div
          className="flex flex-wrap gap-2"
          style={{
            padding: "16px 0",
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
            marginBottom: 24,
          }}
        >
          {FILTERS.map((f) => {
            const count =
              f.id === "all"
                ? SERVICES.length
                : SERVICES.filter((s) => s.type === f.id).length;
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className="inline-flex items-center gap-2 transition-all duration-150"
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border:
                    "1px solid " +
                    (isActive
                      ? "var(--color-brand-primary)"
                      : "var(--color-border)"),
                  background: isActive
                    ? "var(--color-brand-primary)"
                    : "var(--color-background-page)",
                  color: isActive ? "#fff" : "var(--color-text-body)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {f.label}
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    background: isActive
                      ? "rgba(255,255,255,0.20)"
                      : "var(--color-background-soft)",
                    color: isActive ? "#fff" : "var(--color-text-muted)",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 999,
                    minWidth: 20,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Card grid */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {shown.map((s) => (
            <ServiceTile key={s.title} service={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceTile({ service: s }: { service: Service }) {
  const stripeBg =
    s.type === "test"
      ? "linear-gradient(135deg, #C8E6A0 0%, #A4D177 100%)"
      : s.type === "specialist"
        ? "linear-gradient(135deg, var(--color-brand-primary) 0%, #143B30 100%)"
        : s.type === "prescription"
          ? "linear-gradient(135deg, #2D3B36 0%, #0F2E25 100%)"
          : "linear-gradient(135deg, #1B4D3E 0%, #2D6A5A 100%)";
  const stripeFg = s.type === "test" ? "var(--color-background-dark)" : "#fff";
  const tileBg =
    s.type === "test" ? "rgba(20,59,48,0.10)" : "rgba(255,255,255,0.14)";

  return (
    <Link
      href={s.href}
      className="gh-service-tile relative block overflow-hidden text-left"
      style={{
        background: "var(--color-background-page)",
        border: "1px solid var(--color-border)",
        borderRadius: 20,
        fontFamily: "inherit",
        boxShadow: "var(--shadow-soft)",
        textDecoration: "none",
        transition: "all 180ms ease-out",
      }}
    >
      {/* Top stripe with icon + tag */}
      <div
        className="flex items-start justify-between overflow-hidden"
        style={{
          height: 90,
          background: stripeBg,
          color: stripeFg,
          padding: 16,
        }}
      >
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: tileBg,
          }}
        >
          {s.icon}
        </span>
        <span
          className="uppercase"
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background:
              s.type === "test" ? "rgba(20,59,48,0.12)" : "rgba(255,255,255,0.16)",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
          }}
        >
          {s.tag}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 22px 22px" }}>
        <h3
          className="text-[var(--color-text-primary)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            margin: "0 0 14px",
          }}
        >
          {s.title}
        </h3>
        <div
          className="grid grid-cols-2 gap-1"
          style={{
            paddingTop: 14,
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <div>
            <p
              className="m-0 uppercase"
              style={{
                fontSize: 10,
                color: "var(--color-text-muted)",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              From
            </p>
            <p
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              €{s.price}
            </p>
          </div>
          <div className="text-right">
            <p
              className="m-0 uppercase"
              style={{
                fontSize: 10,
                color: "var(--color-text-muted)",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              {s.type === "test" ? "Turnaround" : "Time"}
            </p>
            <p
              className="m-0 text-[var(--color-text-body)]"
              style={{ fontSize: 13, fontWeight: 700 }}
            >
              {s.dur}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .gh-service-tile:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-card-hover);
        }
      `}</style>
    </Link>
  );
}
