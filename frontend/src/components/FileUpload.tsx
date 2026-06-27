import { useState, FormEvent, useRef } from 'react'
import { api } from '../api/client'

export default function FileUpload({ workspaceId, onUploaded }: { workspaceId: string; onUploaded?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) return

    setBusy(true)
    setMsg('')
    setIsError(false)

    try {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/api/documents?workspace_id=${workspaceId}`, form)
      setMsg('Uploaded successfully')
      setIsError(false)
      if (inputRef.current) inputRef.current.value = ''
      onUploaded?.()
    } catch (err: any) {
      setMsg(err.message || 'Upload failed')
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="file-upload-area" onSubmit={handleSubmit}>
      <input type="file" ref={inputRef} accept=".txt,.pdf,.docx" disabled={busy} />
      <button type="submit" className="upload-btn btn-secondary" disabled={busy}>
        {busy ? 'Uploading...' : 'Upload'}
      </button>
      {msg && <p style={{ fontSize: 12, marginTop: 4, color: isError ? 'var(--danger)' : 'var(--success)' }}>{msg}</p>}
    </form>
  )
}
