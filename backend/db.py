"""SQLite database layer for LifePulse exhibition system.

Database path: env LIFEPULSE_DB_PATH (default: <backend-dir>/lifepulse.db)
All datetimes stored as ISO8601 UTC strings: 2026-10-28T12:34:56.000Z
"""
from __future__ import annotations

import os
import secrets as _secrets
from datetime import datetime, date, timezone
from typing import Any, Optional

import aiosqlite

DB_PATH = os.environ.get(
    "LIFEPULSE_DB_PATH",
    os.path.join(os.path.dirname(__file__), "lifepulse.db"),
)

_SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    venue        TEXT    NOT NULL DEFAULT '',
    victim_type  TEXT    NOT NULL DEFAULT 'adult'
                         CHECK(victim_type IN ('adult','child','infant')),
    player_count INTEGER NOT NULL DEFAULT 1
                         CHECK(player_count BETWEEN 1 AND 4),
    is_active    INTEGER NOT NULL DEFAULT 1
                         CHECK(is_active IN (0, 1)),
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    ended_at     TEXT
);

CREATE TABLE IF NOT EXISTS participants (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_number TEXT    NOT NULL,
    name           TEXT    NOT NULL,
    phone          TEXT,
    registered_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(event_id, student_number)
);
CREATE INDEX IF NOT EXISTS idx_participants_event   ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_student ON participants(student_number);

CREATE TABLE IF NOT EXISTS practice_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    session_uuid TEXT    NOT NULL UNIQUE,
    victim_type  TEXT    NOT NULL CHECK(victim_type IN ('adult','child','infant')),
    player_count INTEGER NOT NULL CHECK(player_count BETWEEN 1 AND 4),
    mode         TEXT    NOT NULL DEFAULT 'live',
    started_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_event ON practice_sessions(event_id);

