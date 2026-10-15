# OCM VM deployment

This is a deployment procedure, not evidence of production acceptance. No cloud
provider is required. Development Docker Compose remains development-only.

## Confirm with OCM IT first

- Supported Linux distribution, approved Node.js release, npm path, PostgreSQL
  version (development uses 16), available CPU/RAM/disk, and expected concurrency.
- Dedicated service account, installation paths, administrator access, maintenance
  window, and whether PostgreSQL is local or an existing private database service.
- Final HTTPS hostname, certificate issuer/renewal, network/VPN access, reverse
  proxy, firewall, and whether the VM may download npm packages and build assets.
- Backup destination, encryption, separate/offline copy, retention, recovery point
  and recovery time targets, monitoring recipients, and restoration authority.
- DPO/security acceptance, privacy assessment, retention, account approval, and
  incident response. A successful build does not establish security compliance.

## Prerequisites and installation

Use an OCM-approved Node.js version compatible with this locked project. Node
24.13.1 was used for local checks; confirm the approved version in staging.
Install PostgreSQL client tools matching the server major version and GNU
find/coreutils for the Linux backup script. No Dockerfile is needed for this path.

IT creates the unprivileged `ocm-clinic` user/group, `/var/lib/ocm-clinic`, and a
release directory under `/opt/ocm-clinic/releases/`. The example service expects
`/opt/ocm-clinic/current` to point to the approved release. Adapt these paths and
`/usr/bin/npm` to the actual VM. Keep release source and secrets administrator-owned;
the service needs read access and write access only to `.next` and its home.

Clone the private GitHub repository using an approved read-only deploy key or
short-lived credential. Never put credentials in a repository URL, command
history, or logs. Check out the reviewed commit, then run `npm ci` inside the
release directory. This includes Prisma generation through postinstall. Keep
build tools/Prisma CLI installed until build and controlled migrations finish.

## Environment and database

Create a private, untracked `.env` in the release directory using `.env.example`.
Restrict it to administrators and the service account (for example root owner,
ocm-clinic group, mode 0640). Restrict parent directories too. Do not copy secret
values to tickets, Git, or shell command arguments. `next start` loads `.env`.

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` (set by systemd) |
| `DATABASE_URL` | Private PostgreSQL URL with unique application credentials |
| `DIRECT_URL` | Direct database URL for Prisma; same URL if no pooler |
| `AUTH_SECRET` | Independent cryptographically random secret, at least 32 characters; generate at least 32 random bytes using an approved secret tool |
| `AUTH_COOKIE_SECURE` | `true`, or omit; production always sets secure cookies and rejects false |
| `TRUST_PROXY_HEADERS` | `false` unless the boundary below is enforced |
| `APP_BASE_URL` | Final HTTPS origin before printing QR labels |
| `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_MODE` | Existing optional display settings; never store secrets here |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | Manual bootstrap only; password must have at least 16 non-padding characters |

Production configuration is checked when Next.js loads its configuration for a
production build or server startup. Missing/invalid URLs, missing/short/placeholder/reused auth secrets,
and insecure cookie configuration stop startup. Local HTTP development retains
its existing fallback behavior. Generate high-entropy secrets; length validation
alone cannot prove randomness. Preserve the same secret across restarts; rotating
it signs out existing sessions.

IT provisions the database and restricted roles. Restrict PostgreSQL to loopback
or private application hosts; never publish a production database port to all
interfaces. Use verified database TLS for remote connections per IT policy. Give
schema migration privileges only to the controlled migration operator where
feasible; the application should have only required runtime permissions. Do not
copy the development Compose password/port mapping into production.

## Build, migrations, bootstrap

Run in the prepared release directory:

```sh
npm run prisma:generate
npm run typecheck
npm run check:production
npm run build
```

Build currently uses `next/font/google`: downloading fonts may require outbound
access. For restricted environments, build a Linux artifact on an approved,
compatible build host, including the matching Prisma engine and dependencies;
do not copy Windows `node_modules`. Runtime does not need the Google font service.

Before migration, verify a successful independent backup and a restore test on a
separate database. Rehearse pending migrations against a restored staging copy;
review old/new application compatibility and confirm maintenance approval. With
the intended migration environment explicitly loaded:

```sh
npm run prisma:deploy
```

This is an explicit operator action, never part of application startup. Prisma
loads `.env`; if using separate migration credentials, IT must inject them through
its protected environment mechanism. Never use `prisma:migrate` (development),
reset, or `db push` in production. Never delete database volumes.

For a genuinely new installation only, provide bootstrap values privately and run
`npm run seed:admin` once. Existing accounts are rejected without password reset,
promotion, reactivation, or clinic reassignment. Remove bootstrap variables after
use. Existing deployments retain accounts and do not need this step. Do not run
patient importers or sample-data generators as deployment steps.
If an earlier installation used the former test bootstrap password, rotate that
account through approved account administration before accepting real data;
this patch does not inspect or modify existing accounts.

## Service, HTTPS, and recovery

Install the reviewed `deploy/ocm-clinic.service` as
`/etc/systemd/system/ocm-clinic.service`. Ensure the active release `.next` and
`/var/lib/ocm-clinic` exist with service write permissions. Then:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now ocm-clinic
sudo systemctl status ocm-clinic
sudo systemctl restart ocm-clinic
sudo journalctl -u ocm-clinic -n 100 --no-pager
```

