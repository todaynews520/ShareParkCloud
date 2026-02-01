// utils/validator.js - 表单验证工具

/**
 * 车牌号正则验证
 * 支持普通车牌和新能源车牌
 */
const PLATE_PATTERN = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/

/**
 * 验证车牌号
 * @param {string} plate - 车牌号
 * @returns {object} { valid: boolean, message: string, normalized: string }
 */
function validatePlateNumber(plate) {
  if (!plate) {
    return { valid: false, message: '请输入车牌号' }
  }

  // 统一格式：去除点号，转大写
  const normalized = plate.toUpperCase().replace(/[·.]/g, '')

  if (!PLATE_PATTERN.test(normalized)) {
    return { valid: false, message: '车牌号格式不正确' }
  }

  return { valid: true, normalized }
}

/**
 * 格式化车牌号显示
 * 京A12345 -> 京A·12345
 * @param {string} plate - 车牌号
 * @returns {string} 格式化后的车牌号
 */
function formatPlateNumber(plate) {
  const normalized = plate.toUpperCase().replace(/[·.]/g, '')
  if (normalized.length === 7) {
    return normalized.slice(0, 2) + '·' + normalized.slice(2)
  }
  if (normalized.length === 8) {
    return normalized.slice(0, 2) + '·' + normalized.slice(2)
  }
  return normalized
}

/**
 * 验证手机号
 * @param {string} phone - 手机号
 * @returns {object} { valid: boolean, message: string }
 */
function validatePhone(phone) {
  if (!phone) {
    return { valid: false, message: '请输入手机号' }
  }

  const pattern = /^1[3-9]\d{9}$/
  if (!pattern.test(phone)) {
    return { valid: false, message: '手机号格式不正确' }
  }

  return { valid: true }
}

/**
 * 验证价格
 * @param {number} price - 价格
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {object} { valid: boolean, message: string }
 */
function validatePrice(price, min = 1, max = 50) {
  if (price === undefined || price === null || price === '') {
    return { valid: false, message: '请输入价格' }
  }

  const numPrice = Number(price)
  if (isNaN(numPrice)) {
    return { valid: false, message: '价格格式不正确' }
  }

  if (numPrice < min || numPrice > max) {
    return { valid: false, message: `价格范围应在 ${min}-${max} 之间` }
  }

  return { valid: true }
}

module.exports = {
  validatePlateNumber,
  formatPlateNumber,
  validatePhone,
  validatePrice
}
