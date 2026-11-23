#!/bin/sh
set -eu
umask 077
export LC_ALL=C
: "${BACKUP_DIR:?Set BACKUP_DIR to the approved backup location}"
keep=${BACKUP_KEEP:-3}
min_mib=${BACKUP_MIN_FREE_MIB:-5120}
max_mib=${BACKUP_MAX_MIB:-512}

fail() {
  printf 'Backup failed: %s\n' "$1" >&2
  exit 1
}

if [ -n "${BACKUP_WINDOW_HOUR:-}" ] &&
  [ "$(TZ=Asia/Manila date +%H)" != "$BACKUP_WINDOW_HOUR" ]; then
  fail 'outside the configured Asia/Manila backup window; arrange an off-peak retry'
fi

[ -n "${PGDATABASE:-}${PGSERVICE:-}" ] || fail 'configure PGDATABASE or PGSERVICE privately'
for value in "$keep" "$min_mib" "$max_mib"; do
  case "$value" in
    ''|0*|*[!0-9]*|????????*) fail 'retention and storage limits must be positive integers of at most seven digits' ;;
  esac
done
for tool in pg_dump pg_restore flock prlimit sha256sum; do
  command -v "$tool" >/dev/null || fail "required tool unavailable: $tool"
done
mkdir -p "$BACKUP_DIR"
exec 9>>"${BACKUP_LOCK_FILE:-$BACKUP_DIR/.clinic-operations.lock}"
flock -n 9 || fail 'shared operations lock unavailable; retry after the active operation'

verify_checksum() (
  cd "$1" && digest=$(sha256sum archive.dump) && recorded=$(cat archive.sha256) &&
    [ "$digest" = "$recorded" ]
)

# Rotation owns only these bundles. Flat legacy and manually preserved archives
# are deliberately outside the rotation.
count=0
for backup in "$BACKUP_DIR"/clinic-daily-*; do
  [ -d "$backup" ] || continue
  [ ! -L "$backup" ] && verify_checksum "$backup" 2>/dev/null ||
    fail 'existing scheduled backup failed checksum verification; rotation halted'
  count=$((count + 1))
done

available_kib() {
  df -Pk -- "$BACKUP_DIR" | awk 'NR == 2 && $4 ~ /^[0-9]+$/ { print $4 }'
}

min_kib=$((min_mib * 1024))
max_kib=$((max_mib * 1024))
free_kib=$(available_kib)
[ -n "$free_kib" ] && [ "$free_kib" -ge "$((min_kib + max_kib))" ] ||
  fail 'insufficient disk space for the free-space reserve plus one maximum-size archive'

work=$(mktemp -d "$BACKUP_DIR/.clinic-backup.XXXXXX")
trap 'if [ -d "$work" ]; then rm -f -- "$work/archive.dump" "$work/archive.sha256"; rmdir -- "$work"; fi' EXIT
trap 'exit 1' HUP INT TERM

max_bytes=$((max_kib * 1024))
dump_status=0
prlimit --core=0:0 --fsize="$max_bytes:$max_bytes" -- pg_dump --no-password --format=custom --compress=6 \
  --no-owner --no-privileges --lock-wait-timeout=30s --file="$work/archive.dump" >/dev/null 2>&1 ||
  dump_status=$?
archive_bytes=0
if [ -f "$work/archive.dump" ]; then
  archive_bytes=$(stat -c %s -- "$work/archive.dump")
fi
if [ "$archive_bytes" -gt "$max_bytes" ] ||
  { [ "$dump_status" -ne 0 ] && [ "$archive_bytes" -ge "$max_bytes" ]; }; then
  fail "archive reached or exceeded the configured ${max_mib} MiB cap; review BACKUP_MAX_MIB and disk capacity"
fi
if [ "$archive_bytes" -ge "$((max_bytes * 80 / 100))" ]; then
  printf '<4>Backup warning: archive reached at least 80%% of the configured %s MiB cap (%s bytes).\n' \
    "$max_mib" "$archive_bytes" >&2
fi
[ "$dump_status" -eq 0 ] ||
  fail "pg_dump did not complete; check database access, lock wait, and the configured ${max_mib} MiB cap"
[ -s "$work/archive.dump" ] || fail 'pg_dump produced an empty archive'
# Read and decompress the archive without connecting to any database.
pg_restore --exit-on-error --file=/dev/null "$work/archive.dump" >/dev/null 2>&1 ||
  fail 'offline archive verification failed'
(cd "$work" && sha256sum archive.dump > archive.sha256) &&
  verify_checksum "$work" 2>/dev/null || fail 'archive checksum could not be recorded and verified'

free_kib=$(available_kib)
[ -n "$free_kib" ] && [ "$free_kib" -ge "$min_kib" ] ||
  fail 'free space fell below the reserve during backup'
name="clinic-daily-$(date -u +%Y%m%d-%H%M%S%N)-${work##*.}"
mv -T -- "$work" "$BACKUP_DIR/$name"

# UTC names sort oldest first. Keep the new bundle even if the clock moved.
count=$((count + 1))
for backup in "$BACKUP_DIR"/clinic-daily-*; do
  [ "$count" -gt "$keep" ] || break
  [ -d "$backup" ] && [ "$backup" != "$BACKUP_DIR/$name" ] || continue
  retired="$BACKUP_DIR/.retired-${backup##*/}"
  mv -T -- "$backup" "$retired"
  rm -f -- "$retired/archive.dump" "$retired/archive.sha256"
  rmdir -- "$retired"
  count=$((count - 1))
done
printf 'Backup completed and verified: %s\n' "$name"
