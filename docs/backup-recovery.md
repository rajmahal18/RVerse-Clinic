# LAN Backup and Recovery

For the production Linux procedure, protected credentials, service operation,
and recovery limitations, use [OCM VM deployment](ocm-deployment.md).

## Backup Schedule

Run a PostgreSQL backup at least once per clinic day. Keep one copy on the clinic server and one copy on external or offline storage.

```powershell
npm run backup
```

Backups are written to `backups/` as timestamped `.dump` files. The script keeps the latest 14 completed backups by default. Failed or empty dumps do not prune existing backups or report success. Check the process exit status and alert on failure; test restorability separately.

## Requirements

- PostgreSQL client tools installed on the server.
- `pg_dump` available in `PATH`.
- `.env` contains the active `DATABASE_URL`.
- Backup storage location is confirmed by the clinic.

## Restore Drill

Test restore before turnover and after major deployment changes. Use a separate test database first.

```powershell
pg_restore --exit-on-error --no-owner --no-privileges --dbname "<EMPTY_TEST_DATABASE_NAME>" "<verified-backup.dump>"
```

Do not run restore against the live clinic database unless the clinic has approved downtime and the selected backup file has been verified.
Provide host/user/password through a protected libpq environment or pgpass file,
not credential-bearing command arguments. The target must be a separate empty
test database; database provisioning remains an administrator action.

## Operating Rules

- Never store the only backup on the same disk as the live database.
- Do not send backup files through personal email or chat.
- Restrict backup folder access to the system administrator.
- Record backup and restore tests in turnover notes.
- If the server disk fails and no external copy exists, application-level recovery may not be possible.
