"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function JobShareActions({ url, title, copyLabel, copiedLabel, shareLabel }: {
  url: string; title: string; copyLabel: string; copiedLabel: string; shareLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) return navigator.share({ title, url }).catch(() => undefined);
    return copy();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return <div className="gh-careers-share">
    <button type="button" onClick={copy}>{copied ? <Check aria-hidden /> : <Copy aria-hidden />}{copied ? copiedLabel : copyLabel}</button>
    <button type="button" onClick={share}><Share2 aria-hidden />{shareLabel}</button>
    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={`LinkedIn: ${shareLabel}`}>in</a>
    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={`Facebook: ${shareLabel}`}>f</a>
    <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" aria-label={`X: ${shareLabel}`}>X</a>
  </div>;
}
