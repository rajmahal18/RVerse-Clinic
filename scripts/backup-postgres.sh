#!/bin/sh
# PGDATABASE/PGSERVICE and PGPASSFILE are supplied by OCM IT, never CLI secrets.
set -eu
umask 077
: "${PGDATABASE:?Set PGDATABASE (database name or libpq URL) in the protected backup environment}"
: "${BACKUP_DIR:?Set BACKUP_DIR to the approved backup location}"
keep=${BACKUP_KEEP:-14}
case "$keep" in ''|*[!0-9]*|0) echo 'BACKUP_KEEP must be a positive integer.' >&2; exit 1;; esac
command -v pg_dump >/dev/null || { echo 'Install PostgreSQL client tools.' >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
# A unique working directory prevents overlapping jobs from sharing partial files.
work=$(mktemp -d "$BACKUP_DIR/.clinic-backup.XXXXXX")
trap 'rm -f "$work/data.partial"; rmdir "$work"' EXIT
trap 'exit 1' HUP INT TERM
if ! pg_dump --no-password --format=custom --no-owner --no-privileges --file="$work/data.partial" 2>/dev/null || [ ! -s "$work/data.partial" ]; then
  echo 'Backup failed. Previous backups retained. Check database access and storage.' >&2
  exit 1
fi
target="$BACKUP_DIR/clinic-system-$(date -u +%Y%m%d-%H%M%S)-${work##*.}.dump"
mv "$work/data.partial" "$target"
# Generated names contain no whitespace; only this script's completed dumps match.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'clinic-system-*.dump' -printf '%f\n' |
  LC_ALL=C sort -r | tail -n +"$((keep + 1))" |
  while IFS= read -r old; do rm -f -- "$BACKUP_DIR/$old"; done
echo 'Backup completed.'
