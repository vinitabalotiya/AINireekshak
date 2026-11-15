"""Simple in-memory rate limiting middleware for sensitive endpoints."""

import logging
import time
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-memory rate limiter per IP address for sensitive API routes (e.g. auth)."""

    def __init__(self, app, max_requests: int = 1000, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Maps ip_address -> list of timestamp floats
        self.requests_log: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Rate limit only sensitive POST endpoints (auth, registration)
        path = request.url.path
        if request.method == "POST" and ("/api/auth" in path or "/login" in path):
            client_ip = request.client.host if request.client else "unknown"
            current_time = time.time()

            # Clean up old timestamps
            timestamps = self.requests_log.get(client_ip, [])
            cutoff = current_time - self.window_seconds
            timestamps = [t for t in timestamps if t > cutoff]

            if len(timestamps) >= self.max_requests:
                logger.warning("Rate limit exceeded for IP %s on %s", client_ip, path)
                return Response(
                    content='{"detail": "Too many requests. Please try again later."}',
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    media_type="application/json",
                )

            timestamps.append(current_time)
            self.requests_log[client_ip] = timestamps

        return await call_next(request)
