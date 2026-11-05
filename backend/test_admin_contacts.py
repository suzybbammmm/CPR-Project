"""Admin contact lookup/export tests; every run uses an isolated temporary DB."""
import csv
import io
import tempfile
import unittest
from pathlib import Path

from aiohttp.test_utils import TestClient, TestServer
import api_server
import db
from auth_util import hash_password


class AdminContactsTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_path = db.DB_PATH
        self.old_hash = api_server._ADMIN_PASSWORD_HASH
        db.DB_PATH = str(Path(self.temp.name) / "contacts.db")
        api_server._ADMIN_PASSWORD_HASH = hash_password("isolated-test-password")
        self.conn = await db.init_db()
        self.event_id = await db.get_or_create_auto_event(self.conn)
        session_id = await db.create_session(self.conn, self.event_id, "test-session", "adult", 2, "live")
        for index, (name, phone) in enumerate([("연락처테스트", "01000000000"), ("미입력테스트", None)]):
            participant_id = await db.get_or_create_participant(self.conn, self.event_id, f"test000{index}", name, phone)
            await db.save_attempt(self.conn, {"attempt_uuid": f"attempt-{index}", "session_id": session_id, "participant_id": participant_id, "player_order": index, "score": 90, "grade": "S"})
        self.client = TestClient(TestServer(api_server.create_app()))
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()
        await self.conn.close()
        db.DB_PATH = self.old_path
        api_server._ADMIN_PASSWORD_HASH = self.old_hash
        self.temp.cleanup()

    async def login(self):
        response = await self.client.post("/api/v1/admin/login", json={"password": "isolated-test-password"})
        self.assertEqual(response.status, 200)
        return {"Cookie": f"lifepulse_admin={response.cookies['lifepulse_admin'].value}"}

    async def test_participant_reads_open_without_login_but_other_admin_routes_stay_protected(self):
        for path in ("/api/v1/admin/attempts", "/api/v1/admin/export.csv"):
            response = await self.client.get(path)
            self.assertEqual(response.status, 200)
        for path in ("/api/v1/admin/stats", "/api/v1/admin/backup"):
            response = await self.client.get(path)
            self.assertEqual(response.status, 401)

    async def test_list_and_search_include_optional_phone(self):
        response = await self.client.get("/api/v1/admin/attempts")
        data = await response.json()
        self.assertEqual(data["total"], 2)
        rows = {row["name"]: row for row in data["attempts"]}
        self.assertEqual(rows["연락처테스트"]["phone"], "01000000000")
        self.assertIsNone(rows["미입력테스트"]["phone"])
        for search in ("연락처", "test0000", "010-0000-0000", "01000000000"):
            response = await self.client.get("/api/v1/admin/attempts", params={"search": search})
            result = await response.json()
            self.assertEqual(result["total"], 1)
            self.assertEqual(result["attempts"][0]["name"], "연락처테스트")
        response = await self.client.get("/api/v1/admin/attempts", params={"search": "missing"})
        self.assertEqual((await response.json())["total"], 0)

    async def test_csv_preserves_korean_and_phone_leading_zero(self):
        response = await self.client.get("/api/v1/admin/export.csv")
        self.assertEqual(response.status, 200)
        text = await response.text()
        self.assertTrue(text.startswith("\ufeff"))
        rows = {row["name"]: row for row in csv.DictReader(io.StringIO(text.lstrip("\ufeff")))}
        self.assertEqual(rows["연락처테스트"]["phone"], "010-0000-0000")
        self.assertEqual(rows["미입력테스트"]["phone"], "")
        self.assertEqual(api_server._csv_text("=1+1"), "'=1+1")

    async def test_public_leaderboard_does_not_expose_contacts(self):
        response = await self.client.get("/api/v1/leaderboard")
        data = await response.json()
        self.assertEqual(response.status, 200)
        self.assertEqual(len(data["entries"]), 2)
        for row in data["entries"]:
            self.assertNotIn("phone", row)
            self.assertNotIn("name", row)
            self.assertNotIn("student_number", row)
        self.assertNotIn("01000000000", await response.text())

    async def test_cors_accepts_local_dev_ports_and_rejects_other_hosts(self):
        for origin in ("http://localhost:5173", "http://localhost:5174"):
            response = await self.client.get("/api/v1/leaderboard", headers={"Origin": origin})
            self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), origin)
        response = await self.client.get(
            "/api/v1/leaderboard", headers={"Origin": "https://untrusted.example"}
        )
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)

    async def test_saved_attempt_contact_is_available_to_admin(self):
        response = await self.client.post('/api/v1/attempts', json={
            'attempt_uuid': 'new-attempt', 'session_uuid': 'new-session',
            'student_number': 'test0002', 'name': '저장테스트', 'phone': '010-0000-0002',
            'elapsed_seconds': 120, 'victim_type': 'adult', 'score': 100,
            'compression_events': [{'depth_cm': 5.5, 'bpm': 110, 'recoil_pct': 95}],
        })
        self.assertEqual(response.status, 201)
        response = await self.client.get('/api/v1/admin/attempts', params={'search':'test0002'})
        data = await response.json()
        self.assertEqual(data['total'], 1)
        self.assertEqual(data['attempts'][0]['phone'], '01000000002')
        self.assertEqual(data['attempts'][0]['score'], 100)

    async def test_practice_v2_score_is_saved_and_ranked(self):
        response = await self.client.post('/api/v1/attempts', json={
            'attempt_uuid': 'practice-v2', 'session_uuid': 'practice-v2-session',
            'student_number': 'test0003', 'name': '판정테스트',
            'elapsed_seconds': 30, 'victim_type': 'adult', 'score': 0, 'scoring_version': 2,
            'compression_events': [{'depth_cm': 4.5, 'bpm': 130, 'recoil_pct': 80}],
        })
        self.assertEqual(response.status, 201)
        self.assertEqual((await response.json())['score'], 75)
        response = await self.client.get('/api/v1/leaderboard', params={'scoring_version':'2'})
        rows = (await response.json())['entries']
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['score'], 75)
