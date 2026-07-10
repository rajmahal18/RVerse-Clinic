# DigitalOcean Deployment Handoff for ChatGPT

## Copy/paste prompt for ChatGPT

You are taking over deployment of a Next.js clinic workflow prototype to DigitalOcean. Work with me interactively and do not assume any cloud resources already exist. Inspect the repository before changing it, preserve existing features, and explain every DigitalOcean setting I must choose in the control panel.

The immediate goal is a public **client-review/staging environment**, not production healthcare deployment. It is meant for clients to validate workflows and identify improvements. Use dummy data only. Do not import real patient or medical data until security, privacy, backups, authorization scopes, retention, and Philippine Data Privacy Act requirements have been reviewed.

Use this architecture:

- DigitalOcean App Platform for the Next.js web service.
- DigitalOcean Managed PostgreSQL attached to the app. Do not use Neon.
- A PRE_DEPLOY App Platform job that runs committed Prisma migrations before each release.
- One small web instance initially. Scale only after measurements show a need.
- App and database in the same DigitalOcean region. Prefer the nearest region appropriate for the client audience and available account resources.
- DigitalOcean-provided HTTPS URL first; custom domain can follow after acceptance testing.

Before deploying, perform a read-only deployment audit, show me the findings, then make only the changes required for a safe staging deployment. Verify a local production build before asking me to create cloud resources.

## Current repository state

- Stack: Next.js App Router, React, TypeScript, Tailwind, Prisma 5, PostgreSQL.
- Local PostgreSQL runs through `docker-compose.yml` on port `5433`.
- Prisma schema: `prisma/schema.prisma`.
- Committed migration history directory: `prisma/migrations/`.
- Authentication uses an HTTP-only signed cookie.
- `AUTH_SECRET` currently falls back to `DATABASE_URL`; staging must set an independent strong secret.
- Current roles are category labels only: Admin, Doctor / Nurse, Supply Officer, Records. Role permission enforcement is intentionally not implemented yet.
- The UI has patient records, visits, item requests, inventory batches/expiry monitoring, vaccine catalog, activity logs, accounts, and settings.
- The current local database contains generated dummy patients and a test admin.
- `scripts/import-patients.mjs` is not idempotent and will duplicate patients when run twice.
- `scripts/upsert-admin.mjs` is idempotent but currently contains hardcoded staging-test credentials. Refactor it to read secure environment variables before any public deployment.
- There is currently no Dockerfile and no `.do/app.yaml`; App Platform buildpacks are preferred for this staging deployment.
- Current working tree contains uncommitted application and migration changes. They must be reviewed, committed, and pushed before App Platform deploys from GitHub.

## Required repository preparation

1. Review `git status` and all diffs. Do not discard existing work.
2. Run:

   ```bash
   npm ci
   npm run prisma:generate
   npm run build
   ```

3. Add these package scripts if they do not exist:

   ```json
   "prisma:deploy": "prisma migrate deploy",
   "seed:admin": "node scripts/upsert-admin.mjs"
   ```

4. Add an `engines.node` version supported by the current DigitalOcean Node buildpack. Keep it compatible with Next.js 15 and the lockfile.
5. Add `AUTH_SECRET` and staging admin variable names to `.env.example`, without real secrets.
6. Refactor `scripts/upsert-admin.mjs` to require:

   ```text
   SEED_ADMIN_EMAIL
   SEED_ADMIN_PASSWORD
   SEED_ADMIN_NAME
   ```

   It must fail clearly when these are missing. Never log the password.
7. Do not run the 3,000-patient importer automatically during every deployment.
8. Create `.do/app.yaml` only after confirming the GitHub repository and branch with me. Do not invent repository identifiers.
9. Commit and push the reviewed code and every Prisma migration before creating the App Platform app.

## DigitalOcean resources

### Managed PostgreSQL

- Create or attach a DigitalOcean Managed PostgreSQL database, preferably PostgreSQL 16 to match local Docker.
- Keep it in the same region as App Platform.
- Attach the App Platform app as a trusted source.
- Use the database bindable variable rather than copying credentials into source code.
- Set app-level `DATABASE_URL` to the attached database URL, preferably its private URL when supported by the selected setup.
- Enable backups/maintenance appropriate to the selected managed plan.
- Do not expose the database to all public IP addresses.
- If temporary laptop access is required, add only the current trusted IP and remove it afterward.

DigitalOcean documents attached databases and bindable URLs here:

- https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/
- https://docs.digitalocean.com/products/app-platform/reference/app-spec/

### App Platform web service

Configure:

```text
Type: Web Service
Source: the confirmed GitHub repository and branch
Source directory: /
Build command: npm run prisma:generate && npm run build
Run command: npm run start
HTTP port: 8080 or the port App Platform injects through PORT
Instance count: 1
Health route: /login
Deploy on push: enable only after the first controlled deployment succeeds
```

