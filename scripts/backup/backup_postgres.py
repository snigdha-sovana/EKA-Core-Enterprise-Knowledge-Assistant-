"""Automated PostgreSQL backup utility with compression, SHA-256 verification, and retention pruning."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backup_postgres")


def compute_sha256(file_path: Path) -> str:
    """Compute SHA-256 checksum of a file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


async def dump_postgres_via_python(output_path: Path) -> dict:
    """Python-native fallback dump using an isolated NullPool connection."""
    import gzip
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.pool import NullPool

    logger.info("Extracting PostgreSQL schema and tables via isolated NullPool connection...")
    temp_engine = create_async_engine(settings.database_url, poolclass=NullPool)

    tables_data = {}
    row_counts = {}

    try:
        async with AsyncSession(temp_engine) as session:
            # Query all public tables
            tables_stmt = text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
            )
            res = await session.execute(tables_stmt)
            table_names = [row[0] for row in res.fetchall()]

            for tname in table_names:
                count_stmt = text(f'SELECT count(*) FROM "{tname}"')
                c_res = await session.execute(count_stmt)
                count = c_res.scalar() or 0
                row_counts[tname] = count

                # Fetch rows (serialized as JSON strings for portability)
                rows_stmt = text(f'SELECT * FROM "{tname}"')
                r_res = await session.execute(rows_stmt)
                rows = [dict(r._mapping) for r in r_res.fetchall()]

                # Convert UUIDs and datetimes to strings
                for r in rows:
                    for k, v in r.items():
                        if isinstance(v, (datetime,)):
                            r[k] = v.isoformat()
                        elif hasattr(v, "hex"):
                            r[k] = str(v)
                tables_data[tname] = rows

        # Write compressed JSON payload
        with gzip.open(output_path, "wt", encoding="utf-8") as f:
            json.dump({
                "format": "eka_postgres_json_snapshot_v1",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "tables": tables_data,
                "row_counts": row_counts,
            }, f, indent=2)

    finally:
        await temp_engine.dispose()

    return row_counts


def _run_in_isolated_thread(coro_fn, *args, **kwargs):
    """Run an async coroutine inside a fresh isolated event loop in a dedicated thread."""
    import concurrent.futures

    def _worker():
        worker_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(worker_loop)
        try:
            return worker_loop.run_until_complete(coro_fn(*args, **kwargs))
        finally:
            worker_loop.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        return executor.submit(_worker).result()


def run_postgres_backup(output_dir: Path, retention_days: int = 7) -> Path:
    """Run PostgreSQL backup, compute checksum, and enforce retention."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_file = output_dir / f"postgres_backup_{timestamp}.sql.gz"

    logger.info("Starting PostgreSQL backup to %s...", backup_file)

    # 1. Try pg_dump if available on PATH
    pg_dump_bin = shutil.which("pg_dump")
    dump_success = False

    if pg_dump_bin:
        try:
            db_url = settings.database_url
            logger.info("Found pg_dump at %s, attempting native binary dump...", pg_dump_bin)
            # Create compressed sql dump via pg_dump
            cmd = f'"{pg_dump_bin}" --dbname="{db_url}" --format=custom --file="{backup_file}"'
            proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if proc.returncode == 0 and backup_file.exists() and backup_file.stat().st_size > 0:
                dump_success = True
                logger.info("pg_dump completed successfully (%d bytes).", backup_file.stat().st_size)
            else:
                logger.warning("pg_dump exited with error: %s", proc.stderr)
        except Exception as exc:
            logger.warning("pg_dump execution failed: %s", exc)

    if not dump_success:
        logger.info("Using asynchronous SQLAlchemy snapshot engine...")
        row_counts = _run_in_isolated_thread(dump_postgres_via_python, backup_file)
        logger.info("Snapshot complete across %d tables: %s", len(row_counts), row_counts)


    # 2. Compute SHA-256 checksum
    checksum = compute_sha256(backup_file)
    checksum_file = backup_file.with_suffix(".sha256")
    with open(checksum_file, "w", encoding="utf-8") as f:
        f.write(f"{checksum}  {backup_file.name}\n")
    logger.info("SHA-256 Checksum generated: %s", checksum)

    # 3. Retention policy cleanup
    prune_old_backups(output_dir, prefix="postgres_backup_", retention_days=retention_days)

    return backup_file


def prune_old_backups(output_dir: Path, prefix: str, retention_days: int) -> None:
    """Remove backup files older than retention_days."""
    now = datetime.now(timezone.utc).timestamp()
    cutoff = now - (retention_days * 86400)

    for item in output_dir.glob(f"{prefix}*"):
        if item.stat().st_mtime < cutoff:
            try:
                item.unlink()
                logger.info("Pruned old backup file: %s", item.name)
            except Exception as e:
                logger.warning("Could not prune %s: %s", item.name, e)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automated PostgreSQL Backup Tool for EKA")
    parser.add_argument("--output-dir", default="./data/backups/postgres", type=Path, help="Backup destination directory")
    parser.add_argument("--retention-days", default=7, type=int, help="Number of days to retain backups")
    args = parser.parse_args()

    result_path = run_postgres_backup(args.output_dir, args.retention_days)
    print(f"PostgreSQL backup successfully created at: {result_path}")
