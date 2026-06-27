import { useState, useEffect, useRef, FormEvent } from 'react'
import { api, ChatMessage } from '../api/client'

export default function Chat({ workspaceId }: { workspaceId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<ChatMessage[]>(`/api/chat/history/${workspaceId}`).then(setMessages).catch(console.error)
  }, [workspaceId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || busy) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      role: 'user',
      content: input.trim(),
      sources: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setBusy(true)

    try {
      const res = await api.post<{ reply: string; sources: any[] }>('/api/chat', {
        workspace_id: workspaceId,
        message: userMsg.content,
      })
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        role: 'assistant',
        content: res.reply,
        sources: res.sources,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        role: 'assistant',
        content: `Error: ${err.message}`,
        sources: null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Ask about your documents</h3>
            <p>Upload documents and ask questions about them</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`chat-message ${m.role}`}>
            <div className="bubble">
              <div className="bubble-text">{m.content}</div>
              {m.sources && m.sources.length > 0 && (
                <div className="sources">
                  {m.sources.map((s, i) => (
                    <span key={i} className="source-tag" title={`Chunk ${s.chunk_index}`}>
                      📎 {s.filename}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="chat-message assistant">
            <div className="bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your documents..."
          disabled={busy}
        />
        <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </>
  )
}
