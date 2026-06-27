# AGENTS.md — AI Context for Document Assistant

## Project Overview
Full-stack RAG document assistant with multi-workspace isolation, Google Gemini AI, tool calling, and a single shared vector store.

## Tech Stack
- **Backend**: Python FastAPI, Supabase (auth + DB + vector store), Google Gemini
- **Frontend**: React + Vite + TypeScript
- **LLM**: Gemini 2.5 Flash (chat), Gemini Embedding 2 (embeddings, 3072d)
- **Vector**: pgvector, single `chunks` table, isolation via `workspace_id` filter

## Key Architecture Decisions
1. **Single shared vector table**: All workspaces use one `chunks` table. Isolation is enforced by `WHERE workspace_id = ?` in queries, not by separate tables
2. **Admin API signup**: Uses Supabase Auth Admin API with `email_confirm: true` to bypass email verification on the free tier
3. **Lazy Supabase client**: Initialized lazily so the app boots even with placeholder env vars
4. **No ivfflat index**: Embedding dimension (3072) exceeds ivfflat's 2000-dim limit. Searches use brute-force (fine for dev-scale datasets)
5. **CORS explicit origins**: Using explicit origin list instead of regex to avoid middleware conflicts with credentials
6. **Backend runs without --reload**: File-watch caused server crashes during development

## Project Structure
```
backend/
  app/
    main.py              — FastAPI entry, CORS, router registration
    config.py            — Env var loading
    database.py          — Lazy supabase client
    auth.py              — Bearer token auth dependency
    schemas.py           — Pydantic models
    routers/
      auth_router.py     — Signup (Admin API), signin, /me
      workspaces.py      — CRUD + cascade delete
      documents.py       — Upload, chunk, embed, list, delete
      chat.py            — RAG chat, tool execution, logging
      tasks.py           — Task CRUD
      tool_calls.py      — Tool call log listing
    services/
      llm.py             — Gemini chat with function declarations
      embeddings.py      — Gemini Embedding 2 (3072d)
      chunking.py        — Paragraph-based split with overlap
      rag.py             — Vector search + context builder
      notifications.py   — Discord webhook sender
  supabase/
    full_migration.sql   — Schema + RLS + match_chunks function
frontend/
  src/
    pages/               — Login, SignUp, Dashboard
    components/          — Chat, DocumentList, FileUpload, WorkspaceSwitcher, TaskList, ToolCallLog
    api/client.ts        — API client with auth token
    contexts/AuthContext — Auth state management
    styles/index.css     — Dark theme styling
```

## Common Tasks

### Running locally
- Backend: `cd backend && uvicorn app.main:app --port 8000`
- Frontend: `cd frontend && npm run dev`
- Test credentials: `user@gmail.com` / `test123456`

### Database changes
- Run SQL in Supabase dashboard SQL editor
- Update `backend/supabase/full_migration.sql` to stay in sync

### Adding a new tool
1. Add function declaration in `services/llm.py` `TOOLS` list
2. Add execution logic in `routers/chat.py` (the `for tc in tool_calls` loop)
3. Log to `tool_call_log` table

### Adding a new API route
1. Create the router file in `routers/`
2. Register in `main.py` with `app.include_router()`
3. Add Pydantic schema in `schemas.py` if needed

## Important Notes
- The `.env` file contains real credentials — never commit it
- The `chunks` table was recently migrated from vector(768) to vector(3072) — the `full_migration.sql` in this repo may still show 768
- Rate limits on Supabase free tier: ~30 signups/hour. If signups fail, wait or use pre-created accounts
- Gemini API key in use doesn't have access to `gemini-1.5-flash` or `text-embedding-004` — uses `gemini-2.5-flash` and `gemini-embedding-2` instead
