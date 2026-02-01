// cloudfunctions/login/index.js - 登录云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-4gu1xbu13e161c48' // 云开发环境ID
});

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  const { code } = event;

  try {
    // 调用微信登录接口获取 openid
    const loginRes = await cloud.callFunction({
      name: 'login',
      data: {
        code: code
      }
    });

    if (loginRes.result && loginRes.result.openid) {
      return {
        success: true,
        openid: loginRes.result.openid
      };
    } else {
      return {
        success: false,
        errMsg: '获取 openid 失败'
      };
    }
  } catch (err) {
    console.error('登录失败:', err);
    return {
      success: false,
      errMsg: err.message || '登录失败'
    };
  }
};
