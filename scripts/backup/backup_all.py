"""Master Disaster Recovery & Backup Orchestrator for EKA & NexoraERP.

Coordinates PostgreSQL relational backups and ChromaDB vector snapshots into a verified,
self-contained archive with cryptographic SHA-256 integrity verification.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import tarfile
from datetime import UTC, datetime
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from scripts.backup.backup_chroma import run_chroma_backup
from scripts.backup.backup_postgres import compute_sha256, run_postgres_backup
from src.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backup_all")


def run_full_backup(dest_dir: Path, retention_days: int = 7) -> dict:
    """Execute complete coordinated disaster recovery backup."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    temp_work_dir = dest_dir / f"work_{timestamp}"
    temp_work_dir.mkdir(parents=True, exist_ok=True)

    bundle_archive = dest_dir / f"eka_dr_bundle_{timestamp}.tar.gz"

    logger.info("================================================================")
    logger.info("EKA Production Disaster Recovery: Initiating Full Backup Run")
    logger.info("Timestamp: %s | Target: %s", timestamp, bundle_archive)
    logger.info("================================================================")

    # 1. Backup PostgreSQL
    pg_dir = temp_work_dir / "postgres"
    pg_backup_file = run_postgres_backup(pg_dir, retention_days=retention_days)
    pg_checksum = compute_sha256(pg_backup_file)

    # 2. Backup ChromaDB
    chroma_dir = temp_work_dir / "chroma"
    chroma_backup_file = run_chroma_backup(chroma_dir, retention_days=retention_days)
    chroma_checksum = compute_sha256(chroma_backup_file)

    # 3. Create Manifest
    manifest_data = {
        "format": "eka_dr_manifest_v1",
        "backup_id": f"dr-{timestamp}",
        "created_at": datetime.now(UTC).isoformat(),
        "application": "EKA - Enterprise Knowledge Assistant",
        "retention_days": retention_days,
        "components": {
            "postgres": {
                "file": pg_backup_file.name,
                "size_bytes": pg_backup_file.stat().st_size,
                "sha256": pg_checksum,
            },
            "chroma": {
                "file": chroma_backup_file.name,
                "size_bytes": chroma_backup_file.stat().st_size,
                "sha256": chroma_checksum,
            },
        },
        "config_snapshot": {
            "chroma_host": settings.chroma_host,
            "chroma_port": settings.chroma_port,
            "llm_provider": settings.llm_provider,
            "llm_model": settings.llm_model,
        },
        "status": "SUCCESS",
    }

    manifest_file = temp_work_dir / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    # 4. Package into consolidated bundle tarball
    logger.info("Consolidating components into unified archive %s...", bundle_archive)
    with tarfile.open(bundle_archive, "w:gz") as bundle:
        bundle.add(manifest_file, arcname="manifest.json")
        bundle.add(pg_backup_file, arcname=f"postgres/{pg_backup_file.name}")
        bundle.add(chroma_backup_file, arcname=f"chroma/{chroma_backup_file.name}")

    # 5. Clean up temporary working directory
    import shutil

    shutil.rmtree(temp_work_dir, ignore_errors=True)

    # 6. Compute top-level bundle checksum
    bundle_checksum = compute_sha256(bundle_archive)
    bundle_checksum_file = bundle_archive.with_suffix(".sha256")
    with open(bundle_checksum_file, "w", encoding="utf-8") as f:
        f.write(f"{bundle_checksum}  {bundle_archive.name}\n")

    logger.info("================================================================")
    logger.info("Full Backup Run Completed Successfully!")
    logger.info("Bundle Archive: %s (%d bytes)", bundle_archive, bundle_archive.stat().st_size)
    logger.info("Bundle SHA-256: %s", bundle_checksum)
    logger.info("================================================================")

    result_summary = {
        "status": "SUCCESS",
        "archive_path": str(bundle_archive),
        "sha256": bundle_checksum,
        "size_bytes": bundle_archive.stat().st_size,
        "manifest": manifest_data,
    }
    return result_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Master Disaster Recovery Backup Tool for EKA")
    parser.add_argument(
        "--dest-dir",
        default="./data/backups/bundles",
        type=Path,
        help="Archive destination directory",
    )
    parser.add_argument("--retention-days", default=7, type=int, help="Retention period in days")
    args = parser.parse_args()

    summary = run_full_backup(args.dest_dir, args.retention_days)
    print(json.dumps(summary, indent=2))
