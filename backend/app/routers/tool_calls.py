from fastapi import APIRouter, Depends
from app.database import get_supabase
from app.auth import get_current_user

router = APIRouter(prefix="/api/tool-calls", tags=["tool-calls"])


@router.get("")
async def list_tool_calls(workspace_id: str, user=Depends(get_current_user)):
    resp = (
        get_supabase()
        .table("tool_call_log")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("called_at")
        .execute()
    )
    return resp.data
