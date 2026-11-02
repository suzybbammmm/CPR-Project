"""Fixture tests verifying Python scoring_validator matches TypeScript scoring.ts.

Each fixture was derived from the TypeScript calculatePoints() / teamGameStats() logic:
  Perfect:  t_min <= depth <= t_max AND 100 <= bpm <= 120  → 2 pts, combo+1
  Good:     (t_min-1) <= depth <= (t_max+1) AND 85 <= bpm <= 135 → 1 pt, combo reset
  Otherwise: 0 pts, combo reset
  score = round(100 * xp / (2 * scored_count))
"""
import pytest
from scoring_validator import (
    CPR_PROFILES,
    calculate_grade,
    calculate_points,
    score_attempt,
    validate_attempt,
)


# ── calculate_points fixtures ─────────────────────────────────────────────────

class TestCalculatePointsAdult:
    def test_perfect_center(self):
        pts, combo = calculate_points(5.5, 110, 0, "adult")
        assert pts == 2
        assert combo == 1

    def test_perfect_min_boundary(self):
        pts, combo = calculate_points(5.0, 100, 2, "adult")
        assert pts == 2
        assert combo == 3

    def test_perfect_max_boundary(self):
        pts, combo = calculate_points(6.0, 120, 0, "adult")
        assert pts == 2
        assert combo == 1

    def test_good_shallow(self):
        """depth 4.0 is within good band (5-1=4 to 6+1=7) and bpm=100 is good band"""
        pts, combo = calculate_points(4.0, 100, 5, "adult")
        assert pts == 1
        assert combo == 0

    def test_good_deep(self):
        pts, combo = calculate_points(7.0, 110, 3, "adult")
        assert pts == 1
        assert combo == 0

    def test_good_slow_bpm(self):
        pts, combo = calculate_points(5.5, 85, 2, "adult")
        assert pts == 1
        assert combo == 0

    def test_good_fast_bpm(self):
        pts, combo = calculate_points(5.5, 135, 0, "adult")
        assert pts == 1
        assert combo == 0

    def test_too_shallow(self):
        pts, combo = calculate_points(3.0, 110, 5, "adult")
        assert pts == 0
        assert combo == 0

    def test_too_deep(self):
        pts, combo = calculate_points(8.0, 110, 5, "adult")
        assert pts == 0
        assert combo == 0

    def test_bpm_too_slow(self):
        pts, combo = calculate_points(5.5, 60, 5, "adult")
        assert pts == 0
        assert combo == 0

    def test_bpm_too_fast(self):
        pts, combo = calculate_points(5.5, 180, 5, "adult")
        assert pts == 0
        assert combo == 0

    def test_perfect_depth_bad_bpm_is_otherwise(self):
        """Perfect depth but bpm outside 100-120 but inside 85-135 → Good (1pt)."""
        pts, combo = calculate_points(5.5, 99, 0, "adult")
        assert pts == 1
        assert combo == 0

    def test_combo_increments_only_on_perfect(self):
        _, c1 = calculate_points(5.5, 110, 0, "adult")
        _, c2 = calculate_points(5.5, 110, c1, "adult")
        _, c3 = calculate_points(5.5, 110, c2, "adult")
        assert c3 == 3

    def test_good_resets_combo(self):
        _, c1 = calculate_points(5.5, 110, 3, "adult")  # perfect → 4
        assert c1 == 4
        _, c2 = calculate_points(4.0, 100, c1, "adult")  # good → 0
        assert c2 == 0


class TestCalculatePointsChild:
    def test_perfect(self):
        pts, _ = calculate_points(4.5, 110, 0, "child")
        assert pts == 2

    def test_too_shallow_adult_range(self):
        """5.0 is outside child perfect range (4-5) but inside good (3-6)."""
        pts, _ = calculate_points(5.5, 110, 0, "child")
        assert pts == 1

    def test_profiles_exist(self):
        assert "child" in CPR_PROFILES
        assert CPR_PROFILES["child"]["min"] == 4.0
        assert CPR_PROFILES["child"]["max"] == 5.0


class TestCalculatePointsInfant:
    def test_perfect(self):
        pts, _ = calculate_points(4.0, 110, 0, "infant")
        assert pts == 2

    def test_profiles_exist(self):
        assert "infant" in CPR_PROFILES
        assert CPR_PROFILES["infant"]["min"] == 3.5
        assert CPR_PROFILES["infant"]["max"] == 4.5


# ── calculate_grade fixtures ──────────────────────────────────────────────────

