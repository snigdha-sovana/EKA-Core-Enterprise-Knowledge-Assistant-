#!/usr/bin/env bash
# ==============================================================================
# EKA & NexoraERP Production Automated Backup Script
# Cron Ready: 0 2 * * * /app/scripts/backup/backup.sh >> /var/log/eka_backup.log 2>&1
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/data/backups/bundles"
RETENTION_DAYS=7

echo "================================================================"
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Starting Scheduled EKA Backup"
echo "Project Root: ${PROJECT_ROOT}"
echo "Target Directory: ${BACKUP_DIR}"
echo "================================================================"

mkdir -p "${BACKUP_DIR}"

# Execute master disaster recovery backup orchestrator
python3 "${SCRIPT_DIR}/backup_all.py" --dest-dir "${BACKUP_DIR}" --retention-days "${RETENTION_DAYS}"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Scheduled EKA Backup Complete."
