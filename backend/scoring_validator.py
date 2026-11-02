from __future__ import annotations
from typing import Optional

CPR_PROFILES: dict[str, dict[str, float]] = {
    'adult':  {'min': 5.0, 'max': 6.0},
    'child':  {'min': 4.0, 'max': 5.0},
    'infant': {'min': 3.5, 'max': 4.5},
}


def calculate_points(
    depth: float,
    bpm: float,
    current_combo: int,
    victim_type: str,
) -> tuple[int, int]:
    """Returns (points, new_combo). Mirrors scoring.ts calculatePoints() exactly."""
    target = CPR_PROFILES[victim_type]
    t_min, t_max = target['min'], target['max']

    # Perfect: exact depth range AND 100-120 BPM
    if t_min <= depth <= t_max and 100 <= bpm <= 120:
        return 2, current_combo + 1

    # Good: depth ±1 cm AND 85-135 BPM
    depth_good = (t_min - 1) <= depth <= (t_max + 1)
    bpm_good = 85 <= bpm <= 135
    if depth_good and bpm_good:
        return 1, 0

    return 0, 0


def calculate_grade(score: int) -> str:
    if score >= 90:
        return 'S'
    if score >= 80:
        return 'A'
    if score >= 70:
        return 'B'
    if score >= 60:
        return 'C'
    return 'D'


def score_attempt(
    events: list[dict],
    victim_type: str,
) -> dict:
    """
    Mirrors teamGameStats() in teamSession.ts.

    Each event: {depth: float, bpm: float|None, recoil_pct: float|None}
    bpm None or <= 0 → skip scoring, reset combo (same as TS).
    score = round(100 * xp / (2 * scored_count)) if scored_count > 0 else None
    """
    xp = combo = max_combo = scored_count = 0

    for event in events:
        bpm = event.get('bpm')
        if bpm is None or bpm <= 0:
            combo = 0
            continue
        depth = float(event['depth'])
        points, combo = calculate_points(depth, float(bpm), combo, victim_type)
        xp += points
        max_combo = max(max_combo, combo)
        scored_count += 1

    if scored_count == 0:
        return {'score': None, 'grade': None, 'xp': 0, 'max_combo': 0, 'scored_count': 0}

    score = round(100 * xp / (2 * scored_count))
    return {
        'score': score,
        'grade': calculate_grade(score),
        'xp': xp,
        'max_combo': max_combo,
        'scored_count': scored_count,
    }


def validate_attempt(
    client_score: Optional[int],
    events: list[dict],
    victim_type: str,
) -> dict:
    """
    Compare client-reported score against server calculation.
    If difference > 2, use server value and set score_corrected=True.
    Returns: {score, grade, xp, max_combo, score_corrected}
    """
    result = score_attempt(events, victim_type)
    server_score = result['score']

    score_corrected = False
    if server_score is None:
        final_score = None
        final_grade = None
    elif client_score is None or abs(client_score - server_score) > 2:
        final_score = server_score
        final_grade = result['grade']
        score_corrected = client_score is not None
    else:
        final_score = client_score
        final_grade = calculate_grade(client_score)

    return {
        'score': final_score,
        'grade': final_grade,
        'xp': result['xp'],
        'max_combo': result['max_combo'],
        'score_corrected': score_corrected,
    }
