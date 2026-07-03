import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { countryLegalCacheTag } from "@/lib/content/get-country-legal";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  adminUploadFile,
  fetchAdminCountryById,
  fetchAdminCountryLegalDocuments,
  putAdminCountryLegalDocument,
  deleteAdminCountryLegalDocument,
  type LegalDocumentType,
} from "@/lib/admin/admin-api";
import {
  AdminCard,
  AdminTable,
  Btn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
} from "../../../_components/atoms";
import { FlagBadge } from "../../../_components/flag-badge";
import { DocumentRow } from "@/components/DocumentRow";

export const dynamic = "force-dynamic";

const DOCUMENT_TYPE_LABELS: Record<LegalDocumentType, string> = {
  TERMS_OF_SERVICE: "Terms of Service",
  PRIVACY_POLICY: "Privacy Policy",
  COOKIE_POLICY: "Cookie Policy",
  GDPR_NOTICE: "GDPR Notice",
  DATA_PROCESSING_AGREEMENT: "Data Processing Agreement",
  REFUND_POLICY: "Refund Policy",
  MEDICAL_DISCLAIMER: "Medical Disclaimer",
  ACCESSIBILITY_STATEMENT: "Accessibility Statement",
};

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as LegalDocumentType[];

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; edit?: string }>;
};

