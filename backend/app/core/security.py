from dataclasses import dataclass
from typing import Optional
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from app.core.config import Settings, get_settings
from app.core.logging import logger

bearer_scheme = HTTPBearer(auto_error=False)
_jwks_client: Optional[PyJWKClient] = None


@dataclass
class AuthenticatedUser:
    id: str
    email: Optional[str]
    token: str


def _get_jwks_client(supabase_url: str) -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def _verify_via_supabase_auth(token: str, settings: Settings) -> Optional[AuthenticatedUser]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        return None
    try:
        client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        resp = client.auth.get_user(token)
        if resp and resp.user:
            return AuthenticatedUser(
                id=str(resp.user.id),
                email=resp.user.email,
                token=token,
            )
    except Exception as exc:
        logger.debug("Supabase auth.get_user fallback failed: %s", exc)
    return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token.",
        )

    token = credentials.credentials

    # 1. Try asymmetric JWKS verification (modern Supabase projects)
    if settings.SUPABASE_URL:
        try:
            header = jwt.get_unverified_header(token)
            alg = header.get("alg", "")
            if alg in ("ES256", "RS256"):
                signing_key = _get_jwks_client(settings.SUPABASE_URL).get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[alg],
                    audience="authenticated",
                )
                return AuthenticatedUser(
                    id=payload["sub"],
                    email=payload.get("email"),
                    token=token,
                )
        except Exception as exc:
            logger.debug("JWKS verification skipped/failed: %s", exc)

    # 2. Try symmetric HS256 JWT secret if configured
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            return AuthenticatedUser(
                id=payload["sub"],
                email=payload.get("email"),
                token=token,
            )
        except jwt.PyJWTError as exc:
            logger.debug("HS256 JWT verification failed: %s", exc)

    # 3. Authoritative fallback via Supabase Auth API
    verified = _verify_via_supabase_auth(token, settings)
    if verified:
        return verified

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
    )
