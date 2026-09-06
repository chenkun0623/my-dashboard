/**
 * 后端 API 客户端 — 目前只覆盖 health。登录认证功能暂未接入。
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  }

  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error('后端连接失败')
  }

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const message = typeof data === 'object' && data?.message
      ? (Array.isArray(data.message) ? data.message.join('；') : data.message)
      : `请求失败 (${res.status})`
    throw new Error(message)
  }

  return data
}

export function apiGet(path) {
  return request(path, { method: 'GET' })
}

export function apiPost(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body || {}) })
}

export function healthCheck() {
  return apiGet('/health')
}
