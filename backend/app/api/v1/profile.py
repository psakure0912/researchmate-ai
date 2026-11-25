from fastapi import APIRouter, Depends, HTTPException
from app.core.config import Settings, get_settings
from app.core.security import AuthenticatedUser, get_current_user
from app.db.supabase_client import get_supabase_user_client
from app.models.schemas import ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("")
async def get_profile(
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    res = sb.table("profiles").select("*").eq("id", user.id).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return res.data


@router.put("")
async def update_profile(
    payload: ProfileUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    res = sb.table("profiles").update(updates).eq("id", user.id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return res.data[0]
