# Production readiness patch review

Date: October 15, 2026. Classification: **READY FOR STAGING**.

Local changes only. No deployment, push, database migration, real backup/restore,
account mutation, or patient-record access was performed.

## Changed files

| File | Purpose |
| --- | --- |
| `.env.example` | Document direct database URL, production requirements, proxy boundary, and empty bootstrap variables. |
| `.gitignore` | Exclude environment variants, backups, dumps, and partial dumps; retain the sanitized example. |
| `next.config.ts` | Validate production configuration before build/server startup. |
| `src/lib/security-config.ts` | Centralize production secret checks and secure-cookie enforcement; preserve local HTTP development. |
| `src/lib/auth.ts` | Use the shared secret provider for Node sessions. |
| `src/lib/auth-edge.ts` | Use the same secret provider for middleware sessions. |
| `src/lib/csrf.ts` | Honor the explicit trust setting before using forwarded origin headers. |
| `scripts/upsert-admin.mjs` | Require private bootstrap inputs, reject existing accounts without modifying them, and suppress raw database errors. |
| `scripts/backup-postgres.ps1` | Detect failed/empty dumps, publish only successful output, retain older dumps on failure, remove Prisma-only URL options, and avoid credentials in arguments. |
| `scripts/backup-postgres.sh` | Provide a Linux-native backup procedure using protected libpq settings and success-only retention. |
| `src/app/api/health/live/route.ts` | Add non-sensitive application liveness. |
| `src/app/api/health/ready/route.ts` | Add database connectivity readiness with generic failure output and response deadline. |
| `deploy/ocm-clinic.service` | Provide a restricted, automatically restarted systemd service binding to loopback. |
| `package.json` | Add explicit production migration, manual bootstrap, and focused regression commands; no dependency changes. |
| `scripts/check-production.cjs` | Verify config, Node/Edge sessions, proxy/CSRF behavior, health responses, and bootstrap using mock database operations. |
| `scripts/check-startup.cjs` | Verify actual built-server rejection of missing secrets, liveness/login responses, and secure CSRF cookie without querying a database. |
| `scripts/check-backup.ps1` | Exercise Windows backup failures, empty output, retention, success, and environment restoration using mock pg_dump. |
| `scripts/check-backup.sh` | Exercise Linux backup failures, empty output, retention, and success using mock pg_dump. |
| `docs/ocm-deployment.md` | Document Linux installation, private database setup, migrations, service/proxy operation, recovery, GitHub updates, and responsibilities. |
| `docs/backup-recovery.md` | Clarify backup failure handling and safe separate-database restoration. |
| `README.md` | Link the current deployment guide and flag obsolete prototype scope statements. |
| `docs/production-readiness-review.md` | Record this file inventory, evidence, and remaining acceptance requirements. |

## Confirmed issues resolved

- Production authentication previously allowed database/development-secret
  fallbacks and insecure cookie configuration. Invalid production config now
  stops startup, and valid production sessions always use secure cookies.
- Bootstrap previously used hardcoded credentials and overwrote existing users.
  It now requires supplied inputs and refuses to overwrite existing accounts.
- CSRF origin fallback previously trusted forwarded headers unconditionally.
  Forwarded headers now require explicit proxy trust; token handling is retained.
- Windows backup previously lacked native exit-code checks and could report
  success/prune old backups after generation failure. Failure/empty output now
  leaves completed backups intact. Linux has a matching native backup path.
- Dedicated health endpoints and a reproducible conventional VM service path
  were absent. Both are now supplied without changing development Compose.

## Verification

| Status | Check and scope |
| --- | --- |
| PASS | `npm run typecheck`. |
| PASS | `npm run build`, using generated synthetic auth settings and an unused loopback database URL; no real database connection was needed. |
| PASS | `npm run check:production`: configuration validation, development compatibility, Node/Edge token verification, explicit CSRF proxy boundary, generic health responses, and mocked bootstrap safety. |
| PASS | `node scripts/check-startup.cjs`: actual built server exits on missing production secret; valid config serves liveness/login and sets a secure CSRF cookie. |
| PASS | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-backup.ps1`, with mock pg_dump only. |
| PASS | Shell syntax and `sh scripts/check-backup.sh`, using Git Bash on Windows and mock pg_dump only. |
| PASS | `git diff --check`; ignore checks for secrets/backups; scoped source diff review. |
| NOT RUN | Linux systemd service execution, actual OCM proxy/HTTPS/network checks: no infrastructure access authorized. |
| NOT RUN | Real migrations, bootstrap, backup, restore, or patient workflows: prohibited against actual data in this task. |
| NOT RUN | VAPT, load testing, and full clinical UAT: require an approved isolated staging environment. |

The initial instrumentation-only startup check did not terminate the server
process reliably. The final implementation validates in Next.js configuration;
the actual missing-secret exit check then passed. Final checks above describe
the resulting implementation, not the discarded approach.

## Remaining requirements

- **Scoped code issues:** no known unresolved blocker in this patch. This is not
  a repository-wide security audit. The readiness deadline does not cancel a
  driver query; configure connection/pool timeouts and conservative monitoring.
- **OCM IT:** confirm OS/runtime versions, paths, service permissions, private DB
  provisioning/TLS, final origin, certificate renewal, trusted proxy boundary,
  backup scheduling/storage/alerts, retention, and recovery targets.
- **Security/privacy:** obtain DPO/security assessment and required approvals,
  approved access/retention policies, incident response, and VAPT acceptance.
  Rotate any account that used earlier test credentials through approved account
  administration; existing accounts were not inspected or altered here.
- **Staging/production validation:** run clinical/role/CSRF/proxy tests with
  synthetic data, actual Linux restart/reboot checks, representative load tests,
  migration rehearsal, independent restore, and compatible rollback rehearsal.
  Approve the measured results before production review.

## Final diff review

No unrelated UI/component, workflow, route-permission, schema/migration, existing
database record, or development Compose changes were made. Existing application
routes are preserved; only health routes were added. No packages or cloud
dependencies were added. No actual credentials were introduced into the patch;
test fixtures use synthetic values, and secret/backup files are ignored. Nothing
was committed, pushed, or deployed.
