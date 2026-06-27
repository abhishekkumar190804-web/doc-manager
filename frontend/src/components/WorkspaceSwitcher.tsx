import { Workspace } from '../api/client'

interface Props {
  workspaces: Workspace[]
  active: Workspace | null
  onSelect: (ws: Workspace) => void
  onDelete: (id: string) => void
}

export default function WorkspaceSwitcher({ workspaces, active, onSelect, onDelete }: Props) {
  return (
    <div className="workspace-list">
      {workspaces.map(ws => (
        <div
          key={ws.id}
          className={`workspace-item ${active?.id === ws.id ? 'active' : ''}`}
          onClick={() => onSelect(ws)}
        >
          <span className="name">{ws.name}</span>
          <button
            className="delete-btn"
            onClick={e => { e.stopPropagation(); onDelete(ws.id) }}
            title="Delete workspace"
          >
            ✕
          </button>
        </div>
      ))}
      {workspaces.length === 0 && (
        <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No workspaces yet
        </div>
      )}
    </div>
  )
}
