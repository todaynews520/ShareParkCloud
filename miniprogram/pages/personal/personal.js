// pages/personal/personal.js - 个人中心页面
const app = getApp();
const { showToast, showModal } = require('../../utils/common');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    myReleases: [], // 我的发布
    myReservations: [], // 我的预约
    currentTab: 'releases', // releases 或 reservations
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
    }

    // 刷新数据
    this.refreshData();
  },

  /**
   * 切换Tab
   */
  onTabChange(e) {
    this.setData({
      currentTab: e.detail.value
    });
    this.loadData();
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    if (openid) {
      await this.loadData();
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      this.setData({ loading: true });

      const db = app.getDB();
      const openid = app.globalData.openid || wx.getStorageSync('openid');

      if (!openid) {
        this.setData({ loading: false });
        return;
      }

      // 加载我的发布
      const releasesRes = await db.collection('parking_releases')
        .where({
          owner_id: db.command.in([openid, { openid }]) // 支持两种格式
        })
        .orderBy('create_time', 'desc')
        .get();

      // 加载我的预约
      const reservationsRes = await db.collection('reservations')
        .where({
          user_id: db.command.in([openid, { openid }])
        })
        .orderBy('reserve_time', 'desc')
        .get();

      this.setData({
        myReleases: releasesRes.data,
        myReservations: reservationsRes.data
      });
    } catch (err) {
      console.error('加载数据失败:', err);
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 取消预约
   */
  async onCancelReservation(e) {
    const id = e.currentTarget.dataset.id;
    const reservation = this.data.myReservations.find(r => r._id === id);

    if (!reservation) {
      showToast('预约不存在');
      return;
    }

    showModal({
      title: '确认取消',
      content: `确定要取消预约车位"${reservation.spot_number}"吗？`,
      confirmText: '确定',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          await this.doCancelReservation(id, reservation.release_id);
        }
      }
    });
  },

  /**
   * 执行取消预约
   */
  async doCancelReservation(reservationId, releaseId) {
    try {
      const db = app.getDB();

      // 更新预约状态
      await db.collection('reservations')
        .doc(reservationId)
        .update({
          data: {
            status: 'cancelled'
          }
        });

      // 恢复发布状态
      await db.collection('parking_releases')
        .doc(releaseId)
        .update({
          data: {
            status: 'available'
          }
        });

      showToast('已取消预约');

      // 刷新数据
      setTimeout(() => {
        this.loadData();
      }, 1500);
    } catch (err) {
      console.error('取消预约失败:', err);
      showToast('取消失败');
    }
  },

  /**
   * 查看预约详情
   */
  onViewReservation(e) {
    const id = e.currentTarget.dataset.id;
    const reservation = this.data.myReservations.find(r => r._id === id);

    if (reservation) {
      wx.showModal({
        title: '预约详情',
        content: `车位号：${reservation.spot_number}\n日期：${reservation.date}\n时段：${reservation.start_time}-${reservation.end_time}\n车牌号：${reservation.plate_number}`,
        showCancel: false
      });
    }
  },

  /**
   * 去登录
   */
  onGoLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
