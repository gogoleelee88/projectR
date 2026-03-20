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
CHAT_REWARD_CATALOG = {
    "astra": [
        {
            "id": "orbit-key",
            "title": "Orbit Key Memory",
            "summary": "Astra opens a private orbit memory drop with behind-the-scene notes.",
            "affinity_threshold": 18,
            "sparks_awarded": 180,
        },
        {
            "id": "inner-ring",
            "title": "Inner Ring Voice Drop",
            "summary": "Astra unlocks an intimate voice-note style confession track.",
            "affinity_threshold": 42,
            "sparks_awarded": 320,
        },
        {
            "id": "zero-g-vow",
            "title": "Zero-G Vow Route",
            "summary": "Astra opens the premium vow route with long-arc callbacks.",
            "affinity_threshold": 72,
            "sparks_awarded": 560,
        },
    ],
    "noir": [
        {
            "id": "black-card",
            "title": "Black Card Pass",
            "summary": "Noir grants access to the private market after-hours channel.",
            "affinity_threshold": 16,
            "sparks_awarded": 160,
        },
        {
            "id": "velvet-deal",
            "title": "Velvet Deal",
            "summary": "Noir opens a premium deal room with risk-heavy prompts.",
            "affinity_threshold": 40,
            "sparks_awarded": 300,
        },
        {
            "id": "midnight-contract",
            "title": "Midnight Contract",
            "summary": "Noir unlocks the top-tier contract route with loyalty callbacks.",
            "affinity_threshold": 70,
            "sparks_awarded": 540,
        },
    ],
}
ECONOMY_OFFERS = [
    {
        "id": "legend-pass-s01",
        "offer_type": "subscription",
        "category": "membership",
        "name": "Legend Pass",
        "headline": "Season 01 premium loop",
        "summary": "Recurring premium access for flagship story, character, and event drops.",
        "price": 19900,
        "currency": "KRW",
        "badge": "Best conversion",
        "payload": {
            "plan_id": "legend",
            "recurring": True,
            "grant_sparks": 2200,
            "bonus_sparks": 400,
            "highlight": "Priority access to season drops and premium endings.",
            "tags": ["Flagship", "Recurring", "Premium story"],
            "included_unlocks": [
                {
                    "item_id": "season-01-fast-lane",
                    "category": "season-pass",
                    "title": "Season 01 Fast Lane",
                    "summary": "Priority access to premium story drops and finale rewards.",
                    "quantity": 1,
                },
                {
                    "item_id": "character-priority-queue",
                    "category": "character-upgrade",
                    "title": "Character Priority Queue",
                    "summary": "Faster response lane for premium character sessions.",
                    "quantity": 1,
                },
            ],
        },
    },
    {
        "id": "creator-pro-command",
        "offer_type": "subscription",
        "category": "creator-suite",
        "name": "Creator Pro Command",
        "headline": "Revenue-ready creator suite",
        "summary": "Production tooling for creator publishing, launch reviews, and commerce packaging.",
        "price": 49900,
        "currency": "KRW",
        "badge": "High ARPPU",
        "payload": {
            "plan_id": "creator-pro",
            "recurring": True,
            "grant_sparks": 5200,
            "bonus_sparks": 1600,
            "highlight": "Publishing priority, store placement, and launch packaging.",
            "tags": ["Creator", "Commerce", "Launch ops"],
            "included_unlocks": [
                {
                    "item_id": "creator-launch-console",
                    "category": "creator-tool",
                    "title": "Creator Launch Console",
                    "summary": "Unlocks launch checklists, store bundles, and revenue reporting.",
                    "quantity": 1,
                },
                {
                    "item_id": "priority-review-lane",
                    "category": "creator-tool",
                    "title": "Priority Review Lane",
                    "summary": "Moves releases into a faster review queue.",
                    "quantity": 1,
                },
            ],
        },
    },
    {
        "id": "spark-vault-2400",
        "offer_type": "bundle",
        "category": "spark-pack",
        "name": "Spark Vault 2400",
        "headline": "Fast refill for active spenders",
        "summary": "Top-up pack tuned for redemption-heavy players and live event shoppers.",
        "price": 22000,
        "currency": "KRW",
        "badge": "Refill pack",
        "payload": {
            "recurring": False,
            "grant_sparks": 2400,
            "bonus_sparks": 240,
            "highlight": "Balanced top-up for route keys, creator slots, and image credits.",
            "tags": ["Top-up", "Flexible", "Mid-core"],
            "included_unlocks": [
                {
                    "item_id": "vault-buyer-badge",
                    "category": "wallet-bonus",
                    "title": "Vault Buyer Badge",
                    "summary": "Marks the account for bonus live-shop events.",
                    "quantity": 1,
                }
            ],
        },
    },
    {
        "id": "orbit-collection-drop",
        "offer_type": "bundle",
        "category": "premium-drop",
        "name": "Orbit Collection Drop",
        "headline": "Collector bundle for story and character fans",
        "summary": "A premium pack combining spendable sparks with collectible unlocks for flagship IP.",
        "price": 35900,
        "currency": "KRW",
        "badge": "Collector",
        "payload": {
            "recurring": False,
            "grant_sparks": 3200,
            "bonus_sparks": 600,
            "highlight": "Premium collectibles plus spendable sparks for the next return session.",
            "tags": ["Collector", "IP bundle", "High intent"],
            "included_unlocks": [
                {
                    "item_id": "astra-archive-collection",
                    "category": "collectible",
                    "title": "Astra Archive Collection",
                    "summary": "Unlocks the collector-grade Astra memory archive.",
                    "quantity": 1,
                },
                {
                    "item_id": "millennium-vault-pass",
                    "category": "story-upgrade",
                    "title": "Millennium Vault Pass",
                    "summary": "Unlocks premium vault notes for the Millennium campaign.",
                    "quantity": 1,
                },
            ],
        },
    },
]
ECONOMY_REDEMPTIONS = [
    {
        "id": "astra-priority-channel",
        "category": "character-upgrade",
        "title": "Astra Priority Channel",
        "summary": "Spend sparks to unlock Astra's higher-intensity premium conversation lane.",
        "sparks_cost": 840,
        "badge": "Character premium",
        "payload": {
            "repeatable": False,
            "tags": ["Character", "Premium lane"],
            "grant": {
                "item_id": "astra-priority-channel",
                "category": "character-upgrade",
                "title": "Astra Priority Channel",
                "summary": "Priority channel for Astra with premium prompt access.",
                "quantity": 1,
            },
        },
    },
    {
        "id": "millennium-route-key",
        "category": "story-upgrade",
        "title": "Millennium Route Key",
        "summary": "Unlock the premium side-route key for the Millennium campaign.",
        "sparks_cost": 1180,
        "badge": "Story unlock",
        "payload": {
            "repeatable": False,
            "tags": ["Story", "Route key"],
            "grant": {
                "item_id": "millennium-route-key",
                "category": "story-upgrade",
                "title": "Millennium Route Key",
                "summary": "Opens the hidden route gate and vault notes for Millennium.",
                "quantity": 1,
            },
        },
    },
    {
        "id": "studio-cinematic-pack",
        "category": "studio-credit",
        "title": "Studio Cinematic Pack",
        "summary": "Convert sparks into cinematic render credits for higher-output image sessions.",
        "sparks_cost": 980,
        "badge": "Repeatable",
        "payload": {
            "repeatable": True,
            "tags": ["Studio", "Render credits"],
            "grant": {
                "item_id": "studio-cinematic-pack",
                "category": "studio-credit",
                "title": "Studio Cinematic Pack",
                "summary": "Adds six cinematic render credits to the studio wallet.",
                "quantity": 6,
            },
        },
    },
    {
        "id": "creator-drop-slot",
        "category": "creator-slot",
        "title": "Creator Drop Slot",
        "summary": "Spend sparks to open another premium storefront slot for creator launches.",
        "sparks_cost": 1450,
        "badge": "Repeatable",
        "payload": {
            "repeatable": True,
            "tags": ["Creator", "Storefront"],
            "grant": {
                "item_id": "creator-drop-slot",
                "category": "creator-slot",
                "title": "Creator Drop Slot",
                "summary": "Adds one premium storefront slot to the creator console.",
                "quantity": 1,
            },
        },
    },
]


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
            CREATE TABLE IF NOT EXISTS economy_offers (
                id TEXT PRIMARY KEY,
                offer_type TEXT NOT NULL,
                category TEXT NOT NULL,
                name TEXT NOT NULL,
                headline TEXT NOT NULL,
                summary TEXT NOT NULL,
                price INTEGER NOT NULL,
                currency TEXT NOT NULL,
                badge TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                active INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS economy_redemptions (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                sparks_cost INTEGER NOT NULL,
                badge TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                active INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS wallet_ledger (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                currency TEXT NOT NULL,
                amount_delta INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                source_kind TEXT NOT NULL,
                source_id TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created_at
                ON wallet_ledger (user_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS payment_intents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                offer_id TEXT NOT NULL REFERENCES economy_offers(id),
                provider TEXT NOT NULL,
                platform TEXT NOT NULL,
                status TEXT NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT NOT NULL,
                client_secret TEXT NOT NULL,
                receipt_token TEXT,
                provider_reference TEXT,
                purchase_id TEXT,
                subscription_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                settled_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_payment_intents_user_created_at
                ON payment_intents (user_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS payment_events (
                id TEXT PRIMARY KEY,
                intent_id TEXT NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                status TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_payment_events_intent_created_at
                ON payment_events (intent_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS billing_incidents (
                id TEXT PRIMARY KEY,
                intent_id TEXT NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                provider TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_billing_incidents_intent_updated_at
                ON billing_incidents (intent_id, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_billing_incidents_status_updated_at
                ON billing_incidents (status, updated_at DESC);
            CREATE TABLE IF NOT EXISTS economy_inventory (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                item_id TEXT NOT NULL,
                source_kind TEXT NOT NULL,
                source_id TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                metadata_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (user_id, item_id)
            );
            CREATE INDEX IF NOT EXISTS idx_economy_inventory_user_updated_at
                ON economy_inventory (user_id, updated_at DESC);
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
            CREATE TABLE IF NOT EXISTS character_relationships (
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                affinity_score INTEGER NOT NULL,
                bond_level TEXT NOT NULL,
                conversation_count INTEGER NOT NULL,
                streak_count INTEGER NOT NULL,
                last_tone TEXT NOT NULL,
                last_user_message TEXT NOT NULL,
                last_character_reply TEXT NOT NULL,
                last_message_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, character_id)
            );
            CREATE TABLE IF NOT EXISTS character_messages (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                sender TEXT NOT NULL,
                message_text TEXT NOT NULL,
                tone TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_character_messages_user_character_created_at
                ON character_messages (user_id, character_id, created_at);
            CREATE TABLE IF NOT EXISTS character_reward_unlocks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                reward_id TEXT NOT NULL,
                reward_title TEXT NOT NULL,
                reward_summary TEXT NOT NULL,
                affinity_threshold INTEGER NOT NULL,
                sparks_awarded INTEGER NOT NULL,
                unlocked_at TEXT NOT NULL,
                UNIQUE (user_id, character_id, reward_id)
            );
            CREATE INDEX IF NOT EXISTS idx_character_reward_unlocks_user_character_unlocked_at
                ON character_reward_unlocks (user_id, character_id, unlocked_at DESC);
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

    if _table_is_empty(connection, "economy_offers"):
        for offer in ECONOMY_OFFERS:
            connection.execute(
                """
                INSERT INTO economy_offers (
                    id, offer_type, category, name, headline, summary,
                    price, currency, badge, payload_json, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    offer["id"],
                    offer["offer_type"],
                    offer["category"],
                    offer["name"],
                    offer["headline"],
                    offer["summary"],
                    offer["price"],
                    offer["currency"],
                    offer["badge"],
                    json.dumps(offer["payload"], ensure_ascii=False),
                    1,
                ),
            )

    if _table_is_empty(connection, "economy_redemptions"):
        for redemption in ECONOMY_REDEMPTIONS:
            connection.execute(
                """
                INSERT INTO economy_redemptions (
                    id, category, title, summary, sparks_cost, badge, payload_json, active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    redemption["id"],
                    redemption["category"],
                    redemption["title"],
                    redemption["summary"],
                    redemption["sparks_cost"],
                    redemption["badge"],
                    json.dumps(redemption["payload"], ensure_ascii=False),
                    1,
                ),
            )

    if _table_is_empty(connection, "wallet_ledger"):
        users = connection.execute("SELECT id, sparks FROM users ORDER BY created_at").fetchall()
        for user in users:
            connection.execute(
                """
                INSERT INTO wallet_ledger (
                    id, user_id, currency, amount_delta, balance_after,
                    source_kind, source_id, title, summary, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid4()),
                    user["id"],
                    "sparks",
                    user["sparks"],
                    user["sparks"],
                    "system-bootstrap",
                    "initial-balance",
                    "Opening Spark Bank",
                    "Imported starting balance for the account wallet.",
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


def _serialize_economy_offer(row: sqlite3.Row) -> dict:
    payload = json.loads(row["payload_json"])
    return {
        "id": row["id"],
        "offer_type": row["offer_type"],
        "category": row["category"],
        "name": row["name"],
        "headline": row["headline"],
        "summary": row["summary"],
        "price": row["price"],
        "currency": row["currency"],
        "badge": row["badge"],
        "recurring": bool(payload.get("recurring", False)),
        "grant_sparks": payload.get("grant_sparks", 0),
        "bonus_sparks": payload.get("bonus_sparks", 0),
        "highlight": payload.get("highlight", ""),
        "tags": payload.get("tags", []),
        "plan_id": payload.get("plan_id"),
        "included_unlocks": payload.get("included_unlocks", []),
    }


def _serialize_economy_redemption(row: sqlite3.Row) -> dict:
    payload = json.loads(row["payload_json"])
    grant = payload.get("grant", {})
    return {
        "id": row["id"],
        "category": row["category"],
        "title": row["title"],
        "summary": row["summary"],
        "sparks_cost": row["sparks_cost"],
        "badge": row["badge"],
        "repeatable": bool(payload.get("repeatable", False)),
        "tags": payload.get("tags", []),
        "grant": {
            "item_id": grant.get("item_id", row["id"]),
            "category": grant.get("category", row["category"]),
            "title": grant.get("title", row["title"]),
            "summary": grant.get("summary", row["summary"]),
            "quantity": int(grant.get("quantity", 1)),
        },
    }


def _serialize_wallet_entry(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "currency": row["currency"],
        "amount_delta": row["amount_delta"],
        "balance_after": row["balance_after"],
        "source_kind": row["source_kind"],
        "source_id": row["source_id"],
        "title": row["title"],
        "summary": row["summary"],
        "created_at": row["created_at"],
    }


def _serialize_inventory_item(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "item_id": row["item_id"],
        "source_kind": row["source_kind"],
        "source_id": row["source_id"],
        "category": row["category"],
        "title": row["title"],
        "summary": row["summary"],
        "quantity": row["quantity"],
        "metadata": json.loads(row["metadata_json"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_payment_intent(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "offer_id": row["offer_id"],
        "provider": row["provider"],
        "platform": row["platform"],
        "status": row["status"],
        "amount": row["amount"],
        "currency": row["currency"],
        "client_secret": row["client_secret"],
        "receipt_token": row["receipt_token"],
        "provider_reference": row["provider_reference"],
        "purchase_id": row["purchase_id"],
        "subscription_id": row["subscription_id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "settled_at": row["settled_at"],
    }


def _serialize_payment_event(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "intent_id": row["intent_id"],
        "event_type": row["event_type"],
        "status": row["status"],
        "payload": json.loads(row["payload_json"]),
        "created_at": row["created_at"],
    }


def _record_payment_event(
    connection: sqlite3.Connection,
    *,
    intent_id: str,
    event_type: str,
    status: str,
    payload: dict,
) -> dict:
    event_id = str(uuid4())
    created_at = utc_now()
    connection.execute(
        """
        INSERT INTO payment_events (id, intent_id, event_type, status, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            event_id,
            intent_id,
            event_type,
            status,
            json.dumps(payload, ensure_ascii=False),
            created_at,
        ),
    )
    return {
        "id": event_id,
        "intent_id": intent_id,
        "event_type": event_type,
        "status": status,
        "payload": payload,
        "created_at": created_at,
    }


def _serialize_billing_incident(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "intent_id": row["intent_id"],
        "user_id": row["user_id"],
        "provider": row["provider"],
        "severity": row["severity"],
        "status": row["status"],
        "title": row["title"],
        "summary": row["summary"],
        "payload": json.loads(row["payload_json"]) if row["payload_json"] else {},
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _record_billing_incident(
    connection: sqlite3.Connection,
    *,
    intent_id: str,
    user_id: str,
    provider: str,
    severity: str,
    status: str,
    title: str,
    summary: str,
    payload: dict | None = None,
) -> dict:
    incident_id = str(uuid4())
    now = utc_now()
    connection.execute(
        """
        INSERT INTO billing_incidents (
            id, intent_id, user_id, provider, severity, status,
            title, summary, payload_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            incident_id,
            intent_id,
            user_id,
            provider,
            severity,
            status,
            title,
            summary,
            json.dumps(payload or {}, ensure_ascii=False),
            now,
            now,
        ),
    )
    row = connection.execute(
        "SELECT * FROM billing_incidents WHERE id = ?",
        (incident_id,),
    ).fetchone()
    return _serialize_billing_incident(row)


def _record_spark_ledger_entry(
    connection: sqlite3.Connection,
    *,
    user_id: str,
    amount_delta: int,
    source_kind: str,
    source_id: str,
    title: str,
    summary: str,
) -> dict:
    user_row = connection.execute(
        "SELECT sparks FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    if user_row is None:
        raise ValueError("User not found")

    next_balance = user_row["sparks"] + amount_delta
    if next_balance < 0:
        raise ValueError("Insufficient sparks")

    created_at = utc_now()
    entry_id = str(uuid4())
    connection.execute(
        "UPDATE users SET sparks = ? WHERE id = ?",
        (next_balance, user_id),
    )
    connection.execute(
        """
        INSERT INTO wallet_ledger (
            id, user_id, currency, amount_delta, balance_after,
            source_kind, source_id, title, summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            entry_id,
            user_id,
            "sparks",
            amount_delta,
            next_balance,
            source_kind,
            source_id,
            title,
            summary,
            created_at,
        ),
    )
    return {
        "id": entry_id,
        "currency": "sparks",
        "amount_delta": amount_delta,
        "balance_after": next_balance,
        "source_kind": source_kind,
        "source_id": source_id,
        "title": title,
        "summary": summary,
        "created_at": created_at,
    }


def _grant_inventory_item(
    connection: sqlite3.Connection,
    *,
    user_id: str,
    item_id: str,
    source_kind: str,
    source_id: str,
    category: str,
    title: str,
    summary: str,
    quantity: int = 1,
    metadata: dict | None = None,
) -> dict:
    current = connection.execute(
        """
        SELECT *
        FROM economy_inventory
        WHERE user_id = ? AND item_id = ?
        """,
        (user_id, item_id),
    ).fetchone()
    now = utc_now()
    payload = json.dumps(metadata or {}, ensure_ascii=False)

    if current is None:
        item_id_pk = str(uuid4())
        connection.execute(
            """
            INSERT INTO economy_inventory (
                id, user_id, item_id, source_kind, source_id, category,
                title, summary, quantity, metadata_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item_id_pk,
                user_id,
                item_id,
                source_kind,
                source_id,
                category,
                title,
                summary,
                quantity,
                payload,
                now,
                now,
            ),
        )
        row = connection.execute(
            "SELECT * FROM economy_inventory WHERE id = ?",
            (item_id_pk,),
        ).fetchone()
        return _serialize_inventory_item(row)

    next_quantity = current["quantity"] + quantity
    connection.execute(
        """
        UPDATE economy_inventory
        SET source_kind = ?, source_id = ?, category = ?, title = ?, summary = ?,
            quantity = ?, metadata_json = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            source_kind,
            source_id,
            category,
            title,
            summary,
            next_quantity,
            payload,
            now,
            current["id"],
        ),
    )
    row = connection.execute(
        "SELECT * FROM economy_inventory WHERE id = ?",
        (current["id"],),
    ).fetchone()
    return _serialize_inventory_item(row)


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
    _record_spark_ledger_entry(
        connection,
        user_id=user_id,
        amount_delta=sparks_awarded,
        source_kind="story-ending",
        source_id=completion["ending_id"],
        title=completion["reward"],
        summary=f'{completion["ending_title"]} clear reward credited to the spark bank.',
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


def _get_character_reward_catalog(character_id: str) -> list[dict]:
    rewards = CHAT_REWARD_CATALOG.get(character_id)
    if rewards:
        return rewards

    return [
        {
            "id": "warm-signal",
            "title": "Warm Signal",
            "summary": "A personal callback route opens for this character.",
            "affinity_threshold": 18,
            "sparks_awarded": 160,
        },
        {
            "id": "inner-circle",
            "title": "Inner Circle",
            "summary": "A stronger memory callback set unlocks for repeat conversations.",
            "affinity_threshold": 42,
            "sparks_awarded": 300,
        },
        {
            "id": "signature-route",
            "title": "Signature Route",
            "summary": "The premium relationship route is now unlocked.",
            "affinity_threshold": 70,
            "sparks_awarded": 520,
        },
    ]


def _bond_level_for_affinity(score: int) -> str:
    if score >= 70:
        return "Locked Constellation"
    if score >= 42:
        return "Inner Ring"
    if score >= 18:
        return "Open Orbit"
    return "Signal Warm-up"


def _calculate_affinity_gain(message: str, tone: str, conversation_count: int) -> int:
    base_gain = {"calm": 6, "intense": 8, "intimate": 11}.get(tone, 6)
    lower_message = message.lower()
    bonus = 0

    if len(message.strip()) >= 40:
        bonus += 2
    if "?" in message:
        bonus += 1
    if conversation_count == 0:
        bonus += 2
    if any(
        keyword in lower_message
        for keyword in (
            "trust",
            "remember",
            "again",
            "stay",
            "promise",
            "secret",
            "always",
            "좋아",
            "기억",
            "비밀",
            "약속",
            "사랑",
        )
    ):
        bonus += 3

    return min(16, base_gain + bonus)


def _serialize_character_message(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "sender": row["sender"],
        "text": row["message_text"],
        "tone": row["tone"],
        "created_at": row["created_at"],
    }


def _serialize_character_reward(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "reward_id": row["reward_id"],
        "title": row["reward_title"],
        "summary": row["reward_summary"],
        "affinity_threshold": row["affinity_threshold"],
        "sparks_awarded": row["sparks_awarded"],
        "unlocked_at": row["unlocked_at"],
    }


def _build_character_chat_payload(
    connection: sqlite3.Connection,
    user_id: str,
    character_id: str,
    latest_reward_grant: dict | None = None,
) -> dict:
    character_row = connection.execute(
        """
        SELECT id, name, role, vibe, opener
        FROM characters
        WHERE id = ?
        """,
        (character_id,),
    ).fetchone()
    if character_row is None:
        raise ValueError("Character not found")

    relationship_row = connection.execute(
        """
        SELECT *
        FROM character_relationships
        WHERE user_id = ? AND character_id = ?
        """,
        (user_id, character_id),
    ).fetchone()
    message_rows = connection.execute(
        """
        SELECT id, user_id, character_id, sender, message_text, tone, created_at
        FROM (
            SELECT rowid AS message_order, *
            FROM character_messages
            WHERE user_id = ? AND character_id = ?
            ORDER BY message_order DESC
            LIMIT 48
        )
        ORDER BY message_order ASC
        """,
        (user_id, character_id),
    ).fetchall()
    reward_rows = connection.execute(
        """
        SELECT *
        FROM character_reward_unlocks
        WHERE user_id = ? AND character_id = ?
        ORDER BY unlocked_at DESC
        """,
        (user_id, character_id),
    ).fetchall()
    user_row = connection.execute(
        "SELECT sparks FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()

    affinity_score = 0 if relationship_row is None else relationship_row["affinity_score"]
    unlocked_reward_ids = {row["reward_id"] for row in reward_rows}
    next_reward = next(
        (
            reward
            for reward in _get_character_reward_catalog(character_id)
            if reward["id"] not in unlocked_reward_ids and reward["affinity_threshold"] > affinity_score
        ),
        None,
    )

    return {
        "character_id": character_row["id"],
        "character_name": character_row["name"],
        "role": character_row["role"],
        "vibe": character_row["vibe"],
        "opener": character_row["opener"],
        "affinity_score": affinity_score,
        "bond_level": (
            _bond_level_for_affinity(affinity_score)
            if relationship_row is None
            else relationship_row["bond_level"]
        ),
        "conversation_count": 0
        if relationship_row is None
        else relationship_row["conversation_count"],
        "streak_count": 0 if relationship_row is None else relationship_row["streak_count"],
        "last_tone": "calm" if relationship_row is None else relationship_row["last_tone"],
        "last_message_at": ""
        if relationship_row is None
        else relationship_row["last_message_at"],
        "messages": [_serialize_character_message(row) for row in message_rows],
        "unlocked_rewards": [_serialize_character_reward(row) for row in reward_rows],
        "next_reward": None
        if next_reward is None
        else {
            "reward_id": next_reward["id"],
            "title": next_reward["title"],
            "summary": next_reward["summary"],
            "affinity_threshold": next_reward["affinity_threshold"],
            "remaining_affinity": max(0, next_reward["affinity_threshold"] - affinity_score),
            "sparks_awarded": next_reward["sparks_awarded"],
        },
        "total_sparks": 0 if user_row is None else user_row["sparks"],
        "latest_reward_grant": latest_reward_grant,
        "synced_at": utc_now(),
    }


def _record_character_reward_unlocks(
    connection: sqlite3.Connection,
    *,
    user_id: str,
    character_id: str,
    affinity_score: int,
) -> dict | None:
    granted_payload: dict | None = None

    for reward in _get_character_reward_catalog(character_id):
        if affinity_score < reward["affinity_threshold"]:
            continue

        existing_row = connection.execute(
            """
            SELECT id
            FROM character_reward_unlocks
            WHERE user_id = ? AND character_id = ? AND reward_id = ?
            """,
            (user_id, character_id, reward["id"]),
        ).fetchone()
        if existing_row is not None:
            continue

        unlock_id = str(uuid4())
        unlocked_at = utc_now()
        connection.execute(
            """
            INSERT INTO character_reward_unlocks (
                id,
                user_id,
                character_id,
                reward_id,
                reward_title,
                reward_summary,
                affinity_threshold,
                sparks_awarded,
                unlocked_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                unlock_id,
                user_id,
                character_id,
                reward["id"],
                reward["title"],
                reward["summary"],
                reward["affinity_threshold"],
                reward["sparks_awarded"],
                unlocked_at,
            ),
        )
        _record_spark_ledger_entry(
            connection,
            user_id=user_id,
            amount_delta=reward["sparks_awarded"],
            source_kind="character-bond",
            source_id=reward["id"],
            title=reward["title"],
            summary=f'{character_id} bond reward credited after crossing the affinity threshold.',
        )
        granted_payload = {
            "awarded": True,
            "reward_id": reward["id"],
            "title": reward["title"],
            "summary": reward["summary"],
            "sparks_awarded": reward["sparks_awarded"],
            "affinity_threshold": reward["affinity_threshold"],
            "granted_at": unlocked_at,
        }

    return granted_payload


def get_character_chat_state(user_id: str, character_id: str) -> dict:
    with get_connection() as connection:
        return _build_character_chat_payload(connection, user_id, character_id)


def continue_character_chat(
    user_id: str,
    *,
    character_id: str,
    message: str,
    live_response: dict | None = None,
) -> dict:
    normalized_message = message.strip()
    if not normalized_message:
        raise ValueError("Message is required")

    with get_connection() as connection:
        user_row = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user_row is None:
            raise ValueError("User not found")

        relationship_row = connection.execute(
            """
            SELECT *
            FROM character_relationships
            WHERE user_id = ? AND character_id = ?
            """,
            (user_id, character_id),
        ).fetchone()
        conversation_count = (
            0 if relationship_row is None else relationship_row["conversation_count"]
        )

    response = live_response or build_chat_reply(character_id, normalized_message, conversation_count)
    if response is None:
        raise ValueError("Character not found")

    with get_connection() as connection:
        relationship_row = connection.execute(
            """
            SELECT *
            FROM character_relationships
            WHERE user_id = ? AND character_id = ?
            """,
            (user_id, character_id),
        ).fetchone()
        conversation_count = (
            0 if relationship_row is None else relationship_row["conversation_count"]
        )
        affinity_score = 0 if relationship_row is None else relationship_row["affinity_score"]
        affinity_delta = _calculate_affinity_gain(
            normalized_message,
            response["tone"],
            conversation_count,
        )
        next_affinity_score = min(100, affinity_score + affinity_delta)
        now = utc_now()
        next_streak = min(
            7,
            (1 if relationship_row is None else relationship_row["streak_count"] + 1),
        )
        bond_level = _bond_level_for_affinity(next_affinity_score)

        connection.execute(
            """
            INSERT INTO character_messages (id, user_id, character_id, sender, message_text, tone, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                user_id,
                character_id,
                "user",
                normalized_message,
                response["tone"],
                now,
            ),
        )
        connection.execute(
            """
            INSERT INTO character_messages (id, user_id, character_id, sender, message_text, tone, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                user_id,
                character_id,
                "character",
                response["reply"],
                response["tone"],
                now,
            ),
        )
        connection.execute(
            """
            INSERT INTO character_relationships (
                user_id,
                character_id,
                affinity_score,
                bond_level,
                conversation_count,
                streak_count,
                last_tone,
                last_user_message,
                last_character_reply,
                last_message_at,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, character_id) DO UPDATE SET
                affinity_score = excluded.affinity_score,
                bond_level = excluded.bond_level,
                conversation_count = excluded.conversation_count,
                streak_count = excluded.streak_count,
                last_tone = excluded.last_tone,
                last_user_message = excluded.last_user_message,
                last_character_reply = excluded.last_character_reply,
                last_message_at = excluded.last_message_at,
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                character_id,
                next_affinity_score,
                bond_level,
                conversation_count + 1,
                next_streak,
                response["tone"],
                normalized_message,
                response["reply"],
                now,
                now if relationship_row is None else relationship_row["created_at"],
                now,
            ),
        )
        latest_reward_grant = _record_character_reward_unlocks(
            connection,
            user_id=user_id,
            character_id=character_id,
            affinity_score=next_affinity_score,
        )
        connection.commit()
        state = _build_character_chat_payload(
            connection,
            user_id,
            character_id,
            latest_reward_grant=latest_reward_grant,
        )

    return {
        "character_id": response["character_id"],
        "character_name": response["character_name"],
        "reply": response["reply"],
        "tone": response["tone"],
        "affinity_delta": affinity_delta,
        "state": state,
        "latest_reward_grant": latest_reward_grant,
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


def get_economy_offer_by_id(offer_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM economy_offers
            WHERE id = ? AND active = 1
            """,
            (offer_id,),
        ).fetchone()
        return None if row is None else _serialize_economy_offer(row)


def list_economy_offers() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM economy_offers
            WHERE active = 1
            ORDER BY price ASC, name ASC
            """
        ).fetchall()
        return [_serialize_economy_offer(row) for row in rows]


def list_economy_redemptions() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM economy_redemptions
            WHERE active = 1
            ORDER BY sparks_cost ASC, title ASC
            """
        ).fetchall()
        return [_serialize_economy_redemption(row) for row in rows]


def list_wallet_ledger(user_id: str, limit: int = 18) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM wallet_ledger
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
        return [_serialize_wallet_entry(row) for row in rows]


def list_economy_inventory(user_id: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM economy_inventory
            WHERE user_id = ?
            ORDER BY updated_at DESC
            """,
            (user_id,),
        ).fetchall()
        return [_serialize_inventory_item(row) for row in rows]


def get_economy_catalog() -> dict:
    return {
        "offers": list_economy_offers(),
        "redemptions": list_economy_redemptions(),
    }


def get_economy_state(user_id: str) -> dict:
    with get_connection() as connection:
        user_row = connection.execute(
            "SELECT id, sparks, membership FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user_row is None:
            raise ValueError("User not found")

        inventory_rows = connection.execute(
            """
            SELECT *
            FROM economy_inventory
            WHERE user_id = ?
            ORDER BY updated_at DESC
            """,
            (user_id,),
        ).fetchall()
        ledger_rows = connection.execute(
            """
            SELECT *
            FROM wallet_ledger
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 18
            """,
            (user_id,),
        ).fetchall()
        offer_rows = connection.execute(
            "SELECT * FROM economy_offers WHERE active = 1 ORDER BY price ASC, name ASC"
        ).fetchall()
        redemption_rows = connection.execute(
            """
            SELECT *
            FROM economy_redemptions
            WHERE active = 1
            ORDER BY sparks_cost ASC, title ASC
            """
        ).fetchall()
        active_subscription = connection.execute(
            """
            SELECT s.id, s.user_id, s.plan_id, s.status, s.renewal_at, s.created_at,
                   p.name AS plan_name, p.price
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            WHERE s.user_id = ? AND s.status = 'active'
            ORDER BY s.created_at DESC
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()

    return {
        "wallet_balance": user_row["sparks"],
        "membership": user_row["membership"],
        "offers": [_serialize_economy_offer(row) for row in offer_rows],
        "redemptions": [_serialize_economy_redemption(row) for row in redemption_rows],
        "inventory": [_serialize_inventory_item(row) for row in inventory_rows],
        "ledger": [_serialize_wallet_entry(row) for row in ledger_rows],
        "active_subscription": None
        if active_subscription is None
        else {
            "id": active_subscription["id"],
            "user_id": active_subscription["user_id"],
            "plan_id": active_subscription["plan_id"],
            "plan_name": active_subscription["plan_name"],
            "price": active_subscription["price"],
            "status": active_subscription["status"],
            "renewal_at": active_subscription["renewal_at"],
            "created_at": active_subscription["created_at"],
        },
        "synced_at": utc_now(),
    }


def _grant_offer_unlocks(
    connection: sqlite3.Connection,
    *,
    user_id: str,
    source_kind: str,
    source_id: str,
    unlocks: list[dict],
) -> list[dict]:
    granted: list[dict] = []
    for unlock in unlocks:
        granted.append(
            _grant_inventory_item(
                connection,
                user_id=user_id,
                item_id=unlock["item_id"],
                source_kind=source_kind,
                source_id=source_id,
                category=unlock["category"],
                title=unlock["title"],
                summary=unlock["summary"],
                quantity=int(unlock.get("quantity", 1)),
                metadata={
                    "itemId": unlock["item_id"],
                    "category": unlock["category"],
                },
            )
        )
    return granted


def list_payment_intents(user_id: str, limit: int = 12) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM payment_intents
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
        payload: list[dict] = []
        for row in rows:
            events = connection.execute(
                """
                SELECT *
                FROM payment_events
                WHERE intent_id = ?
                ORDER BY created_at DESC
                """,
                (row["id"],),
            ).fetchall()
            payload.append(
                {
                    **_serialize_payment_intent(row),
                    "events": [_serialize_payment_event(event) for event in events],
                }
            )
        return payload


def get_payment_intent(intent_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM payment_intents
            WHERE id = ?
            """,
            (intent_id,),
        ).fetchone()
        if row is None:
            return None

        events = connection.execute(
            """
            SELECT *
            FROM payment_events
            WHERE intent_id = ?
            ORDER BY created_at DESC
            """,
            (intent_id,),
        ).fetchall()
        return {
            **_serialize_payment_intent(row),
            "events": [_serialize_payment_event(event) for event in events],
        }


def get_payment_intent_by_provider_reference(
    provider: str,
    provider_reference: str,
) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM payment_intents
            WHERE provider = ? AND provider_reference = ?
            """,
            (provider, provider_reference),
        ).fetchone()
        if row is None:
            return None

        events = connection.execute(
            """
            SELECT *
            FROM payment_events
            WHERE intent_id = ?
            ORDER BY created_at DESC
            """,
            (row["id"],),
        ).fetchall()
        return {
            **_serialize_payment_intent(row),
            "events": [_serialize_payment_event(event) for event in events],
        }


def record_payment_provider_state(
    intent_id: str,
    *,
    provider_reference: str | None,
    status: str,
    event_type: str,
    payload: dict | None = None,
    receipt_token: str | None = None,
) -> dict:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE payment_intents
            SET provider_reference = COALESCE(?, provider_reference),
                receipt_token = COALESCE(?, receipt_token),
                status = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                provider_reference,
                receipt_token,
                status,
                utc_now(),
                intent_id,
            ),
        )
        _record_payment_event(
            connection,
            intent_id=intent_id,
            event_type=event_type,
            status=status,
            payload=payload or {},
        )
        connection.commit()

    payload = get_payment_intent(intent_id)
    if payload is None:
        raise ValueError("Payment intent not found")
    return payload


def list_billing_incidents(
    *,
    user_id: str | None = None,
    limit: int = 20,
) -> list[dict]:
    with get_connection() as connection:
        if user_id:
            rows = connection.execute(
                """
                SELECT *
                FROM billing_incidents
                WHERE user_id = ?
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (user_id, limit),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT *
                FROM billing_incidents
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [_serialize_billing_incident(row) for row in rows]


def get_payment_ops_summary() -> dict:
    with get_connection() as connection:
        status_rows = connection.execute(
            """
            SELECT status, COUNT(*) AS count
            FROM payment_intents
            GROUP BY status
            """
        ).fetchall()
        provider_rows = connection.execute(
            """
            SELECT provider, COUNT(*) AS count
            FROM payment_intents
            GROUP BY provider
            """
        ).fetchall()
        open_incidents = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM billing_incidents
            WHERE status = 'open'
            """
        ).fetchone()
        settlement_row = connection.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM payment_intents
            WHERE status = 'settled'
              AND settled_at >= datetime('now', '-30 days')
            """
        ).fetchone()
        incidents = connection.execute(
            """
            SELECT *
            FROM billing_incidents
            ORDER BY updated_at DESC
            LIMIT 12
            """
        ).fetchall()
    return {
        "intent_status_counts": {row["status"]: row["count"] for row in status_rows},
        "provider_counts": {row["provider"]: row["count"] for row in provider_rows},
        "open_incidents": 0 if open_incidents is None else open_incidents["count"],
        "settlement_volume_30d": 0 if settlement_row is None else settlement_row["total"],
        "recent_incidents": [_serialize_billing_incident(row) for row in incidents],
    }


def apply_payment_lifecycle_update(
    intent_id: str,
    *,
    status: str,
    event_type: str,
    summary: str,
    verification_payload: dict | None = None,
    provider_reference: str | None = None,
    receipt_token: str | None = None,
) -> dict:
    with get_connection() as connection:
        intent_row = connection.execute(
            """
            SELECT *
            FROM payment_intents
            WHERE id = ?
            """,
            (intent_id,),
        ).fetchone()
        if intent_row is None:
            raise ValueError("Payment intent not found")

        intent = _serialize_payment_intent(intent_row)
        offer = get_economy_offer_by_id(intent["offer_id"])
        if offer is None:
            raise ValueError("Offer not found")

        now = utc_now()
        connection.execute(
            """
            UPDATE payment_intents
            SET status = ?,
                provider_reference = COALESCE(?, provider_reference),
                receipt_token = COALESCE(?, receipt_token),
                updated_at = ?
            WHERE id = ?
            """,
            (status, provider_reference, receipt_token, now, intent_id),
        )

        latest_entry = None
        incident = None
        reversal_value = int(offer["grant_sparks"]) + int(offer["bonus_sparks"])
        terminal_negative = {"refunded", "cancelled", "charged_back", "expired"}
        if intent["status"] == "settled" and status in terminal_negative:
            if reversal_value > 0:
                try:
                    latest_entry = _record_spark_ledger_entry(
                        connection,
                        user_id=intent["user_id"],
                        amount_delta=-reversal_value,
                        source_kind="billing_lifecycle",
                        source_id=intent_id,
                        title=f"{offer['name']} reversal",
                        summary=summary,
                    )
                except ValueError:
                    latest_entry = None

            if intent["subscription_id"]:
                connection.execute(
                    """
                    UPDATE subscriptions
                    SET status = ?, renewal_at = ?
                    WHERE id = ?
                    """,
                    ("cancelled", now, intent["subscription_id"]),
                )

            incident = _record_billing_incident(
                connection,
                intent_id=intent_id,
                user_id=intent["user_id"],
                provider=intent["provider"],
                severity="critical" if status == "charged_back" else "high",
                status="open",
                title=f"{offer['name']} {status}",
                summary=summary,
                payload={
                    "previousStatus": intent["status"],
                    "reversalApplied": latest_entry is not None,
                    "verification": verification_payload or {},
                },
            )
        elif status in {"failed", "payment_failed"}:
            incident = _record_billing_incident(
                connection,
                intent_id=intent_id,
                user_id=intent["user_id"],
                provider=intent["provider"],
                severity="medium",
                status="open",
                title=f"{offer['name']} payment failed",
                summary=summary,
                payload={"previousStatus": intent["status"], "verification": verification_payload or {}},
            )

        _record_payment_event(
            connection,
            intent_id=intent_id,
            event_type=event_type,
            status=status,
            payload={
                "previousStatus": intent["status"],
                "summary": summary,
                "verification": verification_payload or {},
                "incident": incident,
            },
        )
        connection.commit()

        updated_row = connection.execute(
            "SELECT * FROM payment_intents WHERE id = ?",
            (intent_id,),
        ).fetchone()
        events = connection.execute(
            """
            SELECT *
            FROM payment_events
            WHERE intent_id = ?
            ORDER BY created_at DESC
            """,
            (intent_id,),
        ).fetchall()

    return {
        "intent": _serialize_payment_intent(updated_row),
        "offer": offer,
        "events": [_serialize_payment_event(event) for event in events],
        "settlement": None,
        "latest_entry": latest_entry,
        "incident": incident,
    }


def create_payment_intent(
    user_id: str,
    *,
    offer_id: str,
    provider: str = "sandbox",
    platform: str = "web",
) -> dict:
    offer = get_economy_offer_by_id(offer_id)
    if offer is None:
        raise ValueError("Offer not found")

    intent_id = str(uuid4())
    now = utc_now()
    client_secret = issue_token()

    with get_connection() as connection:
        user_row = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user_row is None:
            raise ValueError("User not found")

        connection.execute(
            """
            INSERT INTO payment_intents (
                id, user_id, offer_id, provider, platform, status, amount, currency,
                client_secret, receipt_token, provider_reference, purchase_id,
                subscription_id, created_at, updated_at, settled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                intent_id,
                user_id,
                offer_id,
                provider,
                platform,
                "requires_confirmation",
                offer["price"],
                offer["currency"],
                client_secret,
                None,
                None,
                None,
                None,
                now,
                now,
                None,
            ),
        )
        created_event = _record_payment_event(
            connection,
            intent_id=intent_id,
            event_type="intent.created",
            status="requires_confirmation",
            payload={
                "offerId": offer_id,
                "provider": provider,
                "platform": platform,
                "amount": offer["price"],
                "currency": offer["currency"],
            },
        )
        connection.commit()

    return {
        "intent": {
            "id": intent_id,
            "user_id": user_id,
            "offer_id": offer_id,
            "provider": provider,
            "platform": platform,
            "status": "requires_confirmation",
            "amount": offer["price"],
            "currency": offer["currency"],
            "client_secret": client_secret,
            "receipt_token": None,
            "provider_reference": None,
            "purchase_id": None,
            "subscription_id": None,
            "created_at": now,
            "updated_at": now,
            "settled_at": None,
        },
        "offer": offer,
        "events": [created_event],
    }


def settle_payment_intent(
    intent_id: str,
    *,
    receipt_token: str | None = None,
    provider_reference: str | None = None,
    status: str = "paid",
    verification_payload: dict | None = None,
) -> dict:
    with get_connection() as connection:
        intent_row = connection.execute(
            """
            SELECT *
            FROM payment_intents
            WHERE id = ?
            """,
            (intent_id,),
        ).fetchone()
        if intent_row is None:
            raise ValueError("Payment intent not found")

        intent = _serialize_payment_intent(intent_row)
        if intent["status"] == "settled":
            existing_events = connection.execute(
                """
                SELECT *
                FROM payment_events
                WHERE intent_id = ?
                ORDER BY created_at DESC
                """,
                (intent_id,),
            ).fetchall()
            return {
                "intent": intent,
                "offer": get_economy_offer_by_id(intent["offer_id"]),
                "events": [_serialize_payment_event(event) for event in existing_events],
                "settlement": None,
            }

        processing_at = utc_now()
        connection.execute(
            """
            UPDATE payment_intents
            SET status = ?, receipt_token = COALESCE(?, receipt_token),
                provider_reference = COALESCE(?, provider_reference), updated_at = ?
            WHERE id = ?
            """,
            (
                "processing" if status == "paid" else status,
                receipt_token,
                provider_reference,
                processing_at,
                intent_id,
            ),
        )
        _record_payment_event(
            connection,
            intent_id=intent_id,
            event_type="intent.confirmed",
            status="processing" if status == "paid" else status,
            payload={
                "receiptToken": receipt_token,
                "providerReference": provider_reference,
                "verification": verification_payload or {},
            },
        )
        connection.commit()

    if status != "paid":
        with get_connection() as connection:
            failed_at = utc_now()
            connection.execute(
                """
                UPDATE payment_intents
                SET status = ?, updated_at = ?
                WHERE id = ?
                """,
                (status, failed_at, intent_id),
            )
            _record_payment_event(
                connection,
                intent_id=intent_id,
                event_type="intent.failed",
                status=status,
                payload={"reason": "Provider verification failed"},
            )
            connection.commit()
            updated_row = connection.execute(
                "SELECT * FROM payment_intents WHERE id = ?",
                (intent_id,),
            ).fetchone()
            events = connection.execute(
                "SELECT * FROM payment_events WHERE intent_id = ? ORDER BY created_at DESC",
                (intent_id,),
            ).fetchall()
        return {
            "intent": _serialize_payment_intent(updated_row),
            "offer": get_economy_offer_by_id(updated_row["offer_id"]),
            "events": [_serialize_payment_event(event) for event in events],
            "settlement": None,
        }

    settlement = checkout_economy_offer(intent["user_id"], offer_id=intent["offer_id"], status="paid")

    with get_connection() as connection:
        settled_at = utc_now()
        connection.execute(
            """
            UPDATE payment_intents
            SET status = ?, receipt_token = COALESCE(?, receipt_token),
                provider_reference = COALESCE(?, provider_reference),
                purchase_id = ?, subscription_id = ?, updated_at = ?, settled_at = ?
            WHERE id = ?
            """,
            (
                "settled",
                receipt_token,
                provider_reference,
                settlement["purchase_id"],
                settlement["subscription_id"],
                settled_at,
                settled_at,
                intent_id,
            ),
        )
        _record_payment_event(
            connection,
            intent_id=intent_id,
            event_type="payment.settled",
            status="settled",
            payload={
                "purchaseId": settlement["purchase_id"],
                "subscriptionId": settlement["subscription_id"],
                "walletBalance": settlement["wallet_balance"],
            },
        )
        connection.commit()
        updated_row = connection.execute(
            "SELECT * FROM payment_intents WHERE id = ?",
            (intent_id,),
        ).fetchone()
        events = connection.execute(
            """
            SELECT *
            FROM payment_events
            WHERE intent_id = ?
            ORDER BY created_at DESC
            """,
            (intent_id,),
        ).fetchall()

    return {
        "intent": _serialize_payment_intent(updated_row),
        "offer": get_economy_offer_by_id(updated_row["offer_id"]),
        "events": [_serialize_payment_event(event) for event in events],
        "settlement": settlement,
    }


def create_checkout(
    user_id: str,
    plan_id: str,
    sku: str,
    category: str,
    amount: int,
    currency: str = "KRW",
    status: str = "paid",
    spark_bonus: int = 0,
    included_unlocks: list[dict] | None = None,
    purchase_title: str | None = None,
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
        if status == "paid":
            connection.execute(
                """
                UPDATE subscriptions
                SET status = 'replaced'
                WHERE user_id = ? AND status = 'active'
                """,
                (user_id,),
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
        latest_entry = None
        granted_unlocks: list[dict] = []
        if status == "paid":
            connection.execute(
                "UPDATE users SET membership = ? WHERE id = ?",
                (plan["name"], user_id),
            )
            if spark_bonus > 0:
                latest_entry = _record_spark_ledger_entry(
                    connection,
                    user_id=user_id,
                    amount_delta=spark_bonus,
                    source_kind="subscription-checkout",
                    source_id=sku,
                    title=purchase_title or plan["name"],
                    summary=f'{purchase_title or plan["name"]} purchase credited sparks to the wallet.',
                )
            if included_unlocks:
                granted_unlocks = _grant_offer_unlocks(
                    connection,
                    user_id=user_id,
                    source_kind="subscription-checkout",
                    source_id=sku,
                    unlocks=included_unlocks,
                )
        connection.commit()

    return {
        "purchase_id": purchase_id,
        "subscription_id": subscription_id,
        "status": status,
        "plan_id": plan_id,
        "renewal_at": renewal_at,
        "wallet_balance": None if latest_entry is None else latest_entry["balance_after"],
        "latest_entry": latest_entry,
        "granted_unlocks": granted_unlocks,
    }


def checkout_economy_offer(
    user_id: str,
    *,
    offer_id: str,
    status: str = "paid",
) -> dict:
    with get_connection() as connection:
        offer_row = connection.execute(
            """
            SELECT *
            FROM economy_offers
            WHERE id = ? AND active = 1
            """,
            (offer_id,),
        ).fetchone()
        user_row = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user_row is None or offer_row is None:
            raise ValueError("Invalid user or offer")

        offer = _serialize_economy_offer(offer_row)

    if offer["offer_type"] == "subscription":
        if not offer["plan_id"]:
            raise ValueError("Subscription offer is missing a plan mapping")
        total_sparks = offer["grant_sparks"] + offer["bonus_sparks"]
        result = create_checkout(
            user_id=user_id,
            plan_id=offer["plan_id"],
            sku=offer_id,
            category=offer["category"],
            amount=offer["price"],
            currency=offer["currency"],
            status=status,
            spark_bonus=total_sparks,
            included_unlocks=offer["included_unlocks"],
            purchase_title=offer["name"],
        )
        state = get_economy_state(user_id)
        return {
            "purchase_id": result["purchase_id"],
            "subscription_id": result["subscription_id"],
            "offer": offer,
            "status": result["status"],
            "wallet_balance": state["wallet_balance"],
            "latest_entry": result["latest_entry"],
            "granted_unlocks": result["granted_unlocks"],
            "active_subscription": state["active_subscription"],
            "synced_at": state["synced_at"],
        }

    purchase_id = str(uuid4())
    created_at = utc_now()
    latest_entry = None
    granted_unlocks: list[dict] = []

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO purchases (id, user_id, sku, category, amount, currency, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                purchase_id,
                user_id,
                offer_id,
                offer["category"],
                offer["price"],
                offer["currency"],
                status,
                created_at,
            ),
        )

        if status == "paid":
            total_sparks = offer["grant_sparks"] + offer["bonus_sparks"]
            if total_sparks > 0:
                latest_entry = _record_spark_ledger_entry(
                    connection,
                    user_id=user_id,
                    amount_delta=total_sparks,
                    source_kind="offer-checkout",
                    source_id=offer_id,
                    title=offer["name"],
                    summary=f'{offer["name"]} purchase credited sparks to the wallet.',
                )
            granted_unlocks = _grant_offer_unlocks(
                connection,
                user_id=user_id,
                source_kind="offer-checkout",
                source_id=offer_id,
                unlocks=offer["included_unlocks"],
            )
        connection.commit()

    state = get_economy_state(user_id)
    return {
        "purchase_id": purchase_id,
        "subscription_id": None,
        "offer": offer,
        "status": status,
        "wallet_balance": state["wallet_balance"],
        "latest_entry": latest_entry,
        "granted_unlocks": granted_unlocks,
        "active_subscription": state["active_subscription"],
        "synced_at": state["synced_at"],
    }


def redeem_economy_item(user_id: str, *, redemption_id: str) -> dict:
    with get_connection() as connection:
        redemption_row = connection.execute(
            """
            SELECT *
            FROM economy_redemptions
            WHERE id = ? AND active = 1
            """,
            (redemption_id,),
        ).fetchone()
        user_row = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user_row is None or redemption_row is None:
            raise ValueError("Invalid user or redemption")

        redemption = _serialize_economy_redemption(redemption_row)
        existing_inventory = connection.execute(
            """
            SELECT *
            FROM economy_inventory
            WHERE user_id = ? AND item_id = ?
            """,
            (user_id, redemption["grant"]["item_id"]),
        ).fetchone()
        if existing_inventory is not None and not redemption["repeatable"]:
            raise ValueError("Reward already redeemed")

        latest_entry = _record_spark_ledger_entry(
            connection,
            user_id=user_id,
            amount_delta=-redemption["sparks_cost"],
            source_kind="reward-redemption",
            source_id=redemption_id,
            title=redemption["title"],
            summary=f'{redemption["title"]} redeemed from the spark bank.',
        )
        granted_item = _grant_inventory_item(
            connection,
            user_id=user_id,
            item_id=redemption["grant"]["item_id"],
            source_kind="reward-redemption",
            source_id=redemption_id,
            category=redemption["grant"]["category"],
            title=redemption["grant"]["title"],
            summary=redemption["grant"]["summary"],
            quantity=redemption["grant"]["quantity"],
            metadata={
                "rewardId": redemption_id,
                "repeatable": redemption["repeatable"],
                "category": redemption["grant"]["category"],
            },
        )
        connection.commit()

    state = get_economy_state(user_id)
    return {
        "redemption": redemption,
        "wallet_balance": state["wallet_balance"],
        "latest_entry": latest_entry,
        "granted_item": granted_item,
        "synced_at": state["synced_at"],
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
        connection.execute(
            """
            INSERT INTO wallet_ledger (
                id, user_id, currency, amount_delta, balance_after,
                source_kind, source_id, title, summary, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                user_id,
                "sparks",
                1200,
                1200,
                "system-onboarding",
                "starter-wallet",
                "Starter Spark Bank",
                "Initial sparks credited for the first onboarding session.",
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
