-- Full schema migration for Document Assistant

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS workspaces (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users NOT NULL,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  filename     TEXT NOT NULL,
  uploaded_at  TIMESTAMPTZ DEFAULT now(),
  chunk_count  INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  document_id  UUID REFERENCES documents NOT NULL,
  content      TEXT NOT NULL,
  embedding    vector(3072),
  chunk_index  INT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_workspace_idx ON chunks (workspace_id);

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  title        TEXT NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tool_call_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  tool_name    TEXT NOT NULL,
  arguments    JSONB NOT NULL,
  result       JSONB,
  success      BOOLEAN,
  called_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  role         TEXT CHECK (role IN ('user','assistant')) NOT NULL,
  content      TEXT NOT NULL,
  sources      JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspaces    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner only" ON workspaces;
DROP POLICY IF EXISTS "workspace owner only" ON documents;
DROP POLICY IF EXISTS "workspace owner only" ON chunks;
DROP POLICY IF EXISTS "workspace owner only" ON tasks;
DROP POLICY IF EXISTS "workspace owner only" ON tool_call_log;
DROP POLICY IF EXISTS "workspace owner only" ON chat_messages;

CREATE POLICY "owner only" ON workspaces
  USING (user_id = auth.uid());

CREATE POLICY "workspace owner only" ON documents
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "workspace owner only" ON chunks
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "workspace owner only" ON tasks
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "workspace owner only" ON tool_call_log
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE POLICY "workspace owner only" ON chat_messages
  USING (workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION match_chunks(
  p_workspace_id UUID,
  p_embedding vector(3072),
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
