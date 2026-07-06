import { apiRequest } from "./client";

export type AdminServiceFaqTranslation = {
  locale: string;
  question: string;
  answer: string;
};

export type AdminServiceFaqDto = {
  id: string;
  serviceId: string;
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  translations?: AdminServiceFaqTranslation[];
};

/**
 * Browser-side FAQ mutations for the admin service detail panel. Hits
 * same-origin Next route handlers that forward the session cookie to the
 * backend — mirrors chat-api.ts and the other /api/admin/* proxies.
 */
export async function createAdminServiceFaq(
  serviceId: string,
  body: {
    question: string;
    answer: string;
    isVisible?: boolean;
    translations?: AdminServiceFaqTranslation[];
  },
) {
  return apiRequest<{ faq: AdminServiceFaqDto }>(
    `/api/admin/services/${encodeURIComponent(serviceId)}/faqs`,
    {
      method: "POST",
      body,
      credentials: "include",
      sameOrigin: true,
    },
  );
}

export async function updateAdminServiceFaq(
  serviceId: string,
  faqId: string,
  body: {
    question?: string;
    answer?: string;
    sortOrder?: number;
    isVisible?: boolean;
    translations?: AdminServiceFaqTranslation[];
  },
) {
  return apiRequest<{ faq: AdminServiceFaqDto }>(
    `/api/admin/services/${encodeURIComponent(serviceId)}/faqs/${encodeURIComponent(faqId)}`,
    {
      method: "PATCH",
      body,
      credentials: "include",
      sameOrigin: true,
    },
  );
}

export async function deleteAdminServiceFaq(serviceId: string, faqId: string) {
  return apiRequest<Record<string, never>>(
    `/api/admin/services/${encodeURIComponent(serviceId)}/faqs/${encodeURIComponent(faqId)}`,
    {
      method: "DELETE",
      credentials: "include",
      sameOrigin: true,
    },
  );
}

export async function reorderAdminServiceFaqs(serviceId: string, orderedIds: string[]) {
  return apiRequest<{ faqs: AdminServiceFaqDto[] }>(
    `/api/admin/services/${encodeURIComponent(serviceId)}/faqs/reorder`,
    {
      method: "PATCH",
      body: { orderedIds },
      credentials: "include",
      sameOrigin: true,
    },
  );
}
