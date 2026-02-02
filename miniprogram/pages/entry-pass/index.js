// pages/entry-pass/index.js - 入场凭证页
const orderService = require('../../services/orderService.js')
const { handleError, showLoading, hideLoading } = require('../../utils/errorHandler.js')
const formatter = require('../../utils/formatter.js')
const CONSTANTS = require('../../config/constants.js')

Page({
  data: {
    orderId: '',
    orderData: null,
    qrCodeUrl: '',
    staticCode: '',
    countdown: 30,
    statusText: '',
    statusColor: ''
  },

  onLoad(options) {
    this.orderId = options.orderId
    this.loadOrderData()
  },

  onUnload() {
    this.clearTimers()
  },

  /**
   * 加载订单数据
   */
  async loadOrderData() {
    showLoading('加载中...')

    try {
      const res = await orderService.getOrderDetail(this.orderId)
      const rawData = res.data

      // 处理字段映射（蛇形命名转驼峰命名）
      const orderData = {
        ...rawData,
        spotNumber: rawData.spot_number || rawData.spotNumber || '未知',
        startTime: rawData.start_time || rawData.startTime || '--:--',
        endTime: rawData.end_time || rawData.endTime || '--:--',
        date: rawData.date || '',
        plateNumber: rawData.plateNumber || '',
        timeRange: rawData.timeRange || { start: '', end: '' }
      }

      // 设置状态文本和颜色
      let statusText = ''
      let statusColor = ''

      switch (orderData.status) {
        case 'paid':
          statusText = '待入场'
          statusColor = '#22c55e' // 绿色
          break
        case 'active':
          statusText = '停车中'
          statusColor = '#3b82f6' // 蓝色
          break
        case 'completed':
          statusText = '已完成'
          statusColor = '#9ca3af' // 灰色
          break
        case 'overstayed':
          statusText = '已超时'
          statusColor = '#ef4444' // 红色
          break
        default:
          statusText = '未知'
          statusColor = '#9ca3af'
      }

      this.setData({
        orderData,
        statusText,
        statusColor,
        staticCode: orderData.entryPass?.staticCode || ''
      })

      // 生成二维码
      this.generateQrCode()

      // 启动定时刷新
      this.startRefreshTimer()

    } catch (err) {
      handleError(err, '加载失败')
    } finally {
      hideLoading()
    }
  },

  /**
   * 生成二维码
   */
  async generateQrCode() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getQrCode',
        data: { orderId: this.orderId }
      })

      const { qrCode, token } = res.result

      // 将ArrayBuffer转为Base64
      const base64 = wx.arrayBufferToBase64(qrCode)
      this.setData({
        qrCodeUrl: `data:image/png;base64,${base64}`
      })

      // 开始倒计时
      this.startCountdown()

    } catch (err) {
      console.error('生成二维码失败:', err)
      // 使用静态码作为备用
      this.setData({
        qrCodeUrl: '',
        countdown: 0
      })
    }
  },

  /**
   * 启动刷新定时器（30秒）
   */
  startRefreshTimer() {
    this.clearTimers()
    this.refreshTimer = setInterval(() => {
      if (this.data.orderData?.status === 'paid' || this.data.orderData?.status === 'active') {
        this.generateQrCode()
      }
    }, CONSTANTS.QR_REFRESH_INTERVAL * 1000)
  },

  /**
   * 启动倒计时
   */
  startCountdown() {
    this.setData({ countdown: CONSTANTS.QR_REFRESH_INTERVAL })

    this.countdownTimer = setInterval(() => {
      const count = this.data.countdown - 1
      this.setData({ countdown: count })

      if (count <= 0) {
        clearInterval(this.countdownTimer)
      }
    }, 1000)
  },

  /**
   * 清除定时器
   */
  clearTimers() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  },

  /**
   * 刷新二维码
   */
  onRefresh() {
    this.generateQrCode()
  },

  /**
   * 导航去车位
   */
  onNavigate() {
    wx.showModal({
      title: '导航',
      content: '即将打开地图导航',
      success: (res) => {
        if (res.confirm) {
          wx.openLocation({
            latitude: this.data.orderData.latitude || 39.908823,
            longitude: this.data.orderData.longitude || 116.397470,
            name: this.data.orderData.spotName || '目标车位',
            address: this.data.orderData.address || '未知地址'
          })
        }
      }
    })
  },

  /**
   * 联系业主
   */
  onContact() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})
