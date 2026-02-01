// cloudfunctions/login/index.js - 登录云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询用户是否存在
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()

    let userId, userData

    if (userRes.data.length === 0) {
      // 新用户，创建记录
      const createRes = await db.collection('users').add({
        data: {
          openid: openid,
          nickname: '车主' + Math.floor(Math.random() * 10000),
          avatar: '',
          phone: '',
          isVerified: false,
          isPropertyManager: false,
          community: {
            name: '',
            building: '',
            unit: ''
          },
          stats: {
            publishCount: 0,
            totalEarning: 0,
            rating: 5.0
          },
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })

      userId = createRes._id
      userData = {
        _id: userId,
        openid: openid,
        nickname: '车主' + Math.floor(Math.random() * 10000),
        avatar: '',
        stats: {
          publishCount: 0,
          totalEarning: 0,
          rating: 5.0
        }
      }
    } else {
      // 已存在用户
      userId = userRes.data[0]._id
      userData = userRes.data[0]
    }

    return {
      success: true,
      openid: openid,
      userId: userId,
      userData: userData
    }

  } catch (err) {
    console.error('登录失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}
