// cloudfunctions/points/index.js - 积分管理云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 积分规则常量（需与前端保持一致）
const INITIAL_POINTS = 1000
const PUBLISH_REWARD = 50
const BOOKING_COST = 10
const DAILY_CHECKIN_REWARD = 10
const CONSECUTIVE_7_BONUS = 100

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    switch (action) {
      case 'init': {
        // 初始化用户积分（登录时调用）
        // 先检查用户是否存在
        const existingUser = await db.collection('users').where({ _id: userId }).get()
        if (existingUser.data.length === 0) {
          // 用户不存在，创建新用户
          await db.collection('users').add({
            data: {
              _id: userId,
              points: INITIAL_POINTS,
              totalEarned: INITIAL_POINTS,
              totalSpent: 0,
              publishCount: 0,
              bookingCount: 0,
              lastCheckInDate: null,
              consecutiveDays: 0,
              totalCheckInDays: 0,
              createdAt: db.serverDate(),
              updatedAt: db.serverDate()
            }
          })
          console.log('[积分] 用户初始化成功:', userId)
        }
        return { success: true, points: INITIAL_POINTS }
      }

      case 'get': {
        // 查询用户积分
        const userResult = await db.collection('users').where({ _id: userId }).get()
        if (userResult.data.length === 0) {
          return { success: false, message: '用户不存在' }
        }
        const userData = userResult.data[0]
        return {
          success: true,
          points: userData.points || 0,
          lastCheckInDate: userData.lastCheckInDate,
          consecutiveDays: userData.consecutiveDays || 0,
          totalCheckInDays: userData.totalCheckInDays || 0
        }
      }

      case 'deduct': {
        // 扣除积分（预约）
        const userResult = await db.collection('users').where({ _id: userId }).get()
        if (userResult.data.length === 0) {
          return { success: false, message: '用户不存在' }
        }

        const userData = userResult.data[0]
        const current = userData.points || 0
        if (current < BOOKING_COST) {
          return { success: false, message: '积分不足' }
        }

        await db.collection('users').doc(userId).update({
          data: {
            points: current - BOOKING_COST,
            totalSpent: _.inc(BOOKING_COST),
            bookingCount: _.inc(1),
            updatedAt: db.serverDate()
          }
        })

        console.log('[积分] 扣除积分成功:', userId, '扣除', BOOKING_COST, '剩余', current - BOOKING_COST)
        return { success: true, points: current - BOOKING_COST }
      }

      case 'add': {
        // 增加积分（发布车位）
        const userResult = await db.collection('users').where({ _id: userId }).get()
        if (userResult.data.length === 0) {
          return { success: false, message: '用户不存在' }
        }

        const userData = userResult.data[0]
        const current = userData.points || 0

        await db.collection('users').doc(userId).update({
          data: {
            points: current + PUBLISH_REWARD,
            totalEarned: _.inc(PUBLISH_REWARD),
            publishCount: _.inc(1),
            updatedAt: db.serverDate()
          }
        })

        console.log('[积分] 增加积分成功:', userId, '增加', PUBLISH_REWARD, '当前', current + PUBLISH_REWARD)
        return { success: true, points: current + PUBLISH_REWARD }
      }

      case 'checkIn': {
        // 签到
        const userResult = await db.collection('users').where({ _id: userId }).get()
        if (userResult.data.length === 0) {
          return { success: false, message: '用户不存在' }
        }
        const userData = userResult.data[0]

        // 获取今天的日期（YYYY-MM-DD）
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

        // 检查今天是否已签到
        if (userData.lastCheckInDate === todayStr) {
          return {
            success: false,
            message: '今天已签到',
            alreadyChecked: true
          }
        }

        // 计算连续签到天数
        let consecutiveDays = userData.consecutiveDays || 0
        const lastCheckInDate = userData.lastCheckInDate

        if (lastCheckInDate) {
          // 检查是否连续（昨天是否签到）
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

          if (lastCheckInDate === yesterdayStr) {
            consecutiveDays += 1
          } else {
            // 中断了，重新开始
            consecutiveDays = 1
          }
        } else {
          consecutiveDays = 1
        }

        // 计算奖励积分
        let reward = DAILY_CHECKIN_REWARD
        let bonus = 0
        if (consecutiveDays === 7) {
          bonus = CONSECUTIVE_7_BONUS
          reward += bonus
          // 连续7天后重置
          consecutiveDays = 0
        }

        const newPoints = (userData.points || 0) + reward

        await db.collection('users').doc(userId).update({
          data: {
            points: newPoints,
            totalEarned: _.inc(reward),
            lastCheckInDate: todayStr,
            consecutiveDays: consecutiveDays,
            totalCheckInDays: _.inc(1),
            updatedAt: db.serverDate()
          }
        })

        console.log('[积分] 签到成功:', userId, '奖励', reward, '连续', consecutiveDays, '剩余', newPoints)
        return {
          success: true,
          points: newPoints,
          reward,
          bonus,
          consecutiveDays
        }
      }

      default:
        return { success: false, message: '未知操作' }
    }
  } catch (err) {
    console.error('[积分] 操作失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}
