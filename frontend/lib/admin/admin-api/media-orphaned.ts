import { adminRequest } from "./core";

export type OrphanedMediaDto = {
  key: string;
  size: number;
  lastModified: string | null;
  publicUrl: string;
};

type OrphanedMediaPayload = {
  orphaned: OrphanedMediaDto[];
  total: number;
  unmatched: number;
};

/** Post-incident recovery tool — bucket objects (image files) that survived
 *  the 2026-07-05 Service-table wipe but lost their DB link. Lets an admin
 *  eyeball each one and re-attach it to a service. */
export async function fetchOrphanedMedia() {
  return adminRequest<OrphanedMediaPayload>("/api/admin/media/orphaned");
}
