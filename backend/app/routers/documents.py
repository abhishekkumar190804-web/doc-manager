import io
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.database import get_supabase
from app.auth import get_current_user
from app.services.chunking import chunk_text
from app.services.embeddings import embed_batch

router = APIRouter(prefix="/api/documents", tags=["documents"])

SUPPORTED_EXTENSIONS = {".txt", ".pdf", ".docx"}


def extract_text(filename: str, content: bytes) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".txt":
        return content.decode("utf-8", errors="replace")
    elif ext == ".pdf":
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    elif ext == ".docx":
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


@router.get("")
async def list_documents(workspace_id: str, user=Depends(get_current_user)):
    resp = get_supabase().table("documents").select("*").eq("workspace_id", workspace_id).execute()
    return resp.data


@router.post("", status_code=201)
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    ws_resp = get_supabase().table("workspaces").select("id").eq("id", workspace_id).single().execute()
    if not ws_resp.data:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}")

    content = await file.read()

    try:
        text = extract_text(file.filename, content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")

    chunks = chunk_text(text)

    doc_resp = get_supabase().table("documents").insert({
        "workspace_id": workspace_id,
        "filename": file.filename,
        "chunk_count": len(chunks),
    }).execute()

    doc_id = doc_resp.data[0]["id"]

    embeddings = embed_batch(chunks)

    chunk_rows = []
    for i, (chunk_text_content, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_rows.append({
            "workspace_id": workspace_id,
            "document_id": doc_id,
            "content": chunk_text_content,
            "embedding": embedding,
            "chunk_index": i,
        })

    CHUNK_BATCH = 50
    for i in range(0, len(chunk_rows), CHUNK_BATCH):
        batch = chunk_rows[i : i + CHUNK_BATCH]
        get_supabase().table("chunks").insert(batch).execute()

    return {
        "id": doc_id,
        "filename": file.filename,
        "chunk_count": len(chunks),
    }


@router.delete("/{document_id}")
async def delete_document(document_id: str, user=Depends(get_current_user)):
    get_supabase().table("chunks").delete().eq("document_id", document_id).execute()
    get_supabase().table("documents").delete().eq("id", document_id).execute()
    return {"ok": True}
