from supabase import Client, ClientOptions, create_client
from app.core.config import Settings


def get_supabase_user_client(settings: Settings, user_jwt: str) -> Client:
    """Returns a Supabase client scoped to the authenticated user's JWT (enforces RLS)."""
    key = settings.SUPABASE_ANON_KEY
    if not settings.SUPABASE_URL or not key:
        raise RuntimeError("Supabase URL and anon/publishable key must be configured.")

    return create_client(
        settings.SUPABASE_URL,
        key,
        options=ClientOptions(
            headers={"Authorization": f"Bearer {user_jwt}"},
            persist_session=False,
        ),
    )


def get_supabase_admin_client(settings: Settings) -> Client:
    """Returns a Supabase service-role client for trusted server-side storage/DB tasks."""
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    if not settings.SUPABASE_URL or not key:
        raise RuntimeError("Supabase URL and API key must be configured.")
    return create_client(settings.SUPABASE_URL, key)
