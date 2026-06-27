from fastapi import APIRouter, Depends, HTTPException
from app.database import get_supabase
from app.auth import get_current_user
from app.schemas import ChatRequest
from app.services.rag import search_chunks, build_context
from app.services.llm import ask_gemini
from app.services.notifications import send_discord_notification

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
async def chat(body: ChatRequest, user=Depends(get_current_user)):
    ws_resp = get_supabase().table("workspaces").select("id").eq("id", body.workspace_id).single().execute()
    if not ws_resp.data:
        raise HTTPException(status_code=404, detail="Workspace not found")

    get_supabase().table("chat_messages").insert({
        "workspace_id": body.workspace_id,
        "role": "user",
        "content": body.message,
    }).execute()

    history_resp = (
        get_supabase().table("chat_messages")
        .select("*")
        .eq("workspace_id", body.workspace_id)
        .order("created_at")
        .execute()
    )

    results = search_chunks(body.workspace_id, body.message)
    context = build_context(results) if results else "No relevant documents found."

    reply_text, tool_calls = ask_gemini(body.message, context, history_resp.data)

    for tc in tool_calls:
        tool_result = None
        success = False

        if tc["name"] == "create_task":
            try:
                resp = get_supabase().table("tasks").insert({
                    "workspace_id": body.workspace_id,
                    "title": tc["args"].get("title", "Untitled"),
                    "notes": tc["args"].get("notes"),
                }).execute()
                tool_result = resp.data[0] if resp.data else {"ok": True}
                success = True
            except Exception as e:
                tool_result = {"error": str(e)}

        elif tc["name"] == "send_notification":
            try:
                tool_result = await send_discord_notification(
                    tc["args"].get("message", "")
                )
                success = tool_result.get("success", False)
            except Exception as e:
                tool_result = {"error": str(e)}

        get_supabase().table("tool_call_log").insert({
            "workspace_id": body.workspace_id,
            "tool_name": tc["name"],
            "arguments": tc["args"],
            "result": tool_result,
            "success": success,
        }).execute()

    sources = []
    for r in results[:3]:
        sources.append({
            "document_id": r["document_id"],
            "filename": r["filename"],
            "chunk_index": r["chunk_index"],
        })

    get_supabase().table("chat_messages").insert({
        "workspace_id": body.workspace_id,
        "role": "assistant",
        "content": reply_text,
        "sources": sources,
    }).execute()

    return {
        "reply": reply_text,
        "sources": sources,
    }


@router.get("/history/{workspace_id}")
async def get_chat_history(workspace_id: str, user=Depends(get_current_user)):
    resp = (
        get_supabase().table("chat_messages")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at")
        .execute()
    )
    return resp.data
