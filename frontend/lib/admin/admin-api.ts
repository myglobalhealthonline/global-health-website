// Barrel re-export — this file used to hold every admin domain (~2600 lines).
// It is now split into cohesive modules under ./admin-api/*. Every existing
// `@/lib/admin/admin-api` import keeps working unchanged via these re-exports.
export * from "./admin-api/core";
export * from "./admin-api/countries";
export * from "./admin-api/appointments";
export * from "./admin-api/notifications";
export * from "./admin-api/doctors";
export * from "./admin-api/services";
export * from "./admin-api/automation";
export * from "./admin-api/audit";
export * from "./admin-api/users";
export * from "./admin-api/patients";
export * from "./admin-api/patients-merge";
export * from "./admin-api/health-tests";
export * from "./admin-api/test-centers";
export * from "./admin-api/assets";
export * from "./admin-api/page-content";
export * from "./admin-api/blog";
