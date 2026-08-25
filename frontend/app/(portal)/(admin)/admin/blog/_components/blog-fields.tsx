import { ADMIN_BLOG_LOCALES, type AdminBlogDto } from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../_components/managed-image-field";
import { FormSection } from "@/components/FormSection";
import { HtmlBodyFieldLazy as HtmlBodyField } from "./html-body-field-lazy";

type Props = {
  post?: AdminBlogDto | null;
  isCreate?: boolean;
  /** When false, the per-language fields (title, slug, excerpt, body, SEO)
   *  are omitted because the caller renders them inside the language tabs —
   *  the edit screen keeps every language in one place, the original
   *  included. The create screen has no tabs yet, so it keeps them here. */
  languageFields?: boolean;
  /** Doctors selectable as the article's named author / clinical reviewer.
   *  Linking a doctor emits the Article author/reviewedBy Physician schema. */
  doctors?: Array<{ id: string; fullName: string }>;
  /** Services selectable as the article's bottom CTA target. */
  services?: Array<{ id: string; name: string }>;
};

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-portal-body text-[var(--color-text-primary)]";

const labelClass = "block text-portal-meta font-semibold text-[var(--color-text-muted)]";

export function BlogFields({ post, isCreate, doctors = [], services = [], languageFields = true }: Props) {
  return (
    <div className="gh-admin-blog-fields flex flex-col gap-5">
      <FormSection
        title="Article"
        description={
          languageFields
            ? "Title, URL slug and the short summary shown on cards."
            : "Details that stay the same in every language."
        }
      >
          {languageFields ? (
            <>
              <label className={labelClass}>
                Title
                <input
                  name="title"
                  required
                  maxLength={240}
                  defaultValue={post?.title ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Slug
                <input
                  name="slug"
                  required
                  maxLength={160}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  title="Lowercase letters, numbers and hyphens only"
                  placeholder="my-article-title"
                  defaultValue={post?.slug ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                Excerpt
                <textarea
                  name="excerpt"
                  rows={2}
                  maxLength={600}
                  defaultValue={post?.excerpt ?? ""}
                  placeholder="One or two sentences shown on the blog index card."
                  className={inputClass}
                />
              </label>
            </>
          ) : null}
          <label className={labelClass}>
            Category
            <input
              name="category"
              maxLength={80}
              placeholder="Telemedicine"
              defaultValue={post?.category ?? ""}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Author
            <input
              name="authorDisplayName"
              maxLength={160}
              placeholder="The Global Health Medical Team"
              defaultValue={post?.authorDisplayName ?? ""}
              className={inputClass}
            />
          </label>
        </FormSection>

      <FormSection
        title="Clinical attribution"
        description="Link a registered doctor as the named author / clinical reviewer. Drives the Article author/reviewedBy Physician schema (E-E-A-T)."
      >
          <label className={labelClass}>
            Author doctor
            <select name="authorDoctorId" defaultValue={post?.authorDoctorId ?? ""} className={inputClass}>
              <option value="">— None —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Reviewer doctor
            <select name="reviewerDoctorId" defaultValue={post?.reviewerDoctorId ?? ""} className={inputClass}>
              <option value="">— None —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            CTA service
            <select name="ctaServiceId" defaultValue={post?.ctaServiceId ?? ""} className={inputClass}>
              <option value="">None (country gate)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-portal-meta font-normal text-[var(--color-text-muted)]">
              Bottom &quot;Book a consultation&quot; CTA links to this service&apos;s booking page.
            </span>
          </label>
        </FormSection>

      <FormSection
        title="Cover image"
        description="Shown as the thumbnail on the blog card and at the top of the article."
      >
          <ManagedImageField
            name="coverImagePath"
            label="Cover image"
            helperText="Optional. 1200×630 recommended."
            initialPath={post?.coverAsset?.path ?? null}
            hint="1200×630 recommended · JPEG, PNG, WebP, GIF, AVIF · max 5 MB"
          />
          <label className={labelClass}>
            Image alt text
            <input
              name="coverImageAlt"
              maxLength={300}
              placeholder="Describe the image for accessibility/SEO"
              defaultValue={post?.coverAsset?.altText ?? ""}
              className={inputClass}
            />
          </label>
        </FormSection>

      {languageFields ? (
        <>
          <FormSection
            title="Body (HTML)"
            description="Upload an .html file or paste article HTML. Sanitized on save."
          >
            <HtmlBodyField name="body" initialValue={post?.body ?? ""} />
          </FormSection>

          <FormSection title="SEO" description="Optional — falls back to title/excerpt.">
            <label className={labelClass}>
              SEO title
              <input
                name="seoTitle"
                maxLength={180}
                defaultValue={post?.seoTitle ?? ""}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              SEO description
              <input
                name="seoDescription"
                maxLength={320}
                defaultValue={post?.seoDescription ?? ""}
                className={inputClass}
              />
            </label>
          </FormSection>
        </>
      ) : null}

      <FormSection
        title="Publish"
        description="Drafts stay hidden from the public blog."
      >
          <label className={labelClass}>
            Status
            <select name="status" defaultValue={post?.status ?? "DRAFT"} className={inputClass}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </label>
          <label className={labelClass}>
            Language
            <select name="locale" defaultValue={post?.locale ?? "EN"} className={inputClass}>
              {ADMIN_BLOG_LOCALES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-6 flex items-center gap-2 text-portal-compact font-semibold text-[var(--color-text-primary)]">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={isCreate ? true : (post?.isActive ?? true)}
              className="size-4 rounded border-[var(--color-border)]"
            />
            Active
          </label>
      </FormSection>
    </div>
  );
}
