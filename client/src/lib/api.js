const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function apiRequest(path, options = {}) {
  const { token, headers, body, ...fetchOptions } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.errors?.join(' ') || data.message || 'Request failed')
  }

  return data
}
