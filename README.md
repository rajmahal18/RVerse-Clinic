# Clinic System Layout Prototype

Modern layout-first clinic records and inventory system. Built as a self-hostable web app that can run as a website or LAN/intranet application.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL via Docker Compose
- PWA-ready structure: manifest, app shell, responsive layouts, offline-friendly navigation design

## Current scope

This repository is intentionally layout-focused. It uses dummy data and implements only lightweight inferred UI behavior such as tabs, page routing, static patient lists, request types, patient chart sections, medicine request tables, and inventory views.

No production auth, database writes, audit logging, or medical workflow validation is implemented yet.

## Getting started

```bash
cp .env.example .env
npm install
npm run db:up
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000`.

## Database

The Prisma schema is included so future app logic can be added cleanly. The layout currently reads from static data, not PostgreSQL.

```bash
npm run prisma:migrate
npm run prisma:studio
```

## Pages

- `/` Dashboard
- `/patients` Patient Records
- `/patients/oting-jasnia-daud` Patient profile and chart
- `/todays-patients` Today's Patient queue
- `/follow-ups` Follow-up cases
- `/vaccination` Vaccination queue
- `/emergency-cases` Medical emergency cases
- `/inventory` Medical inventory
- `/reports` Reports
- `/settings` Settings

## Deployment modes

Same codebase can be deployed as:

- Cloud website: managed PostgreSQL + object storage
- LAN/intranet: local mini PC/server + Docker PostgreSQL + local storage/MinIO later
