/**
 * 金额格式化工具 — 国际千分位
 */

/** 两位小数，国际千分位（"1,234.56"） */
export function fmt2(n) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)
}

/** 整数，国际千分位（"1,234"） */
export function fmtInt(n) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(n)
}
