-- Adds the audit-action enum value used when admins save a per-country
-- footer at /admin/footer. The prior migration created the CountryFooter
-- table; this one wires the audit log so writes get recorded.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COUNTRY_FOOTER_UPDATED';
