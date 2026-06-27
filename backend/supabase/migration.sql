-- Run this in Supabase SQL editor after applying the schema

CREATE OR REPLACE FUNCTION match_chunks(
  p_workspace_id UUID,
  p_embedding vector(768),
  p_match_count INT DEFAULT 8,
  p_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.workspace_id,
    chunks.document_id,
    chunks.content,
    chunks.chunk_index,
    1 - (chunks.embedding <=> p_embedding) AS similarity
  FROM chunks
  WHERE chunks.workspace_id = p_workspace_id
    AND 1 - (chunks.embedding <=> p_embedding) > p_threshold
  ORDER BY chunks.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$;
