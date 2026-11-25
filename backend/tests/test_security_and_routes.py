from fastapi.testclient import TestClient
from app.main import app
from app.core.rate_limit import SlidingWindowRateLimiter
import pytest
from fastapi import HTTPException

client = TestClient(app)


def test_openapi_contains_all_core_routes():
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    paths = resp.json()["paths"]
    expected = [
        "/api/v1/health",
        "/api/v1/profile",
        "/api/v1/workspaces",
        "/api/v1/documents/upload",
        "/api/v1/chat/sessions/{session_id}/ask",
        "/api/v1/summaries/{document_id}",
        "/api/v1/literature-review/generate",
        "/api/v1/gap-analysis/generate",
        "/api/v1/discover/search",
        "/api/v1/exports/literature-review/{review_id}/csv",
        "/api/v1/exports/gap-report/{report_id}/pdf",
    ]
    for path in expected:
        assert path in paths, f"Missing route {path}"


def test_rate_limiter_blocks_excess_requests():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=60)
    limiter.check("user-1")
    limiter.check("user-1")
    with pytest.raises(HTTPException) as exc:
        limiter.check("user-1")
    assert exc.value.status_code == 429
