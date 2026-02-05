// services/pointsService.js - 积分服务
const cloudService = require('./cloud')

/**
 * 获取用户积分
 * @returns {Promise<{success: boolean, points: number, lastCheckInDate: string, consecutiveDays: number, totalCheckInDays: number}>}
 */
async function getUserPoints() {
  return cloudService.callFunction('points', { action: 'get' })
}

/**
 * 扣除积分
 * @param {number} amount - 扣除积分数量
 * @param {string} description - 描述
 * @returns {Promise<{success: boolean, points: number}>}
 */
async function deductPoints(amount, description) {
  return cloudService.callFunction('points', {
    action: 'deduct',
    amount,
    description
  })
}

/**
 * 增加积分
 * @param {number} amount - 增加积分数量
 * @param {string} description - 描述
 * @returns {Promise<{success: boolean, points: number}>}
 */
async function addPoints(amount, description) {
  return cloudService.callFunction('points', {
    action: 'add',
    amount,
    description
  })
}

/**
 * 签到
 * @returns {Promise<{success: boolean, points: number, reward: number, bonus: number, consecutiveDays: number}>}
 */
async function checkIn() {
  return cloudService.callFunction('points', { action: 'checkIn' })
}

/**
 * 初始化用户积分（登录时调用）
 * @returns {Promise<{success: boolean, points: number}>}
 */
async function initUserPoints() {
  return cloudService.callFunction('points', { action: 'init' })
}

module.exports = {
  getUserPoints,
  deductPoints,
  addPoints,
  checkIn,
  initUserPoints
}
