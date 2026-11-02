"""aiohttp REST API server for LifePulse — port 8766.

Imported by backend_server.py and started alongside the WebSocket server.
All persistent state goes through db.py (SQLite WAL).
Score validation is delegated to scoring_validator.py.
"""
from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

import aiohttp
import aiosqlite
from aiohttp import web

from auth_util import (
    is_session_expired,
    new_session_id,
    session_expires_at,
    verify_password,
)
from db import (
    DB_PATH,
    create_admin_session,
    create_event,
    create_session,
    delete_admin_session,
    finalize_event,
    get_active_event,
    get_latest_event,
    get_admin_attempts,
    get_admin_session,
    get_db_path,
    get_leaderboard,
    get_or_create_auto_event,
    get_or_create_participant,
    get_personal_best,
    get_stats,
    init_db,
    invalidate_attempt,
    restore_attempt,
    save_attempt,
)
from privacy import mask_name, mask_student_number
from scoring_validator import CPR_PROFILES, validate_attempt

logger = logging.getLogger(__name__)

_API_PORT = int(os.environ.get("LIFEPULSE_API_PORT", "8766"))
_ADMIN_PASSWORD_HASH = os.environ.get("LIFEPULSE_ADMIN_PASSWORD_HASH", "")
_CORS_ORIGIN = os.environ.get("LIFEPULSE_CORS_ORIGIN", "http://localhost:5173")
_COOKIE_NAME = "lifepulse_admin"

# Shared sensor state injected from backend_server.py
_sensor_state: dict[str, Any] = {}


def set_sensor_state(state: dict[str, Any]) -> None:
    global _sensor_state
    _sensor_state = state


# ── Helpers ──────────────────────────────────────────────────────────────────


def _json(data: dict, status: int = 200) -> web.Response:
    return web.Response(
        text=json.dumps(data, ensure_ascii=False),
        content_type="application/json",
        status=status,
    )


def _err(code: str, message: str, status: int = 400) -> web.Response:
    return _json({"success": False, "error": {"code": code, "message": message}}, status)


def _cors_headers(request: web.Request) -> dict[str, str]:
    if request.headers.get("Origin") == _CORS_ORIGIN:
        return {
            "Access-Control-Allow-Origin": _CORS_ORIGIN,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Vary": "Origin",
        }
    return {}


@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        return web.Response(headers=_cors_headers(request), status=204)
    response = await handler(request)
    for k, v in _cors_headers(request).items():
        response.headers[k] = v
    return response


