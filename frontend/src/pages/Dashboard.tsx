import { useState, useEffect, useCallback, FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api, Workspace } from '../api/client'
import Chat from '../components/Chat'
import DocumentList from '../components/DocumentList'
import WorkspaceSwitcher from '../components/WorkspaceSwitcher'
import FileUpload from '../components/FileUpload'
import TaskList from '../components/TaskList'
import ToolCallLog from '../components/ToolCallLog'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWs, setActiveWs] = useState<Workspace | null>(null)
  const [wsLoading, setWsLoading] = useState(true)
  const [showNewWs, setShowNewWs] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.get<Workspace[]>('/api/workspaces').then(data => {
      setWorkspaces(data)
      if (data.length > 0) setActiveWs(data[0])
    }).catch(console.error).finally(() => setWsLoading(false))
  }, [])

  const createWorkspace = useCallback(async (name: string) => {
    if (creating) return
    setCreating(true)
    try {
      const ws = await api.post<Workspace>('/api/workspaces', { name })
      setWorkspaces(prev => [...prev, ws])
      setActiveWs(ws)
      setShowNewWs(false)
      setNewWsName('')
    } finally {
      setCreating(false)
    }
  }, [creating])

  const deleteWorkspace = useCallback(async (id: string) => {
    if (!window.confirm('Delete this workspace and all its content?')) return
    await api.delete(`/api/workspaces/${id}`)
    setWorkspaces(prev => {
      const next = prev.filter(w => w.id !== id)
      if (activeWs?.id === id) {
        setActiveWs(next[0] || null)
      }
      return next
    })
  }, [activeWs])

  function handleNewWsSubmit(e: FormEvent) {
    e.preventDefault()
    if (newWsName.trim()) createWorkspace(newWsName.trim())
  }

  if (wsLoading) return <div className="loading">Loading...</div>

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Doc Manager</h1>
          <button className="btn-primary btn-sm" onClick={() => setShowNewWs(true)}>+ New</button>
        </div>
        {showNewWs && (
          <form onSubmit={handleNewWsSubmit} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <input
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              placeholder="Workspace name"
              autoFocus
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button type="submit" className="btn-primary btn-sm" disabled={creating || !newWsName.trim()}>
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => { setShowNewWs(false); setNewWsName('') }}>Cancel</button>
            </div>
          </form>
        )}
        <WorkspaceSwitcher
          workspaces={workspaces}
          active={activeWs}
          onSelect={setActiveWs}
          onDelete={deleteWorkspace}
        />
        <div className="sidebar-footer">
          <span className="user-email">{user?.email}</span>
          <button className="btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div className="main-content">
        {activeWs ? (
          <WorkspaceView workspaceId={activeWs.id} workspaceName={activeWs.name} />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No workspace yet</h3>
            <p>Create a workspace to start uploading documents and chatting</p>
            <button className="btn-primary" style={{ marginTop: 16, width: 'auto' }} onClick={() => setShowNewWs(true)}>
              Create Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function WorkspaceView({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get<any[]>('/api/documents', { workspace_id: workspaceId }).then(setDocuments).catch(console.error).finally(() => setLoading(false))
  }, [workspaceId])

  return (
    <div className="workspace-view">
      <div className="workspace-header">
        <h2>{workspaceName}</h2>
      </div>
      <div className="workspace-body">
        <ChatPanel workspaceId={workspaceId} />
        <SidePanel workspaceId={workspaceId} documents={documents} loading={loading} onDocChange={() => {
          api.get<any[]>('/api/documents', { workspace_id: workspaceId }).then(setDocuments).catch(console.error)
        }} />
      </div>
    </div>
  )
}

function ChatPanel({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="chat-panel">
      <Chat workspaceId={workspaceId} />
    </div>
  )
}

function SidePanel({ workspaceId, documents, loading, onDocChange }: {
  workspaceId: string
  documents: any[]
  loading: boolean
  onDocChange: () => void
}) {
  return (
    <div className="documents-panel">
      <div className="documents-panel-header">
        <span>Documents</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{documents.length}</span>
      </div>
      <DocumentList workspaceId={workspaceId} />
      <FileUpload workspaceId={workspaceId} onUploaded={onDocChange} />
      <TaskList workspaceId={workspaceId} />
      <ToolCallLog workspaceId={workspaceId} />
    </div>
  )
}
