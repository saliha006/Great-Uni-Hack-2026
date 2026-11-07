from app.main import app
from fastapi.testclient import TestClient


def _boom():
    raise RuntimeError("kaboom")


# Hidden from the schema so the contract-paths test still sees only PRD §11 routes.
app.add_api_route("/__boom", _boom, include_in_schema=False)
client = TestClient(app, raise_server_exceptions=False)


def test_unhandled_error_returns_json_with_cors_headers():
    r = client.get("/__boom", headers={"Origin": "http://localhost:5173"})
    assert r.status_code == 500
    assert r.json() == {"detail": "internal_error"}
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_any_localhost_port_is_allowed():
    r = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_other_origins_are_not_allowed():
    r = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers
