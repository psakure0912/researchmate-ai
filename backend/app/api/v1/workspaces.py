from fastapi import APIRouter, Depends, HTTPException, status
from app.core.config import Settings, get_settings
from app.core.security import AuthenticatedUser, get_current_user
from app.db.supabase_client import get_supabase_user_client
from app.models.schemas import WorkspaceCreate, WorkspaceUpdate

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("")
async def list_workspaces(
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    res = (
        sb.table("workspaces")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", desc=True)
        .execute()
    )
    return res.data or []


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    res = (
        sb.table("workspaces")
        .insert(
            {
                "user_id": user.id,
                "name": payload.name.strip(),
                "description": payload.description,
                "topic_tags": payload.topic_tags,
            }
        )
        .execute()
    )
    return res.data[0]


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    res = (
        sb.table("workspaces")
        .select("*")
        .eq("id", workspace_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return res.data


@router.put("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    updates = payload.model_dump(exclude_none=True)
    res = (
        sb.table("workspaces")
        .update(updates)
        .eq("id", workspace_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return res.data[0]


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    sb.table("workspaces").delete().eq("id", workspace_id).eq("user_id", user.id).execute()
    return None
