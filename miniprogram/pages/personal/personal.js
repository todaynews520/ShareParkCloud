// pages/personal/personal.js - 个人中心页面
const app = getApp();
const { showToast, showModal } = require('../../utils/common');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null, // 用户信息
    myReleases: [], // 我的发布
    myReservations: [], // 我的预约
    currentTab: 'releases', // releases 或 reservations
    loading: false,
    isLoggedIn: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 设置登录状态和用户信息
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    const isLoggedIn = app.globalData.isLoggedIn || !!openid;

    this.setData({
      isLoggedIn: isLoggedIn
    });

    // 如果有 openid 但没有 userInfo，从数据库加载
    if (openid && !app.globalData.userInfo) {
      this.loadUserInfoFromDB(openid);
    } else {
      this.setData({
        userInfo: app.globalData.userInfo
      });
    }

    this.loadData();
  },

  /**
   * 从数据库加载用户信息
   */
  async loadUserInfoFromDB(openid) {
    try {
      const db = app.getDB();
      const userRes = await db.collection('users')
        .where({ openid: openid })
        .get();

      if (userRes.data.length > 0) {
        app.globalData.userInfo = userRes.data[0];
        this.setData({
          userInfo: userRes.data[0]
        });
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
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

    // 更新用户信息
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    if (openid) {
      if (!app.globalData.userInfo) {
        this.loadUserInfoFromDB(openid);
      } else {
        this.setData({
          userInfo: app.globalData.userInfo
        });
      }
    }

    // 刷新数据
    this.refreshData();
  },

  /**
   * 切换Tab
   */
  onTabChange(e) {
    const tabValue = e.currentTarget.dataset.value;
    if (!tabValue) return;

    this.setData({
      currentTab: tabValue
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

      // 加载我的发布 - 按日期和创建时间排序
      const releasesRes = await db.collection('parking_releases')
        .where({
          'owner_id.openid': openid
        })
        .orderBy('date', 'asc')
        .orderBy('start_time', 'asc')
        .orderBy('create_time', 'desc')
        .get();

      // 加载我的预约 - 只显示未取消的预约
      const reservationsRes = await db.collection('reservations')
        .where({
          user_id: openid,
          status: db.command.in(['pending', 'confirmed'])
        })
        .orderBy('date', 'asc')
        .orderBy('reserve_time', 'desc')
        .get();

      // 添加更多详情
      const myReleases = await this.loadReleaseDetails(releasesRes.data);
      const myReservations = await this.loadReservationDetails(reservationsRes.data);

      this.setData({
        myReleases: myReleases,
        myReservations: myReservations
      });
    } catch (err) {
      console.error('加载数据失败:', err);
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载发布详情
   * parking_id 已经包含 spot_number，不需要额外查询
   */
  async loadReleaseDetails(releases) {
    // 直接返回发布记录，parking_id 已包含所需信息
    return releases;
  },

  /**
   * 加载预约详情
   * 需要查询发布记录获取车位号
   */
  async loadReservationDetails(reservations) {
    const db = app.getDB();
    const detailedReservations = [];

    for (const item of reservations) {
      try {
        // 加载发布详情获取车位号
        if (item.release_id) {
          const releaseRes = await db.collection('parking_releases')
            .doc(item.release_id)
            .get();

          if (releaseRes.data && releaseRes.data.parking_id) {
            // 从发布记录中获取车位号
            item.spot_number = releaseRes.data.parking_id.spot_number || '未知';
          } else {
            item.spot_number = '未知';
          }
        } else {
          item.spot_number = '未知';
        }

        detailedReservations.push(item);
      } catch (err) {
        console.error('加载预约详情失败:', err);
        item.spot_number = '未知';
        detailedReservations.push(item);
      }
    }

    return detailedReservations;
  },

  /**
   * 获取状态样式类
   */
  getStatusClass(status) {
    switch (status) {
      case 'confirmed':
        return 'confirmed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    switch (status) {
      case 'confirmed':
        return '已确认';
      case 'cancelled':
        return '已取消';
      default:
        return '待确认';
    }
  },

  /**
   * 格式化时间戳
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
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
   * 去完善资料
   */
  onCompleteProfile() {
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
