import pytest
from fastapi.testclient import TestClient

from app import config, security
from app.main import app
from app.providers import gemini
from app.routes import voice

from .test_agents import CHAPTER, GOOD

BODY = {
    "elder": {"name": "Zubaida", "relation": "Nani", "language": "Urdu"},
    "theme": "Free talk",
    "turns": [{"role": "birdy", "text": "Where did you grow up?", "lang": "en"}, {"role": "elder", "text": "Near Anarkali", "lang": "en", "index": 1}],
}


@pytest.fixture
def env(monkeypatch):
    """Set environment variables for one test; settings are re-read each time."""
    for key in ("GEMINI_API_KEY", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
        monkeypatch.delenv(key, raising=False)
    security.reset_for_tests()

    def apply(**values):
        for k, v in values.items():
            monkeypatch.setenv(k, v)
        config.settings.cache_clear()

    apply(APP_ENV="development")
    yield apply
    config.settings.cache_clear()


@pytest.fixture
def api():
    return TestClient(app)


def fake_model(*replies):
    queue = list(replies)

    async def model(system, user, temperature=0.7):
        return queue.pop(0)

    return model


def test_production_without_keys_stays_locked(env, api):
    env(APP_ENV="production")
    res = api.post("/api/turn", json=BODY)
    assert res.status_code == 503 and res.json() == {"error": "This site isn't set up with its keys yet."}


def test_missing_provider_is_501_so_the_browser_uses_its_stand_in(env, api):
    assert api.post("/api/turn", json=BODY).status_code == 501


def test_turn_returns_the_decision_with_handoff_and_trace(env, api, monkeypatch):
    env(GEMINI_API_KEY="k")
    monkeypatch.setattr(gemini, "generate_json", fake_model(GOOD))
    res = api.post("/api/turn", json=BODY)
    assert res.status_code == 200
    body = res.json()
    assert body["action"] == "follow_up" and body["mood"] == "normal" and body["handoff"] is None
    assert body["question"]["en"] == GOOD["question"]["en"]
    assert body["trace"][0]["agent"] == "interviewer"
    assert body["signals"] == {"answers": 1, "sensitive": False, "tired": False, "skipped": False}


def test_chapter_runs_the_pipeline_and_speaks_camel_case(env, api, monkeypatch):
    env(GEMINI_API_KEY="k")
    monkeypatch.setattr(gemini, "generate_json", fake_model(CHAPTER))
    turns = [{"role": "elder", "text": "Cardamom and wet earth after rain.", "lang": "en", "index": 3}]
    res = api.post("/api/chapter", json={**BODY, "turns": turns, "familySeed": 5})
    assert res.status_code == 200
    body = res.json()
    assert body["chapter"]["pullQuote"] == {"text": "Cardamom and wet earth after rain.", "turnIndex": 3}
    assert body["chapter"]["sourceTurns"] == [3] and body["imageUrl"] is None
    assert body["trace"][-1]["outcome"].startswith("illustrator not configured")


def test_skip_before_any_answer_still_gets_a_question(env, api, monkeypatch):
    env(GEMINI_API_KEY="k")
    monkeypatch.setattr(gemini, "generate_json", fake_model(GOOD))
    res = api.post("/api/turn", json={**BODY, "turns": [], "skipped": True})
    assert res.status_code == 200 and res.json()["signals"]["skipped"] is True
    # The writer still needs something to write from.
    assert api.post("/api/chapter", json={**BODY, "turns": []}).status_code == 400


def test_bad_bodies_are_400(env, api):
    env(GEMINI_API_KEY="k")
    assert api.post("/api/turn", json={"elder": {}, "turns": []}).status_code == 400
    assert api.post("/api/turn", content=b"not json", headers={"content-type": "application/json"}).status_code == 400
    assert api.post("/api/turn", content=b"x" * 300_000).status_code == 400


def test_supabase_needs_a_valid_bearer_token(env, api, monkeypatch):
    env(GEMINI_API_KEY="k", SUPABASE_URL="https://x.supabase.co", SUPABASE_ANON_KEY="anon")

    async def who(token):
        return "user-1" if token == "good" else None

    monkeypatch.setattr(security, "user_id_for", who)
    monkeypatch.setattr(gemini, "generate_json", fake_model(GOOD))
    assert api.post("/api/turn", json=BODY).status_code == 401
    assert api.post("/api/turn", json=BODY, headers={"Authorization": "Bearer bad"}).status_code == 401
    assert api.post("/api/turn", json=BODY, headers={"Authorization": "Bearer good"}).status_code == 200


def test_cors_allows_the_frontend_only(env, api):
    pre = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"}
    ok = api.options("/api/turn", headers={"Origin": "http://localhost:3000", **pre})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3000"
    evil = api.options("/api/turn", headers={"Origin": "https://evil.example", **pre})
    assert "access-control-allow-origin" not in evil.headers


def test_rate_limit(env, api):
    codes = [api.post("/api/turn", json=BODY).status_code for _ in range(31)]
    assert codes[29] == 501 and codes[30] == 429


def test_spoofed_forwarded_for_does_not_reset_the_limit(env, api):
    # Only the hop our own proxy appended (the rightmost) counts; the client's own entries don't.
    codes = [api.post("/api/turn", json=BODY, headers={"X-Forwarded-For": f"10.0.0.{i}, 203.0.113.9"}).status_code for i in range(31)]
    assert codes[-1] == 429


def test_chapters_and_paintings_have_a_small_budget(env, api, monkeypatch):
    env(GEMINI_API_KEY="k")
    monkeypatch.setattr(gemini, "generate_json", fake_model(*[CHAPTER] * 8))
    turns = [{"role": "elder", "text": "Cardamom and wet earth after rain.", "lang": "en"}]
    codes = [api.post("/api/chapter", json={**BODY, "turns": turns}).status_code for _ in range(8)]
    assert codes.count(200) == 6 and codes[-1] == 429


def test_one_account_cannot_dodge_limits_by_changing_networks(env, api, monkeypatch):
    env(GEMINI_API_KEY="k", SUPABASE_URL="https://x.supabase.co", SUPABASE_ANON_KEY="anon")

    async def who(token):
        return "user-1"

    monkeypatch.setattr(security, "user_id_for", who)
    monkeypatch.setattr(gemini, "generate_json", fake_model(*[{}] * 20))
    codes = [
        api.post("/api/chapter", json=BODY, headers={"Authorization": "Bearer t", "X-Forwarded-For": f"x, 198.51.100.{i}"}).status_code
        for i in range(8)
    ]
    assert codes[-1] == 429


def test_audio_is_identified_by_its_bytes_not_its_label(env, api, monkeypatch):
    env(GEMINI_API_KEY="k")

    async def hear(data, mime, lang):
        return "words"

    monkeypatch.setattr(gemini, "transcribe", hear)
    html = api.post("/api/transcribe", files={"audio": ("a.webm", b"<script>alert(1)</script>", "audio/webm")}, data={"lang": "ur"})
    assert html.status_code == 400
    webm = api.post("/api/transcribe", files={"audio": ("a", b"\x1a\x45\xdf\xa3" + b"0" * 100, "text/html")}, data={"lang": "ur"})
    assert webm.status_code == 200 and webm.json()["text"] == "words"


def test_bodies_are_limited_while_streaming(env, api):
    env(GEMINI_API_KEY="k")

    def chunks():
        for _ in range(8):
            yield b"a" * 65536

    assert api.post("/api/turn", content=chunks(), headers={"content-type": "application/json"}).status_code == 400
    assert api.post("/api/turn", content=b"[" * 50000 + b"]" * 50000).status_code == 400


def test_security_headers_on_every_response(env, api):
    for res in (api.get("/health"), api.post("/api/turn", json=BODY)):
        assert res.headers["x-content-type-options"] == "nosniff"
        assert res.headers["cache-control"] == "no-store"
        assert "default-src 'none'" in res.headers["content-security-policy"]


def test_tts_repeats_are_cached(env, api, monkeypatch):
    env(GEMINI_API_KEY="k")
    voice._tts_cache.clear()
    calls = []

    async def speak(text, voice_name="Kore"):
        calls.append(text)
        return b"RIFF....WAVE"

    monkeypatch.setattr(gemini, "speak", speak)
    for _ in range(2):
        res = api.post("/api/tts", json={"text": "آپ کہاں پیدا ہوئے؟", "lang": "ur"})
        assert res.status_code == 200 and res.headers["content-type"] == "audio/wav"
    assert len(calls) == 1


def test_share_without_service_role_is_503(env, api):
    assert api.get("/api/share/abc123").status_code == 503


def test_health_reports_connections_without_secrets(env, api):
    env(GEMINI_API_KEY="secret-value")
    body = api.get("/health").json()
    assert body["gemini"] is True and "secret-value" not in str(body)
