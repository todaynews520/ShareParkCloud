// cloudfunctions/login/index.js - 登录云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-4gu1xbu13e161c48'
});

/**
 * 云函数入口函数
 * 获取用户 openid
 * 微信云函数会自动在 context 中包含 OPENID
 */
exports.main = async (event, context) => {
  console.log('云函数调用参数:', { event, context });

  try {
    // 方法1: 从 context.OPENID 获取（推荐方式）
    // 当小程序端调用云函数时，微信会自动将 OPENID 注入到 context 中
    if (context && context.OPENID) {
      console.log('从 context.OPENID 获取 openid:', context.OPENID);
      return {
        success: true,
        openid: context.OPENID
      };
    }

    // 方法2: 从 context.openid 获取（小写版本）
    if (context && context.openid) {
      console.log('从 context.openid 获取 openid:', context.openid);
      return {
        success: true,
        openid: context.openid
      };
    }

    // 方法3: 从 event 对象获取（前端传递的情况）
    if (event && event.openid) {
      console.log('从 event.openid 获取 openid:', event.openid);
      return {
        success: true,
        openid: event.openid
      };
    }

    // 方法4: 从 event.userInfo 获取
    if (event && event.userInfo && event.userInfo.openId) {
      console.log('从 event.userInfo.openId 获取 openid:', event.userInfo.openId);
      return {
        success: true,
        openid: event.userInfo.openId
      };
    }

    // 方法5: 尝试使用 wx-server-sdk 的 getOpenId 方法
    // 注意：这个方法可能不可用，取决于 SDK 版本
    try {
      const app = cloud.init({
        env: 'cloud1-4gu1xbu13e161c48'
      });
      // wx-server-sdk 没有直接的 getOpenId 方法
      // openid 只能从 context 中获取
    } catch (e) {
      console.log('SDK 方法不可用:', e.message);
    }

    // 所有方法都失败
    console.error('无法获取 openid，context 内容:', context);
    return {
      success: false,
      errMsg: '获取 openid 失败：请确保在小程序端调用且已登录',
      debugInfo: {
        hasContext: !!context,
        contextKeys: context ? Object.keys(context) : [],
        hasEvent: !!event,
        eventKeys: event ? Object.keys(event) : []
      }
    };
  } catch (err) {
    console.error('登录失败:', err);
    return {
      success: false,
      errMsg: err.message || '登录失败'
    };
  }
};
