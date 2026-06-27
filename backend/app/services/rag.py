from app.database import get_supabase
from app.services.embeddings import embed_text


MAX_CHUNKS = 8
SIMILARITY_THRESHOLD = 0.5


def search_chunks(workspace_id: str, query: str, top_k: int = MAX_CHUNKS) -> list[dict]:
    query_embedding = embed_text(query)
    embedding_str = f"[{','.join(str(v) for v in query_embedding)}]"

    resp = get_supabase().rpc(
        "match_chunks",
        {
            "p_workspace_id": workspace_id,
            "p_embedding": embedding_str,
            "p_match_count": top_k,
            "p_threshold": SIMILARITY_THRESHOLD,
        },
    ).execute()

    if not resp.data:
        return []

    results = []
    for row in resp.data:
        doc_resp = (
            get_supabase().table("documents")
            .select("filename")
            .eq("id", row["document_id"])
            .single()
            .execute()
        )
        filename = doc_resp.data["filename"] if doc_resp.data else "unknown"
        results.append(
            {
                "document_id": row["document_id"],
                "filename": filename,
                "chunk_index": row["chunk_index"],
                "content": row["content"],
                "similarity": row.get("similarity", 0),
            }
        )

    return results


def build_context(results: list[dict]) -> str:
    parts = []
    for i, r in enumerate(results, 1):
        parts.append(
            f"[Source {i}] File: {r['filename']} (chunk {r['chunk_index']})\n{r['content']}"
        )
    return "\n\n".join(parts)
