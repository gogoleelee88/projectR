from __future__ import annotations

import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "projectr.db"


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def bootstrap_database() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS releases (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                module TEXT NOT NULL,
                pitch TEXT NOT NULL,
                price INTEGER NOT NULL,
                projection TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def list_releases() -> list[dict[str, str | int]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, title, module, pitch, price, projection, status, created_at
            FROM releases
            ORDER BY created_at DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def create_release(payload: dict[str, str | int]) -> dict[str, str | int]:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO releases (id, title, module, pitch, price, projection, status, created_at)
            VALUES (:id, :title, :module, :pitch, :price, :projection, :status, :created_at)
            """,
            payload,
        )
        connection.commit()
    return payload
