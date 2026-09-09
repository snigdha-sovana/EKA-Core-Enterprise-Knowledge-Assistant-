"""Automated ChromaDB vector store snapshot utility with metadata manifests and SHA-256 checksums."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import sys
import tarfile
from datetime import datetime, timezone
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backup_chroma")


def compute_sha256(file_path: Path) -> str:
    """Compute SHA-256 checksum of a file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def run_chroma_backup(output_dir: Path, retention_days: int = 7) -> Path:
    """Run ChromaDB vector snapshot, generate metadata manifest, and enforce retention."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_file = output_dir / f"chroma_backup_{timestamp}.tar.gz"

    logger.info("Starting ChromaDB vector store snapshot to %s...", backup_file)

    manifest_data = {
        "format": "eka_chromadb_snapshot_v1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "host": settings.chroma_host,
        "port": settings.chroma_port,
        "collections": {},
        "total_chunks": 0,
    }

    # Attempt to query live ChromaDB collections for metadata auditing
    try:
        import chromadb
        if settings.chroma_host and settings.chroma_host not in ("localhost", "127.0.0.1"):
            client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
        else:
            client = chromadb.HttpClient(host="127.0.0.1", port=settings.chroma_port)

        collections = client.list_collections()
        for col in collections:
            count = col.count()
            manifest_data["collections"][col.name] = {
                "id": str(col.id),
                "count": count,
                "metadata": col.metadata,
            }
            manifest_data["total_chunks"] += count
        logger.info("Cataloged %d ChromaDB collections (%d total chunks).", len(collections), manifest_data["total_chunks"])
    except Exception as exc:
        logger.warning("Could not query ChromaDB HTTP API directly (will snapshot directory): %s", exc)

    # Snapshot local chroma data directory if it exists
    data_dir = Path("./data/chroma")
    temp_meta_file = output_dir / f"temp_manifest_{timestamp}.json"
    with open(temp_meta_file, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    with tarfile.open(backup_file, "w:gz") as tar:
        tar.add(temp_meta_file, arcname="manifest.json")
        if data_dir.exists():
            tar.add(data_dir, arcname="chroma_storage")
            logger.info("Archived ChromaDB storage directory: %s", data_dir)
        else:
            logger.info("Local storage dir %s not found; archived metadata manifest only.", data_dir)

    temp_meta_file.unlink(missing_ok=True)

    # Compute SHA-256
    checksum = compute_sha256(backup_file)
    checksum_file = backup_file.with_suffix(".sha256")
    with open(checksum_file, "w", encoding="utf-8") as f:
        f.write(f"{checksum}  {backup_file.name}\n")
    logger.info("ChromaDB Snapshot SHA-256: %s", checksum)

    # Pruning
    prune_old_backups(output_dir, prefix="chroma_backup_", retention_days=retention_days)

    return backup_file


def prune_old_backups(output_dir: Path, prefix: str, retention_days: int) -> None:
    """Prune backups older than retention_days."""
    now = datetime.now(timezone.utc).timestamp()
    cutoff = now - (retention_days * 86400)

    for item in output_dir.glob(f"{prefix}*"):
        if item.stat().st_mtime < cutoff:
            try:
                item.unlink()
                logger.info("Pruned old ChromaDB snapshot: %s", item.name)
            except Exception as e:
                logger.warning("Could not prune %s: %s", item.name, e)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ChromaDB Vector Backup Tool for EKA")
    parser.add_argument("--output-dir", default="./data/backups/chroma", type=Path, help="Backup destination directory")
    parser.add_argument("--retention-days", default=7, type=int, help="Retention period in days")
    args = parser.parse_args()

    result_path = run_chroma_backup(args.output_dir, args.retention_days)
    print(f"ChromaDB snapshot successfully created at: {result_path}")
