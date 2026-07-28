from collections import Counter

from api.v1.models.exam import UserExamSession
from api.v1.models.proctoring import ViolationType

# Rule-based weights used to turn a raw violation count into a risk score.
VIOLATION_WEIGHTS = {
    ViolationType.IDENTITY_MISMATCH: 10,
    ViolationType.MULTIPLE_PERSON: 8,
    ViolationType.PROHIBITED_OBJECT: 6,
    ViolationType.DEVTOOLS: 5,
    ViolationType.UNLOAD_ATTEMPT: 4,
    ViolationType.TAB_SWITCH: 3,
    ViolationType.WINDOW_BLUR: 3,
    ViolationType.COPY_PASTE: 2,
    ViolationType.LOOK_AWAY: 2,
    ViolationType.VOICE_ACTIVITY: 1,
}

# Per-type contribution to the risk score is capped so one noisy violation type
# (e.g. a candidate glancing away repeatedly) can't alone push the score sky-high.
PER_TYPE_CAP = 5

RISK_BAND_THRESHOLDS = [
    (15, "High"),
    (6, "Medium"),
]


def risk_band(score: int) -> str:
    for threshold, band in RISK_BAND_THRESHOLDS:
        if score >= threshold:
            return band
    return "Low"


def build_proctoring_summary(session: UserExamSession) -> dict:
    violations = session.violations
    counts = Counter(v.violation_type for v in violations)

    score = 0
    by_type = {}
    for v_type, count in counts.items():
        weight = VIOLATION_WEIGHTS.get(v_type, 1)
        contribution = weight * min(count, PER_TYPE_CAP)
        score += contribution
        by_type[v_type.value] = count

    timeline = [
        {
            "id": str(v.id),
            "type": v.violation_type.value,
            "message": v.message,
            "snapshot_url": v.snapshot_url,
            "audio_clip_url": v.audio_clip_url,
            "created_at": v.created_at.isoformat(),
        }
        for v in sorted(violations, key=lambda v: v.created_at)
    ]

    return {
        "session_id": str(session.id),
        "total_violations": len(violations),
        "violations_by_type": by_type,
        "risk_score": score,
        "risk_band": risk_band(score),
        "timeline": timeline,
    }
