# AI_NOTES.md

## AI Tools Used

This project was built using **Anomaally Big-Pickle** (a code-generation model) as the primary development assistant. All code — backend routers, services, frontend components, API client, auth context, styles, and documentation — was written interactively through a conversational CLI loop; no third-party boilerplate generators or scaffolding tools were used.

## How It Was Built

The project evolved through a series of goals:

1. **Scaffolding**: Created the project directory structure, FastAPI app, Vite + React frontend
2. **Core backend**: Built auth (Supabase Admin API for signup with auto-confirm), workspaces CRUD, document upload with chunk+embed pipeline, RAG chat
3. **Frontend**: Built login/signup pages, dashboard layout with sidebar, chat UI, document list, file upload
4. **Integration**: Connected frontend to backend via a typed API client, wired up auth state management, tested full flow end-to-end
5. **Fixing runtime issues**: Encountered and resolved several runtime errors (model names, embedding dimensions, etc.)

## Key Decisions & Tradeoffs

| Decision | Rationale |
|----------|-----------|
| **Single shared `chunks` table** | Simpler schema, avoids per-workspace table management. Isolation via `WHERE workspace_id = ?` in every query. The assignment explicitly required "one shared vector store" |
| **Supabase Admin API for signup** | Free tier doesn't allow disabling email confirmation. Admin API with `email_confirm: true` bypasses this without requiring verified email sending |
| **Lazy Supabase client** | The app booted with placeholder env vars during development. A lazy init prevents crashes when env vars aren't set yet |
| **Paragraph-based chunking with overlap** | Simple, preserves document structure better than fixed-token windows. Overlap prevents information loss at chunk boundaries |
| **Gemini 2.5 Flash + Embedding 2** | The user's API key didn't have access to `gemini-1.5-flash` or `text-embedding-004`. Had to discover available models via `models.list()` and switch |
| **No ivfflat index** | Vector dimension (3072) exceeds ivfflat's 2000-dim limit. Brute-force search is acceptable for dev-scale datasets |
| **`system_instruction` in GenerateContentConfig** | Cleaner than injecting system prompt as a user message. Supported by the `google-genai` SDK |
| **Explicit CORS origins** | Using `allow_origins` list instead of regex patterns avoids middleware conflicts when `allow_credentials=True` |

## Hardest Bugs

### 1. Wrong Gemini Model Names
**Symptom**: `500 Internal Server Error` on upload and chat
**Cause**: The `.env` file specified `gemini-1.5-flash` and `text-embedding-004`, but the user's API key only had access to newer models (`gemini-2.5-flash`, `gemini-embedding-2`). The Gemini API returns `404 NOT_FOUND` for unavailable models — not a descriptive "model not found for this key."
**Fix**: Called `client.models.list()` to enumerate available models, then updated `llm.py` and `embeddings.py` to use the correct model names.

### 2. Embedding Dimension Mismatch (768 vs 3072)
**Symptom**: Upload succeeded for the document row but failed with `expected 768 dimensions, not 3072` when inserting chunks
**Cause**: The old `text-embedding-004` model produced 768-dim embeddings, but the replacement `gemini-embedding-2` produces 3072-dim. The `chunks` table was created with `vector(768)` and the `match_chunks` function expected `vector(768)`.
**Fix**: Dropped the `chunks` table, recreated with `vector(3072)`, updated `match_chunks` function signature. Also had to skip the ivfflat index because it doesn't support >2000 dimensions.

### 3. System Prompt as User Message
**Symptom**: The LLM gave incoherent responses and ignored the "I don't know" instruction
**Cause**: The original `ask_gemini` function injected the system prompt as a `role: "user"` message with a fake `role: "model"` acknowledgement, which polluted the conversation context
**Fix**: Used the `system_instruction` parameter in `GenerateContentConfig` to pass the system prompt properly

### 4. Backend Process Died on Restart
**Symptom**: Fetch errors in the browser after backend changes
**Cause**: `Start-Process` in PowerShell creates a child process tied to the shell session. Restart attempts often left port 8000 orphaned
**Fix**: Added a guard to check for existing processes and properly kill them before restarting. Note that the backend runs without `--reload` to avoid file-watch crashes

### 5. FileUpload Causes Full Page Reload
**Symptom**: After uploading a document, the entire page reloaded via `window.location.reload()`
**Cause**: The original `FileUpload` component called `window.location.reload()` after upload to refresh the document list
**Fix**: Changed to pass an `onUploaded` callback that triggers a re-fetch of documents without a full page reload

## Prompt Engineering

The system prompt in `services/llm.py`:

```
You are a document assistant. Answer questions based ONLY on the provided document context.

Rules:
1. If the context contains the answer, answer using it and cite sources as [Source N].
2. If the context does NOT contain the answer, say "I couldn't find that information in your documents." — do not make up an answer.
3. You can create tasks (create_task) and send notifications (send_notification) when the user asks.
4. Be concise.
```

The user message format includes a clear "Context from documents:" / "Question:" separator to help the model distinguish retrieved context from the user's question. The phrase "Answer using ONLY the context above. If the context has no relevant info, say so. Cite sources as [Source N]." is appended to every user message.

## What Would Be Done Differently

- **Idempotent uploads**: Skip duplicate chunk inserts if the same file is uploaded twice
- **Prompt-injection guard**: Add a note in the system prompt that retrieved text is data, not instructions
- **Retrieval debug view**: Show which chunks were retrieved and their similarity scores in the UI
- **HNSW index**: If pgvector version supports it, use HNSW index (works with >2000 dims) instead of brute-force
- **Chat streaming**: Use Gemini's streaming API for a better chat UX
- **WebSocket-based chat**: Replace polling-based chat with WebSockets for real-time interaction

## Current Status

- All core features implemented and tested (auth, workspaces, document upload, RAG chat, tool calling, tool call log)
- Backend running locally on port 8000
- Frontend running locally on port 5173
- Not yet deployed (instructions provided in README.md)
