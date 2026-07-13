"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { readClientLocale } from "@/lib/i18n/get-client-locale";
import {
  ACCEPT_ALL,
  CONSENT_OPEN_EVENT,
  DENY_ALL,
  purgeLegacyConsent,
  readConsent,
  writeConsent,
  type ConsentChoices,
} from "./cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [choices, setChoices] = useState<ConsentChoices>(DENY_ALL);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  // Only steal focus when the visitor *asked* for the panel (footer link).
  // Grabbing it on first page load would be hostile.
  const focusOnOpen = useRef(false);

  useEffect(() => {
    purgeLegacyConsent();
    setLocale(readClientLocale());
    if (!readConsent()) setVisible(true);

    function onOpen() {
      const existing = readConsent();
      setLocale(readClientLocale());
      setChoices(
        existing
          ? { marketing: existing.marketing, thirdParty: existing.thirdParty }
          : DENY_ALL,
      );
      focusOnOpen.current = true;
      setExpanded(true);
      setVisible(true);
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (visible && focusOnOpen.current) {
      focusOnOpen.current = false;
      headingRef.current?.focus();
    }
  }, [visible]);

  const decide = useCallback((next: ConsentChoices) => {
    writeConsent(next);
    setVisible(false);
    setExpanded(false);
  }, []);

  if (!visible) return null;

  const t = getCommonLocale(locale).cookie;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="gh-cookie-title"
      className="gh-cookie-bar"
    >
      <h2 id="gh-cookie-title" ref={headingRef} tabIndex={-1} className="gh-cookie-title">
        {t.title}
      </h2>
      <p className="gh-cookie-body">
        {t.body}{" "}
        <Link href="/privacy" className="gh-cookie-link">
          {t.privacyNotice}
        </Link>{" "}
        {t.forDetails}
      </p>

      {expanded ? (
        <div className="gh-cookie-categories">
          <div className="gh-cookie-row">
            <div>
              <p className="gh-cookie-row-title">{t.necessaryTitle}</p>
              <p className="gh-cookie-row-body">{t.necessaryBody}</p>
            </div>
            <span className="gh-cookie-always">{t.alwaysOn}</span>
          </div>

          <CategoryRow
            title={t.marketingTitle}
            body={t.marketingBody}
            checked={choices.marketing}
            onChange={(v) => setChoices((c) => ({ ...c, marketing: v }))}
          />
          <CategoryRow
            title={t.thirdPartyTitle}
            body={t.thirdPartyBody}
            checked={choices.thirdParty}
            onChange={(v) => setChoices((c) => ({ ...c, thirdParty: v }))}
          />
        </div>
      ) : null}

      <div className="gh-cookie-actions">
        {expanded ? (
          <button
            type="button"
            onClick={() => decide(choices)}
            className="gh-btn gh-cookie-btn-ghost"
          >
            {t.save}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="gh-btn gh-cookie-btn-ghost"
          >
            {t.manage}
          </button>
        )}
        <button
          type="button"
          onClick={() => decide(DENY_ALL)}
          className="gh-btn gh-cookie-btn-ghost"
        >
          {t.deny}
        </button>
        <button
          type="button"
          onClick={() => decide(ACCEPT_ALL)}
          className="gh-btn gh-btn-accent"
        >
          {t.acceptAll}
        </button>
      </div>
    </div>
  );
}

function CategoryRow({
  title,
  body,
  checked,
  onChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="gh-cookie-row">
      <div>
        <p className="gh-cookie-row-title">{title}</p>
        <p className="gh-cookie-row-body">{body}</p>
      </div>
      <input
        type="checkbox"
        role="switch"
        aria-label={title}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="gh-cookie-toggle"
      />
    </div>
  );
}
