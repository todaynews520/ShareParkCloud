// pages/success/index.js - 预约成功页
Page({
  data: {
    countdown: 3
  },

  onLoad(options) {
    this.orderId = options.orderId
    this.startCountdown()
  },

  /**
   * 启动倒计时
   */
  startCountdown() {
    this.setData({ countdown: 3 })

    this.timer = setInterval(() => {
      const count = this.data.countdown - 1
      this.setData({ countdown: count })

      if (count <= 0) {
        clearInterval(this.timer)
        this.goToEntryPass()
      }
    }, 1000)
  },

  /**
   * 立即查看凭证
   */
  onViewPass() {
    clearInterval(this.timer)
    this.goToEntryPass()
  },

  /**
   * 返回首页
   */
  onBackHome() {
    clearInterval(this.timer)
    wx.switchTab({
      url: '/pages/home/index'
    })
  },

  /**
   * 跳转到入场凭证页
   */
  goToEntryPass() {
    wx.redirectTo({
      url: `/pages/entry-pass/index?orderId=${this.orderId}`
    })
  }
})
