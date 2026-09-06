/**
 * Web Crypto 薄封装：PBKDF2 派生 + AES-GCM 加解密 + base64 工具。
 *
 * 仅依赖浏览器原生 crypto.subtle。useVault 用它来加密本地密码库。
 */

// OWASP 建议 PBKDF2-SHA256 至少 60 万次迭代。
// 注意：旧库数据按旧次数解锁（见 useVault 的 iter 兼容逻辑），不能直接改这里而不管旧数据。
export const PBKDF2_ITERATIONS = 600_000
const KEY_BITS = 256
const HASH = 'SHA-256'

function ensureSubtle() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前浏览器不支持 Web Crypto')
  }
  return globalThis.crypto
}

export function randomBytes(n) {
  const buf = new Uint8Array(n)
  ensureSubtle().getRandomValues(buf)
  return buf
}

export function b64encode(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function b64decode(str) {
  const bin = atob(str)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function deriveKey(passwordString, saltBytes, iterations = PBKDF2_ITERATIONS) {
  const subtle = ensureSubtle().subtle
  const baseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passwordString),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: HASH
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(key, ivBytes, plaintextBytes) {
  const subtle = ensureSubtle().subtle
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, plaintextBytes)
  return new Uint8Array(ct)
}

export async function decrypt(key, ivBytes, ciphertextBytes) {
  const subtle = ensureSubtle().subtle
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ciphertextBytes)
  return new Uint8Array(pt)
}
