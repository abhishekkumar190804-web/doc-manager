from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from app.config import SUPABASE_URL, SUPABASE_ANON_KEY

bearer_scheme = HTTPBearer(auto_error=False)


def get_supabase_client() -> create_client:
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )
    client = get_supabase_client()
    try:
        resp = client.auth.get_user(credentials.credentials)
        return resp.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
