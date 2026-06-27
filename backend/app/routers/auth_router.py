import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from app.auth import get_current_user, get_supabase_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignUpRequest(BaseModel):
    email: str
    password: str


class SignInRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def signup(req: SignUpRequest):
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                },
                json={
                    "email": req.email,
                    "password": req.password,
                    "email_confirm": True,
                },
            )
            if resp.status_code != 200:
                detail = resp.json().get("msg", "Signup failed")
                raise HTTPException(status_code=400, detail=detail)
            return {"user": resp.json()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin")
async def signin(req: SignInRequest):
    client = get_supabase_client()
    try:
        resp = client.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        return {
            "user": resp.user.model_dump(),
            "session": {
                "access_token": resp.session.access_token,
                "refresh_token": resp.session.refresh_token,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    return {"user": {"id": user.id, "email": user.email}}
