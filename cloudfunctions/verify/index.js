// cloudfunctions/verify/index.js - 道闸验证云函数
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input))
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecodeToString(input) {
  const padded = String(input).replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8')
}

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(String(a))
  const bBuf = Buffer.from(String(b))
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function verifySignedToken(token, secret) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) {
    return { ok: false, reason: 'token_format' }
  }
  const [headerPart, payloadPart, sigPart] = parts
  let header
  let payload
  try {
    header = JSON.parse(base64UrlDecodeToString(headerPart))
    payload = JSON.parse(base64UrlDecodeToString(payloadPart))
  } catch (e) {
    return { ok: false, reason: 'token_decode' }
  }
  if (!header || header.alg !== 'HS256') {
    return { ok: false, reason: 'token_alg' }
  }

  const content = `${headerPart}.${payloadPart}`
  const expectedSig = base64UrlEncode(crypto.createHmac('sha256', secret).update(content).digest())
  if (!timingSafeEqual(expectedSig, sigPart)) {
    return { ok: false, reason: 'token_signature' }
  }

  return { ok: true, payload }
}

function tryParseLegacyJsonToken(token) {
  // 兼容旧实现：直接 JSON.stringify(payload) 作为 token
  try {
    const payload = JSON.parse(token)
    return { ok: true, payload, legacy: true }
  } catch (e) {
    return { ok: false }
  }
}

exports.main = async (event, context) => {
  const { action, plate, token, gateId } = event

  try {
    switch (action) {
      case 'checkPlate':
        // 车牌验证
        if (!plate) {
          return {
            valid: false,
            reason: 'plate_required',
            message: '缺少车牌'
          }
        }
        const orderRes = await db.collection('orders')
          .where({
            plateNumber: plate.toUpperCase(),
            status: _.in(['paid', 'active'])
          })
          .get()

        if (orderRes.data.length === 0) {
          return {
            valid: false,
            reason: 'invalid_plate',
            message: '车牌不存在'
          }
        }

        const order = orderRes.data[0]
        const now = new Date()
        const endTime = new Date(order.timeRange.end)

        // 检查是否超时
        if (now > endTime) {
          return {
            valid: false,
            reason: 'expired',
            message: '预约已过期'
          }
        }

        return {
          valid: true,
          orderId: order._id,
          type: order.status === 'paid' ? 'entry' : 'exit',
          allowOpen: true
        }

      case 'checkQr':
        // 二维码验证
        if (!token) {
          return {
            valid: false,
            reason: 'token_required',
            message: '缺少凭证'
          }
        }

        const secret = process.env.JWT_SECRET || process.env.QR_TOKEN_SECRET || 'dev-secret'
        const signedRes = verifySignedToken(token, secret)
        const legacyRes = signedRes.ok ? null : tryParseLegacyJsonToken(token)
        const payload = signedRes.ok ? signedRes.payload : (legacyRes && legacyRes.ok ? legacyRes.payload : null)

        if (!payload || !payload.orderId) {
          return {
            valid: false,
            reason: 'token_invalid',
            message: '二维码无效'
          }
        }

        // 检查过期时间
        const nowTs = Math.floor(Date.now() / 1000)
        if (payload.exp && nowTs > payload.exp) {
          return {
            valid: false,
            reason: 'token_expired',
            message: '二维码已过期'
          }
        }

        // 校验订单存在且状态允许
        const orderRes2 = await db.collection('orders').doc(payload.orderId).get()
        const order2 = orderRes2.data
        if (!order2) {
          return {
            valid: false,
            reason: 'order_not_found',
            message: '订单不存在'
          }
        }

        if (!['paid', 'active'].includes(order2.status)) {
          return {
            valid: false,
            reason: 'order_status_invalid',
            message: '订单状态无效'
          }
        }

        if (payload.plate && order2.plateNumber && String(payload.plate).toUpperCase() !== String(order2.plateNumber).toUpperCase()) {
          return {
            valid: false,
            reason: 'plate_mismatch',
            message: '车牌不匹配'
          }
        }

        // 记录道闸日志
        await db.collection('gate_logs').add({
          data: {
            gateId: gateId || '',
            orderId: payload.orderId,
            plate: payload.plate,
            method: 'qr_scan',
            result: 'allowed',
            timestamp: db.serverDate()
          }
        })

        return {
          valid: true,
          orderId: payload.orderId,
          type: payload.type || (order2.status === 'paid' ? 'entry' : 'exit'),
          allowOpen: true
        }

      default:
        return {
          valid: false,
          reason: 'unknown_action',
          message: '未知操作'
        }
    }

  } catch (err) {
    console.error('验证失败:', err)
    return {
      valid: false,
      reason: 'server_error',
      message: err.message
    }
  }
}