@web.middleware
async def admin_auth_middleware(request: web.Request, handler):
    path = request.path
    if not path.startswith("/api/v1/admin") or path == "/api/v1/admin/login":
        return await handler(request)

    session_id = request.cookies.get(_COOKIE_NAME)
    if not session_id:
        return _err("UNAUTHORIZED", "로그인이 필요합니다.", 401)

    async with aiosqlite.connect(get_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        session = await get_admin_session(conn, session_id)

    if session is None or is_session_expired(session["expires_at"]):
        return _err("UNAUTHORIZED", "세션이 만료되었습니다. 다시 로그인해주세요.", 401)

    return await handler(request)


# ── Auth ─────────────────────────────────────────────────────────────────────


async def admin_login(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err("INVALID_JSON", "요청 형식이 올바르지 않습니다.")

    password = str(body.get("password", ""))
    if not _ADMIN_PASSWORD_HASH:
        return _err("NOT_CONFIGURED", "관리자 비밀번호가 설정되지 않았습니다.", 503)

    if not verify_password(password, _ADMIN_PASSWORD_HASH):
        return _err("INVALID_CREDENTIALS", "비밀번호가 올바르지 않습니다.", 401)

    session_id = new_session_id()
    expires_at = session_expires_at()
    ip = request.headers.get("X-Forwarded-For", request.remote)

    async with aiosqlite.connect(get_db_path()) as conn:
        await create_admin_session(conn, session_id, expires_at, ip)

    resp = _json({"success": True})
    resp.set_cookie(
        _COOKIE_NAME,
        session_id,
        httponly=True,
        samesite="Strict",
        max_age=8 * 3600,
        path="/",
    )
    return resp


async def admin_logout(request: web.Request) -> web.Response:
    session_id = request.cookies.get(_COOKIE_NAME)
    if session_id:
        async with aiosqlite.connect(get_db_path()) as conn:
            await delete_admin_session(conn, session_id)
    resp = _json({"success": True})
    resp.del_cookie(_COOKIE_NAME, path="/")
    return resp


# ── Sessions ─────────────────────────────────────────────────────────────────


async def create_session_handler(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err("INVALID_JSON", "요청 형식이 올바르지 않습니다.")

    session_uuid = str(body.get("session_uuid", "")).strip()
    victim_type = str(body.get("victim_type", "adult")).strip()
    player_count = body.get("player_count", 1)
    mode = str(body.get("mode", "live")).strip()

    if not session_uuid:
        return _err("VALIDATION_ERROR", "session_uuid가 필요합니다.")
    if victim_type not in ("adult", "child", "infant"):
        return _err("VALIDATION_ERROR", "유효하지 않은 victim_type입니다.")
    if not isinstance(player_count, int) or not (1 <= player_count <= 4):
        return _err("VALIDATION_ERROR", "player_count는 1~4여야 합니다.")

    async with aiosqlite.connect(get_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        event_id = await get_or_create_auto_event(conn)
        session_id = await create_session(
            conn, event_id, session_uuid, victim_type, player_count, mode
        )

    return _json({"success": True, "session_id": session_id}, 201)


# ── Attempts ─────────────────────────────────────────────────────────────────

_SN_RE = re.compile(r"^[A-Za-z0-9\-]+$")


_PHONE_RE = re.compile(r"^01[0-9]\d{7,8}$")


def _validate_participant_fields(sn: str, name: str, phone: str = "") -> str | None:
    if not (4 <= len(sn) <= 20):
        return "학번은 4~20자여야 합니다."
    if not _SN_RE.match(sn):
        return "학번은 영문, 숫자, 하이픈만 사용할 수 있습니다."
    if not (2 <= len(name) <= 30):
        return "이름은 2~30자여야 합니다."
    if phone:
        digits = re.sub(r"[-\s]", "", phone)
        if not _PHONE_RE.match(digits):
            return "전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)"
    return None


async def save_attempt_handler(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err("INVALID_JSON", "요청 형식이 올바르지 않습니다.")

    attempt_uuid = str(body.get("attempt_uuid", "")).strip()
    session_uuid = str(body.get("session_uuid", "")).strip()
    student_number = str(body.get("student_number", "")).strip()
    name = str(body.get("name", "")).strip()
    phone = re.sub(r"[-\s]", "", str(body.get("phone", "")).strip())
    player_order = int(body.get("player_order", 0))
    elapsed_seconds = body.get("elapsed_seconds", 0)
    victim_type = str(body.get("victim_type", "adult")).strip()
    client_score = body.get("score")
    compression_events_raw = body.get("compression_events", [])

    if not attempt_uuid:
        return _err("VALIDATION_ERROR", "attempt_uuid가 필요합니다.")
    if not session_uuid:
        return _err("VALIDATION_ERROR", "session_uuid가 필요합니다.")
    err = _validate_participant_fields(student_number, name, phone)
    if err:
        return _err("VALIDATION_ERROR", err)
    if victim_type not in ("adult", "child", "infant"):
        return _err("VALIDATION_ERROR", "유효하지 않은 victim_type입니다.")
    if not isinstance(compression_events_raw, list):
        return _err("VALIDATION_ERROR", "압박 이벤트 형식이 올바르지 않습니다.")

    # Normalise compression events to scoring_validator format
    scoring_events = [
        {"depth": float(e.get("depth_cm", e.get("depth", 0))),
         "bpm": e.get("bpm"),
         "recoil_percent": e.get("recoil_pct", e.get("recoil_percent"))}
        for e in compression_events_raw
    ]

    validated = validate_attempt(client_score, scoring_events, victim_type)

    # Build compression_events list for db (db expects depth_cm, bpm, recoil_pct)
    db_events = [
        {
            "seq": i,
            "depth_cm": float(e.get("depth_cm", e.get("depth", 0))),
            "bpm": e.get("bpm"),
            "recoil_pct": e.get("recoil_pct", e.get("recoil_percent")),
            "points": e.get("points", 0),
            "combo_at": e.get("combo_at", 0),
        }
        for i, e in enumerate(compression_events_raw)
    ]

    # Aggregates
    valid_bpms = [e["bpm"] for e in scoring_events if e["bpm"] and e["bpm"] > 0]
    valid_depths = [e["depth"] for e in scoring_events if e["bpm"] and e["bpm"] > 0]
    recoils = [e["recoil_percent"] for e in scoring_events if e["recoil_percent"] is not None]

    profile = CPR_PROFILES.get(victim_type, CPR_PROFILES["adult"])
    t_min, t_max = profile["min"] - 1, profile["max"] + 1

    depth_good_pct = (
        round(100 * sum(1 for d in valid_depths if t_min <= d <= t_max) / len(valid_depths))
        if valid_depths else 0
    )
    rate_good_pct = (
        round(100 * sum(1 for b in valid_bpms if 85 <= b <= 135) / len(valid_bpms))
        if valid_bpms else 0
    )
    avg_depth = round(sum(valid_depths) / len(valid_depths), 2) if valid_depths else None
    avg_bpm = round(sum(valid_bpms) / len(valid_bpms), 1) if valid_bpms else None
    avg_recoil = round(sum(recoils) / len(recoils), 1) if recoils else None

    async with aiosqlite.connect(get_db_path()) as conn:
        conn.row_factory = aiosqlite.Row

        event_id = await get_or_create_auto_event(conn)
        participant_id = await get_or_create_participant(conn, event_id, student_number, name, phone or None)

        async with conn.execute(
            "SELECT id FROM practice_sessions WHERE session_uuid = ?", (session_uuid,)
        ) as cur:
            row = await cur.fetchone()

        if row is None:
            # Session not pre-created (e.g. mid-session exit before ensureServerSession ran).
            # Auto-create it so the attempt can still be saved.
            player_count = max(1, int(body.get("player_count", 1)))
            session_id = await create_session(
                conn, event_id, session_uuid, victim_type, player_count, "live"
            )
        else:
            session_id = row["id"]

        result = await save_attempt(
            conn,
            {
                "attempt_uuid": attempt_uuid,
                "session_id": session_id,
                "participant_id": participant_id,
                "player_order": player_order,
                "elapsed_seconds": elapsed_seconds,
                "score": validated["score"],
                "grade": validated["grade"],
                "xp": validated["xp"],
                "max_combo": validated["max_combo"],
                "compression_count": len(compression_events_raw),
                "observed_count": validated.get("scored_count", 0),
                "missing_count": 0,
                "average_depth": avg_depth,
                "average_bpm": avg_bpm,
                "average_recoil": avg_recoil,
                "depth_good_percent": depth_good_pct,
                "rate_good_percent": rate_good_pct,
                "scoring_version": 1,
                "victim_type": victim_type,
                "compression_events": db_events,
            },
        )

    status = 200 if result["existing"] else 201
    return _json(
        {
            "success": True,
            "attempt_id": result["id"],
            "score": validated["score"],
            "grade": validated["grade"],
            "xp": validated["xp"],
            "max_combo": validated["max_combo"],
            "score_corrected": validated["score_corrected"],
            "existing": result["existing"],
        },
        status,
    )


# ── Leaderboard ───────────────────────────────────────────────────────────────


async def get_leaderboard_handler(request: web.Request) -> web.Response:
    q = request.rel_url.query
    event_id_str = q.get("event_id")
    scoring_version = int(q.get("scoring_version", "1"))
    victim_type = q.get("victim_type", "adult")
    limit = max(1, min(int(q.get("limit", "20")), 100))
    offset = int(q.get("offset", "0"))

    if victim_type not in ("adult", "child", "infant"):
        victim_type = "adult"

    async with aiosqlite.connect(get_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        if event_id_str == "all":
            event_id: int | None = None
            event_info = None
        elif event_id_str:
            event_id = int(event_id_str)
            event_info = None
        else:
            latest = await get_latest_event(conn)
            event_id = latest["id"] if latest else None
            event_info = latest

        entries = await get_leaderboard(
            conn,
            event_id=event_id,
            victim_type=victim_type,
            scoring_version=scoring_version,
            limit=limit,
            offset=offset,
        )
        stats = await get_stats(conn)

    return _json(
        {
            "success": True,
            "entries": entries,
            "stats": stats,
            "event_id": event_id,
            "event_info": event_info,
        }
    )


async def get_personal_best_handler(request: web.Request) -> web.Response:
    q = request.rel_url.query
    student_number = q.get("student_number", "").strip()

    if not student_number:
        return _err("VALIDATION_ERROR", "학번을 입력해주세요.")

    async with aiosqlite.connect(get_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        active = await get_active_event(conn)
        event_id = active["id"] if active else None
        result = await get_personal_best(conn, event_id, student_number)

    return _json({"success": True, **result})


# ── Admin: stats ─────────────────────────────────────────────────────────────


async def admin_get_stats(request: web.Request) -> web.Response:
    async with aiosqlite.connect(get_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        stats = await get_stats(conn)
        active_event = await get_active_event(conn)

    sensor = _sensor_state
    return _json(
        {
            "success": True,
            "sensor_connected": sensor.get("connected", False),
            "last_sensor_at": sensor.get("last_received_at"),
            "active_event": dict(active_event) if active_event else None,
            "stats": stats,
            "db_path": get_db_path(),
        }
    )


# ── Admin: attempts ───────────────────────────────────────────────────────────


async def admin_get_attempts(request: web.Request) -> web.Response:
    q = request.rel_url.query
    page = max(1, int(q.get("page", "1")))
    per_page = min(int(q.get("per_page", "50")), 200)
    search = q.get("search", "").strip() or None
    victim_type = q.get("victim_type") or None
    grade = q.get("grade") or None

    async with aiosqlite.connect(get_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        data = await get_admin_attempts(
            conn,
            page=page,
            per_page=per_page,
            search=search,
            victim_type_filter=victim_type,
            grade_filter=grade,
        )

    return _json({"success": True, **data})


async def admin_invalidate_attempt(request: web.Request) -> web.Response:
    attempt_id = int(request.match_info["id"])
    try:
        body = await request.json()
    except Exception:
        return _err("INVALID_JSON", "요청 형식이 올바르지 않습니다.")

    reason = str(body.get("reason", "")).strip()
    if not reason:
        return _err("VALIDATION_ERROR", "무효 처리 사유를 입력해주세요.")

    async with aiosqlite.connect(get_db_path()) as conn:
        updated = await invalidate_attempt(conn, attempt_id, reason)

    if not updated:
        return _err("NOT_FOUND", "시도 기록을 찾을 수 없습니다.", 404)

    return _json({"success": True})


async def admin_restore_attempt(request: web.Request) -> web.Response:
    attempt_id = int(request.match_info["id"])
    async with aiosqlite.connect(get_db_path()) as conn:
        updated = await restore_attempt(conn, attempt_id)

    if not updated:
        return _err("NOT_FOUND", "시도 기록을 찾을 수 없습니다.", 404)

    return _json({"success": True})


# ── Admin: events ─────────────────────────────────────────────────────────────


async def admin_create_event(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err("INVALID_JSON", "요청 형식이 올바르지 않습니다.")

    name = str(body.get("name", "")).strip()
    venue = str(body.get("venue", "")).strip()
    victim_type = str(body.get("victim_type", "adult")).strip()
    player_count = int(body.get("player_count", 1))

    if not name:
        return _err("VALIDATION_ERROR", "이벤트 이름을 입력해주세요.")
    if victim_type not in ("adult", "child", "infant"):
        return _err("VALIDATION_ERROR", "유효하지 않은 victim_type입니다.")
    if not (1 <= player_count <= 4):
        return _err("VALIDATION_ERROR", "player_count는 1~4여야 합니다.")

    async with aiosqlite.connect(get_db_path()) as conn:
        event_id = await create_event(conn, name, venue, victim_type, player_count)

    return _json({"success": True, "event_id": event_id}, 201)


async def admin_finalize_event(request: web.Request) -> web.Response:
    event_id = int(request.match_info["id"])
    async with aiosqlite.connect(get_db_path()) as conn:
        updated = await finalize_event(conn, event_id)

    if not updated:
        return _err("NOT_FOUND", "이벤트를 찾을 수 없습니다.", 404)

    return _json({"success": True})


# ── Admin: export / backup ────────────────────────────────────────────────────


async def admin_export_csv(request: web.Request) -> web.Response:
    import csv
    import io

    async with aiosqlite.connect(get_db_path()) as conn:
        conn.row_factory = aiosqlite.Row
        data = await get_admin_attempts(conn, page=1, per_page=99999)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "attempt_id", "attempt_uuid", "student_number", "name",
            "victim_type", "score", "grade", "xp", "max_combo",
            "compression_count", "average_depth", "average_bpm", "average_recoil",
            "depth_good_percent", "rate_good_percent",
            "elapsed_seconds", "scoring_version",
            "completed_at", "invalidated_at", "invalidated_reason",
        ]
    )
    for row in data["attempts"]:
        writer.writerow(
            [
                row["id"], row["attempt_uuid"],
                row.get("student_number", ""), row.get("name", ""),
                row.get("victim_type", "adult"),
                row["score"], row["grade"], row["xp"], row["max_combo"],
                row["compression_count"],
                row.get("average_depth"), row.get("average_bpm"), row.get("average_recoil"),
                row.get("depth_good_percent"), row.get("rate_good_percent"),
                row.get("elapsed_seconds"),
                row.get("scoring_version", 1),
                row["completed_at"], row.get("invalidated_at"), row.get("invalidated_reason"),
            ]
        )

    return web.Response(
        text=output.getvalue(),
        content_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="lifepulse_attempts.csv"'},
    )


async def admin_backup(request: web.Request) -> web.Response:
    db_path = get_db_path()
    try:
        with open(db_path, "rb") as f:
            data = f.read()
    except FileNotFoundError:
        return _err("NOT_FOUND", "DB 파일을 찾을 수 없습니다.", 404)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return web.Response(
        body=data,
        content_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="lifepulse_{ts}.db"'},
    )


# ── App factory ───────────────────────────────────────────────────────────────


def create_app() -> web.Application:
    app = web.Application(middlewares=[cors_middleware, admin_auth_middleware])

    app.router.add_post("/api/v1/admin/login", admin_login)
    app.router.add_post("/api/v1/admin/logout", admin_logout)
    app.router.add_get("/api/v1/admin/stats", admin_get_stats)
    app.router.add_get("/api/v1/admin/attempts", admin_get_attempts)
    app.router.add_post("/api/v1/admin/attempts/{id}/invalidate", admin_invalidate_attempt)
    app.router.add_post("/api/v1/admin/attempts/{id}/restore", admin_restore_attempt)
    app.router.add_post("/api/v1/admin/events", admin_create_event)
    app.router.add_post("/api/v1/admin/events/{id}/finalize", admin_finalize_event)
    app.router.add_get("/api/v1/admin/export.csv", admin_export_csv)
    app.router.add_get("/api/v1/admin/backup", admin_backup)

    app.router.add_post("/api/v1/sessions", create_session_handler)
    app.router.add_post("/api/v1/attempts", save_attempt_handler)
    app.router.add_get("/api/v1/leaderboard", get_leaderboard_handler)
    app.router.add_get("/api/v1/leaderboard/personal", get_personal_best_handler)

    return app


async def start_api_server() -> None:
    """Called from backend_server.py main(). Runs indefinitely alongside WebSocket server."""
    await init_db()
    app = create_app()
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", _API_PORT)
    await site.start()
    logger.info("REST API listening on :%d", _API_PORT)
