// cloudfunctions/verify/index.js - 道闸验证云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, plate, token, gateId } = event

  try {
    switch (action) {
      case 'checkPlate':
        // 车牌验证
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
        let payload
        try {
          payload = JSON.parse(token)
        } catch (e) {
          return {
            valid: false,
            reason: 'token_invalid',
            message: '二维码无效'
          }
        }

        // 检查过期时间
        const now = Math.floor(Date.now() / 1000)
        if (payload.exp && now > payload.exp) {
          return {
            valid: false,
            reason: 'token_expired',
            message: '二维码已过期'
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
          orderId: payload.orderId
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
