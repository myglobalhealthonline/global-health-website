"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { SiteNavigationData } from "@/data/navigation";

type FooterColumnProps = {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
};

const socialLinks = [
  { icon: Globe, label: "Website", href: "#" },
  { icon: MessageCircle, label: "Community", href: "#" },
  { icon: Send, label: "Updates", href: "#" },
];

function isRealLogo(src?: string): boolean {
  if (!src) return false;
  if (src.includes("temp") || src.includes("placeholder")) return false;
  return true;
}

export default function FooterColumn({
  siteName,
  navigation,
  brandLogo,
}: FooterColumnProps) {
  const hasRealLogo = isRealLogo(brandLogo?.src);

  const contactInfo = [
    { icon: Mail, text: navigation.siteContactEmail },
    { icon: Phone, text: "+353 1 000 0000" },
    { icon: MapPin, text: "Ireland, Portugal, Spain, Czechia, Romania" },
  ];

  return (
    <footer className="mt-16 w-full bg-[var(--color-brand-primary)]">
      <div className="mx-auto max-w-[var(--container-width)] px-4 pb-7 pt-14 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              {hasRealLogo ? (
                <Image
                  src={brandLogo!.src}
                  alt={brandLogo!.alt}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full border border-white/20 bg-white object-cover"
                />
              ) : (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                  <ShieldCheck className="size-5" aria-hidden />
                </span>
              )}
              <span className="text-2xl font-semibold text-white">
                {siteName}
              </span>
            </div>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70 sm:max-w-xs">
              Online clinic services with licensed doctors and secure consultations
              across Europe.
            </p>

            <ul className="mt-8 flex gap-5">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-white/70 transition hover:text-white"
                  >
                    <span className="sr-only">{label}</span>
                    <Icon className="size-5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:col-span-2">
            {navigation.footerColumns.map((column) => (
              <div className="text-left" key={column.heading}>
                <p className="text-base font-semibold text-white">
                  {column.heading}
                </p>
                <ul className="mt-5 space-y-3 text-sm">
                  {column.links.map((item) => (
                    <li key={item.label + item.href}>
                      <Link
                        className="text-white/70 transition hover:text-white"
                        href={item.href}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="text-left">
              <p className="text-base font-semibold text-white">
                Contact
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                {contactInfo.map(({ icon: Icon, text }) => (
                  <li className="flex items-start gap-2" key={text}>
                    <Icon className="mt-0.5 size-4 shrink-0 text-white/70" />
                    <span className="text-white/70">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/20 pt-5 text-sm sm:flex sm:items-center sm:justify-between">
          <p className="text-white/70">
            <span className="block sm:inline">All rights reserved.</span>
          </p>
          <p className="mt-2 text-white/70 sm:mt-0">
            &copy; {new Date().getFullYear()} {siteName}
          </p>
        </div>
      </div>
    </footer>
  );
}
