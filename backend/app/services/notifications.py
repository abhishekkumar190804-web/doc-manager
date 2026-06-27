import httpx
from app.config import DISCORD_WEBHOOK_URL


async def send_discord_notification(message: str) -> dict:
    if not DISCORD_WEBHOOK_URL:
        return {"success": False, "error": "Discord webhook not configured"}

    payload = {"content": message}

    async with httpx.AsyncClient() as client:
        resp = await client.post(DISCORD_WEBHOOK_URL, json=payload)
        return {
            "success": resp.is_success,
            "status_code": resp.status_code,
        }
