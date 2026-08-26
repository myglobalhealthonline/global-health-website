import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Calendar, Clock, RefreshCw, User } from "lucide-react";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";

type CalmEditorialArticleHeroProps = {
  backHref: string;
  backLabel: string;
  category: string;
  title: string;
  excerpt: string;
  authorName: string;
  authorHref: string | null;
  publishedLabel: string;
  readingTimeLabel: string;
  reviewerName: string | null;
  reviewerHref: string | null;
  reviewedByLabel: string;
  lastReviewedLabel: string | null;
  coverImageSrc: string | null;
  coverImageAlt: string;
};

/** Quiet, reading-first hero used by the one-article calm-editorial pilot. */
export function CalmEditorialArticleHero({
  backHref,
  backLabel,
  category,
  title,
  excerpt,
  authorName,
  authorHref,
  publishedLabel,
  readingTimeLabel,
  reviewerName,
  reviewerHref,
  reviewedByLabel,
  lastReviewedLabel,
  coverImageSrc,
  coverImageAlt,
}: CalmEditorialArticleHeroProps) {
  return (
    <header className="gh-blog-calm-hero">
      <div className="gh-blog-calm-hero-inner">
        <Link href={backHref} className="gh-blog-calm-back">
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel}
        </Link>

        <p className="gh-blog-calm-category">{category}</p>
        <h1>{title}</h1>
        {excerpt ? <p className="gh-blog-calm-dek">{excerpt}</p> : null}

        <div className="gh-blog-calm-byline" aria-label="Article details">
          <span>
            <User className="size-4" aria-hidden />
            {authorHref ? <Link href={authorHref}>{authorName}</Link> : authorName}
          </span>
          <span>
            <Calendar className="size-4" aria-hidden />
            {publishedLabel}
          </span>
          <span>
            <Clock className="size-4" aria-hidden />
            {readingTimeLabel}
          </span>
          {lastReviewedLabel ? (
            <span>
              <RefreshCw className="size-4" aria-hidden />
              {lastReviewedLabel}
            </span>
          ) : null}
        </div>

        {reviewerName ? (
          <p className="gh-blog-calm-reviewer">
            <BadgeCheck className="size-[18px]" aria-hidden />
            {reviewedByLabel}{" "}
            {reviewerHref ? <Link href={reviewerHref}>{reviewerName}</Link> : reviewerName}
          </p>
        ) : null}

        {coverImageSrc ? (
          <figure className="gh-blog-calm-cover">
            <div className="gh-blog-calm-cover-frame">
              <Image
                src={coverImageSrc}
                alt={coverImageAlt}
                fill
                priority
                sizes="(min-width: 1024px) 960px, 100vw"
                className="object-contain"
                unoptimized={isUnoptimizedImageSrc(coverImageSrc)}
              />
            </div>
          </figure>
        ) : null}
      </div>
    </header>
  );
}
