from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_URL
from app.routers import auth_router, workspaces, documents, chat, tasks, tool_calls

app = FastAPI(title="Document Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(workspaces.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(tasks.router)
app.include_router(tool_calls.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
