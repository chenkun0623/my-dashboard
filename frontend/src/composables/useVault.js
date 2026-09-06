/**
 * 密码库 — AES-GCM 加密存 localStorage 单 key（my-dashboard:vault）。
 *
 * 解密 key 由用户安全码（活在 useSecurityCode 内存里）经 PBKDF2 派生而来。
 * 整库一次性加解密，搜索/排序仍走纯内存。本模块是单例：全 App 共用一份解锁状态。
 */
import { ref, computed } from 'vue'
import {
  b64decode,
  b64encode,
  decrypt,
  deriveKey,
  encrypt,
  PBKDF2_ITERATIONS,
  randomBytes
} from '../utils/crypto'
import { getActiveSecurityCode } from './useSecurityCode'

export const VAULT_KEY = 'my-dashboard:vault'
const SCHEMA_VERSION = 1

// 模块级单例
const entries = ref([])
let derivedKey = null      // CryptoKey | null
let activeSalt = null      // Uint8Array | null
const unlockedFlag = ref(false)

function safeReadEnvelope() {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.v !== SCHEMA_VERSION) return { __unknownVersion: true }
    return parsed
  } catch {
    return null
  }
}

function safeWriteEnvelope(envelope) {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

function nowIso() {
  return new Date().toISOString()
}

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  // 极旧浏览器兜底：16 字节随机 hex
  const bytes = randomBytes(16)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function dedupTags(list) {
  const seen = new Map() // lower -> original casing
  for (const raw of Array.isArray(list) ? list : []) {
    const t = String(raw ?? '').trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (!seen.has(k)) seen.set(k, t)
  }
  return [...seen.values()]
}

function normalizeEntry(input) {
  const now = nowIso()
  return {
    id: input.id || newId(),
    project: String(input.project ?? '').trim(),
    category: String(input.category ?? '').trim(),
    username: String(input.username ?? ''),
    email: String(input.email ?? ''),
    phone: String(input.phone ?? ''),
    password: String(input.password ?? ''),
    tags: dedupTags(input.tags),
    note: String(input.note ?? ''),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now
  }
}

async function encryptEntries(list) {
  if (!derivedKey || !activeSalt) throw new Error('保存失败，请重试')
  const iv = randomBytes(12)
  const plaintext = new TextEncoder().encode(JSON.stringify(list))
  let cipher
  try {
    cipher = await encrypt(derivedKey, iv, plaintext)
  } catch {
    throw new Error('保存失败，请重试')
  }
  return {
    v: SCHEMA_VERSION,
    iter: PBKDF2_ITERATIONS,
    salt: b64encode(activeSalt),
    iv: b64encode(iv),
    data: b64encode(cipher)
  }
}

async function persist(list) {
  const envelope = await encryptEntries(list)
  const ok = safeWriteEnvelope(envelope)
  if (!ok) throw new Error('本地存储写入失败')
}

async function unlock() {
  const code = getActiveSecurityCode()
  if (!code) throw new Error('安全码尚未在内存中')

  const envelope = safeReadEnvelope()
  if (envelope && envelope.__unknownVersion) {
    throw new Error('安全码不匹配或数据已损坏')
  }
  if (!envelope) {
    // 新库：生成 salt，派生 key，置空 entries，写一份空库
    activeSalt = randomBytes(16)
    derivedKey = await deriveKey(code, activeSalt)
    entries.value = []
    try {
      await persist([])
    } catch (err) {
      // 写盘失败不致命：内存里照样能用；下次保存仍可重试。
      // 但 unlock 阶段写盘失败说明 storage 完全不可用，抛给调用方知会一下。
      derivedKey = null
      activeSalt = null
      throw err
    }
    unlockedFlag.value = true
    return
  }

  let salt, iv, cipher
  try {
    salt = b64decode(envelope.salt)
    iv = b64decode(envelope.iv)
    cipher = b64decode(envelope.data)
  } catch {
    throw new Error('安全码不匹配或数据已损坏')
  }

  // 旧库没有 iter 字段，按历史默认 10 万次解锁，保证已存数据可解；
  // 新保存的数据会带上 iter 字段，之后按新次数派生。
  const iterations =
    Number.isInteger(envelope.iter) && envelope.iter > 0 ? envelope.iter : 100_000

  let key
  try {
    key = await deriveKey(code, salt, iterations)
  } catch {
    throw new Error('安全码不匹配或数据已损坏')
  }

  let pt
  try {
    pt = await decrypt(key, iv, cipher)
  } catch {
    throw new Error('安全码不匹配或数据已损坏')
  }

  let list
  try {
    list = JSON.parse(new TextDecoder().decode(pt))
    if (!Array.isArray(list)) throw new Error()
  } catch {
    throw new Error('安全码不匹配或数据已损坏')
  }

  derivedKey = key
  activeSalt = salt
  entries.value = list.map((e) => normalizeEntry(e))
  unlockedFlag.value = true
}

function lock() {
  derivedKey = null
  activeSalt = null
  entries.value = []
  unlockedFlag.value = false
}

async function addEntry(input) {
  const next = normalizeEntry(input)
  const list = [...entries.value, next]
  await persist(list)
  entries.value = list
  return next
}

async function updateEntry(id, patch) {
  const idx = entries.value.findIndex((e) => e.id === id)
  if (idx === -1) return null
  const merged = normalizeEntry(
    { ...entries.value[idx], ...patch, id, createdAt: entries.value[idx].createdAt }
  )
  merged.updatedAt = nowIso()
  const list = entries.value.map((e, i) => (i === idx ? merged : e))
  await persist(list)
  entries.value = list
  return merged
}

async function removeEntry(id) {
  const list = entries.value.filter((e) => e.id !== id)
  if (list.length === entries.value.length) return false
  await persist(list)
  entries.value = list
  return true
}

async function replaceAll(list) {
  const normalized = (Array.isArray(list) ? list : []).map((e) =>
    normalizeEntry(e)
  )
  await persist(normalized)
  entries.value = normalized
}

async function mergeImport(list) {
  const byId = new Map(entries.value.map((e) => [e.id, e]))
  for (const raw of Array.isArray(list) ? list : []) {
    const candidate = normalizeEntry(raw)
    const existing = byId.get(candidate.id)
    if (!existing) {
      byId.set(candidate.id, candidate)
      continue
    }
    if (candidate.updatedAt > existing.updatedAt) {
      byId.set(candidate.id, candidate)
    }
  }
  const merged = [...byId.values()]
  await persist(merged)
  entries.value = merged
}

function exportPlain() {
  // 深拷贝，避免外部修改影响内部
  return entries.value.map((e) => ({ ...e, tags: [...e.tags] }))
}

export function useVault() {
  return {
    entries,
    isUnlocked: computed(() => unlockedFlag.value),
    unlock,
    lock,
    addEntry,
    updateEntry,
    removeEntry,
    replaceAll,
    mergeImport,
    exportPlain
  }
}
