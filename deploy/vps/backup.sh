#!/usr/bin/env bash
# backup.sh — pg_dump metmal harian → gzip, retensi 14 hari.
# Dipanggil cron di host VPS:
#   0 3 * * * /opt/metmal/deploy/vps/backup.sh >> /var/log/metmal-backup.log 2>&1
# Restore: gunzip -c <file>.sql.gz | docker compose exec -T postgres psql -U metmal -d metmal
set -euo pipefail

BACKUP_DIR=/opt/metmal/backups
COMPOSE_DIR=/opt/metmal/deploy/vps
KEEP=14

mkdir -p "$BACKUP_DIR"
ts="$(date +%Y%m%d_%H%M%S)"
out="$BACKUP_DIR/metmal_${ts}.sql.gz"

docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U metmal -d metmal --no-owner --no-privileges \
  | gzip -9 > "$out.tmp.gz"
mv "$out.tmp.gz" "$out"

# Validitas arsip (gzip rusak → gagal)
gunzip -t "$out"
size=$(du -h "$out" | cut -f1)
echo "$(date -Is) backup OK: $out ($size)"

# Rotasi: sisakan $KEEP terbaru
ls -1t "$BACKUP_DIR"/metmal_*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
