"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { buildBlogShareLinks } from "@/lib/content/blog-share-links";

type BlogShareLinksProps = {
  articleUrl: string;
  title: string;
  labels: {
    kicker: string;
    title: string;
    shareOn: string;
    copyLink: string;
    copySuccess: string;
    copyFailure: string;
    instagramCopied: string;
    shareComplete: string;
  };
};

type ShareAnchorProps = {
  href: string;
  label: string;
  shareOnLabel: string;
  children: ReactNode;
};

function ShareAnchor({ href, label, shareOnLabel, children }: ShareAnchorProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="gh-blog-share-action"
      aria-label={shareOnLabel.replace("{network}", label)}
    >
      {children}
      <span>{label}</span>
    </a>
  );
}

async function copyArticleUrl(articleUrl: string) {
  await navigator.clipboard.writeText(articleUrl);
}

export function BlogShareLinks({ articleUrl, title, labels }: BlogShareLinksProps) {
  const links = buildBlogShareLinks({ articleUrl, title });
  const [notice, setNotice] = useState("");

  const copyLink = async (forInstagram = false) => {
    try {
      await copyArticleUrl(articleUrl);
      setNotice(forInstagram ? labels.instagramCopied : labels.copySuccess);
    } catch {
      setNotice(labels.copyFailure);
    }
  };

  const shareToInstagram = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: articleUrl });
        setNotice(labels.shareComplete);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink(true);
  };

  return (
    <section className="gh-blog-calm-share" aria-labelledby="share-this-article">
      <div className="gh-blog-calm-share-inner">
        <div>
          <p className="gh-blog-calm-share-kicker">{labels.kicker}</p>
          <h2 id="share-this-article">{labels.title}</h2>
        </div>
        <div className="gh-blog-calm-share-actions">
          <ShareAnchor href={links.facebook} label="Facebook" shareOnLabel={labels.shareOn}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M13.7 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5H17V3.6c-.8-.1-1.6-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.2v2.3H7.8V13h2.7v8h3.2Z" /></svg>
          </ShareAnchor>
          <ShareAnchor href={links.whatsapp} label="WhatsApp" shareOnLabel={labels.shareOn}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M12.1 3a8.8 8.8 0 0 0-7.6 13.2L3.3 21l4.9-1.3A8.8 8.8 0 1 0 12.1 3Zm5.1 12.4c-.2.7-1.2 1.4-1.9 1.5-.5.1-1.1.2-3.5-.8-2.9-1.2-4.8-4.2-4.9-4.4-.1-.2-1.2-1.6-1.2-3.1 0-1.5.8-2.3 1.1-2.6.3-.3.7-.4 1-.4h.7c.2 0 .5-.1.7.5l1 2.4c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.3.8 1.3 1.8 2.1 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.3.7-.2l2.1 1c.3.1.5.2.6.3.1.2.1.6-.1.9Z" /></svg>
          </ShareAnchor>
          <ShareAnchor href={links.x} label="X" shareOnLabel={labels.shareOn}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M18.2 3h3.1l-6.8 7.8L22.5 21h-6.3l-4.9-6.4L5.7 21H2.6l7.2-8.3L2.1 3h6.4l4.4 5.8L18.2 3Zm-1.1 16.2h1.7L7.5 4.7H5.7l11.4 14.5Z" /></svg>
          </ShareAnchor>
          <ShareAnchor href={links.linkedin} label="LinkedIn" shareOnLabel={labels.shareOn}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M6.5 8.4H3.2V21h3.3V8.4ZM4.9 3A1.9 1.9 0 1 0 5 6.8 1.9 1.9 0 0 0 4.9 3ZM21 13.8c0-3.8-2-5.6-4.7-5.6-2.2 0-3.1 1.2-3.7 2V8.4H9.3V21h3.3v-7c0-1.8.4-3.6 2.7-3.6 2.3 0 2.4 2.1 2.4 3.8V21H21v-7.2Z" /></svg>
          </ShareAnchor>
          <button type="button" className="gh-blog-share-action" onClick={shareToInstagram}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M7.3 2.8h9.4a4.5 4.5 0 0 1 4.5 4.5v9.4a4.5 4.5 0 0 1-4.5 4.5H7.3a4.5 4.5 0 0 1-4.5-4.5V7.3a4.5 4.5 0 0 1 4.5-4.5Zm0 1.8a2.7 2.7 0 0 0-2.7 2.7v9.4a2.7 2.7 0 0 0 2.7 2.7h9.4a2.7 2.7 0 0 0 2.7-2.7V7.3a2.7 2.7 0 0 0-2.7-2.7H7.3Zm10 1.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 1.8a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" />
            </svg>
            <span>Instagram</span>
          </button>
          <button type="button" className="gh-blog-share-action" onClick={() => copyLink()}>
            {notice === labels.copySuccess ? <Check aria-hidden /> : <Copy aria-hidden />}
            <span>{labels.copyLink}</span>
          </button>
        </div>
        <p className="gh-blog-calm-share-notice" aria-live="polite">{notice}</p>
      </div>
    </section>
  );
}
