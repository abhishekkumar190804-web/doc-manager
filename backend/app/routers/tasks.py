from fastapi import APIRouter, Depends, HTTPException
from app.database import get_supabase
from app.auth import get_current_user
from app.schemas import TaskCreate, TaskOut

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
async def list_tasks(workspace_id: str, user=Depends(get_current_user)):
    resp = get_supabase().table("tasks").select("*").eq("workspace_id", workspace_id).order("created_at").execute()
    return resp.data


@router.post("", status_code=201)
async def create_task(body: TaskCreate, user=Depends(get_current_user)):
    resp = get_supabase().table("tasks").insert({
        "workspace_id": body.workspace_id,
        "title": body.title,
        "notes": body.notes,
    }).execute()
    return resp.data[0]


@router.delete("/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    get_supabase().table("tasks").delete().eq("id", task_id).execute()
    return {"ok": True}
