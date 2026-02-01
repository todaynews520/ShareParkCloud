// services/userService.js - 用户服务
const cloudService = require('./cloud.js')

/**
 * 用户登录
 */
function login() {
  return cloudService.callFunction('login', {})
}

/**
 * 获取用户信息
 * @param {string} userId - 用户ID
 */
function getUserInfo(userId) {
  const app = getApp()
  const db = app.getDB()

  return db.collection('users').doc(userId).get()
}

/**
 * 更新用户信息
 * @param {string} userId - 用户ID
 * @param {object} data - 更新数据
 */
function updateUserInfo(userId, data) {
  const app = getApp()
  const db = app.getDB()

  return db.collection('users').doc(userId).update({
    data
  })
}

module.exports = {
  login,
  getUserInfo,
  updateUserInfo
}
