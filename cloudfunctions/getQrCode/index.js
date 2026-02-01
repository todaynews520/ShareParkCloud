// cloudfunctions/getQrCode/index.js - 生成二维码云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { orderId } = event

  try {
    // 获取订单详情
    const orderRes = await db.collection('orders').doc(orderId).get()

    if (!orderRes.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }

    const order = orderRes.data

    // 生成JWT Token（简化版，实际应使用jsonwebtoken库）
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      orderId: orderId,
      spotId: order.spotId,
      plate: order.plateNumber,
      entryTime: order.timeRange.start,
      exitTime: order.timeRange.end,
      nonce: Math.random().toString(36).substring(2, 8),
      iat: now,
      exp: now + 30, // 30秒过期
      type: order.status === 'paid' ? 'entry' : 'exit'
    }

    // 简化：直接返回payload字符串作为token
    // 实际生产环境应使用JWT签名
    const token = JSON.stringify(payload)

    // 生成小程序码
    const qrRes = await cloud.openapi.wxacode.get({
      path: `pages/entry-pass/index?orderId=${orderId}`,
      width: 430
    })

    return {
      success: true,
      qrCode: qrRes.buffer,
      token: token
    }

  } catch (err) {
    console.error('生成二维码失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}
