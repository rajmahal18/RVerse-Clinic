# OCM Clinic backup and PM2 recovery runbook

This runbook uses the November 23, 2026 inspection as its starting point.
Confirm each path, version, and service setting with OCM IT before an approved
production operation. Command blocks are examples for the named environment.

## Lightweight backup

The proposed timer runs once daily at 02:00 Asia/Manila. Confirm that window
with IT. With `Persistent=false`, a missed run is skipped after downtime.
The service also refuses to start a dump outside 02:00–02:59 Asia/Manila,
including after resume from suspend. Monitor for stale backups. Arrange any
manual run outside that hour through an approved off-peak procedure with
the same locked helper and protected backup configuration.

The Linux helper writes a gzip-compressed PostgreSQL custom archive to the
backup filesystem. It decodes the archive offline with `pg_restore`, records
and checks SHA-256, rechecks free space, and then publishes the archive and
checksum together by directory rename. It retains the latest three verified
`clinic-daily-*` bundles. Existing scheduled checksums are verified before
rotation. A mismatch stops the job and keeps the set for IT inspection.
Failures before publication leave earlier copies in place.

The restricted service stores scheduled backups in
`/var/lib/ocm-clinic-backup`, separate from the clinicadmin-owned legacy
directory. Leave
`/home/clinicadmin/ocm-clinic-backups/ocm_clinic_before_b622331_20261120_152413.dump`
in place until a newer backup passes a full independent restore. Catalog
readability alone does not satisfy that gate. Keep an encrypted off-host copy
of the last restore-proven backup until an independently restored replacement
is available. The scheduler never prunes the legacy directory.

| Budget | Initial value |
| --- | --- |
| Free-space reserve | 5 GiB (5,120 MiB), configurable with `BACKUP_MIN_FREE_MIB` |
| Compressed archive limit | 512 MiB per run, configurable with `BACKUP_MAX_MIB` |
| Local scheduled copy count | 3, configurable with `BACKUP_KEEP` |
| Scheduled archive footprint at limit | About 1.5 GiB steady state, or 2 GiB while writing a replacement, plus metadata |
| Proposed off-host quota | 4 GiB, including encrypted metadata and temporary transfer files, subject to destination approval |

The backup refuses to start below 5.5 GiB free at defaults. The archive size
limit bounds the dump itself. The final free-space check detects space lost to
other processes while the dump ran. Budget the legacy archive, logs, releases,
filesystem overhead, and any abandoned hidden work directories separately.
The journal records a warning at 80% of the configured archive limit.
A dump that fails at the cap exits nonzero with a specific limit diagnostic.
Measure actual compressed sizes and growth before adjusting limits. The
259,244-byte November 20 archive is one historical observation.

For off-host recovery, use an approved encrypted destination with restricted
access and a separately recoverable decryption key. Keep up to seven daily
copies within the 4 GiB total quota, including any restore-proven hold. Verify
the new upload and checksum before pruning older copies. Preserve the last
known-good copy and alert if the quota prevents safe rotation. Confirm capacity,
ownership, and alerting before configuring transfer. Scheduled local success
does not imply off-host success.

### Service preparation and monitoring

**STATE-CHANGING, staging first.** IT provisions a dedicated
`ocm-clinic-backup` system user and group without login, a database role with
only the read access needed for a complete archive, and an administrator-owned
copy of `scripts/backup-postgres.sh` at
`/usr/local/libexec/ocm-clinic-backup`. Confirm the actual database server
major version, dump-client compatibility, required table and sequence access,
and row-level-security coverage.

IT provides root-owned mode-0600 files
`/etc/ocm-clinic/backup.pg_service.conf` and `/etc/ocm-clinic/backup.pgpass`.
The service file's section is `[ocm-clinic-backup]` and supplies the approved
host, port, database, role, and TLS settings. Put passwords only in the passfile.
Systemd loads both as service credentials. The optional
`/etc/ocm-clinic/backup.conf` is for non-secret limit overrides.

Pre-create `/var/lib/ocm-clinic-ops/operations.lock` on a local filesystem.
Grant append/open access to the backup service and authorized deployment
operator, for example through a dedicated shared group with mode 0660 on the
file and restricted directory traversal. Keep the directory administrator-owned
and preserve the lock file's inode. The PM2 deployment workflow and any
approved manual backup must use this same path. Never unlink or replace the
lock while it is in use.

**READ-ONLY checks, on an authorized Ubuntu staging host.**

```sh
systemd-analyze verify /etc/systemd/system/ocm-clinic-backup.service /etc/systemd/system/ocm-clinic-backup.timer
systemd-analyze calendar '*-*-* 02:00:00 Asia/Manila'
df -h /var/lib/ocm-clinic-backup /home/clinicadmin/ocm-clinic-releases
systemctl list-timers ocm-clinic-backup.timer --all
journalctl -u ocm-clinic-backup.service --since yesterday --no-pager
```

In staging, test the oneshot with staging credentials, review success and
failure records, and verify that the service account can use the operations
lock. Before production activation, assign someone to monitor nonzero unit
exits, missing verified backups, and off-host transfer freshness. Use the
journal for sanitized diagnostics, and monitor archive-cap warnings before
they become failures. A lock collision is a failed attempt.
Arrange a supervised retry after the active operation and alert on a missed
backup window. Inspect abandoned `.clinic-backup.*` or `.retired-*`
directories under the shared lock before any manual cleanup. Timer installation
and activation on production require a separate approved change.

## Independent restore drill

IT provisions a fresh non-production PostgreSQL instance, confirms compatible
server and restore tool versions, installs required extensions, and supplies a
dedicated restore role and service entry. Network isolation must prevent
connections to production. Keep any patient data in an approved protected
environment. Use separate synthetic fixtures for write tests.

