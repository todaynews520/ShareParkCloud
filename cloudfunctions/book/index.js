// cloudfunctions/book/index.js - 预约下单云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

function normalizeSpot(spot = {}) {
  const date = spot.date ?? spot.schedule?.date
  const startTime = spot.startTime ?? spot.start_time ?? spot.schedule?.startTime
  const endTime = spot.endTime ?? spot.end_time ?? spot.schedule?.endTime
  const duration = spot.duration ?? spot.schedule?.duration
  const spotNumber = spot.spotNumber ?? spot.spot_number ?? spot.schedule?.spotNumber

  return {
    ...spot,
    date,
    startTime,
    endTime,
    duration,
    spotNumber
  }
}

function normalizeOrder(order = {}) {
  return {
    ...order,
    spotNumber: order.spotNumber ?? order.spot_number,
    startTime: order.startTime ?? order.start_time,
    endTime: order.endTime ?? order.end_time
  }
}

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
        const spot = normalizeSpot(spotRes.data)

        if (!spot) {
          return {
            success: false,
            message: '车位不存在'
          }
        }

        const date = spot.date
        const startTime = spot.startTime
        const endTime = spot.endTime

        // 兜底：如果前端没传 timeRange（或传错），按车位时间生成
        const timeRange = (orderData && orderData.timeRange && orderData.timeRange.start && orderData.timeRange.end)
          ? orderData.timeRange
          : {
              start: (date && startTime) ? `${date} ${startTime}` : '',
              end: (date && endTime) ? `${date} ${endTime}` : ''
            }

        const createRes = await db.collection('orders').add({
          data: {
            userId: openid,
            spotId: orderData.spotId,
            // 保存车位信息到订单（统一 camelCase）
            spotNumber: spot.spotNumber,
            date: spot.date,
            startTime: spot.startTime,
            endTime: spot.endTime,
            duration: spot.duration,
            location: spot.location || null,
            // 原有数据
            plateNumber: (orderData.plateNumber || '').toUpperCase().replace(/[·.]/g, ''),
            timeRange: timeRange,
            pricing: orderData.pricing,
            status: 'pending',
            entryPass: {},
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
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
            },
            updatedAt: db.serverDate()
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
          data: (listRes.data || []).map(normalizeOrder)
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
