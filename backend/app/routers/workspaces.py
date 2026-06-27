from fastapi import APIRouter, Depends, HTTPException
from app.database import get_supabase
from app.schemas import WorkspaceCreate, WorkspaceOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


@router.get("")
async def list_workspaces(user=Depends(get_current_user)):
    resp = get_supabase().table("workspaces").select("*").eq("user_id", user.id).order("created_at").execute()
    return resp.data


@router.post("", status_code=201)
async def create_workspace(body: WorkspaceCreate, user=Depends(get_current_user)):
    resp = get_supabase().table("workspaces").insert({
        "user_id": user.id,
        "name": body.name,
    }).execute()
    return resp.data[0]


@router.get("/{workspace_id}")
async def get_workspace(workspace_id: str, user=Depends(get_current_user)):
    resp = get_supabase().table("workspaces").select("*").eq("id", workspace_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return resp.data


@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, user=Depends(get_current_user)):
    supabase = get_supabase()
    supabase.table("chunks").delete().eq("workspace_id", workspace_id).execute()
    supabase.table("documents").delete().eq("workspace_id", workspace_id).execute()
    supabase.table("chat_messages").delete().eq("workspace_id", workspace_id).execute()
    supabase.table("tasks").delete().eq("workspace_id", workspace_id).execute()
    supabase.table("tool_call_log").delete().eq("workspace_id", workspace_id).execute()
    supabase.table("workspaces").delete().eq("id", workspace_id).execute()
    return {"ok": True}