**READ-ONLY, against the copied archive on the isolated host.**

```sh
cd /approved/isolated/backup-bundle
sha256sum --strict --check archive.sha256
pg_restore --list archive.dump >/dev/null
pg_restore --exit-on-error --file=/dev/null archive.dump
```

For the legacy flat archive, verify the transfer against an independently
recorded SHA-256. A newly computed digest proves identity for later comparisons,
while the full restore is needed to establish recovery.

**STATE-CHANGING, isolated instance only.** Verify the service alias, server,
and empty target database with the second operator before restoring.

```sh
pg_restore --single-transaction --exit-on-error --no-owner --no-privileges \
  --dbname='service=ocm_restore_isolated' archive.dump
```

Record archive identity, effective recovery point, elapsed time, and errors.
Check `_prisma_migrations` names, checksums, completion and rollback markers.
Verify schema, extensions, constraints, indexes, and representative aggregate
counts without exporting patient rows. Start the intended application against
the isolated instance and verify liveness and readiness. Use synthetic
credentials and records for write-based smoke tests. A passing drill requires
an error-free restore, reconciled schema, successful application checks, and
IT sign-off. Propose a 24-hour RPO and four-hour RTO for IT to confirm against
measured retrieval, restore, and application validation time.

## Manual production release and rollback

**READ-ONLY, repository.**

```sh
git merge-base --is-ancestor b622331 d745cea
git diff --name-status b622331 d745cea -- prisma/migrations prisma/schema.prisma
```

The approved candidate is
`d745cea9d10277d52721fab8c4b5d42696cfb3c1`, with Next.js 15.5.29.
The comparison found no migration or Prisma schema changes from `b622331`.
Before promotion, IT must reconcile the actual applied migration history
through a separately approved read-only database check. Unexpected pending,
failed, or divergent entries are stop conditions. Require an approved isolated
rehearsal and explicit migration approval before any future schema-changing
release. Keep seed, import, reset, and development migration commands out of
the release procedure.

1. **Before staging:** confirm the exact SHA passed GitHub CI. Rehearse on
   Ubuntu with Node 24.21.0, npm 11.19.0, and synthetic configuration.
   Measure checkout, dependencies, build output, and logs on staging.
   Ensure free space covers the 5 GiB reserve, up to 512 MiB for the next dump,
   the measured new release/build peak, and a log margin. For example, a 3 GiB
   staging peak and 1 GiB margin require 9.5 GiB free before staging. Keep
   `b622331` available. The November 23 observation of roughly 22 GB free
   must be rechecked. Do not delete active or rollback releases to pass the gate.
2. **Before acquiring the deployment lock:** verify the latest fresh off-host
   backup and independent restore evidence. If a new backup is needed, run the
   approved oneshot first. **PRODUCTION-IMPACTING.** The deployment operator
   then holds the same lock across staging on the production host, candidate
   testing, promotion or rollback, and recording the result. Recheck the
   backup and approvals after acquiring it. Calling the oneshot while holding
   that lock would cause the backup to exit.

   ```sh
   # Approved operator shell only. The descriptor releases at shell exit.
   exec 9>>/var/lib/ocm-clinic-ops/operations.lock
   flock -n 9 || exit 1
   ```

   Keep this shell open through promotion. Close descriptor 9 for commands
   that can spawn long-lived processes, for example invoke the approved PM2
   candidate command with `9>&-`. The operator shell still holds the lock.

3. **Candidate:** stage in a new detached commit-based directory under
   `/home/clinicadmin/ocm-clinic-releases`. Run the approved build with
   protected configuration. Start a distinctly named PM2 candidate on an
   available loopback port such as `3001`, leaving
   `rverse-clinic-b622331` serving `3000`. Keep the candidate out of the PM2
   saved boot state until acceptance. Preserve the application auth secret,
   verify health, and confirm the correct SHA and Next.js version. Rehearse
   workflow actions, settings, patient screens, search, stale tabs, static
   assets, and form refresh behavior on staging with synthetic data.
4. **Promotion:** with OCM approval, record the current Nginx configuration
   and upstream, change the approved upstream to the candidate, run
   `nginx -t`, then reload gracefully. Check HTTPS, liveness and approved
   readiness, fresh and existing sessions, static assets, and agreed clinic
   smoke tests. Keep production validation read-only unless separate
   authorization permits a designated test record. Observe errors and
   latency during the agreed window, then persist the accepted PM2 startup
   state and retain the previous release for rollback.
5. **Rollback:** on failed health, failing login or workflows, broken assets,
   or agreed error thresholds, keep the previous database in place. If
   schema and candidate writes remain compatible, switch Nginx back to
   `127.0.0.1:3000` and revalidate the old release through HTTPS. If
   compatibility is uncertain, stop promotion and escalate to IT for a
   forward fix or independent database recovery decision. Never restore an
   archive over production as part of application rollback. Stop the failed
   candidate only after routing is verified.

## PM2 reboot recovery

`pm2-clinicadmin.service` was enabled but inactive. The active daemon was
started independently, and the boot preceded creation of the startup unit.
Do not restart or stop the unit during inspection because its stop action
invokes `pm2 kill`. Inspect the unit state, service user, PID tracking,
`PM2_HOME`, the NVM executable path, and selected saved app identity fields.
Avoid dumping the PM2 environment. Verify that the actual release and saved
release agree. Rehearse resurrection in staging.

**PRODUCTION-IMPACTING, separate maintenance window.** Have OCM IT plan the
handoff to the systemd-managed daemon with console access, a verified backup,
the known-good release, and a named rollback operator. Validate a controlled
boot end to end. Confirm systemd tracks the daemon, the expected release
listens on the correct loopback port, Nginx routes correctly, and health and
login checks pass. Keep the current daemon intact until the window begins.
