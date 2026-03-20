// pages/publish/index.js - 发布页
const parkingService = require('../../services/parkingService.js')
const { validatePrice } = require('../../utils/validator.js')
const { handleError, showLoading, hideLoading } = require('../../utils/errorHandler.js')
const CONSTANTS = require('../../config/constants.js')
const formatter = require('../../utils/formatter.js')

Page({
  data: {
    // 表单数据
    form: {
      spotNumber: '',
      date: '',
      startHour: 13,
      duration: 2,
      price: 5,
      features: {
        hasCharger: false,
        hasMonitor: false,
        isIndoor: false
      }
    },
    // UI状态
    dates: [],
    selectedDateIndex: 0,
    durationOptions: [1, 2, 4, 8],
    priceSuggestions: [3, 4, 5],
    estimatedEarning: 0,
    estimatedEarningText: '0.00'
  },

  onLoad() {
    this.initDates()
    this.calculateEarning()
  },

  /**
   * 初始化日期列表（未来7天）
   */
  initDates() {
    const dates = []
    const today = new Date()
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      dates.push({
        dateStr: formatter.formatDate(date),
        weekday: '周' + weekdays[date.getDay()],
        isToday: i === 0
      })
    }

    this.setData({
      dates,
      'form.date': dates[0].dateStr
    })
  },

  /**
   * 计算收益
   */
  calculateEarning() {
    const { price, duration } = this.data.form
    // price 单位: 元/小时; earning 以“分”存储，展示时再 /100
    const baseFeeCents = Math.round(Number(price || 0) * 100 * Number(duration || 0))
    const earning = Math.round(baseFeeCents * (1 - CONSTANTS.SERVICE_FEE_RATE))
    this.setData({
      estimatedEarning: earning,
      estimatedEarningText: (earning / 100).toFixed(2)
    })
  },

  /**
   * 选择日期
   */
  onDateSelect(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      selectedDateIndex: index,
      'form.date': this.data.dates[index].dateStr
    })
  },

  /**
   * 开始时间滑块
   */
  onTimeChange(e) {
    this.setData({
      'form.startHour': parseInt(e.detail.value)
    })
  },

  /**
   * 选择时长
   */
  onDurationSelect(e) {
    const duration = e.currentTarget.dataset.duration
    this.setData({
      'form.duration': duration
    })
    this.calculateEarning()
  },

  /**
   * 价格输入
   */
  onPriceInput(e) {
    const price = parseFloat(e.detail.value) || 0
    this.setData({
      'form.price': price
    })
    this.calculateEarning()
  },

  /**
   * 选择建议价格
   */
  onSuggestPrice(e) {
    const price = e.currentTarget.dataset.price
    this.setData({
      'form.price': price
    })
    this.calculateEarning()
  },

  /**
   * 车位号输入
   */
  onSpotNumberInput(e) {
    this.setData({
      'form.spotNumber': e.detail.value
    })
  },

  /**
   * 切换特性
   */
  onFeatureToggle(e) {
    const key = e.currentTarget.dataset.key
    const currentValue = this.data.form.features[key]
    this.setData({
      [`form.features.${key}`]: !currentValue
    })
  },

  /**
   * 提交发布
   */
  async onSubmit() {
    const app = getApp()

    // 检查登录
    if (!app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            app.login().then(() => {
              this.onSubmit()
            })
          }
        }
      })
      return
    }

    const { form } = this.data

    // 表单验证
    if (!form.spotNumber) {
      wx.showToast({ title: '请输入车位号', icon: 'none' })
      return
    }

    const priceCheck = validatePrice(form.price)
    if (!priceCheck.valid) {
      wx.showToast({ title: priceCheck.message, icon: 'none' })
      return
    }

    // 计算结束时间
    const startHour = form.startHour
    const endHour = (startHour + form.duration) % 24
    const startTime = `${String(startHour).padStart(2, '0')}:00`
    const endTime = `${String(endHour).padStart(2, '0')}:00`

    showLoading('发布中...')

    try {
      await parkingService.createPublish({
        spotNumber: form.spotNumber,
        date: form.date,
        startTime,
        endTime,
        duration: form.duration,
        price: {
          hourly: form.price * 100, // 转换为分
          currency: 'CNY'
        },
        features: form.features
      })

      hideLoading()

      wx.showToast({ title: '发布成功', icon: 'success' })

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/home/index'
        })
      }, 1500)

    } catch (err) {
      hideLoading()
      handleError(err, '发布失败')
    }
  }
})
