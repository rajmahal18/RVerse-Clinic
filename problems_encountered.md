# Problems Encountered

This file tracks recurring setup/build/database issues for faster debugging.

## 1. Prisma migrate dev asks to reset the database

### Error

```text
Drift detected: Your database schema is not in sync with your migration history.

? We need to reset the "public" schema at "localhost:5433"
Do you want to continue? All data will be lost. » (y/N)
```

### Meaning

The database already has the expected tables, but Prisma does not see matching records in `_prisma_migrations`.

This can happen when the DB was created manually, with `db push`, imported from backup, or initialized before migration history was tracked.

### Do Not Do

Do not answer `y`.

That will reset the `public` schema and delete existing data.

### Safe Fix Used

Mark the existing baseline migrations as already applied, then deploy the pending migration:

```powershell
npx prisma migrate resolve --applied 20260513_init
npx prisma migrate resolve --applied 20260514_workflow_foundation
npx prisma migrate deploy
```

Then:

```powershell
npx prisma generate
npm run build
```

### Notes

Use `npx prisma migrate status` first when unsure.

Use `npx prisma migrate deploy` for this existing DB, not `npx prisma migrate dev`, unless the DB is disposable.

## 2. Build fails with EPERM on `.next\trace`

### Error

```text
uncaughtException [Error: EPERM: operation not permitted, open '...\clinic-system-layout\.next\trace']
code: 'EPERM'
syscall: 'open'
path: '...\clinic-system-layout\.next\trace'
```

### Likely Cause

The `.next` folder or `.next\trace` file is locked by another running Next.js dev/build process, antivirus indexing, or a previous Node process.

### First Checks

Check running Node/Next processes:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match 'node|next' } |
  Select-Object ProcessId, Name, CommandLine |
  Format-List
```

Check the dev server logs:

```powershell
Get-Content -Tail 40 .\clinic-dev.out
Get-Content -Tail 40 .\clinic-dev.err
```

### Safe Fix

Stop the running Next.js dev server or Node process that is using this project, then run:

```powershell
npm run build
```

If `.next` remains locked after stopping the server, close terminals/editors that may be watching the folder, then retry.

Only delete `.next` after confirming no dev/build process is using it.

## 3. Build fails because PostgreSQL is unreachable

### Error

```text
Can't reach database server at `localhost:5433`
Please make sure your database server is running at `localhost:5433`.
```

### Meaning

Next.js prerender is loading pages that query Prisma, but PostgreSQL is not running or not reachable using `DATABASE_URL`.

### Fix

Start the local PostgreSQL service/container, then verify:

```powershell
npx prisma migrate status
```

Then run:

```powershell
npm run build
```

## 4. Docker command cannot connect to Docker Desktop

### Error

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

### Meaning

Docker Desktop is not running, or the Linux engine is unavailable.

### Fix

Start Docker Desktop first, then retry:

```powershell
docker ps
```

## 5. Next dev server does not accept `--host`

### Error

```text
error: unknown option '--host'
(Did you mean --port?)
```

### Fix

Use:

```powershell
npm run dev -- --port 3000
```

Do not use `--host` with this installed Next.js version.

## 6. Activity logs migration added

### Migration

```text
20260709_activity_logs
```

### Files

```text
prisma/schema.prisma
prisma/migrations/20260709_activity_logs/migration.sql
src/lib/activity-log.ts
src/lib/activity-log-view.ts
src/app/activity-logs/page.tsx
```

### Verification

Run after applying migrations:

```powershell
npx prisma generate
npm run typecheck
npm run build
```
