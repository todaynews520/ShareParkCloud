// services/orderService.js - 订单服务
const cloudService = require('./cloud.js')
const CONSTANTS = require('../config/constants.js')

/**
 * 创建订单
 * @param {object} orderData - 订单数据
 */
function createOrder(orderData) {
  return cloudService.callFunction('book', {
    action: 'create',
    orderData
  })
}

/**
 * 模拟支付
 * @param {string} orderId - 订单ID
 */
function payOrder(orderId) {
  return new Promise((resolve, reject) => {
    wx.showLoading({ title: '支付中...', mask: true })

    // 模拟支付延迟
    setTimeout(() => {
      cloudService.callFunction('book', {
        action: 'pay',
        orderId
      }).then(res => {
        wx.hideLoading()
        wx.showToast({ title: '支付成功', icon: 'success' })
        resolve(res)
      }).catch(err => {
        wx.hideLoading()
        wx.showToast({ title: '支付失败', icon: 'error' })
        reject(err)
      })
    }, 1500)
  })
}

/**
 * 获取我的订单列表
 * @param {string} userId - 用户ID
 */
function getMyOrderList(userId) {
  return cloudService.callFunction('book', {
    action: 'list',
    userId
  })
}

/**
 * 取消订单
 * @param {string} orderId - 订单ID
 */
function cancelOrder(orderId) {
  return cloudService.callFunction('book', {
    action: 'cancel',
    orderId
  })
}

/**
 * 获取订单详情
 * @param {string} orderId - 订单ID
 */
function getOrderDetail(orderId) {
  const app = getApp()
  const db = app.getDB()

  return db.collection('orders').doc(orderId).get()
}

/**
 * 计算费用
 * @param {number} price - 每小时价格（分）
 * @param {number} duration - 时长（小时）
 */
function calculatePrice(price, duration) {
  // 固定10积分，不按时长计算
  const pointsCost = CONSTANTS.BOOKING_COST

  return {
    pointsCost: pointsCost,     // 消耗积分
    baseFee: pointsCost,        // 车位费（积分）
    serviceFee: 0,            // 服务费（积分）
    total: pointsCost,         // 总费用（积分）
    baseFeeText: pointsCost.toString(),
    serviceFeeText: '0',
    totalText: pointsCost.toString()
  }
}

module.exports = {
  createOrder,
  payOrder,
  getMyOrderList,
  cancelOrder,
  getOrderDetail,
  calculatePrice
}
