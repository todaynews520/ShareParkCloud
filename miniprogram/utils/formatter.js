// utils/formatter.js - 格式化工具

/**
 * 格式化时间
 * @param {Date|string|number} date - 时间
 * @param {string} format - 格式化模板
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date, format = 'YYYY-MM-DD HH:mm') {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 格式化日期
 * @param {Date|string|number} date - 时间
 * @returns {string} YYYY-MM-DD
 */
function formatDate(date) {
  return formatTime(date, 'YYYY-MM-DD')
}

/**
 * 格式化金额（分为单位）
 * @param {number} amount - 金额（分）
 * @returns {string} 格式化后的金额
 */
function formatMoney(amount) {
  if (typeof amount !== 'number') return '¥0.00'
  return '¥' + (amount / 100).toFixed(2)
}

/**
 * 计算时间差（分钟）
 * @param {Date|string|number} start - 开始时间
 * @param {Date|string|number} end - 结束时间
 * @returns {number} 分钟数
 */
function timeDiff(start, end) {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  return Math.round((endTime - startTime) / 60000)
}

/**
 * 计算时长（小时）
 * @param {number} minutes - 分钟数
 * @returns {string} 时长描述
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}小时`
  }
  return `${hours}小时${mins}分钟`
}

/**
 * 获取相对时间描述
 * @param {Date|string|number} date - 时间
 * @returns {string} 相对时间描述
 */
function getRelativeTime(date) {
  const d = new Date(date).getTime()
  const now = Date.now()
  const diff = now - d

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatDate(date)
}

module.exports = {
  formatTime,
  formatDate,
  formatMoney,
  timeDiff,
  formatDuration,
  getRelativeTime
}
