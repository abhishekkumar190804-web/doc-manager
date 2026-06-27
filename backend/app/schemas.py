from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceOut(BaseModel):
    id: str
    user_id: str
    name: str
    created_at: datetime


class DocumentOut(BaseModel):
    id: str
    workspace_id: str
    filename: str
    uploaded_at: datetime
    chunk_count: int


class ChatRequest(BaseModel):
    workspace_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str
    sources: list[dict]


class TaskCreate(BaseModel):
    workspace_id: str
    title: str
    notes: Optional[str] = None


class TaskOut(BaseModel):
    id: str
    workspace_id: str
    title: str
    notes: Optional[str]
    created_at: datetime


class SourceInfo(BaseModel):
    document_id: str
    filename: str
    chunk_index: int
    content: str