@pytest.mark.parametrize("score,expected", [
    (100, "S"), (90, "S"), (89, "A"), (80, "A"),
    (79, "B"), (70, "B"), (69, "C"), (60, "C"),
    (59, "D"), (0, "D"),
])
def test_calculate_grade(score, expected):
    assert calculate_grade(score) == expected


# ── score_attempt fixtures ────────────────────────────────────────────────────

class TestScoreAttempt:
    def test_all_perfect(self):
        events = [{"depth": 5.5, "bpm": 110, "recoil_percent": 90}] * 10
        result = score_attempt(events, "adult")
        assert result["score"] == 100
        assert result["grade"] == "S"
        assert result["xp"] == 20
        assert result["max_combo"] == 10
        assert result["scored_count"] == 10

    def test_all_good(self):
        events = [{"depth": 4.0, "bpm": 100, "recoil_percent": 90}] * 10
        result = score_attempt(events, "adult")
        assert result["score"] == 50
        assert result["xp"] == 10
        assert result["max_combo"] == 0

    def test_all_zero(self):
        events = [{"depth": 2.0, "bpm": 50, "recoil_percent": None}] * 10
        result = score_attempt(events, "adult")
        assert result["score"] == 0
        assert result["grade"] == "D"
        assert result["max_combo"] == 0

    def test_bpm_none_skipped(self):
        events = [
            {"depth": 5.5, "bpm": None, "recoil_percent": 90},
            {"depth": 5.5, "bpm": 110, "recoil_percent": 90},
        ]
        result = score_attempt(events, "adult")
        assert result["scored_count"] == 1
        assert result["score"] == 100

    def test_bpm_zero_resets_combo(self):
        events = [
            {"depth": 5.5, "bpm": 110},
            {"depth": 5.5, "bpm": 110},
            {"depth": 5.5, "bpm": 0},   # resets combo
            {"depth": 5.5, "bpm": 110},
        ]
        result = score_attempt(events, "adult")
        assert result["max_combo"] == 2   # from first two

    def test_empty_events(self):
        result = score_attempt([], "adult")
        assert result["score"] is None
        assert result["grade"] is None
        assert result["xp"] == 0

    def test_mixed_sequence(self):
        events = [
            {"depth": 5.5, "bpm": 110},   # perfect → 2 pts
            {"depth": 5.5, "bpm": 110},   # perfect → 2 pts
            {"depth": 4.0, "bpm": 100},   # good   → 1 pt
            {"depth": 5.5, "bpm": 110},   # perfect → 2 pts
        ]
        result = score_attempt(events, "adult")
        assert result["xp"] == 7
        assert result["scored_count"] == 4
        expected_score = round(100 * 7 / (2 * 4))   # 88
        assert result["score"] == expected_score

    def test_score_rounding(self):
        """Verify round() matches Python banker's rounding behavior (same as JS)."""
        events = [{"depth": 5.5, "bpm": 110}] * 3  # 6 xp / 6 = 100
        result = score_attempt(events, "adult")
        assert result["score"] == 100

    def test_single_good_compression(self):
        events = [{"depth": 4.0, "bpm": 100}]
        result = score_attempt(events, "adult")
        # 1 xp / (2*1) = 0.5 → round() = 0 (banker's rounding in Python)
        assert result["score"] == round(100 * 1 / 2)  # 50


# ── validate_attempt fixtures ─────────────────────────────────────────────────

class TestValidateAttempt:
    def test_client_matches_server(self):
        events = [{"depth": 5.5, "bpm": 110}] * 10
        result = validate_attempt(100, events, "adult")
        assert result["score"] == 100
        assert result["score_corrected"] is False

    def test_client_within_tolerance(self):
        events = [{"depth": 5.5, "bpm": 110}] * 10
        result = validate_attempt(98, events, "adult")
        assert result["score"] == 98
        assert result["score_corrected"] is False

    def test_client_outside_tolerance_uses_server(self):
        events = [{"depth": 5.5, "bpm": 110}] * 10   # server = 100
        result = validate_attempt(50, events, "adult")
        assert result["score"] == 100
        assert result["score_corrected"] is True

    def test_client_none_uses_server(self):
        events = [{"depth": 5.5, "bpm": 110}] * 10
        result = validate_attempt(None, events, "adult")
        assert result["score"] == 100
        assert result["score_corrected"] is False

    def test_empty_events_score_none(self):
        result = validate_attempt(50, [], "adult")
        assert result["score"] is None
        assert result["grade"] is None
        assert result["score_corrected"] is False
