#!/bin/sh
set -eu
root=$(mktemp -d)
trap 'rm -f "$root/bin/pg_dump" "$root/dumps/"*; rmdir "$root/bin" "$root/dumps" "$root"' EXIT
mkdir "$root/bin" "$root/dumps"
cat > "$root/bin/pg_dump" <<'MOCK'
#!/bin/sh
for arg in "$@"; do
  case "$arg" in --file=*) target=${arg#--file=};; esac
done
case "$MOCK_RESULT" in
  failure) echo partial > "$target"; exit 1;;
  empty) : > "$target"; exit 0;;
  success) echo complete > "$target"; exit 0;;
esac
exit 1
MOCK
chmod +x "$root/bin/pg_dump"
export PATH="$root/bin:$PATH" PGDATABASE=synthetic BACKUP_DIR="$root/dumps" BACKUP_KEEP=1
old="$BACKUP_DIR/clinic-system-20000101-000000.dump"
echo synthetic > "$old"
for MOCK_RESULT in failure empty success; do
  export MOCK_RESULT
  if sh scripts/backup-postgres.sh >/dev/null 2>&1; then
    [ "$MOCK_RESULT" = success ] || exit 1
  else
    [ "$MOCK_RESULT" != success ] || exit 1
  fi
  [ "$(find "$BACKUP_DIR" -type f -name '*.dump' | wc -l)" -eq 1 ] || exit 1
  [ "$(find "$BACKUP_DIR" -type f -name '*.partial' | wc -l)" -eq 0 ] || exit 1
  if [ "$MOCK_RESULT" != success ]; then [ -f "$old" ] || exit 1; fi
done
echo 'PASS: Linux backup failure, empty output, success, and retention (mock pg_dump; no database).'
