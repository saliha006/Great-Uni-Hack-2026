"""Hard-coded stub responses (Y0) so frontend and engine can integrate before the real flow lands."""
from app import schemas as s

TS = "2026-11-07T14:40:00Z"

SUBJECT = s.Subject(id=1, name="Cell Biology", kind="KNOWLEDGE", exam_date="2026-12-10", phase="SAMPLING")

PLAN = s.Plan(
    method="ACTIVE_RECALL",
    mode="SAMPLER",
    session_minutes=15,
    reason="Sampler round 1 of 3: trying each method on a similar chunk.",
)

READINESS = s.Readiness(performance=None, understanding=0.42, confidence="LOW")

METHOD_STATS = [
    s.MethodStatView(method="ACTIVE_RECALL", n=1, mean_reward=0.62, ci_low=0.31, ci_high=0.88),
    s.MethodStatView(method="PRACTICE_TEST", n=1, mean_reward=0.58, ci_low=0.27, ci_high=0.85),
    s.MethodStatView(method="FEYNMAN", n=0, mean_reward=0.5, ci_low=0.15, ci_high=0.85),
]

SUBJECT_STATE = s.SubjectState(
    subject=SUBJECT,
    sampler={
        "ACTIVE_RECALL": s.SamplerEntry(done=True, probe_score=0.6),
        "PRACTICE_TEST": s.SamplerEntry(done=True, probe_score=0.55),
        "FEYNMAN": s.SamplerEntry(done=False),
    },
    method_stats=METHOD_STATS,
    plan=PLAN,
    readiness=READINESS,
    focus_window_min=18,
    confidence="EARLY",
)

SESSION = s.Session(
    id=1, subject_id=1, method="ACTIVE_RECALL", mode="SAMPLER", planned_minutes=15, chunk_id=1, reason=PLAN.reason
)

ITEM = s.Item(
    id=1,
    kind="RECALL_PROMPT",
    phase="MAIN",
    prompt="From memory: what is the difference between diffusion and osmosis?",
    difficulty=2,
    expected_seconds=60,
    hint="Think about what moves, and across what.",
)

PROBE_ITEMS = [
    s.Item(
        id=10 + i,
        kind="MCQ",
        phase="PROBE",
        prompt=f"Probe question {i + 1} on diffusion and osmosis.",
        options=["A", "B", "C", "D"],
        difficulty=2,
        expected_seconds=30,
    )
    for i in range(3)
] + [
    s.Item(
        id=13 + i,
        kind="SHORT_ANSWER",
        phase="PROBE",
        prompt=f"Short answer {i + 1}: explain one step of osmosis.",
        difficulty=3,
        expected_seconds=90,
    )
    for i in range(2)
]

ANSWER_RESULT = s.AnswerResult(
    score=1.0,
    correct=None,
    feedback="Nice, that matches the key idea.",
    reveal="Diffusion moves solute down its gradient; osmosis moves water across a semi-permeable membrane.",
)

EVENTS_RESULT = s.EventsResult(
    attention=s.AttentionReading(
        state="FOCUSED", latency_cv=0.22, latency_ratio=1.05, idle_count=0, blur_count=0, window_n=5
    ),
    intervention=s.Intervention(type="NONE", message=""),
)

SIGNED_URL = s.SignedUrl(
    signed_url="wss://example.invalid/stub-signed-url",
    context=s.VoiceContext(
        topic="Diffusion and osmosis",
        key_points=["Diffusion moves particles down a gradient", "Osmosis is water across a membrane"],
        first_message="Hi! I'm Sam. Can you explain osmosis to me like I've never heard of it?",
    ),
)

FEYNMAN_RESULT = s.FeynmanResult(
    score=0.7,
    covered=["Diffusion moves particles down a gradient"],
    gaps=["Osmosis is water across a membrane"],
    feedback="Clear on diffusion; say what crosses the membrane in osmosis.",
)

REFLECTION = s.Reflection(
    id=1,
    ts=TS,
    trigger="MANUAL",
    diagnosis="ON_TRACK",
    evidence={"sessions": 2, "probe_trend": 0.05},
    decision=s.Decision(action="KEEP"),
    explanation="Probe scores are rising on the current method, so the plan stays.",
)

SESSION_RESULT = s.SessionResult(
    probe_score=0.6, active_minutes=14.0, efficiency=0.043, reward=0.61, subject_state=SUBJECT_STATE, reflection=None
)

INSIGHTS = s.Insights(
    method_series={
        "ACTIVE_RECALL": [s.ScorePoint(ts=TS, probe_score=0.6)],
        "PRACTICE_TEST": [s.ScorePoint(ts=TS, probe_score=0.55)],
    },
    attention_by_session=[
        s.AttentionBySession(session_id=1, ts=TS, method="ACTIVE_RECALL", drift_share=0.1, lapse_share=0.0)
    ],
    timeline=[s.TimelineEntry(ts=TS, kind="SAMPLER_DONE", label="Sampler finished")],
    readiness_series=[s.ReadinessPoint(ts=TS, performance=None, understanding=0.42)],
)
