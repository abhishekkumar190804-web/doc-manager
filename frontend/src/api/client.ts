const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${API_BASE}${path}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    }

    const headers: Record<string, string> = {}
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Request failed')
    }

    return res.json()
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>('GET', path, undefined, params)
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body)
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path)
  }
}

export const api = new ApiClient()

export interface Workspace {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Document {
  id: string
  workspace_id: string
  filename: string
  uploaded_at: string
  chunk_count: number
}

export interface ChatMessage {
  id: string
  workspace_id: string
  role: 'user' | 'assistant'
  content: string
  sources: { document_id: string; filename: string; chunk_index: number }[] | null
  created_at: string
}

export interface Task {
  id: string
  workspace_id: string
  title: string
  notes: string | null
  created_at: string
}