Confirm that Next.js binds to `0.0.0.0` and respects DigitalOcean's `PORT`. Adjust the start script only if testing proves necessary.

App Platform build/run and environment-variable references:

- https://docs.digitalocean.com/products/app-platform/how-to/build-run-commands/
- https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/

### PRE_DEPLOY migration job

Create a deployment job using the same repository and branch:

```text
Kind: PRE_DEPLOY
Run command: npm run prisma:deploy
Environment: DATABASE_URL available at runtime
```

The deployment must stop if migrations fail. Never use `prisma migrate dev`, `prisma db push`, or destructive reset commands in DigitalOcean.

DigitalOcean deployment-job reference:

- https://docs.digitalocean.com/products/app-platform/how-to/manage-jobs/

## Required environment variables

Configure these in App Platform. Encrypt all secrets.

```text
DATABASE_URL=${<confirmed-database-component>.DATABASE_URL}
AUTH_SECRET=<at least 32 cryptographically random bytes; independent of DATABASE_URL>
NEXT_PUBLIC_APP_NAME=The Clinic
NEXT_PUBLIC_APP_MODE=staging
NODE_ENV=production
SEED_ADMIN_EMAIL=<staging admin email; only needed by the manual seed job>
SEED_ADMIN_PASSWORD=<strong unique temporary password; only needed by the manual seed job>
SEED_ADMIN_NAME=<display name; only needed by the manual seed job>
```

Do not expose `DATABASE_URL`, `AUTH_SECRET`, or the admin password as `NEXT_PUBLIC_*` variables. Do not paste secret values into commits, screenshots, deployment logs, or chat responses.

## One-time database initialization

After the first successful migration deployment:

1. Use the App Platform console or a one-off job to run `npm run seed:admin` with encrypted seed variables.
2. Confirm the admin can log in.
3. Remove the seed password variable after use if practical, or rotate it immediately.
4. Decide with me whether the client-review database should start empty or receive the dummy patient dataset.
5. If importing dummy patients, run `npm run import:patients` exactly once and verify counts before and after.
6. Never copy the local Docker database volume to DigitalOcean.

## Acceptance checklist

Verify from the public HTTPS URL:

- `/login` renders with CSS and images.
- Unauthenticated access redirects to `/login`.
- Admin login works and logout invalidates the cookie.
- Dashboard loads without server errors.
- Patient creation/edit and measurements/BMI work.
- Visit creation, service selection, chief complaints, and completion work.
- Medicine request creates exactly one queue row per request.
- Item-request notification badge matches pending count.
- Approving a request deducts the exact inventory batch atomically.
- Request history records Approved/Rejected and resolution time.
- Inventory batches with different expiry dates remain separate.
- Expiry filters, sorting, row actions, and stock additions work.
- Vaccine defaults/custom catalog and HPV dose work.
- Activity logs record important mutations.
- Mobile pages do not horizontally scroll except intentional navigation tabs.
- App redeployment does not duplicate seed data.

## Staging safety boundaries

- This is not yet production-ready for real health information.
- Role names exist, but per-role authorization scopes are not implemented.
- No password-reset/email-verification flow is documented.
- No rate limiting, MFA, formal audit retention, privacy consent, breach workflow, or production security review has been completed.
- Do not invite clients to enter real names, diagnoses, contact numbers, or other personal/medical data. Label the site `STAGING — DUMMY DATA ONLY` until these gaps are addressed.
- Consider adding a visible staging banner and robots exclusion before sharing the URL.

## Rollback and recovery

- Use App Platform deployment rollback for application regressions.
- Treat applied Prisma migrations as forward-only. Do not roll back the app to code that cannot understand the migrated schema.
- Before risky schema changes, verify managed-database backup availability and recovery procedure.
- Export or snapshot staging data before destructive testing.
- If deployment fails, capture web-service logs, PRE_DEPLOY job logs, and the failed migration name before changing anything.

## Cost/credit guidance

- Start with one small shared App Platform instance and the smallest appropriate DigitalOcean PostgreSQL option.
- Do not enable autoscaling, multiple app instances, dedicated CPUs, extra workers, or log-forwarding products for this review environment unless measurements justify them.
- Managed PostgreSQL is preferred because the database is explicitly required to live in DigitalOcean and should not depend on the app container filesystem.
- Review the current DigitalOcean pricing screen before confirmation; do not rely on hardcoded prices in this handoff.
- Set DigitalOcean billing alerts and a reminder before promotional credits expire.

## Definition of done

The handoff is complete only when:

1. reviewed code and migrations are committed and pushed;
2. App Platform and DigitalOcean PostgreSQL are connected through encrypted environment variables;
3. PRE_DEPLOY migrations succeed;
4. one staging admin exists without a hardcoded repository password;
5. the public HTTPS acceptance checklist passes;
6. dummy-data-only limitations are communicated to every reviewer;
7. rollback, backup, cost alerts, and resource ownership are documented.
