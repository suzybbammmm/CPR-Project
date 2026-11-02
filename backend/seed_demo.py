"""임의 참가자 10명 테스트 데이터 삽입 스크립트.
실행: python3 seed_demo.py
이미 실행한 적 있으면 --reset 플래그로 기존 시드 데이터를 지우고 다시 넣을 수 있습니다.
"""
import asyncio
import sys
import uuid
from datetime import datetime, timezone, timedelta

import aiosqlite

from db import DB_PATH, init_db

PARTICIPANTS = [
    ("20231001", "김지윤", "010-1111-0001"),
    ("20231002", "이하늘", "010-1111-0002"),
    ("20231003", "박서준", "010-1111-0003"),
    ("20231004", "최수아", "010-1111-0004"),
    ("20231005", "정민준", "010-1111-0005"),
    ("20231006", "윤지호", "010-1111-0006"),
    ("20231007", "강예린", "010-1111-0007"),
    ("20231008", "조현우", "010-1111-0008"),
    ("20231009", "신다은", "010-1111-0009"),
    ("20231010", "임태양", "010-1111-0010"),
]

# (score, grade, xp, max_combo, depth_good_pct, rate_good_pct, avg_depth, avg_bpm)
SCORES = [
    (98, "S", 392, 18, 95, 92, 5.4, 112),
    (87, "A", 348, 14, 82, 88, 5.1, 108),
    (87, "A", 348, 13, 80, 87, 5.2, 107),
    (75, "B", 300, 10, 70, 78, 5.6, 118),
    (68, "B", 272,  8, 65, 72, 4.8, 103),
    (60, "C", 240,  7, 58, 65, 4.5,  98),
    (55, "C", 220,  5, 50, 60, 4.3,  95),
    (45, "D", 180,  4, 40, 50, 3.9,  92),
    (40, "D", 160,  3, 35, 45, 3.7,  88),
    (30, "D", 120,  2, 25, 38, 3.4,  85),
]


def _now(offset_minutes: int = 0) -> str:
    t = datetime.now(timezone.utc) - timedelta(minutes=offset_minutes)
    return t.strftime('%Y-%m-%dT%H:%M:%S.') + f"{t.microsecond // 1000:03d}Z"


async def seed():
    reset = "--reset" in sys.argv
    conn = await init_db()

    # 활성 이벤트 확인 또는 생성
    async with conn.execute("SELECT id, name FROM events WHERE is_active=1 ORDER BY id DESC LIMIT 1") as cur:
        event_row = await cur.fetchone()

    if event_row:
        event_id = event_row["id"]
        print(f"기존 활성 이벤트 사용: id={event_id}, name={event_row['name']}")
    else:
        async with conn.execute(
            "INSERT INTO events (name, venue, victim_type, player_count) VALUES (?,?,?,?)",
            ("2025 CPR 실습 전시회", "부산대학교", "adult", 1),
        ) as cur:
            await conn.commit()
            event_id = cur.lastrowid
        print(f"새 이벤트 생성: id={event_id}")

    if reset:
        # 시드 학번 패턴(2023100x)으로 만들어진 데이터 삭제
        await conn.execute(
            "DELETE FROM participants WHERE event_id=? AND student_number LIKE '202310%'",
            (event_id,),
        )
        await conn.commit()
        print("기존 시드 데이터 삭제 완료")

    # 세션 생성
    session_uuid = str(uuid.uuid4())
    async with conn.execute(
        "INSERT OR IGNORE INTO practice_sessions (event_id, session_uuid, victim_type, player_count, mode, started_at, completed_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (event_id, session_uuid, "adult", len(PARTICIPANTS), "live", _now(35), _now(1)),
    ) as cur:
        await conn.commit()
        session_id = cur.lastrowid

    if not session_id:
        async with conn.execute("SELECT id FROM practice_sessions WHERE session_uuid=?", (session_uuid,)) as cur:
            session_id = (await cur.fetchone())["id"]

    inserted = 0
    for i, ((sn, name, phone), (score, grade, xp, max_combo, depth_pct, rate_pct, avg_depth, avg_bpm)) in enumerate(
        zip(PARTICIPANTS, SCORES)
    ):
        # 참가자
        async with conn.execute(
            "INSERT OR IGNORE INTO participants (event_id, student_number, name, phone) VALUES (?,?,?,?)",
            (event_id, sn, name, phone.replace("-", "")),
        ) as cur:
            await conn.commit()
            p_id = cur.lastrowid

        if not p_id:
            async with conn.execute(
                "SELECT id FROM participants WHERE event_id=? AND student_number=?", (event_id, sn)
            ) as cur:
                p_id = (await cur.fetchone())["id"]

        # attempt
        attempt_uuid = str(uuid.uuid4())
        compression_count = score * 2  # 압박 수 임의
        completed_at = _now(30 - i * 2)

        try:
            async with conn.execute(
                """INSERT INTO attempts
                   (attempt_uuid, session_id, participant_id, player_order,
                    elapsed_seconds, score, grade, xp, max_combo,
                    compression_count, observed_count, missing_count,
                    average_depth, average_bpm, average_recoil,
                    depth_good_percent, rate_good_percent,
                    scoring_version, victim_type, completed_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (attempt_uuid, session_id, p_id, i,
                 120, score, grade, xp, max_combo,
                 compression_count, compression_count, 0,
                 avg_depth, avg_bpm, 88.0,
                 depth_pct, rate_pct,
                 1, "adult", completed_at),
            ):
                await conn.commit()
                inserted += 1
                print(f"  {name} ({sn}) → {score}점 {grade}등급")
        except aiosqlite.IntegrityError:
            print(f"  {name} ({sn}) → 이미 존재, 건너뜀")

    await conn.close()
    print(f"\n완료: {inserted}명 삽입, event_id={event_id}")
    print("브라우저에서 http://localhost:5173/leaderboard 를 새로고침하세요.")


asyncio.run(seed())
