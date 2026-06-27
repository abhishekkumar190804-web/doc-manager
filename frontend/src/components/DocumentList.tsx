import { useState, useEffect } from 'react'
import { api, Document } from '../api/client'

export default function DocumentList({ workspaceId }: { workspaceId: string }) {
  const [docs, setDocs] = useState<Document[]>([])

  const load = () => {
    api.get<Document[]>('/api/documents', { workspace_id: workspaceId }).then(setDocs).catch(console.error)
  }

  useEffect(() => { load() }, [workspaceId])

  async function remove(id: string) {
    await api.delete(`/api/documents/${id}`)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="documents-list">
      {docs.length === 0 && (
        <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No documents yet
        </div>
      )}
      {docs.map(d => (
        <div key={d.id} className="document-item">
          <span className="name">{d.filename}</span>
          <span className="chunks">{d.chunk_count} chunks</span>
          <button className="btn-ghost btn-sm" onClick={() => remove(d.id)} title="Delete">x</button>
        </div>
      ))}
    </div>
  )
}
