import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Simple per-IP/user sliding-window rate limiter for API protection."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        bucket = self._hits[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please slow down and try again shortly.",
            )
        bucket.append(now)


api_rate_limiter = SlidingWindowRateLimiter(max_requests=90, window_seconds=60)
llm_rate_limiter = SlidingWindowRateLimiter(max_requests=25, window_seconds=60)


async def enforce_api_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    api_rate_limiter.check(f"ip:{client_ip}")
