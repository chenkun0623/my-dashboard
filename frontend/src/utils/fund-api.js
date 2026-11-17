/**
 * 基金功能 API 客户端。
 */
import { API_BASE_URL } from './api'

async function req(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message?.join?.('；') || data?.message || `请求失败 (${res.status})`)
  }
  return data
}

export const fundApi = {
  // 基金
  listFunds: () => req('/funds'),
  createFund: (code, extra = {}) =>
    req('/funds', { method: 'POST', body: JSON.stringify({ code, ...extra }) }),
  updateFund: (id, patch) => req(`/funds/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteFund: (id) => req(`/funds/${id}`, { method: 'DELETE' }),
  syncFund: (id) => req(`/funds/${id}/sync`, { method: 'POST' }),
  syncAll: () => req('/funds/sync', { method: 'POST' }),
  // 计划
  listPlans: (fundId) => req(`/plans${fundId ? `?fundId=${fundId}` : ''}`),
  createPlan: (body) => req('/plans', { method: 'POST', body: JSON.stringify(body) }),
  updatePlan: (id, patch) => req(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deletePlan: (id) => req(`/plans/${id}`, { method: 'DELETE' }),
  backfill: (planId, segments) =>
    req('/funds/backfill', { method: 'POST', body: JSON.stringify({ planId, segments }) }),
  // 流水
  listTrades: (fundId) => req(`/trades${fundId ? `?fundId=${fundId}` : ''}`),
  createTrade: (body) => req('/trades', { method: 'POST', body: JSON.stringify(body) }),
  updateTrade: (id, patch) => req(`/trades/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteTrade: (id) => req(`/trades/${id}`, { method: 'DELETE' }),
  // 汇总
  overview: () => req('/summary/overview'),
  daily: (from, to) =>
    req(`/summary/daily${from ? `?from=${from}` : ''}${to ? `${from ? '&' : '?'}to=${to}` : ''}`),
}
