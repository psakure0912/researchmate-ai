from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "chroma_mode" in data


def test_protected_routes_require_auth():
    resp = client.get("/api/v1/workspaces")
    assert resp.status_code == 401
