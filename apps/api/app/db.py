from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from .auth import hash_password, issue_token, verify_password
from .data import (
    CHARACTERS,
    CREATOR_TEMPLATES,
    FEATURED_WORKS,
    IMAGE_STYLES,
    OPS_SIGNALS,
    PARTY_SCENARIOS,
    PAYMENT_PLANS,
    STORY_EPISODES,
    USER_PRESETS,
)


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "projectr.db"
DEMO_PASSWORD = "projectr-demo"
PARTY_ACTIONS = {
    "trial": [
        "증거 원본을 공개한다",
        "감정선 중심으로 배심원을 설득한다",
        "상대 주장에 숨은 모순을 찌른다",
        "조건부 타협안을 제안한다",
    ],
    "ark": [
        "긴급 격리 구역을 개방한다",
        "승객 동선을 재배치한다",
        "코어 시스템을 수동 우회한다",
        "미확인 신호에 직접 응답한다",
    ],
}
FIRST_CLEAR_SPARKS = 320
ENCORE_CLEAR_SPARKS = 90


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _table_is_empty(connection: sqlite3.Connection, table_name: str) -> bool:
    count = connection.execute(f"SELECT COUNT(*) AS count FROM {table_name}").fetchone()
    return count["count"] == 0


def bootstrap_database() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                membership TEXT NOT NULL,
                sparks INTEGER NOT NULL,
                focus TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                handle TEXT NOT NULL UNIQUE,
                bio TEXT NOT NULL,
                location TEXT NOT NULL,
                avatar_gradient TEXT NOT NULL,
                favorite_genres_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS works (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                module TEXT NOT NULL,
                label TEXT NOT NULL,
                genre TEXT NOT NULL,
                summary TEXT NOT NULL,
                concurrent_metric TEXT NOT NULL,
                conversion_metric TEXT NOT NULL,
                retention_metric TEXT NOT NULL,
                hooks_json TEXT NOT NULL,
                featured_index INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS work_tags (
                work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
                tag TEXT NOT NULL,
                position INTEGER NOT NULL,
                PRIMARY KEY (work_id, position)
            );
            CREATE TABLE IF NOT EXISTS story_episodes (
                id TEXT PRIMARY KEY,
                position INTEGER NOT NULL,
                title TEXT NOT NULL,
                scene TEXT NOT NULL,
                stakes TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS story_choices (
                id TEXT PRIMARY KEY,
                episode_id TEXT NOT NULL REFERENCES story_episodes(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                label TEXT NOT NULL,
                result TEXT NOT NULL,
                trust_delta INTEGER NOT NULL,
                hype_delta INTEGER NOT NULL,
                next_episode_id TEXT
            );
            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                vibe TEXT NOT NULL,
                opener TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS character_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                tone TEXT NOT NULL,
                position INTEGER NOT NULL,
                response_text TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS party_scenarios (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                premise TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS party_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scenario_id TEXT NOT NULL REFERENCES party_scenarios(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                role_name TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS party_twists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scenario_id TEXT NOT NULL REFERENCES party_scenarios(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                twist_text TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS image_styles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                palette TEXT NOT NULL,
                summary TEXT NOT NULL,
                gradient TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS creator_templates (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                module TEXT NOT NULL,
                audience TEXT NOT NULL,
                monetization TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS creator_template_outline (
                template_id TEXT NOT NULL REFERENCES creator_templates(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                item_text TEXT NOT NULL,
                PRIMARY KEY (template_id, position)
            );
            CREATE TABLE IF NOT EXISTS ops_signals (
                label TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                tone TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS plans (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                price INTEGER NOT NULL,
                billing_interval TEXT NOT NULL,
                perks_json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan_id TEXT NOT NULL REFERENCES plans(id),
                status TEXT NOT NULL,
                renewal_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS purchases (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                sku TEXT NOT NULL,
                category TEXT NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
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
            CREATE TABLE IF NOT EXISTS saved_items (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                item_kind TEXT NOT NULL,
                item_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, item_kind, item_id)
            );
            CREATE INDEX IF NOT EXISTS idx_saved_items_user_created_at
                ON saved_items (user_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS story_progress (
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                work_id TEXT NOT NULL,
                current_episode_id TEXT NOT NULL,
                trust_score INTEGER NOT NULL,
                hype_score INTEGER NOT NULL,
                visited_episode_ids_json TEXT NOT NULL,
                ending_id TEXT,
                log_json TEXT NOT NULL,
                started_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                synced_at TEXT NOT NULL,
                PRIMARY KEY (user_id, work_id)
            );
            CREATE TABLE IF NOT EXISTS story_run_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                work_id TEXT NOT NULL,
                ending_id TEXT NOT NULL,
                ending_title TEXT NOT NULL,
                ending_class TEXT NOT NULL,
                reward TEXT NOT NULL,
                trust_score INTEGER NOT NULL,
                hype_score INTEGER NOT NULL,
                visited_count INTEGER NOT NULL,
                choice_count INTEGER NOT NULL,
                duration_minutes INTEGER NOT NULL,
                highlight_tags_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_story_run_history_user_work_created_at
                ON story_run_history (user_id, work_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS story_ending_unlocks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                work_id TEXT NOT NULL,
                ending_id TEXT NOT NULL,
                ending_title TEXT NOT NULL,
                ending_class TEXT NOT NULL,
                reward TEXT NOT NULL,
                clear_count INTEGER NOT NULL,
                sparks_awarded_total INTEGER NOT NULL,
                first_cleared_at TEXT NOT NULL,
                last_cleared_at TEXT NOT NULL,
                UNIQUE (user_id, work_id, ending_id)
            );
            CREATE INDEX IF NOT EXISTS idx_story_ending_unlocks_user_work_last_cleared_at
                ON story_ending_unlocks (user_id, work_id, last_cleared_at DESC);
            """
        )
        _seed_database(connection)
        connection.commit()


def _seed_database(connection: sqlite3.Connection) -> None:
    if _table_is_empty(connection, "users"):
        for preset in USER_PRESETS:
            password_hash, password_salt = hash_password(DEMO_PASSWORD)
            connection.execute(
                """
                INSERT INTO users (
                    id, email, password_hash, password_salt, name, role, membership, sparks, focus, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    preset["id"],
                    f'{preset["id"]}@projectr.local',
                    password_hash,
                    password_salt,
                    preset["name"],
                    preset["role"],
                    preset["membership"],
                    preset["sparks"],
                    preset["focus"],
                    utc_now(),
                ),
            )

    if _table_is_empty(connection, "user_profiles"):
        users = connection.execute("SELECT * FROM users ORDER BY created_at").fetchall()
        for user in users:
            defaults = _default_profile(user)
            connection.execute(
                """
                INSERT INTO user_profiles (
                    user_id, handle, bio, location, avatar_gradient, favorite_genres_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user["id"],
                    defaults["handle"],
                    defaults["bio"],
                    defaults["location"],
                    defaults["avatar_gradient"],
                    json.dumps(defaults["favorite_genres"], ensure_ascii=False),
                    utc_now(),
                ),
            )

    if _table_is_empty(connection, "works"):
        for index, work in enumerate(FEATURED_WORKS):
            connection.execute(
                """
                INSERT INTO works (
                    id, title, module, label, genre, summary,
                    concurrent_metric, conversion_metric, retention_metric, hooks_json, featured_index
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    work["id"],
                    work["title"],
                    work["module"],
                    work["label"],
                    work["genre"],
                    work["summary"],
                    work["metrics"]["concurrent"],
                    work["metrics"]["conversion"],
                    work["metrics"]["retention"],
                    json.dumps(work["hooks"], ensure_ascii=False),
                    index,
                ),
            )
            for tag_index, tag in enumerate(work["tags"]):
                connection.execute(
                    "INSERT INTO work_tags (work_id, tag, position) VALUES (?, ?, ?)",
                    (work["id"], tag, tag_index),
                )

    if _table_is_empty(connection, "story_episodes"):
        for index, episode in enumerate(STORY_EPISODES):
            connection.execute(
                """
                INSERT INTO story_episodes (id, position, title, scene, stakes)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    episode["id"],
                    index,
                    episode["title"],
                    episode["scene"],
                    episode.get("stakes", "선택이 다음 장면의 분위기를 바꿉니다."),
                ),
            )

        for episode_index, episode in enumerate(STORY_EPISODES):
            next_episode_id = STORY_EPISODES[
                min(episode_index + 1, len(STORY_EPISODES) - 1)
            ]["id"]
            for choice_index, choice in enumerate(episode["choices"]):
                connection.execute(
                    """
                    INSERT INTO story_choices (
                        id, episode_id, position, label, result, trust_delta, hype_delta, next_episode_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        choice["id"],
                        episode["id"],
                        choice_index,
                        choice["label"],
                        choice["result"],
                        choice["trust_delta"],
                        choice["hype_delta"],
                        next_episode_id,
                    ),
                )

    if _table_is_empty(connection, "characters"):
        for character in CHARACTERS.values():
            connection.execute(
                """
                INSERT INTO characters (id, name, role, vibe, opener)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    character["id"],
                    character["name"],
                    character["role"],
                    character.get("vibe", ""),
                    character.get("opener", ""),
                ),
            )
            for tone, responses in character["responses"].items():
                for response_index, response_text in enumerate(responses):
                    connection.execute(
                        """
                        INSERT INTO character_responses (character_id, tone, position, response_text)
                        VALUES (?, ?, ?, ?)
                        """,
                        (character["id"], tone, response_index, response_text),
                    )

    if _table_is_empty(connection, "party_scenarios"):
        for scenario in PARTY_SCENARIOS.values():
            connection.execute(
                "INSERT INTO party_scenarios (id, title, premise) VALUES (?, ?, ?)",
                (scenario["id"], scenario["title"], scenario["premise"]),
            )
            for role_index, role in enumerate(scenario["player_roles"]):
                connection.execute(
                    "INSERT INTO party_roles (scenario_id, position, role_name) VALUES (?, ?, ?)",
                    (scenario["id"], role_index, role),
                )
            for twist_index, twist in enumerate(scenario["twists"]):
                connection.execute(
                    "INSERT INTO party_twists (scenario_id, position, twist_text) VALUES (?, ?, ?)",
                    (scenario["id"], twist_index, twist),
                )

    if _table_is_empty(connection, "image_styles"):
        for style in IMAGE_STYLES:
            connection.execute(
                """
                INSERT INTO image_styles (id, name, palette, summary, gradient)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    style["id"],
                    style["name"],
                    style["palette"],
                    style["summary"],
                    style["gradient"],
                ),
            )

    if _table_is_empty(connection, "creator_templates"):
        for template in CREATOR_TEMPLATES:
            connection.execute(
                """
                INSERT INTO creator_templates (id, title, module, audience, monetization)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    template["id"],
                    template["title"],
                    template["module"],
                    template["audience"],
                    template["monetization"],
                ),
            )
            for outline_index, item in enumerate(template["outline"]):
                connection.execute(
                    """
                    INSERT INTO creator_template_outline (template_id, position, item_text)
                    VALUES (?, ?, ?)
                    """,
                    (template["id"], outline_index, item),
                )

    if _table_is_empty(connection, "ops_signals"):
        for signal in OPS_SIGNALS:
            connection.execute(
                "INSERT INTO ops_signals (label, value, tone) VALUES (?, ?, ?)",
                (signal["label"], signal["value"], signal["tone"]),
            )

    if _table_is_empty(connection, "plans"):
        for plan in PAYMENT_PLANS:
            connection.execute(
                """
                INSERT INTO plans (id, name, price, billing_interval, perks_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    plan["id"],
                    plan["name"],
                    plan["price"],
                    plan["billing_interval"],
                    json.dumps(plan["perks"], ensure_ascii=False),
                ),
            )

    if _table_is_empty(connection, "subscriptions"):
        for subscription_id, user_id, plan_id in [
            ("sub-legend-aria", "aria", "legend"),
            ("sub-creator-jin", "jin", "creator-pro"),
        ]:
            connection.execute(
                """
                INSERT INTO subscriptions (id, user_id, plan_id, status, renewal_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    subscription_id,
                    user_id,
                    plan_id,
                    "active",
                    (datetime.now(UTC) + timedelta(days=30)).isoformat(),
                    utc_now(),
                ),
            )


def _serialize_work(connection: sqlite3.Connection, row: sqlite3.Row) -> dict:
    tags = [
        tag_row["tag"]
        for tag_row in connection.execute(
            "SELECT tag FROM work_tags WHERE work_id = ? ORDER BY position",
            (row["id"],),
        ).fetchall()
    ]
    return {
        "id": row["id"],
        "title": row["title"],
        "module": row["module"],
        "label": row["label"],
        "genre": row["genre"],
        "summary": row["summary"],
        "tags": tags,
        "metrics": {
            "concurrent": row["concurrent_metric"],
            "conversion": row["conversion_metric"],
            "retention": row["retention_metric"],
        },
        "hooks": json.loads(row["hooks_json"]),
    }


def _public_user(row: sqlite3.Row) -> dict[str, str | int]:
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
        "membership": row["membership"],
        "sparks": row["sparks"],
        "focus": row["focus"],
    }


def _normalize_handle(seed: str) -> str:
    normalized = "".join(
        character.lower() if character.isalnum() else "-"
        for character in seed.strip()
    )
    parts = [segment for segment in normalized.split("-") if segment]
    return "-".join(parts)[:24] or "projectr-user"


def _default_profile(row: sqlite3.Row | dict) -> dict[str, str | list[str]]:
    role = row["role"]
    name = row["name"]
    defaults = {
        "player": {
            "bio": f"{name} keeps a shortlist of stories, characters, and image packs worth revisiting.",
            "location": "Seoul",
            "avatar_gradient": "linear-gradient(135deg, #1a2840 0%, #214d72 45%, #f76b1c 100%)",
            "favorite_genres": ["Story", "Party Chat", "Romance", "Mystery"],
        },
        "creator": {
            "bio": f"{name} is building repeat-play IP with season drops, premium beats, and creator store loops.",
            "location": "Tokyo",
            "avatar_gradient": "linear-gradient(135deg, #14242e 0%, #1f5c68 48%, #ffd36b 100%)",
            "favorite_genres": ["Creator IP", "Fantasy", "Martial Arts", "Character"],
        },
        "operator": {
            "bio": f"{name} manages live ops, feed quality, safety signals, and conversion experiments.",
            "location": "Singapore",
            "avatar_gradient": "linear-gradient(135deg, #151c32 0%, #304c90 52%, #78f0d5 100%)",
            "favorite_genres": ["Live Ops", "Safety", "Party Chat", "Ranking"],
        },
    }
    role_defaults = defaults.get(role, defaults["player"])
    return {
        "handle": _normalize_handle(row["id"]),
        "bio": role_defaults["bio"],
        "location": role_defaults["location"],
        "avatar_gradient": role_defaults["avatar_gradient"],
        "favorite_genres": role_defaults["favorite_genres"],
    }


def _serialize_profile(
    row: sqlite3.Row,
    profile_row: sqlite3.Row | None,
) -> dict[str, str | int | list[str] | None]:
    defaults = _default_profile(row)
    favorite_genres = (
        json.loads(profile_row["favorite_genres_json"])
        if profile_row is not None
        else defaults["favorite_genres"]
    )
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
        "membership": row["membership"],
        "sparks": row["sparks"],
        "focus": row["focus"],
        "handle": profile_row["handle"] if profile_row is not None else defaults["handle"],
        "bio": profile_row["bio"] if profile_row is not None else defaults["bio"],
        "location": profile_row["location"] if profile_row is not None else defaults["location"],
        "avatar_gradient": (
            profile_row["avatar_gradient"]
            if profile_row is not None
            else defaults["avatar_gradient"]
        ),
        "favorite_genres": favorite_genres,
        "created_at": row["created_at"],
        "updated_at": (
            profile_row["updated_at"] if profile_row is not None else row["created_at"]
        ),
    }


def _resolve_saved_item_snapshot(
    connection: sqlite3.Connection,
    item_kind: str,
    item_id: str,
) -> dict[str, str | list[str]] | None:
    if item_kind == "work":
        row = connection.execute("SELECT * FROM works WHERE id = ?", (item_id,)).fetchone()
        if row is None:
            return None
        tags = [
            tag_row["tag"]
            for tag_row in connection.execute(
                "SELECT tag FROM work_tags WHERE work_id = ? ORDER BY position",
                (item_id,),
            ).fetchall()
        ]
        return {
            "title": row["title"],
            "summary": row["summary"],
            "href": f"/detail/work/{item_id}",
            "meta": row["label"],
            "chips": tags[:4],
        }

    if item_kind == "character":
        row = connection.execute(
            "SELECT * FROM characters WHERE id = ?",
            (item_id,),
        ).fetchone()
        if row is None:
            return None
        return {
            "title": row["name"],
            "summary": row["vibe"] or row["opener"],
            "href": f"/detail/character/{item_id}",
            "meta": row["role"],
            "chips": ["Character", "Chat", "Saved"],
        }

    if item_kind == "style":
        row = connection.execute(
            "SELECT * FROM image_styles WHERE id = ?",
            (item_id,),
        ).fetchone()
        if row is None:
            return None
        return {
            "title": row["name"],
            "summary": row["summary"],
            "href": f"/detail/style/{item_id}",
            "meta": row["palette"],
            "chips": [segment.strip() for segment in row["palette"].split(",")],
        }

    if item_kind == "template":
        row = connection.execute(
            "SELECT * FROM creator_templates WHERE id = ?",
            (item_id,),
        ).fetchone()
        if row is None:
            return None
        outline = [
            outline_row["item_text"]
            for outline_row in connection.execute(
                """
                SELECT item_text
                FROM creator_template_outline
                WHERE template_id = ?
                ORDER BY position
                """,
                (item_id,),
            ).fetchall()
        ]
        return {
            "title": row["title"],
            "summary": row["monetization"],
            "href": f"/detail/template/{item_id}",
            "meta": row["audience"],
            "chips": outline[:4],
        }

    if item_kind == "release":
        row = connection.execute(
            "SELECT * FROM releases WHERE id = ?",
            (item_id,),
        ).fetchone()
        if row is None:
            return None
        return {
            "title": row["title"],
            "summary": row["pitch"],
            "href": f"/detail/release/{item_id}",
            "meta": row["status"],
            "chips": [f'₩{row["price"]:,}', row["projection"]],
        }

    return None


def _serialize_saved_item(
    connection: sqlite3.Connection,
    row: sqlite3.Row,
) -> dict[str, str | list[str]]:
    snapshot = _resolve_saved_item_snapshot(connection, row["item_kind"], row["item_id"])
    if snapshot is None:
        raise ValueError("Saved item target missing")
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "item_kind": row["item_kind"],
        "item_id": row["item_id"],
        "title": snapshot["title"],
        "summary": snapshot["summary"],
        "href": snapshot["href"],
        "meta": snapshot["meta"],
        "chips": snapshot["chips"],
        "created_at": row["created_at"],
    }


def list_feed(query: str | None = None) -> list[dict]:
    sql = "SELECT * FROM works"
    parameters: list[str] = []
    if query:
        sql += " WHERE lower(title || ' ' || genre || ' ' || summary) LIKE lower(?)"
        parameters.append(f"%{query}%")
    sql += " ORDER BY featured_index"

    with get_connection() as connection:
        rows = connection.execute(sql, parameters).fetchall()
        return [_serialize_work(connection, row) for row in rows]


def get_feed_item(work_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM works WHERE id = ?", (work_id,)).fetchone()
        if row is None:
            return None
        return _serialize_work(connection, row)


def list_story_episodes() -> list[dict]:
    with get_connection() as connection:
        episodes = connection.execute(
            "SELECT * FROM story_episodes ORDER BY position"
        ).fetchall()
        payload: list[dict] = []
        for episode in episodes:
            choices = connection.execute(
                """
                SELECT id, label, result, trust_delta, hype_delta, next_episode_id
                FROM story_choices
                WHERE episode_id = ?
                ORDER BY position
                """,
                (episode["id"],),
            ).fetchall()
            payload.append(
                {
                    "id": episode["id"],
                    "title": episode["title"],
                    "scene": episode["scene"],
                    "stakes": episode["stakes"],
                    "choices": [
                        {
                            "id": choice["id"],
                            "label": choice["label"],
                            "result": choice["result"],
                            "trust_delta": choice["trust_delta"],
                            "hype_delta": choice["hype_delta"],
                            "next_episode_id": choice["next_episode_id"],
                        }
                        for choice in choices
                    ],
                }
            )
        return payload


def advance_story(
    episode_id: str,
    choice_id: str,
    trust_score: int,
    hype_score: int,
) -> dict | None:
    with get_connection() as connection:
        choice = connection.execute(
            """
            SELECT label, result, trust_delta, hype_delta, next_episode_id
            FROM story_choices
            WHERE episode_id = ? AND id = ?
            """,
            (episode_id, choice_id),
        ).fetchone()
        if choice is None:
            return None
        return {
            "title": choice["label"],
            "detail": choice["result"],
            "trust_score": trust_score + choice["trust_delta"],
            "hype_score": hype_score + choice["hype_delta"],
            "next_episode_id": choice["next_episode_id"] or episode_id,
        }


def _serialize_story_progress(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None

    return {
        "current_episode_id": row["current_episode_id"],
        "trust_score": row["trust_score"],
        "hype_score": row["hype_score"],
        "visited_episode_ids": json.loads(row["visited_episode_ids_json"]),
        "ending_id": row["ending_id"],
        "log": json.loads(row["log_json"]),
        "started_at": row["started_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_story_run(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "work_id": row["work_id"],
        "ending_id": row["ending_id"],
        "ending_title": row["ending_title"],
        "ending_class": row["ending_class"],
        "reward": row["reward"],
        "trust_score": row["trust_score"],
        "hype_score": row["hype_score"],
        "visited_count": row["visited_count"],
        "choice_count": row["choice_count"],
        "duration_minutes": row["duration_minutes"],
        "created_at": row["created_at"],
        "highlight_tags": json.loads(row["highlight_tags_json"]),
    }


def _serialize_story_ending_unlock(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "work_id": row["work_id"],
        "ending_id": row["ending_id"],
        "ending_title": row["ending_title"],
        "ending_class": row["ending_class"],
        "reward": row["reward"],
        "clear_count": row["clear_count"],
        "sparks_awarded_total": row["sparks_awarded_total"],
        "first_cleared_at": row["first_cleared_at"],
        "last_cleared_at": row["last_cleared_at"],
    }


def _build_story_sync_payload(
    connection: sqlite3.Connection,
    user_id: str,
    work_id: str,
    latest_reward_grant: dict | None = None,
) -> dict:
    progress_row = connection.execute(
        """
        SELECT *
        FROM story_progress
        WHERE user_id = ? AND work_id = ?
        """,
        (user_id, work_id),
    ).fetchone()
    run_rows = connection.execute(
        """
        SELECT *
        FROM story_run_history
        WHERE user_id = ? AND work_id = ?
        ORDER BY created_at DESC
        LIMIT 8
        """,
        (user_id, work_id),
    ).fetchall()
    reward_rows = connection.execute(
        """
        SELECT *
        FROM story_ending_unlocks
        WHERE user_id = ? AND work_id = ?
        ORDER BY last_cleared_at DESC
        """,
        (user_id, work_id),
    ).fetchall()
    user_row = connection.execute(
        "SELECT sparks FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()

    return {
        "work_id": work_id,
        "progress": _serialize_story_progress(progress_row),
        "run_history": [_serialize_story_run(row) for row in run_rows],
        "ending_rewards": [_serialize_story_ending_unlock(row) for row in reward_rows],
        "total_sparks": 0 if user_row is None else user_row["sparks"],
        "latest_reward_grant": latest_reward_grant,
        "synced_at": utc_now(),
    }


def _record_story_completion(
    connection: sqlite3.Connection,
    *,
    user_id: str,
    work_id: str,
    completion: dict,
) -> dict:
    existing_run = connection.execute(
        """
        SELECT id, created_at
        FROM story_run_history
        WHERE id = ? AND user_id = ?
        """,
        (completion["run_id"], user_id),
    ).fetchone()
    unlock_row = connection.execute(
        """
        SELECT *
        FROM story_ending_unlocks
        WHERE user_id = ? AND work_id = ? AND ending_id = ?
        """,
        (user_id, work_id, completion["ending_id"]),
    ).fetchone()

    if existing_run is not None:
        return {
            "awarded": False,
            "sparks_awarded": 0,
            "reward": completion["reward"],
            "tier": "duplicate",
            "clear_count": 0 if unlock_row is None else unlock_row["clear_count"],
            "granted_at": existing_run["created_at"],
        }

    granted_at = completion["created_at"] or utc_now()
    if unlock_row is None:
        unlock_id = str(uuid4())
        sparks_awarded = FIRST_CLEAR_SPARKS
        clear_count = 1
        tier = "first-clear"
        connection.execute(
            """
            INSERT INTO story_ending_unlocks (
                id,
                user_id,
                work_id,
                ending_id,
                ending_title,
                ending_class,
                reward,
                clear_count,
                sparks_awarded_total,
                first_cleared_at,
                last_cleared_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                unlock_id,
                user_id,
                work_id,
                completion["ending_id"],
                completion["ending_title"],
                completion["ending_class"],
                completion["reward"],
                clear_count,
                sparks_awarded,
                granted_at,
                granted_at,
            ),
        )
    else:
        sparks_awarded = ENCORE_CLEAR_SPARKS
        clear_count = unlock_row["clear_count"] + 1
        tier = "encore"
        connection.execute(
            """
            UPDATE story_ending_unlocks
            SET ending_title = ?,
                ending_class = ?,
                reward = ?,
                clear_count = ?,
                sparks_awarded_total = sparks_awarded_total + ?,
                last_cleared_at = ?
            WHERE id = ?
            """,
            (
                completion["ending_title"],
                completion["ending_class"],
                completion["reward"],
                clear_count,
                sparks_awarded,
                granted_at,
                unlock_row["id"],
            ),
        )

    connection.execute(
        """
        INSERT INTO story_run_history (
            id,
            user_id,
            work_id,
            ending_id,
            ending_title,
            ending_class,
            reward,
            trust_score,
            hype_score,
            visited_count,
            choice_count,
            duration_minutes,
            highlight_tags_json,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            completion["run_id"],
            user_id,
            work_id,
            completion["ending_id"],
            completion["ending_title"],
            completion["ending_class"],
            completion["reward"],
            completion["trust_score"],
            completion["hype_score"],
            completion["visited_count"],
            completion["choice_count"],
            completion["duration_minutes"],
            json.dumps(completion["highlight_tags"], ensure_ascii=False),
            granted_at,
        ),
    )
    connection.execute(
        "UPDATE users SET sparks = sparks + ? WHERE id = ?",
        (sparks_awarded, user_id),
    )

    return {
        "awarded": True,
        "sparks_awarded": sparks_awarded,
        "reward": completion["reward"],
        "tier": tier,
        "clear_count": clear_count,
        "granted_at": granted_at,
    }


def get_story_progress_state(user_id: str, work_id: str) -> dict:
    with get_connection() as connection:
        return _build_story_sync_payload(connection, user_id, work_id)


def sync_story_progress(
    user_id: str,
    *,
    work_id: str,
    current_episode_id: str,
    trust_score: int,
    hype_score: int,
    visited_episode_ids: list[str],
    ending_id: str | None,
    log: list[dict],
    started_at: str,
    updated_at: str,
    completion: dict | None = None,
) -> dict:
    with get_connection() as connection:
        user_row = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user_row is None:
            raise ValueError("User not found")

        normalized_episode_ids = [
            episode_id
            for episode_id in dict.fromkeys(visited_episode_ids)
            if episode_id
        ]
        normalized_log = log[:18]
        synced_at = utc_now()
        connection.execute(
            """
            INSERT INTO story_progress (
                user_id,
                work_id,
                current_episode_id,
                trust_score,
                hype_score,
                visited_episode_ids_json,
                ending_id,
                log_json,
                started_at,
                updated_at,
                synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, work_id) DO UPDATE SET
                current_episode_id = excluded.current_episode_id,
                trust_score = excluded.trust_score,
                hype_score = excluded.hype_score,
                visited_episode_ids_json = excluded.visited_episode_ids_json,
                ending_id = excluded.ending_id,
                log_json = excluded.log_json,
                started_at = excluded.started_at,
                updated_at = excluded.updated_at,
                synced_at = excluded.synced_at
            """,
            (
                user_id,
                work_id,
                current_episode_id,
                trust_score,
                hype_score,
                json.dumps(normalized_episode_ids, ensure_ascii=False),
                ending_id,
                json.dumps(normalized_log, ensure_ascii=False),
                started_at,
                updated_at,
                synced_at,
            ),
        )

        latest_reward_grant = None
        if completion is not None and ending_id:
            latest_reward_grant = _record_story_completion(
                connection,
                user_id=user_id,
                work_id=work_id,
                completion=completion,
            )

        connection.commit()
        return _build_story_sync_payload(
            connection,
            user_id,
            work_id,
            latest_reward_grant=latest_reward_grant,
        )


def list_characters() -> list[dict]:
    with get_connection() as connection:
        characters = connection.execute("SELECT * FROM characters ORDER BY name").fetchall()
        payload: list[dict] = []
        for character in characters:
            response_rows = connection.execute(
                """
                SELECT tone, response_text
                FROM character_responses
                WHERE character_id = ?
                ORDER BY tone, position
                """,
                (character["id"],),
            ).fetchall()
            responses: dict[str, list[str]] = {"calm": [], "intense": [], "intimate": []}
            for row in response_rows:
                responses[row["tone"]].append(row["response_text"])
            payload.append(
                {
                    "id": character["id"],
                    "name": character["name"],
                    "role": character["role"],
                    "vibe": character["vibe"],
                    "opener": character["opener"],
                    "responses": responses,
                }
            )
        return payload


def build_chat_reply(character_id: str, message: str, turn_index: int) -> dict | None:
    with get_connection() as connection:
        character = connection.execute(
            "SELECT id, name FROM characters WHERE id = ?",
            (character_id,),
        ).fetchone()
        if character is None:
            return None

        if "!" in message or len(message) > 32:
            tone = "intense"
        elif any(keyword in message for keyword in ("좋아", "보고", "기억", "비밀", "사랑")):
            tone = "intimate"
        else:
            tone = "calm"

        responses = connection.execute(
            """
            SELECT response_text
            FROM character_responses
            WHERE character_id = ? AND tone = ?
            ORDER BY position
            """,
            (character_id, tone),
        ).fetchall()
        if not responses:
            return None
        return {
            "character_id": character["id"],
            "character_name": character["name"],
            "reply": responses[turn_index % len(responses)]["response_text"],
            "tone": tone,
        }


def list_party_scenarios() -> list[dict]:
    with get_connection() as connection:
        scenarios = connection.execute(
            "SELECT * FROM party_scenarios ORDER BY title"
        ).fetchall()
        payload: list[dict] = []
        for scenario in scenarios:
            roles = [
                row["role_name"]
                for row in connection.execute(
                    "SELECT role_name FROM party_roles WHERE scenario_id = ? ORDER BY position",
                    (scenario["id"],),
                ).fetchall()
            ]
            twists = [
                row["twist_text"]
                for row in connection.execute(
                    "SELECT twist_text FROM party_twists WHERE scenario_id = ? ORDER BY position",
                    (scenario["id"],),
                ).fetchall()
            ]
            payload.append(
                {
                    "id": scenario["id"],
                    "title": scenario["title"],
                    "premise": scenario["premise"],
                    "player_roles": roles,
                    "twists": twists,
                }
            )
        return payload


def resolve_party_action(scenario_id: str, action: str, turn_index: int) -> dict | None:
    scenario = next(
        (entry for entry in list_party_scenarios() if entry["id"] == scenario_id),
        None,
    )
    if scenario is None:
        return None
    role = scenario["player_roles"][turn_index % len(scenario["player_roles"])]
    twist = scenario["twists"][turn_index % len(scenario["twists"])]
    return {
        "scenario_id": scenario_id,
        "summary": f'{role} 포지션으로 "{action}"을 선택했습니다. {twist}',
    }


def list_image_styles() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM image_styles ORDER BY name").fetchall()
        return [dict(row) for row in rows]


def generate_image_shot(prompt: str, style_id: str, index: int) -> dict | None:
    with get_connection() as connection:
        style = connection.execute(
            "SELECT * FROM image_styles WHERE id = ?",
            (style_id,),
        ).fetchone()
        if style is None:
            return None
        return {
            "title": f'{style["name"]} Scene {index + 1}',
            "prompt": prompt,
            "style_id": style_id,
            "tagline": f'{style["palette"]} 기반의 공유용 키비주얼',
            "gradient": style["gradient"],
        }


def list_creator_templates() -> list[dict]:
    with get_connection() as connection:
        templates = connection.execute(
            "SELECT * FROM creator_templates ORDER BY title"
        ).fetchall()
        payload: list[dict] = []
        for template in templates:
            outline = [
                row["item_text"]
                for row in connection.execute(
                    """
                    SELECT item_text
                    FROM creator_template_outline
                    WHERE template_id = ?
                    ORDER BY position
                    """,
                    (template["id"],),
                ).fetchall()
            ]
            payload.append(
                {
                    "id": template["id"],
                    "title": template["title"],
                    "module": template["module"],
                    "audience": template["audience"],
                    "monetization": template["monetization"],
                    "outline": outline,
                }
            )
        return payload


def list_ops_signals() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM ops_signals ORDER BY label").fetchall()
        return [dict(row) for row in rows]


def list_plans() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM plans ORDER BY price").fetchall()
        return [
            {
                "id": row["id"],
                "name": row["name"],
                "price": row["price"],
                "billing_interval": row["billing_interval"],
                "perks": json.loads(row["perks_json"]),
            }
            for row in rows
        ]


def list_subscriptions(user_id: str | None = None) -> list[dict]:
    sql = """
        SELECT s.id, s.user_id, s.plan_id, s.status, s.renewal_at, s.created_at, p.name AS plan_name, p.price
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
    """
    parameters: list[str] = []
    if user_id:
        sql += " WHERE s.user_id = ?"
        parameters.append(user_id)
    sql += " ORDER BY s.created_at DESC"

    with get_connection() as connection:
        rows = connection.execute(sql, parameters).fetchall()
        return [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "plan_id": row["plan_id"],
                "plan_name": row["plan_name"],
                "price": row["price"],
                "status": row["status"],
                "renewal_at": row["renewal_at"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]


def create_checkout(
    user_id: str,
    plan_id: str,
    sku: str,
    category: str,
    amount: int,
    currency: str = "KRW",
    status: str = "paid",
) -> dict:
    purchase_id = str(uuid4())
    subscription_id = str(uuid4())
    created_at = utc_now()
    renewal_at = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    with get_connection() as connection:
        user = connection.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        plan = connection.execute(
            "SELECT id, name FROM plans WHERE id = ?",
            (plan_id,),
        ).fetchone()
        if user is None or plan is None:
            raise ValueError("Invalid user or plan")

        connection.execute(
            """
            INSERT INTO purchases (id, user_id, sku, category, amount, currency, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (purchase_id, user_id, sku, category, amount, currency, status, created_at),
        )
        connection.execute(
            """
            INSERT INTO subscriptions (id, user_id, plan_id, status, renewal_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                subscription_id,
                user_id,
                plan_id,
                "active" if status == "paid" else status,
                renewal_at,
                created_at,
            ),
        )
        if status == "paid":
            connection.execute(
                "UPDATE users SET membership = ? WHERE id = ?",
                (plan["name"], user_id),
            )
        connection.commit()

    return {
        "purchase_id": purchase_id,
        "subscription_id": subscription_id,
        "status": status,
        "plan_id": plan_id,
        "renewal_at": renewal_at,
    }


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


def get_user_by_email(email: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE lower(email) = lower(?)",
            (email,),
        ).fetchone()
        return dict(row) if row is not None else None


def get_user_by_id(user_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row is not None else None


def get_user_profile(user_id: str) -> dict | None:
    with get_connection() as connection:
        user_row = connection.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user_row is None:
            return None

        profile_row = connection.execute(
            "SELECT * FROM user_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        return _serialize_profile(user_row, profile_row)


def update_user_profile(
    user_id: str,
    *,
    name: str,
    focus: str,
    handle: str,
    bio: str,
    location: str,
    avatar_gradient: str,
    favorite_genres: list[str],
) -> dict | None:
    normalized_name = name.strip()
    normalized_focus = focus.strip()
    normalized_handle = _normalize_handle(handle)
    normalized_bio = bio.strip()
    normalized_location = location.strip()
    normalized_gradient = avatar_gradient.strip()
    normalized_genres = [
        genre.strip()
        for genre in favorite_genres
        if genre.strip()
    ][:6]

    if not normalized_name or not normalized_focus or not normalized_handle:
        raise ValueError("Invalid profile payload")

    if not normalized_bio:
        normalized_bio = f"{normalized_name} is curating a personal Project R shortlist."
    if not normalized_location:
        normalized_location = "Seoul"
    if not normalized_gradient:
        normalized_gradient = "linear-gradient(135deg, #1a2840 0%, #214d72 45%, #f76b1c 100%)"
    if not normalized_genres:
        normalized_genres = ["Story", "Character", "Party Chat"]

    with get_connection() as connection:
        user_row = connection.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user_row is None:
            return None

        connection.execute(
            """
            UPDATE users
            SET name = ?, focus = ?
            WHERE id = ?
            """,
            (normalized_name, normalized_focus, user_id),
        )

        existing_profile = connection.execute(
            "SELECT user_id FROM user_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        payload = (
            normalized_handle,
            normalized_bio,
            normalized_location,
            normalized_gradient,
            json.dumps(normalized_genres, ensure_ascii=False),
            utc_now(),
            user_id,
        )
        if existing_profile is None:
            connection.execute(
                """
                INSERT INTO user_profiles (
                    handle, bio, location, avatar_gradient, favorite_genres_json, updated_at, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                payload,
            )
        else:
            connection.execute(
                """
                UPDATE user_profiles
                SET handle = ?, bio = ?, location = ?, avatar_gradient = ?,
                    favorite_genres_json = ?, updated_at = ?
                WHERE user_id = ?
                """,
                payload,
            )
        connection.commit()

    return get_user_profile(user_id)


def list_saved_items(user_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM saved_items
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()
        payload: list[dict] = []
        for row in rows:
            try:
                payload.append(_serialize_saved_item(connection, row))
            except ValueError:
                continue
        return payload


def save_item(user_id: str, item_kind: str, item_id: str) -> dict:
    with get_connection() as connection:
        user = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user is None:
            raise ValueError("User not found")

        snapshot = _resolve_saved_item_snapshot(connection, item_kind, item_id)
        if snapshot is None:
            raise ValueError("Save target not found")

        row = connection.execute(
            """
            SELECT *
            FROM saved_items
            WHERE user_id = ? AND item_kind = ? AND item_id = ?
            """,
            (user_id, item_kind, item_id),
        ).fetchone()
        if row is None:
            save_id = str(uuid4())
            created_at = utc_now()
            connection.execute(
                """
                INSERT INTO saved_items (id, user_id, item_kind, item_id, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (save_id, user_id, item_kind, item_id, created_at),
            )
            connection.commit()
            row = connection.execute(
                "SELECT * FROM saved_items WHERE id = ?",
                (save_id,),
            ).fetchone()

        return _serialize_saved_item(connection, row)


def remove_saved_item(user_id: str, item_kind: str, item_id: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM saved_items
            WHERE user_id = ? AND item_kind = ? AND item_id = ?
            """,
            (user_id, item_kind, item_id),
        )
        connection.commit()
        return cursor.rowcount > 0


def create_user(name: str, email: str, password: str, role: str = "player") -> dict:
    password_hash, password_salt = hash_password(password)
    user_id = str(uuid4())

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO users (
                id, email, password_hash, password_salt, name, role, membership, sparks, focus, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                email,
                password_hash,
                password_salt,
                name,
                role,
                "Explorer",
                1200,
                "새로운 세계관 탐색과 첫 구매 전환",
                utc_now(),
            ),
        )
        defaults = _default_profile(
            {
                "id": user_id,
                "name": name,
                "role": role,
            }
        )
        connection.execute(
            """
            INSERT INTO user_profiles (
                user_id, handle, bio, location, avatar_gradient, favorite_genres_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                defaults["handle"],
                defaults["bio"],
                defaults["location"],
                defaults["avatar_gradient"],
                json.dumps(defaults["favorite_genres"], ensure_ascii=False),
                utc_now(),
            ),
        )
        connection.commit()

    return {
        "id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "membership": "Explorer",
        "sparks": 1200,
        "focus": "새로운 세계관 탐색과 첫 구매 전환",
    }


def authenticate_user(email: str, password: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE lower(email) = lower(?)",
            (email,),
        ).fetchone()
        if row is None:
            return None
        if not verify_password(password, row["password_hash"], row["password_salt"]):
            return None
        return dict(row)


def create_auth_session(user_id: str) -> dict:
    token = issue_token()
    session_id = str(uuid4())
    expires_at = (datetime.now(UTC) + timedelta(days=30)).isoformat()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO auth_sessions (id, user_id, token, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (session_id, user_id, token, utc_now(), expires_at),
        )
        user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        connection.commit()

    return {
        "session_id": session_id,
        "token": token,
        "expires_at": expires_at,
        "user": _public_user(user),
    }


def get_user_by_token(token: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT u.*
            FROM auth_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > ?
            """,
            (token, utc_now()),
        ).fetchone()
        return _public_user(row) if row is not None else None


def revoke_auth_session(token: str) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM auth_sessions WHERE token = ?",
            (token,),
        )
        connection.commit()
        return cursor.rowcount > 0


def list_preset_users() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM users
            WHERE id IN (?, ?, ?)
            ORDER BY CASE id WHEN 'aria' THEN 1 WHEN 'jin' THEN 2 WHEN 'mina' THEN 3 ELSE 99 END
            """,
            ("aria", "jin", "mina"),
        ).fetchall()
        return [_public_user(row) for row in rows]


def create_preset_session(preset_id: str) -> dict | None:
    user = get_user_by_id(preset_id)
    if user is None:
        return None
    return create_auth_session(user["id"])


def fetch_bootstrap_payload(user_id: str | None = None) -> dict:
    episodes = [
        {
            "id": episode["id"],
            "title": episode["title"],
            "scene": episode["scene"],
            "stakes": episode["stakes"],
            "choices": [
                {
                    "id": choice["id"],
                    "label": choice["label"],
                    "result": choice["result"],
                    "trustDelta": choice["trust_delta"],
                    "hypeDelta": choice["hype_delta"],
                    "nextEpisodeId": choice["next_episode_id"],
                }
                for choice in episode["choices"]
            ],
        }
        for episode in list_story_episodes()
    ]
    characters = [
        {
            "id": character["id"],
            "name": character["name"],
            "role": character["role"],
            "vibe": character["vibe"],
            "opener": character["opener"],
            "responsePools": character["responses"],
        }
        for character in list_characters()
    ]
    party_scenarios = [
        {
            "id": scenario["id"],
            "title": scenario["title"],
            "premise": scenario["premise"],
            "playerRoles": scenario["player_roles"],
            "actions": PARTY_ACTIONS.get(
                scenario["id"],
                [
                    "Lead the room with a high-conviction play",
                    "Test a hidden alliance",
                    "Trigger a reveal before the timer ends",
                ],
            ),
            "twists": scenario["twists"],
        }
        for scenario in list_party_scenarios()
    ]
    plans = [
        {
            "id": plan["id"],
            "name": plan["name"],
            "price": plan["price"],
            "billingInterval": plan["billing_interval"],
            "perks": plan["perks"],
        }
        for plan in list_plans()
    ]
    subscriptions = [
        {
            "id": subscription["id"],
            "userId": subscription["user_id"],
            "planId": subscription["plan_id"],
            "planName": subscription["plan_name"],
            "price": subscription["price"],
            "status": subscription["status"],
            "renewalAt": subscription["renewal_at"],
            "createdAt": subscription["created_at"],
        }
        for subscription in list_subscriptions(user_id)
    ]
    releases = [
        {
            "id": release["id"],
            "title": release["title"],
            "module": release["module"],
            "pitch": release["pitch"],
            "price": release["price"],
            "projection": release["projection"],
            "status": release["status"],
            "createdAt": release["created_at"],
        }
        for release in list_releases()
    ]
    return {
        "presets": list_preset_users(),
        "feed": list_feed(),
        "episodes": episodes,
        "characters": characters,
        "partyScenarios": party_scenarios,
        "styles": list_image_styles(),
        "creatorTemplates": list_creator_templates(),
        "opsSignals": list_ops_signals(),
        "plans": plans,
        "subscriptions": subscriptions,
        "releases": releases,
    }
