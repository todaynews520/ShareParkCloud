// jest.setup.js - Jest 全局设置和 Mock

// Mock 微信 API
global.wx = {
  // 云开发相关
  cloud: {
    init: jest.fn(),
    callFunction: jest.fn(),
    database: jest.fn(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(),
          update: jest.fn(),
          remove: jest.fn(),
          count: jest.fn()
        })),
        doc: jest.fn(() => ({
          get: jest.fn(),
          update: jest.fn(),
          remove: jest.fn()
        })),
        add: jest.fn(),
        orderBy: jest.fn(),
        limit: jest.fn(),
        skip: jest.fn()
      })),
      command: jest.fn()
    })),
    getWXContext: jest.fn(() => ({
      OPENID: 'test-openid',
      APPID: 'test-appid',
      UNIONID: 'test-unionid'
    }))
  },

  // 本地存储相关
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn(() => null),
  removeStorageSync: jest.fn(),
  clearStorageSync: jest.fn(),

  // 网络请求
  request: jest.fn(),
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),

  // 导航路由
  navigateTo: jest.fn(),
  redirectTo: jest.fn(),
  switchTab: jest.fn(),
  navigateBack: jest.fn(),
  reLaunch: jest.fn(),

  // UI 交互
  showToast: jest.fn(),
  hideToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showModal: jest.fn(),
  showActionSheet: jest.fn(),

  // 下拉刷新
  startPullDownRefresh: jest.fn(),
  stopPullDownRefresh: jest.fn(),

  // 其他
  getSystemInfo: jest.fn((callback) => {
    const info = {
      brand: 'devtools',
      model: 'iPhone 12',
      system: 'iOS 14.0',
      platform: 'ios',
      SDKVersion: '2.20.0',
      screenWidth: 375,
      screenHeight: 667,
      windowWidth: 375,
      windowHeight: 667
    }
    if (callback) {
      callback(info)
    }
    return Promise.resolve(info)
  }),

  createSelectorQuery: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    exec: jest.fn((callback) => {
      if (callback) callback([])
    })
  })),

  // 创建 IntersectionObserver
  createIntersectionObserver: jest.fn(() => ({
    relativeTo: jest.fn().mockReturnThis(),
    relativeToViewport: jest.fn().mockReturnThis(),
    observe: jest.fn((component, callback) => {
      // 模拟立即触发回调
      setTimeout(() => {
        if (callback) {
          callback({
            id: 'test',
            dataset: {},
            intersectionRatio: 1
          })
        }
      }, 0)
    }),
    disconnect: jest.fn()
  }))
}

// Mock console 方法以减少测试输出
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}