The process binds only to 127.0.0.1:3000 and restarts on failure. Inspect startup
errors, configuration, permissions, disk, and database availability before
restarting repeatedly. Do not log environment files or share raw logs containing
sensitive information. Configure journal retention and restricted access.

IT terminates HTTPS at its approved proxy. Preserve the external `Host`; overwrite
`X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-For`, and `X-Real-IP` using
trusted connection metadata, not arbitrary client values. Do not append an
untrusted incoming forwarded-for chain: the existing limiter uses its first IP.
Enable `TRUST_PROXY_HEADERS=true` only after this boundary and blocked direct
access are verified. With false, account-based throttling remains but IP-based
throttling is unavailable. Validate CSRF/Server Actions behind the actual proxy.
If proxy runs on another host, adapt the binding/firewall to allow only that proxy.
Do not cache authenticated pages, API data, or form responses at the proxy.

`/api/health/live` returns app liveness without querying PostgreSQL.
`/api/health/ready` runs only `SELECT 1`, returns 200 or generic 503, and has a
three-second response deadline. The deadline does not cancel an in-flight driver
query: configure database connection/pool timeouts and conservative polling.
No error details are returned. IT should restrict these paths to monitoring
sources at the proxy; neither endpoint replaces a migration/schema smoke test.

## Backups and restoration

Windows: `npm run backup` or invoke `scripts/backup-postgres.ps1` with `-OutputDir`
and `-Keep`. It removes Prisma-only URL options before calling PostgreSQL tools,
keeps 14 completed dumps by default, rejects failed/empty output, and prunes only
after success. Tool diagnostics are suppressed to avoid credential leakage.

Linux: schedule `sh scripts/backup-postgres.sh` using an IT-controlled timer/cron
job. Supply `PGDATABASE`, optional `PGHOST`/`PGPORT`/`PGUSER` or `PGSERVICE`, and a
mode-0600 `PGPASSFILE` through a restricted environment/service config. A libpq URL
must not contain Prisma-only `schema`, `connection_limit`, or `pool_timeout`
options. Set `BACKUP_DIR` and optionally `BACKUP_KEEP` (default 14 completed dumps).
Use one scheduled writer per destination; alert on any nonzero exit and stale
backups. Both scripts preserve prior dumps on generation failure. An exit-success,
nonempty dump is not proof of restorability: perform restore drills.

Keep encrypted copies on separate storage/offline media with restricted access.
Same-disk backups and VM snapshots alone are insufficient. IT owns scheduling,
failure alerts, retention approval, and periodic restore evidence.

Restore to an empty, separate test database provisioned by IT. Configure libpq
environment/pgpass privately for that test database, then:

```sh
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$PGDATABASE" /approved/path/backup.dump
```

Use a database name/service instead of a credential-bearing URI in this command.
Confirm `PGDATABASE` targets the separate test database first. Compare application
behavior and authorized record counts without exporting patient information.
Production restoration requires explicit downtime/recovery approval and a plan
for writes after the backup. This task does not execute backups or restores.

## Updates and rollback

Fetch approved commits from private GitHub into a new release directory using
read-only credentials. Do not edit or reset the running checkout. Repeat install,
build, security checks, staging rehearsal, and backup verification. Apply only
reviewed pending migrations during the agreed window; switch `current` to the
new release and restart. Verify locally and through HTTPS. Keep the previous
artifact and its compatible dependencies/environment for rollback.

An application rollback does not reverse migrations. Switch back only when the
old code is compatible with the current schema; otherwise use an approved
forward fix. Restoring an old database loses later writes and requires separate
authorization. Do not automatically restore a database on deployment failure.

## Staging acceptance and ownership

- Verify invalid config stops the actual Linux service; HTTPS cookies, login,
  logout, CSRF, approved/denied role actions, and trusted IP throttling work.
- Exercise patient/visit/lab workflows, dispensing and exact stock deductions,
  reports, printing, QR links, and mobile layouts using synthetic data.
- Verify live/ready responses, database-outage behavior, process/reboot recovery,
  persistence across releases, representative concurrent load, and alert delivery.
- Test backup failure, independent restore, migration rehearsal, and compatible
  rollback. Record results and approved release before production review.

Developer owns application changes, release instructions, and application defect
resolution. OCM IT owns VM/OS/runtime operation, database provisioning, firewall,
TLS renewal, secrets delivery, backup jobs/storage, monitoring, and recovery.
Clinic management approves workflows/roles; DPO/security officers determine
privacy/security acceptance. Agree named contacts and escalation ownership before
turnover. Infrastructure, VAPT/privacy approvals, and actual VM staging acceptance
remain external requirements, not completed by this local patch.
