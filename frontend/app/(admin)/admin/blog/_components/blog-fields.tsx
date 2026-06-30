import { ADMIN_BLOG_LOCALES, type AdminBlogDto } from "@/lib/admin/admin-api";
import { AdminCard, SectionHeader } from "../../_components/atoms";
import { ManagedImageField } from "../../_components/managed-image-field";
import { HtmlBodyField } from "./html-body-field";

type Props = {
  post?: AdminBlogDto | null;
  isCreate?: boolean;
  /** Doctors selectable as the article's named author / clinical reviewer.
   *  Linking a doctor emits the Article author/reviewedBy Physician schema. */
  doctors?: Array<{ id: string; fullName: string }>;
};

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]";

const labelClass = "block text-[12px] font-semibold text-[var(--color-text-muted)]";

export function BlogFields({ post, isCreate, doctors = [] }: Props) {
  return (
    <div className="gh-admin-blog-fields">
      <AdminCard padding={0}>
        <SectionHeader
          title="Article"
          description="Title, URL slug and the short summary shown on cards."
        />
        <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--two p-5">
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
              placeholder="Global Health Editorial Team"
              defaultValue={post?.authorDisplayName ?? ""}
              className={inputClass}
            />
          </label>
        </div>
      </AdminCard>

      <AdminCard padding={0}>
        <SectionHeader
          title="Clinical attribution"
          description="Link a registered doctor as the named author / clinical reviewer. Drives the Article author/reviewedBy Physician schema (E-E-A-T)."
        />
        <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--two p-5">
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
        </div>
      </AdminCard>

      <AdminCard padding={0}>
        <SectionHeader
          title="Cover image"
          description="Shown as the thumbnail on the blog card and at the top of the article."
        />
        <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--two p-5">
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
        </div>
      </AdminCard>

      <AdminCard padding={0}>
        <SectionHeader
          title="Body (HTML)"
          description="Upload an .html file or paste article HTML. Sanitized on save."
        />
        <div className="p-5">
          <HtmlBodyField name="body" initialValue={post?.body ?? ""} />
        </div>
      </AdminCard>

      <AdminCard padding={0}>
        <SectionHeader title="SEO" description="Optional — falls back to title/excerpt." />
        <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--two p-5">
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
        </div>
      </AdminCard>

      <AdminCard padding={0}>
        <SectionHeader title="Publish" description="Drafts stay hidden from the public blog." />
        <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--three p-5">
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
          <label className="mt-6 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-primary)]">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={isCreate ? true : (post?.isActive ?? true)}
              className="size-4 rounded border-[var(--color-border)]"
            />
            Active
          </label>
        </div>
      </AdminCard>
    </div>
  );
}