CREATE TABLE IF NOT EXISTS attempts (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_uuid       TEXT    NOT NULL UNIQUE,
    session_id         INTEGER NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    participant_id     INTEGER REFERENCES participants(id) ON DELETE SET NULL,
    player_order       INTEGER NOT NULL,
    elapsed_seconds    REAL,
    score              INTEGER,
    grade              TEXT    CHECK(grade IN ('S','A','B','C','D') OR grade IS NULL),
    xp                 INTEGER NOT NULL DEFAULT 0,
    max_combo          INTEGER NOT NULL DEFAULT 0,
    compression_count  INTEGER NOT NULL DEFAULT 0,
    observed_count     INTEGER NOT NULL DEFAULT 0,
    missing_count      INTEGER NOT NULL DEFAULT 0,
    average_depth      REAL,
    average_bpm        REAL,
    average_recoil     REAL,
    depth_good_percent INTEGER,
    rate_good_percent  INTEGER,
    scoring_version    INTEGER NOT NULL DEFAULT 1,
    victim_type        TEXT    NOT NULL DEFAULT 'adult',
    completed_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    invalidated_at     TEXT,
    invalidated_reason TEXT,
    result_token       TEXT    UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_attempts_session     ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_participant ON attempts(participant_id);
CREATE INDEX IF NOT EXISTS idx_attempts_leaderboard
    ON attempts(victim_type, scoring_version, score DESC)
    WHERE invalidated_at IS NULL AND compression_count > 0;

CREATE TABLE IF NOT EXISTS compression_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    seq        INTEGER NOT NULL,
    depth_cm   REAL    NOT NULL,
    bpm        REAL,
    recoil_pct REAL,
    points     INTEGER NOT NULL DEFAULT 0,
    combo_at   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(attempt_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_cevents_attempt ON compression_events(attempt_id);

CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    expires_at TEXT NOT NULL,
    ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor       TEXT    NOT NULL,
    action      TEXT    NOT NULL,
    target_type TEXT,
    target_id   INTEGER,
    detail      TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
"""


async def init_db() -> aiosqlite.Connection:
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    await conn.executescript(_SCHEMA)
    await conn.commit()
    # Incremental migrations — safe to run on existing DB
    try:
        await conn.execute("ALTER TABLE participants ADD COLUMN phone TEXT")
        await conn.commit()
    except Exception:
        pass  # column already exists
    return conn


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') + \
           f"{datetime.now(timezone.utc).microsecond // 1000:03d}Z"


async def get_active_event(conn: aiosqlite.Connection) -> Optional[dict]:
    async with conn.execute(
        "SELECT * FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1"
    ) as cursor:
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_latest_event(conn: aiosqlite.Connection) -> Optional[dict]:
    """Active event first; fall back to most recently ended event."""
    active = await get_active_event(conn)
    if active:
        return active
    async with conn.execute(
        "SELECT * FROM events ORDER BY id DESC LIMIT 1"
    ) as cursor:
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_or_create_auto_event(conn: aiosqlite.Connection) -> int:
    event = await get_active_event(conn)
    if event:
        return event['id']
    async with conn.execute(
        "INSERT INTO events (name, venue, victim_type, player_count) VALUES (?,?,?,?)",
        ("자동 생성 이벤트", "", "adult", 1),
    ) as cursor:
        await conn.commit()
        return cursor.lastrowid  # type: ignore[return-value]


async def get_or_create_participant(
    conn: aiosqlite.Connection,
    event_id: int,
    student_number: str,
    name: str,
    phone: Optional[str] = None,
) -> int:
    normalized_sn = student_number.strip().lower()
    normalized_name = name.strip()
    normalized_phone = phone.strip() if phone else None
    async with conn.execute(
        "SELECT id FROM participants WHERE event_id = ? AND student_number = ?",
        (event_id, normalized_sn),
    ) as cursor:
        row = await cursor.fetchone()
        if row:
            participant_id = row[0]
            if normalized_phone:
                await conn.execute(
                    "UPDATE participants SET phone = ? WHERE id = ?",
                    (normalized_phone, participant_id),
                )
                await conn.commit()
            return participant_id
    async with conn.execute(
        "INSERT INTO participants (event_id, student_number, name, phone) VALUES (?,?,?,?)",
        (event_id, normalized_sn, normalized_name, normalized_phone),
    ) as cursor:
        await conn.commit()
        return cursor.lastrowid  # type: ignore[return-value]


async def create_session(
    conn: aiosqlite.Connection,
    event_id: int,
    session_uuid: str,
    victim_type: str,
    player_count: int,
    mode: str,
) -> int:
    async with conn.execute(
        """INSERT INTO practice_sessions (event_id, session_uuid, victim_type, player_count, mode)
           VALUES (?,?,?,?,?)""",
        (event_id, session_uuid, victim_type, player_count, mode),
    ) as cursor:
        await conn.commit()
        return cursor.lastrowid  # type: ignore[return-value]


async def save_attempt(conn: aiosqlite.Connection, data: dict) -> dict:
    """Idempotent: returns {'id', 'existing'} — existing=True if attempt_uuid already stored."""
    async with conn.execute(
        "SELECT id FROM attempts WHERE attempt_uuid = ?",
        (data['attempt_uuid'],),
    ) as cursor:
        existing = await cursor.fetchone()
        if existing:
            return {'id': existing[0], 'existing': True}

    result_token = _secrets.token_urlsafe(16)

    async with conn.execute(
        """INSERT INTO attempts (
            attempt_uuid, session_id, participant_id, player_order,
            elapsed_seconds, score, grade, xp, max_combo,
            compression_count, observed_count, missing_count,
            average_depth, average_bpm, average_recoil,
            depth_good_percent, rate_good_percent,
            scoring_version, victim_type, result_token
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            data['attempt_uuid'],
            data['session_id'],
            data.get('participant_id'),
            data['player_order'],
            data.get('elapsed_seconds'),
            data.get('score'),
            data.get('grade'),
            data.get('xp', 0),
            data.get('max_combo', 0),
            data.get('compression_count', 0),
            data.get('observed_count', 0),
            data.get('missing_count', 0),
            data.get('average_depth'),
            data.get('average_bpm'),
            data.get('average_recoil'),
            data.get('depth_good_percent'),
            data.get('rate_good_percent'),
            data.get('scoring_version', 1),
            data.get('victim_type', 'adult'),
            result_token,
        ),
    ) as cursor:
        attempt_id = cursor.lastrowid

    compression_events = data.get('compression_events', [])
    if compression_events:
        await conn.executemany(
            """INSERT OR IGNORE INTO compression_events
               (attempt_id, seq, depth_cm, bpm, recoil_pct, points, combo_at)
               VALUES (?,?,?,?,?,?,?)""",
            [
                (
                    attempt_id,
                    ev.get('seq', i),
                    ev['depth_cm'],
                    ev.get('bpm'),
                    ev.get('recoil_pct'),
                    ev.get('points', 0),
                    ev.get('combo_at', 0),
                )
                for i, ev in enumerate(compression_events)
            ],
        )

    await conn.commit()
    return {'id': attempt_id, 'existing': False}  # type: ignore[return-value]


async def get_leaderboard(
    conn: aiosqlite.Connection,
    event_id: Optional[int],
    victim_type: str = 'adult',
    scoring_version: int = 1,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    from privacy import mask_name, mask_student_number

    event_filter = ""
    params: list[Any] = [victim_type, scoring_version]
    if event_id is not None:
        event_filter = """AND EXISTS (
            SELECT 1 FROM practice_sessions s
            WHERE s.id = a.session_id AND s.event_id = ?
        )"""
        params.append(event_id)

    params += [limit, offset]

    query = f"""
    WITH best AS (
        SELECT
            a.id,
            a.participant_id,
            p.student_number,
            p.name,
            a.score,
            a.grade,
            a.xp,
            a.max_combo,
            a.compression_count,
            a.depth_good_percent,
            a.rate_good_percent,
            a.completed_at,
            ROW_NUMBER() OVER (
                PARTITION BY a.participant_id
                ORDER BY
                    a.score              DESC,
                    a.depth_good_percent DESC,
                    a.rate_good_percent  DESC,
                    a.max_combo          DESC,
                    a.completed_at       ASC
            ) AS rn
        FROM attempts a
        LEFT JOIN participants p ON p.id = a.participant_id
        WHERE a.victim_type     = ?
          AND a.scoring_version = ?
          AND a.invalidated_at  IS NULL
          {event_filter}
    )
    SELECT
        ROW_NUMBER() OVER (
            ORDER BY score DESC, depth_good_percent DESC,
                     rate_good_percent DESC, max_combo DESC, completed_at ASC
        ) AS rank,
        id AS attempt_id,
        participant_id,
        student_number,
        name,
        score,
        grade,
        xp,
        max_combo,
        compression_count,
        depth_good_percent,
        rate_good_percent,
        completed_at
    FROM best
    WHERE rn = 1
    ORDER BY score DESC, depth_good_percent DESC,
             rate_good_percent DESC, max_combo DESC, completed_at ASC
    LIMIT ? OFFSET ?
    """

    async with conn.execute(query, params) as cursor:
        rows = await cursor.fetchall()

    return [
        {
            'rank': row['rank'],
            'attempt_id': row['attempt_id'],
            'participant_id': row['participant_id'],
            'masked_name': mask_name(row['name'] or ''),
            'masked_student_number': mask_student_number(row['student_number'] or ''),
            'score': row['score'],
            'grade': row['grade'],
            'xp': row['xp'],
            'max_combo': row['max_combo'],
            'compression_count': row['compression_count'],
            'depth_good_percent': row['depth_good_percent'],
            'rate_good_percent': row['rate_good_percent'],
            'completed_at': row['completed_at'],
        }
        for row in rows
    ]


async def get_personal_best(
    conn: aiosqlite.Connection,
    event_id: Optional[int],
    student_number: str,
) -> dict:
    normalized_sn = student_number.strip().lower()

    event_filter = ""
    params: list[Any] = [normalized_sn]
    if event_id is not None:
        event_filter = """AND EXISTS (
            SELECT 1 FROM practice_sessions s
            WHERE s.id = a.session_id AND s.event_id = ?
        )"""
        params.append(event_id)

    count_query = f"""
    SELECT COUNT(*) FROM attempts a
    JOIN participants p ON p.id = a.participant_id
    WHERE p.student_number = ? AND a.invalidated_at IS NULL {event_filter}
    """
    async with conn.execute(count_query, params) as cur:
        count_row = await cur.fetchone()
    attempt_count = count_row[0] if count_row else 0

    best_query = f"""
    SELECT a.id, a.score, a.grade, a.compression_count, a.completed_at,
           p.student_number, p.name
    FROM attempts a
    JOIN participants p ON p.id = a.participant_id
    WHERE p.student_number = ?
      AND a.invalidated_at IS NULL
      {event_filter}
    ORDER BY a.score DESC, a.depth_good_percent DESC, a.completed_at ASC
    LIMIT 1
    """
    async with conn.execute(best_query, params) as cursor:
        row = await cursor.fetchone()

    return {
        'best': dict(row) if row else None,
        'attempt_count': attempt_count,
        'rank': None,
    }


async def invalidate_attempt(
    conn: aiosqlite.Connection,
    attempt_id: int,
    reason: str,
    actor: str = 'admin',
) -> bool:
    now = _now_iso()
    async with conn.execute(
        "UPDATE attempts SET invalidated_at = ?, invalidated_reason = ? WHERE id = ?",
        (now, reason, attempt_id),
    ) as cursor:
        updated = cursor.rowcount > 0
    await conn.execute(
        "INSERT INTO audit_log (actor, action, target_type, target_id, detail) VALUES (?,?,?,?,?)",
        (actor, 'invalidate_attempt', 'attempt', attempt_id, reason),
    )
    await conn.commit()
    return updated


async def restore_attempt(
    conn: aiosqlite.Connection,
    attempt_id: int,
    actor: str = 'admin',
) -> bool:
    async with conn.execute(
        "UPDATE attempts SET invalidated_at = NULL, invalidated_reason = NULL WHERE id = ?",
        (attempt_id,),
    ) as cursor:
        updated = cursor.rowcount > 0
    await conn.execute(
        "INSERT INTO audit_log (actor, action, target_type, target_id) VALUES (?,?,?,?)",
        (actor, 'restore_attempt', 'attempt', attempt_id),
    )
    await conn.commit()
    return updated


async def create_event(
    conn: aiosqlite.Connection,
    name: str,
    venue: str,
    victim_type: str,
    player_count: int,
) -> int:
    await conn.execute("UPDATE events SET is_active = 0 WHERE is_active = 1")
    async with conn.execute(
        "INSERT INTO events (name, venue, victim_type, player_count, is_active) VALUES (?,?,?,?,1)",
        (name, venue, victim_type, player_count),
    ) as cursor:
        event_id = cursor.lastrowid
    await conn.commit()
    return event_id  # type: ignore[return-value]


async def get_admin_attempts(
    conn: aiosqlite.Connection,
    page: int = 1,
    per_page: int = 50,
    search: Optional[str] = None,
    victim_type_filter: Optional[str] = None,
    grade_filter: Optional[str] = None,
) -> dict:
    conditions: list[str] = []
    params: list[Any] = []

    if search:
        conditions.append("(p.student_number LIKE ? OR p.name LIKE ? OR REPLACE(REPLACE(COALESCE(p.phone, ''), '-', ''), ' ', '') LIKE ?)")
        pattern = f"%{search}%"
        phone_search = search.replace("-", "").replace(" ", "") or search
        params += [pattern, pattern, f"%{phone_search}%"]
    if victim_type_filter:
        conditions.append("a.victim_type = ?")
        params.append(victim_type_filter)
    if grade_filter:
        conditions.append("a.grade = ?")
        params.append(grade_filter)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    count_query = f"""
    SELECT COUNT(*) FROM attempts a
    LEFT JOIN participants p ON p.id = a.participant_id {where}
    """
    async with conn.execute(count_query, params) as cur:
        total = (await cur.fetchone())[0]

    offset = (page - 1) * per_page
    data_query = f"""
    SELECT
        a.id, a.attempt_uuid, a.player_order, a.victim_type,
        a.score, a.grade, a.xp, a.max_combo,
        a.compression_count, a.observed_count, a.missing_count,
        a.average_depth, a.average_bpm, a.average_recoil,
        a.depth_good_percent, a.rate_good_percent,
        a.elapsed_seconds, a.completed_at,
        a.invalidated_at, a.invalidated_reason,
        p.student_number, p.name, p.phone
    FROM attempts a
    LEFT JOIN participants p ON p.id = a.participant_id
    {where}
    ORDER BY a.completed_at DESC
    LIMIT ? OFFSET ?
    """
    async with conn.execute(data_query, params + [per_page, offset]) as cursor:
        rows = await cursor.fetchall()

    return {
        'attempts': [dict(row) for row in rows],
        'total': total,
        'page': page,
        'per_page': per_page,
    }


def get_db_path() -> str:
    return DB_PATH


async def create_admin_session(
    conn: aiosqlite.Connection,
    session_id: str,
    expires_at: str,
    ip_address: Optional[str] = None,
) -> None:
    await conn.execute(
        "INSERT OR REPLACE INTO admin_sessions (session_id, expires_at, ip_address) VALUES (?,?,?)",
        (session_id, expires_at, ip_address),
    )
    await conn.commit()


async def get_admin_session(
    conn: aiosqlite.Connection,
    session_id: str,
) -> Optional[dict]:
    async with conn.execute(
        "SELECT * FROM admin_sessions WHERE session_id = ?",
        (session_id,),
    ) as cursor:
        row = await cursor.fetchone()
        return dict(row) if row else None


async def delete_admin_session(
    conn: aiosqlite.Connection,
    session_id: str,
) -> None:
    await conn.execute(
        "DELETE FROM admin_sessions WHERE session_id = ?",
        (session_id,),
    )
    await conn.commit()


async def finalize_event(
    conn: aiosqlite.Connection,
    event_id: int,
    actor: str = 'admin',
) -> bool:
    now = _now_iso()
    async with conn.execute(
        "UPDATE events SET is_active = 0, ended_at = ? WHERE id = ?",
        (now, event_id),
    ) as cursor:
        updated = cursor.rowcount > 0
    await conn.execute(
        "INSERT INTO audit_log (actor, action, target_type, target_id) VALUES (?,?,?,?)",
        (actor, 'finalize_event', 'event', event_id),
    )
    await conn.commit()
    return updated


async def get_stats(conn: aiosqlite.Connection) -> dict:
    today = date.today().isoformat()

    async with conn.execute(
        """SELECT COUNT(DISTINCT p.id) FROM participants p
           JOIN attempts a ON a.participant_id = p.id
           WHERE DATE(a.completed_at) = ?""",
        (today,),
    ) as cur:
        today_participants = (await cur.fetchone() or [0])[0]

    async with conn.execute(
        "SELECT COUNT(*) FROM attempts WHERE invalidated_at IS NULL"
    ) as cur:
        total_attempts = (await cur.fetchone() or [0])[0]

    event = await get_active_event(conn)
    return {
        'today_participants': today_participants,
        'total_attempts': total_attempts,
        'active_event': event,
        'db_path': DB_PATH,
    }
