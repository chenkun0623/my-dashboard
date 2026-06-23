/**
 * 本地安全码管理
 *
 * 安全码固定 6 位数字。localStorage 只存 SHA-256 hash，不存明文；
 * sessionStorage 记录当前浏览器会话是否已经验证。
 */
export const SECURITY_HASH_KEY = 'my-dashboard:security-code-hash'
export const SECURITY_SESSION_KEY = 'my-dashboard:security-verified'

export function normalizeCodeInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 6)
}

export function isValidCode(code) {
  return /^\d{6}$/.test(String(code ?? ''))
}

function safeGet(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

async function sha256(text) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前浏览器不支持安全码哈希能力')
  }
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hasSecurityCode() {
  return Boolean(safeGet(localStorage, SECURITY_HASH_KEY))
}

export async function setSecurityCode(code) {
  if (!isValidCode(code)) return { ok: false, error: '请输入 6 位数字安全码' }
  try {
    const hash = await sha256(code)
    const saved = safeSet(localStorage, SECURITY_HASH_KEY, hash)
    if (!saved) return { ok: false, error: '安全码保存失败，请检查浏览器存储权限' }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || '安全码生成失败' }
  }
}

export async function verifySecurityCode(code) {
  if (!isValidCode(code)) return { ok: false, error: '请输入 6 位数字安全码' }
  const savedHash = safeGet(localStorage, SECURITY_HASH_KEY)
  if (!savedHash) return { ok: false, error: '尚未设置安全码' }
  try {
    const hash = await sha256(code)
    return hash === savedHash
      ? { ok: true }
      : { ok: false, error: '安全码不一致' }
  } catch (err) {
    return { ok: false, error: err?.message || '安全码验证失败' }
  }
}

export function isSessionVerified() {
  return safeGet(sessionStorage, SECURITY_SESSION_KEY) === 'true'
}

export function markSessionVerified() {
  safeSet(sessionStorage, SECURITY_SESSION_KEY, 'true')
}

export function clearSessionVerified() {
  try {
    sessionStorage.removeItem(SECURITY_SESSION_KEY)
  } catch {}
}
