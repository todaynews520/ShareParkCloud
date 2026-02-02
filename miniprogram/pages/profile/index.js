// pages/profile/index.js - 个人中心
const parkingService = require('../../services/parkingService.js')
const orderService = require('../../services/orderService.js')
const { handleError, showLoading, hideLoading } = require('../../utils/errorHandler.js')

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    activeTab: 'publish',
    publishList: [],
    orderList: [],
    loading: false,
    stats: {
      publishCount: 0,
      totalEarningText: '0',
      rating: 5.0
    }
  },

  onLoad() {
    this.checkLogin()
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadData()
    }
  },

  /**
   * 检查登录状态
   */
  checkLogin() {
    const app = getApp()
    const userInfo = app.globalData.userInfo

    // 处理统计数据
    let stats = {
      publishCount: 0,
      totalEarningText: '0',
      rating: 5.0
    }

    if (userInfo && userInfo.stats) {
      stats.publishCount = userInfo.stats.publishCount || 0
      stats.totalEarningText = ((userInfo.stats.totalEarning || 0) / 100).toFixed(0)
      stats.rating = userInfo.stats.rating || 5.0
    }

    this.setData({
      userInfo: userInfo,
      isLoggedIn: app.globalData.isLoggedIn,
      stats: stats
    })

    if (app.globalData.isLoggedIn) {
      this.loadData()
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const openid = getApp().globalData.openid

      // 并行加载发布列表和订单列表
      const [publishRes, orderRes] = await Promise.all([
        parkingService.getMyPublishList(openid).catch((err) => {
          console.error('获取发布列表失败:', err)
          return { data: [] }
        }),
        orderService.getMyOrderList(openid).catch((err) => {
          console.error('获取订单列表失败:', err)
          return { data: [] }
        })
      ])

      const publishList = publishRes.data || []
      const orderList = orderRes.data || []

      // 转换字段名：snake_case -> camelCase
      const processedPublishList = publishList.map(item => ({
        ...item,
        spotNumber: item.spotNumber || item.spot_number || '未知',
        startTime: item.startTime || item.start_time || '--:--',
        endTime: item.endTime || item.end_time || '--:--'
      }))

      const processedOrderList = orderList.map(item => ({
        ...item,
        spotNumber: item.spotNumber || item.spot_number || '未知',
        startTime: item.startTime || item.start_time || '--:--',
        endTime: item.endTime || item.end_time || '--:--'
      }))

      // 调试：打印数据
      console.log('发布列表:', processedPublishList)
      console.log('订单列表:', processedOrderList)

      this.setData({
        publishList: processedPublishList,
        orderList: processedOrderList
      })
    } catch (err) {
      console.error('加载数据失败:', err)
      handleError(err, '加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 切换Tab
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  /**
   * 登录
   */
  onLogin() {
    const app = getApp()
    showLoading('登录中...')

    app.login().then(() => {
      hideLoading()
      this.checkLogin()
    }).catch(err => {
      hideLoading()
      handleError(err, '登录失败')
    })
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.logout()
        }
      }
    })
  },

  /**
   * 取消发布
   */
  onCancelPublish(e) {
    const publishId = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定要取消这个发布吗？',
      success: (res) => {
        if (res.confirm) {
          showLoading('处理中...')

          parkingService.cancelPublish(publishId).then(() => {
            hideLoading()
            wx.showToast({ title: '已取消', icon: 'success' })
            this.loadData()
          }).catch(err => {
            hideLoading()
            handleError(err, '操作失败')
          })
        }
      }
    })
  },

  /**
   * 查看入场凭证
   */
  onViewEntryPass(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/entry-pass/index?orderId=${orderId}`
    })
  },

  /**
   * 取消预约
   */
  onCancelBooking(e) {
    const orderId = e.currentTarget.dataset.id

    wx.showModal({
      title: '提示',
      content: '确定要取消这个预约吗？',
      success: (res) => {
        if (res.confirm) {
          showLoading('处理中...')

          orderService.cancelOrder(orderId).then(() => {
            hideLoading()
            wx.showToast({ title: '已取消', icon: 'success' })
            this.loadData()
          }).catch(err => {
            hideLoading()
            handleError(err, '操作失败')
          })
        }
      }
    })
  }
})
