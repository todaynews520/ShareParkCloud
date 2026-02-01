// utils/cache.js - 本地缓存封装

/**
 * 设置缓存
 * @param {string} key - 键名
 * @param {any} value - 值
 * @param {number} expire - 过期时间（秒），可选
 */
function set(key, value, expire) {
  const data = {
    value,
    expire: expire ? Date.now() + expire * 1000 : null
  }
  wx.setStorageSync(key, JSON.stringify(data))
}

/**
 * 获取缓存
 * @param {string} key - 键名
 * @returns {any} 值，如果过期或不存在则返回 null
 */
function get(key) {
  try {
    const data = wx.getStorageSync(key)
    if (!data) return null

    const parsed = JSON.parse(data)

    // 检查是否过期
    if (parsed.expire && Date.now() > parsed.expire) {
      remove(key)
      return null
    }

    return parsed.value
  } catch (e) {
    return null
  }
}

/**
 * 删除缓存
 * @param {string} key - 键名
 */
function remove(key) {
  wx.removeStorageSync(key)
}

/**
 * 清空所有缓存
 */
function clear() {
  wx.clearStorageSync()
}

module.exports = {
  set,
  get,
  remove,
  clear
}