export default async function CountryLegalDocumentsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const editType = sp.edit ?? null;

  const [countryRes, docsRes] = await Promise.all([
    fetchAdminCountryById(id),
    fetchAdminCountryLegalDocuments(id),
  ]);

  if (!countryRes.ok) {
    return (
      <>
        <PageHeader eyebrow="Country" title="Legal documents" />
        <AdminCard>
          <p className="text-sm text-[var(--color-status-error-text)]">
            {countryRes.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const c = countryRes.data.country;
  const docs = docsRes.ok ? docsRes.data.documents : [];
  const docsByType = Object.fromEntries(docs.map((d) => [`${d.type}__${d.locale}`, d]));
  const editDoc = editType ? docsByType[`${editType}__en`] ?? null : null;

  async function saveDocumentAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const type = formData.get("type") as string;
    const title = (formData.get("title") as string)?.trim();
    const content = (formData.get("content") as string)?.trim() || null;
    const isPublished = formData.get("isPublished") === "on";
    const existingPdfPath = (formData.get("existingPdfPath") as string) || null;

    if (!type || !title) {
      redirect(`/admin/countries/${id}/legal-documents?error=Title+required`);
    }

    let pdfPath = existingPdfPath;
    const pdfFile = formData.get("pdfFile") as File | null;
    if (pdfFile && pdfFile.size > 0) {
      const upload = await adminUploadFile(pdfFile);
      if (!upload.ok) {
        redirect(`/admin/countries/${id}/legal-documents?error=${encodeURIComponent(`PDF upload failed: ${upload.message}`)}`);
      }
      pdfPath = upload.data.key;
    }

    const result = await putAdminCountryLegalDocument(id, {
      type,
      title,
      content,
      pdfPath,
      isPublished,
      locale: "en",
    });

    if (!result.ok) {
      redirect(`/admin/countries/${id}/legal-documents?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(`/admin/countries/${id}/legal-documents`);
    revalidateTag(countryLegalCacheTag(c.code), "max");
    redirect(`/admin/countries/${id}/legal-documents?success=${encodeURIComponent(`${DOCUMENT_TYPE_LABELS[type as LegalDocumentType] ?? type} saved`)}`);
  }

  async function deleteDocumentAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const docId = formData.get("docId") as string;
    if (!docId) redirect(`/admin/countries/${id}/legal-documents?error=Missing+doc+id`);
    const result = await deleteAdminCountryLegalDocument(id, docId);
    if (!result.ok) {
      redirect(`/admin/countries/${id}/legal-documents?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(`/admin/countries/${id}/legal-documents`);
    revalidateTag(countryLegalCacheTag(c.code), "max");
    redirect(`/admin/countries/${id}/legal-documents?success=Document+deleted`);
  }

  return (
    <>
      <Link
        href={`/admin/countries/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" />
        Back to {c.name}
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={c.code} size={14} />
            {c.name}
          </span>
        }
        title="Legal documents"
        description="Per-country legal pages: ToS, Privacy Policy, Cookie Policy, GDPR notice, etc."
        actions={
          <Btn href={`/admin/countries/${id}/legal`} variant="soft" size="md">
            ← Legal profile
          </Btn>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      {/* Document list */}
      <AdminCard padding={0} className="gh-admin-country-legal-docs overflow-hidden">
        <div className="gh-admin-country-table-wrap overflow-x-auto">
        <AdminTable>
          <Thead>
            <Th>Document type</Th>
            <Th>Title</Th>
            <Th>Status</Th>
            <Th>Version</Th>
            <Th align="right">Actions</Th>
          </Thead>
          <tbody>
            {DOCUMENT_TYPES.map((type) => {
              const doc = docsByType[`${type}__en`];
              return (
                <Tr key={type}>
                  <Td style={{ minWidth: 220 }}>
                    <DocumentRow
                      icon={<FileText className="size-4" aria-hidden />}
                      title={DOCUMENT_TYPE_LABELS[type]}
                    />
                  </Td>
                  <Td>
                    {doc ? (
                      <span className="text-[13px] text-[var(--color-text-body)]">{doc.title}</span>
                    ) : (
                      <span className="text-[12px] text-[var(--color-text-muted)]">Not created</span>
                    )}
                  </Td>
                  <Td>
                    {doc ? (
                      <Pill tone={doc.isPublished ? "published" : "draft"}>
                        {doc.isPublished ? "Published" : "Draft"}
                      </Pill>
                    ) : (
                      <Pill tone="inactive">—</Pill>
                    )}
                  </Td>
                  <Td>
                    <span className="text-[12px] text-[var(--color-text-muted)]">
                      {doc ? `v${doc.version}` : "—"}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/countries/${id}/legal-documents?edit=${type}`}
                        className="gh-btn gh-btn-soft text-[12px]"
                      >
                        {doc ? "Edit" : <><Plus className="size-3 inline" /> Create</>}
                      </Link>
                      {doc ? (
                        <form action={deleteDocumentAction} className="inline">
                          <input type="hidden" name="docId" value={doc.id} />
                          <button
                            type="submit"
                            className="gh-btn gh-btn-danger flex items-center gap-1 text-[12px]"
                            aria-label={`Delete ${DOCUMENT_TYPE_LABELS[type]}`}
                          >
                            <Trash2 className="size-3" aria-hidden />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </AdminTable>
        </div>
      </AdminCard>

      {/* Edit / create form */}
      {editType ? (
        <AdminCard className="gh-admin-country-editor mt-4">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            {editDoc ? "Edit" : "Create"}: {DOCUMENT_TYPE_LABELS[editType as LegalDocumentType] ?? editType}
          </h3>
          <form action={saveDocumentAction} className="gh-admin-country-editor-form mt-4 grid gap-4" encType="multipart/form-data">
            <input type="hidden" name="type" value={editType} />
            <input type="hidden" name="existingPdfPath" value={editDoc?.pdfPath ?? ""} />
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Title</span>
              <input
                type="text"
                name="title"
                defaultValue={editDoc?.title ?? DOCUMENT_TYPE_LABELS[editType as LegalDocumentType] ?? ""}
                className="gh-input"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Content (HTML)</span>
              <textarea
                name="content"
                rows={20}
                defaultValue={editDoc?.content ?? ""}
                className="gh-input resize-y font-mono text-[12px]"
                placeholder="<p>Legal document content…</p>"
              />
              <p className="m-0 text-[11px] text-[var(--color-text-muted)]">
                Provide content here or attach a PDF below — at least one is required.
              </p>
            </label>
            <div className="flex flex-col gap-1">
              <span className="gh-field-label">PDF attachment (optional, max 10 MB)</span>
              {editDoc?.pdfPath ? (
                <div className="mb-1 flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
                  <FileText className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate font-mono">{editDoc.pdfPath}</span>
                  <a
                    href={`/api/media/${editDoc.pdfPath.split("/").map(encodeURIComponent).join("/")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 inline-flex items-center gap-0.5 hover:underline"
                    aria-label="Open current PDF"
                  >
                    <ExternalLink className="size-3" aria-hidden /> View
                  </a>
                </div>
              ) : null}
              <input
                type="file"
                name="pdfFile"
                accept="application/pdf"
                className="text-[13px] text-[var(--color-text-body)]"
              />
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Leave empty to keep the existing PDF. Uploading a new file replaces it.
              </p>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={editDoc?.isPublished ?? false}
                className="size-4"
              />
              <span className="text-[13px] text-[var(--color-text-body)]">Published</span>
            </label>
            <div className="gh-admin-country-actions flex items-center gap-3">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save document
              </button>
              <Link
                href={`/admin/countries/${id}/legal-documents`}
                className="gh-btn gh-btn-soft"
              >
                Cancel
              </Link>
            </div>
          </form>
        </AdminCard>
      ) : null}
    </>
  );
}
