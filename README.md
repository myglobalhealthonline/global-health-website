# Global Health Platform

A scalable, health care platform that provides seamless online medical consultations, appointment scheduling, and secure patient–doctor interactions.

---

## Overview

The Global Health Platform connects patients with healthcare professionals worldwide through a fast, secure, and user-friendly web application.

It enables users to book consultations, manage appointments, and receive care remotely while ensuring high performance, scalability, and data security.

---

## Features

- Online consultation booking
- Real-time appointment management
- Secure authentication system
- Responsive and accessible UI
- Robust form validation
- Scalable backend architecture
- Clean and maintainable codebase

---

## Tech Stack

### Frontend

**Core Framework & UI**
- Next.js 16 (App Router, Server Components)
- React 19
- TypeScript

**Styling & Components**
- Tailwind CSS 4
- Radix UI / shadcn

**Forms & Validation**
- React Hook Form
- Zod

**UX Enhancements**
- Sonner (toasts)
- Lucide (icons)

---

### Backend

**Runtime & Infrastructure**
- Node.js 20.19
- Docker

**Database & ORM**
- PostgreSQL
- Prisma 7

**Authentication & Security**
- JWT (jose)
- bcryptjs

---

### Shared / Full-Stack

- TypeScript
- Zod (shared schemas)
- Next.js (API routes + Server Actions)
- pnpm

---

## Architecture

- Full-stack architecture using Next.js
- Server Actions and API routes handle backend logic
- Prisma ORM manages database operations
- Shared validation using Zod
- Docker for containerized deployment

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL
- Docker (optional)

---

### Installation

```bash
git clone <your-repo-url>
cd global-health-platform
pnpm install
