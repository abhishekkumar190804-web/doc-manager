# Document Assistant

A full-stack RAG (Retrieval-Augmented Generation) document assistant with multi-workspace isolation, AI chat via Google Gemini, and tool calling (create tasks, send notifications).

## Features

- **Multi-workspace**: Each user can create multiple isolated workspaces
- **Document ingestion**: Upload `.txt`, `.pdf`, `.docx` files — they get chunked, embedded, and stored
- **RAG chat**: Ask questions about your documents. The AI retrieves relevant chunks from the active workspace only and answers with citations
- **Honest "I don't know"**: If the workspace's documents don't contain the answer, the assistant says so instead of inventing one
- **Tool calling**: The AI can create tasks and send Discord notifications on demand
- **Single shared vector store**: All workspaces share one `chunks` table. Isolation is enforced by `workspace_id` in every query — not by separate tables

## Stack

| Layer | Technology |
|-------|-----------|
| LLM | Google Gemini 2.5 Flash (function calling) |
| Embeddings | Gemini Embedding 2 (3072d) |
| Vector store | Supabase Postgres + pgvector (single table) |
| Auth | Supabase Auth (email/password) |
| Backend | Python FastAPI |
| Frontend | React + Vite + TypeScript |
| Notifications | Discord webhook (optional) |

## Quick Start (local)

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Supabase project (free tier at [supabase.com](https://supabase.com))
- A Gemini API key (free at [aistudio.google.com](https://aistudio.google.com/apikey))

### 1. Database

Run `backend/supabase/full_migration.sql` in your Supabase SQL editor (this creates all tables, indexes, RLS policies, and the vector search function).

**Important**: The SQL uses `vector(768)`. If your embedding model produces a different dimension, change it to match (this project uses 3072d — adjust if needed).

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
# Edit .env with your real keys
```

Start the backend:

```bash
uvicorn app.main:app --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment Variables (.env)

See [`.env.example`](.env.example) for the template.

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service_role key (for admin signup) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `DISCORD_WEBHOOK_URL` | No | Discord webhook for `send_notification` tool |
| `FRONTEND_URL` | No | Frontend origin for CORS (default: `http://localhost:5173`) |

## Test Credentials

| Email | Password | Notes |
|-------|----------|-------|
| `user@gmail.com` | `test123456` | Pre-created, ready to use |

Sign-up also works — new accounts are auto-confirmed (no email verification needed).

## Testing the App

### Sample Documents

Upload these two documents into separate workspaces to test isolation:

**doc1.txt** (upload to Workspace A):
```
Document Assistant is a tool that helps users manage and query documents using AI.
It supports multiple workspaces, document uploads, and intelligent chat.
The system uses Google Gemini for embeddings and chat, and Supabase for storage.
```

**doc2.txt** (upload to Workspace B):
```
The capital of France is Paris. It is known for the Eiffel Tower and its cuisine.
The population of Paris is approximately 2.1 million people.
French is the official language spoken in Paris.
```

### Sample Questions

| Question | Expected behavior |
|----------|-------------------|
| "What is Document Assistant?" | Answer from Workspace A's document with citation |
| "What is the capital of France?" | Answer from Workspace B's document with citation |
| "Tell me about Paris" | Answer from Workspace B |
| "What is the weather today?" | "I don't know" (no weather docs) |
| "Create a task to review the documents" | AI calls `create_task` tool |

### Testing Isolation

1. Create two workspaces (e.g., "Work" and "Personal")
2. Upload `doc1.txt` to "Work", upload `doc2.txt` to "Personal"
3. Switch to "Work" → ask "What is Document Assistant?" → should answer correctly
4. Switch to "Work" → ask "What is the capital of France?" → should say "I don't know"
5. Switch to "Personal" → ask "What is the capital of France?" → should answer correctly
6. Switch to "Personal" → ask "What is Document Assistant?" → should say "I don't know"

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/signin` | Sign in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/workspaces` | List workspaces |
| POST | `/api/workspaces` | Create workspace |
| DELETE | `/api/workspaces/{id}` | Delete workspace + all content |
| GET | `/api/documents?workspace_id=` | List documents |
| POST | `/api/documents?workspace_id=` | Upload document |
| DELETE | `/api/documents/{id}` | Delete document |
| POST | `/api/chat` | Chat with AI (RAG) |
| GET | `/api/chat/history/{workspace_id}` | Chat history |
| GET | `/api/tasks?workspace_id=` | List tasks |
| POST | `/api/tasks` | Create task |
| DELETE | `/api/tasks/{id}` | Delete task |
| GET | `/api/tool-calls?workspace_id=` | List tool calls |
| GET | `/api/health` | Health check |

## Deploying

### Backend (Render)

1. Push the `backend/` folder to a new Git repo
2. On Render, create a **Web Service** connected to that repo
3. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
4. Add all environment variables from `.env` in Render's dashboard
5. Update `FRONTEND_URL` in `.env` to your deployed frontend URL

### Frontend (Vercel)

1. Push the `frontend/` folder to a Git repo
2. On Vercel, import the project
3. Set:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend/`
   - **Environment Variable**: `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy

### Important for Production

- Update `allow_origins` in `backend/app/main.py` to include your deployed frontend domain
- Set `FRONTEND_URL` in the backend's `.env`
- The Supabase free tier has rate limits on the Auth API — consider adding a small delay between signups
