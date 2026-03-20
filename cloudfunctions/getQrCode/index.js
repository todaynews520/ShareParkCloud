// cloudfunctions/getQrCode/index.js - 生成二维码云函数
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input))
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function signToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerPart = base64UrlEncode(JSON.stringify(header))
  const payloadPart = base64UrlEncode(JSON.stringify(payload))
  const content = `${headerPart}.${payloadPart}`
  const sig = crypto.createHmac('sha256', secret).update(content).digest()
  const sigPart = base64UrlEncode(sig)
  return `${content}.${sigPart}`
}

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

    // 生成可校验 Token（HMAC-SHA256，演示用；生产可替换为标准 JWT 库）
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

    const secret = process.env.JWT_SECRET || process.env.QR_TOKEN_SECRET || 'dev-secret'
    const token = signToken(payload, secret)

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
