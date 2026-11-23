#!/bin/sh
set -eu
umask 077
root=$(mktemp -d)
trap 'rm -rf -- "$root"' EXIT
mkdir "$root/bin" "$root/dumps"

cat > "$root/bin/pg_dump" <<'MOCK'
#!/bin/sh
set -eu
for arg in "$@"; do
  case "$arg" in --file=*) target=${arg#--file=};; esac
done
case " $* " in *' --format=custom --compress=6 '*) ;; *) exit 1;; esac
case "$MOCK_RESULT" in
  failures) echo 'mock password must not reach logs' >&2; echo partial > "$target"; exit 1;;
  empty) : > "$target";;
  at_cap) truncate -s 1048576 "$target"; exit 1;;
  near_cap) truncate -s 900000 "$target";;
  *) printf 'synthetic archive %s\n' "$MOCK_RESULT" > "$target";;
esac
MOCK
real_date=$(command -v date)
export real_date
cat > "$root/bin/date" <<'MOCK'
#!/bin/sh
if [ "$MOCK_RESULT" = late ] && [ "$1" = +%H ] && [ "$TZ" = Asia/Manila ]; then
  echo 10
else
  exec "$real_date" "$@"
fi
MOCK
cat > "$root/bin/pg_restore" <<'MOCK'
#!/bin/sh
test "$1" = "--exit-on-error" && test "$2" = "--file=/dev/null" &&
  test "$#" -eq 3 && test -s "$3" && test "$MOCK_RESULT" != corrupt
MOCK
cat > "$root/bin/df" <<'MOCK'
#!/bin/sh
case "$MOCK_RESULT" in
  low_space) free=5242880;;
  space_drop)
    if find "$BACKUP_DIR" -name archive.dump -path '*/.clinic-backup.*/*' | grep -q .; then
      free=5242879
    else
      free=6000000
    fi;;
  *) free=6000000;;
esac
printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\nmock 8000000 2000000 %s 25%% /\n' "$free"
MOCK

# Exercise real util-linux tools on Linux and use targeted shims on Git Bash.
if ! command -v flock >/dev/null; then
  printf '%s\n' '#!/bin/sh' 'test "$*" = "-n 9" && test "$MOCK_RESULT" != locked' > "$root/bin/flock"
fi
if ! command -v prlimit >/dev/null; then
  printf '%s\n' '#!/bin/sh' 'bytes=$(("${BACKUP_MAX_MIB:-512}" * 1048576))' 'test "$1" = "--core=0:0" && test "$2" = "--fsize=$bytes:$bytes" && test "$3" = "--" || exit 1' 'shift 3' 'exec "$@"' > "$root/bin/prlimit"
fi
chmod +x "$root/bin/"*
unset BACKUP_KEEP BACKUP_MIN_FREE_MIB BACKUP_MAX_MIB BACKUP_WINDOW_HOUR
export PATH="$root/bin:$PATH" PGDATABASE=synthetic BACKUP_DIR="$root/dumps"
export BACKUP_LOCK_FILE="$root/operations.lock"
legacy="$BACKUP_DIR/ocm_clinic_before_b622331_20261120_152413.dump"
printf 'legacy archive\n' > "$legacy"

bundle_count() {
  find "$BACKUP_DIR" -maxdepth 1 -type d -name 'clinic-daily-*' | wc -l
}

expect_failure() {
  if MOCK_RESULT="$1" sh scripts/backup-postgres.sh > "$root/log" 2>&1; then
    echo "Expected failure for $1" >&2
    exit 1
  fi
  grep -Fq "$2" "$root/log"
  ! grep -q 'mock password' "$root/log"
  [ "$(bundle_count)" -eq 3 ]
  [ "$(find "$BACKUP_DIR" -name '.clinic-backup.*' | wc -l)" -eq 0 ]
}

for MOCK_RESULT in first second third fourth; do
  MOCK_RESULT="$MOCK_RESULT" sh scripts/backup-postgres.sh
done
[ "$(bundle_count)" -eq 3 ]
[ "$(cat "$legacy")" = 'legacy archive' ]
for backup in "$BACKUP_DIR"/clinic-daily-*; do
  (cd "$backup" && sha256sum --strict --check archive.sha256)
  ! grep -q ' first$' "$backup/archive.dump"
done

expect_failure failures 'pg_dump did not complete'
expect_failure empty 'empty archive'
expect_failure corrupt 'offline archive verification failed'
expect_failure low_space 'insufficient disk space'
expect_failure space_drop 'below the reserve'
(export BACKUP_WINDOW_HOUR=02; expect_failure late 'outside the configured Asia/Manila backup window')
(export BACKUP_MAX_MIB=1; expect_failure at_cap 'configured 1 MiB cap')
BACKUP_MAX_MIB=1 MOCK_RESULT=near_cap sh scripts/backup-postgres.sh > "$root/log" 2>&1
grep -Fq '80% of the configured 1 MiB cap' "$root/log"
grep -Fq 'Backup completed and verified' "$root/log"
[ "$(bundle_count)" -eq 3 ]
if [ -x "$root/bin/flock" ]; then
  expect_failure locked 'shared operations lock unavailable'
else
  (exec 8>>"$BACKUP_LOCK_FILE"; flock -n 8; expect_failure locked 'shared operations lock unavailable')
fi

printf 'modified archive\n' >> "$backup/archive.dump"
expect_failure second 'existing scheduled backup failed checksum'
[ "$(cat "$legacy")" = 'legacy archive' ]
echo 'PASS: three verified backups, legacy preservation, locking, storage guards, and sanitized failures (mock PostgreSQL tools).'
