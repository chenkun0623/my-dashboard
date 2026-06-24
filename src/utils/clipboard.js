/**
 * 跨浏览器复制：优先 navigator.clipboard，失败回落到 document.execCommand。
 * 返回 boolean，绝不抛错 — UI 直接根据返回值切换 ✓/× 反馈。
 */

async function copyViaClipboardApi(text) {
  if (!globalThis.navigator?.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function copyViaExecCommand(text) {
  if (typeof document === 'undefined' || !document.execCommand) return false
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '0'
  ta.style.left = '0'
  ta.style.width = '1px'
  ta.style.height = '1px'
  ta.style.padding = '0'
  ta.style.border = 'none'
  ta.style.outline = 'none'
  ta.style.boxShadow = 'none'
  ta.style.background = 'transparent'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  const prevActive = document.activeElement
  ta.focus()
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  if (prevActive && typeof prevActive.focus === 'function') {
    try { prevActive.focus() } catch {}
  }
  return ok
}

export async function copyText(text) {
  const str = String(text ?? '')
  if (await copyViaClipboardApi(str)) return true
  return copyViaExecCommand(str)
}
