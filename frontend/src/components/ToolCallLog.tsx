import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface ToolCall {
  id: string
  workspace_id: string
  tool_name: string
  arguments: any
  result: any
  success: boolean
  called_at: string
}

export default function ToolCallLog({ workspaceId }: { workspaceId: string }) {
  const [logs, setLogs] = useState<ToolCall[]>([])

  useEffect(() => {
    api.get<ToolCall[]>('/api/tool-calls', { workspace_id: workspaceId }).then(setLogs).catch(console.error)
  }, [workspaceId])

  if (logs.length === 0) return null

  return (
    <div className="tasks-section">
      <h4>Tool Calls</h4>
      {logs.slice().reverse().slice(0, 10).map(t => (
        <div key={t.id} className="task-item" style={{ fontSize: 12 }}>
          <span className="task-title" style={{ fontFamily: 'monospace' }}>
            {t.success ? '✓' : '✗'} {t.tool_name}
          </span>
          <span className="task-notes">
            {JSON.stringify(t.arguments).substring(0, 60)}
          </span>
        </div>
      ))}
    </div>
  )
}
