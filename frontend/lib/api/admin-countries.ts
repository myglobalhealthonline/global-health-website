import "server-only";

import type { Paginated } from "@gh/shared";
import type {
  CountryCreateInput,
  CountryDTO,
  CountryListQuery,
  CountryUpdateInput,
} from "@gh/shared/schemas/countries";
import { adminApi, type AdminApiResult } from "./admin-client";

const BASE = "/api/v1/admin/countries";

export async function listAdminCountries(
  query: Partial<CountryListQuery> = {},
): Promise<AdminApiResult<Paginated<CountryDTO>>> {
  return adminApi<Paginated<CountryDTO>>(BASE, { query });
}

export async function getAdminCountry(id: string): Promise<AdminApiResult<CountryDTO>> {
  return adminApi<CountryDTO>(`${BASE}/${encodeURIComponent(id)}`);
}

export async function createAdminCountry(
  input: CountryCreateInput,
): Promise<AdminApiResult<CountryDTO>> {
  return adminApi<CountryDTO>(BASE, { method: "POST", body: input });
}

export async function updateAdminCountry(
  id: string,
  input: CountryUpdateInput,
): Promise<AdminApiResult<CountryDTO>> {
  return adminApi<CountryDTO>(`${BASE}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deactivateAdminCountry(
  id: string,
): Promise<AdminApiResult<CountryDTO>> {
  return adminApi<CountryDTO>(`${BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
