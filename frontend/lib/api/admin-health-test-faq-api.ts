import { apiRequest } from "./client";

export type AdminHealthTestFaqTranslation = {
  locale: string;
  question: string;
  answer: string;
};

export type AdminHealthTestFaqDto = {
  id: string;
  healthTestId: string;
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  translations?: AdminHealthTestFaqTranslation[];
};

export async function createAdminHealthTestFaq(
  healthTestId: string,
  body: {
    question: string;
    answer: string;
    isVisible?: boolean;
    translations?: AdminHealthTestFaqTranslation[];
  },
) {
  return apiRequest<{ faq: AdminHealthTestFaqDto }>(
    `/api/admin/health-tests/${encodeURIComponent(healthTestId)}/faqs`,
    {
      method: "POST",
      body,
      credentials: "include",
      sameOrigin: true,
    },
  );
}

export async function updateAdminHealthTestFaq(
  healthTestId: string,
  faqId: string,
  body: {
    question?: string;
    answer?: string;
    sortOrder?: number;
    isVisible?: boolean;
    translations?: AdminHealthTestFaqTranslation[];
  },
) {
  return apiRequest<{ faq: AdminHealthTestFaqDto }>(
    `/api/admin/health-tests/${encodeURIComponent(healthTestId)}/faqs/${encodeURIComponent(faqId)}`,
    {
      method: "PATCH",
      body,
      credentials: "include",
      sameOrigin: true,
    },
  );
}

export async function deleteAdminHealthTestFaq(healthTestId: string, faqId: string) {
  return apiRequest<Record<string, never>>(
    `/api/admin/health-tests/${encodeURIComponent(healthTestId)}/faqs/${encodeURIComponent(faqId)}`,
    {
      method: "DELETE",
      credentials: "include",
      sameOrigin: true,
    },
  );
}

export async function reorderAdminHealthTestFaqs(healthTestId: string, orderedIds: string[]) {
  return apiRequest<{ faqs: AdminHealthTestFaqDto[] }>(
    `/api/admin/health-tests/${encodeURIComponent(healthTestId)}/faqs/reorder`,
    {
      method: "PATCH",
      body: { orderedIds },
      credentials: "include",
      sameOrigin: true,
    },
  );
}
