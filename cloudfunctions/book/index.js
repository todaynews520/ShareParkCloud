// cloudfunctions/book/index.js - 预约下单云函数
const cloud = require('wx-server-sdk')

// 积分消耗常量
const BOOKING_COST = 10

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 生成6位静态验证码
function generateStaticCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除易混淆字符
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

exports.main = async (event, context) => {
  const { action, userId, orderData, orderId } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'create':
        // 创建订单
        // 先获取车位信息
        const spotRes = await db.collection('parking_releases').doc(orderData.spotId).get()
        const spot = spotRes.data

        if (!spot) {
          return {
            success: false,
            message: '车位不存在'
          }
        }

        // 检查用户积分是否足够
        try {
          const userRes = await db.collection('users').where({ openid }).get()
          if (userRes.data.length === 0) {
            return {
              success: false,
              message: '用户不存在，请先登录'
            }
          }

          const user = userRes.data[0]
          const currentPoints = user.points || 0

          if (currentPoints < BOOKING_COST) {
            return {
              success: false,
              message: `积分不足，预约需要${BOOKING_COST}积分，当前${currentPoints}积分`
            }
          }

          console.log('[积分检查] 用户积分充足:', { openid, currentPoints, required: BOOKING_COST })
        } catch (checkErr) {
          console.error('[积分检查] 失败:', checkErr)
          return {
            success: false,
            message: '积分检查失败，请稍后重试'
          }
        }

        const createRes = await db.collection('orders').add({
          data: {
            userId: openid,
            spotId: orderData.spotId,
            // 保存车位信息到订单
            spot_number: spot.spotNumber,
            date: spot.date,
            start_time: spot.startTime,
            end_time: spot.endTime,
            // 原有数据
            plateNumber: orderData.plateNumber,
            timeRange: orderData.timeRange,
            pricing: orderData.pricing,
            status: 'pending',
            entryPass: {},
            createdAt: db.serverDate()
          }
        })

        return {
          success: true,
          orderId: createRes._id
        }

      case 'pay':
        // 模拟支付
        // 获取订单详情
        const orderRes = await db.collection('orders').doc(orderId).get()
        const order = orderRes.data

        // 扣除用户积分
        try {
          const userRes = await db.collection('users').where({ openid }).get()
          if (userRes.data.length > 0) {
            const user = userRes.data[0]
            const currentPoints = user.points || 0

            if (currentPoints < BOOKING_COST) {
              return {
                success: false,
                message: '积分不足，无法完成支付'
              }
            }

            const newPoints = currentPoints - BOOKING_COST

            await db.collection('users').doc(user._id).update({
              data: {
                points: newPoints,
                updatedAt: db.serverDate()
              }
            })

            console.log('[预约支付] 用户积分已扣除:', { openid, deducted: BOOKING_COST, newPoints })
          }
        } catch (pointsErr) {
          console.error('[预约支付] 积分扣除失败:', pointsErr)
          return {
            success: false,
            message: '积分扣除失败，请稍后重试'
          }
        }

        // 生成静态验证码
        const staticCode = generateStaticCode()

        // 更新订单状态
        await db.collection('orders').doc(orderId).update({
          data: {
            status: 'paid',
            paidAt: db.serverDate(),
            entryPass: {
              staticCode: staticCode,
              generatedAt: db.serverDate(),
              refreshInterval: 30
            }
          }
        })

        // 更新车位状态
        await db.collection('parking_releases').doc(order.spotId).update({
          data: {
            status: 'booked',
            updatedAt: db.serverDate()
          }
        })

        return {
          success: true
        }

      case 'list':
        // 获取我的订单列表
        const listRes = await db.collection('orders')
          .where({
            userId: openid
          })
          .orderBy('createdAt', 'desc')
          .get()

        return {
          success: true,
          data: listRes.data
        }

      default:
        return {
          success: false,
          message: '未知操作'
        }
    }

  } catch (err) {
    console.error('订单操作失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}
