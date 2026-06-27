import { useState, useEffect } from 'react'
import { api, Task } from '../api/client'

export default function TaskList({ workspaceId }: { workspaceId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    api.get<Task[]>('/api/tasks', { workspace_id: workspaceId }).then(setTasks).catch(console.error)
  }, [workspaceId])

  if (tasks.length === 0) return null

  return (
    <div className="tasks-section">
      <h4>Tasks</h4>
      {tasks.slice().reverse().map(t => (
        <div key={t.id} className="task-item">
          <span className="task-title">{t.title}</span>
          {t.notes && <span className="task-notes">{t.notes}</span>}
        </div>
      ))}
    </div>
  )
}
