# Admin Phase Plan

## Phase 1

Implemented in this phase:
- read-only public content APIs
  - `GET /api/countries`
  - `GET /api/services`
  - `GET /api/doctors`
  - `GET /api/pricing`
  - `GET /api/assets`
- booking request submission API
  - `POST /api/appointments`
- Zod validation for booking/contact/shared field rules
- Prisma-backed service modules
- safe `503` responses when database access is unavailable

## Explicitly Deferred

- admin dashboard UI
- CRUD interfaces for countries, services, doctors, pricing, assets
- patient dashboard
- doctor dashboard
- email notifications
- payment workflows
- appointment confirmation workflow
- availability calendar
- audit logs
- role-based admin auth

## Recommended Phase 2

1. add admin auth and role model
2. add content-management CRUD APIs
3. add appointment-review queue for staff
4. add email/event workflow for request follow-up
5. add asset-management workflow with approval states
