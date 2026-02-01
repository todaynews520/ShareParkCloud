// pages/admin/admin.js - 物业管理页面
const app = getApp();
const { showToast, showModal, showLoading, hideLoading } = require('../../utils/common');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    reservations: [], // 预约列表
    currentDate: '', // 当前日期
    filterDate: '', // 筛选日期
    showFilter: false, // 是否显示筛选弹窗
    loading: false,
    totalReservations: 0, // 总预约数
    todayReservations: 0 // 今日预约数
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const today = app.getUtils().getCurrentDate();
    this.setData({
      currentDate: today,
      filterDate: today
    });
    this.loadReservations();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新数据
    this.loadReservations();

    // 确保自定义导航栏的选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({
      reservations: [],
      loading: true
    });
    this.loadReservations(true).then(() => {
      wx.stopPullDownRefresh();
      this.setData({ loading: false });
    }).catch(() => {
      wx.stopPullDownRefresh();
      this.setData({ loading: false });
    });
  },

  /**
   * 触底加载更多
   */
  onReachBottom() {
    if (!this.data.loading && this.data.reservations.length < this.data.totalReservations) {
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      this.loadReservations(false);
    }
  },

  /**
   * 加载预约列表
   */
  async loadReservations(isRefresh = false) {
    try {
      if (!isRefresh) {
        this.setData({ loading: true });
      }

      const db = app.getDB();
      const utils = app.getUtils();

      // 构建查询条件
      const queryConditions = {};

      // 如果选择了日期，添加日期筛选
      if (this.data.filterDate) {
        // 查询该日期的预约记录
        const startDate = utils.getDateOffset(0); // 今天
        const endDate = utils.getDateOffset(365); // 一年后

        // 使用 date + start_time 组合进行查询
        queryConditions.date = { $gte: startDate, $lte: endDate };
      }

      // 查询预约列表
      const res = await db.collection('reservations')
        .where(queryConditions)
        .orderBy('reserve_time', 'desc')
        .limit(50)
        .skip((this.data.currentPage || 0) * 50)
        .get();

      const reservations = res.data;

      // 统计总数
      const totalReservations = reservations.length;
      const today = utils.getDateOffset(0);
      const todayReservations = reservations.filter(item => item.date === today).length;

      // 加载预约详情
      const detailedReservations = await this.loadReservationDetails(reservations);

      // 更新数据
      if (isRefresh) {
        this.setData({
          reservations: detailedReservations,
          totalReservations: totalReservations,
          todayReservations: todayReservations,
          hasMore: false
        });
      } else {
        this.setData({
          reservations: [...this.data.reservations, ...detailedReservations],
          totalReservations: totalReservations,
          todayReservations: todayReservations
        });
      }
    } catch (err) {
      console.error('加载预约列表失败:', err);
      showToast('加载失败');
    } finally {
      if (!isRefresh) {
        this.setData({ loading: false });
      }
    }
  },

  /**
   * 加载预约详情
   */
  async loadReservationDetails(reservations) {
    const db = app.getDB();
    const detailedReservations = [];

    for (const item of reservations) {
      try {
        // 加载发布者信息
        if (item.release_id) {
          const releaseRes = await db.collection('parking_releases')
            .doc(item.release_id)
            .get();

          if (releaseRes.data) {
            item.release_info = releaseRes.data;

            // 加载车位信息
            if (releaseRes.data.parking_id && releaseRes.data.parking_id._id) {
              const parkingRes = await db.collection('parkings')
                .doc(releaseRes.data.parking_id._id)
                .get();
              item.spot_number = parkingRes.data && parkingRes.data.spot_number || '未知';
            }
          }
        }

        detailedReservations.push(item);
      } catch (err) {
        console.error('加载预约详情失败:', err);
        detailedReservations.push(item);
      }
    }

    return detailedReservations;
  },

  /**
   * 打开筛选弹窗
   */
  onFilter() {
    this.setData({
      showFilter: true
    });
  },

  /**
   * 关闭筛选弹窗
   */
  hideFilter() {
    this.setData({
      showFilter: false
    });
  },

  /**
   * 筛选日期改变
   */
  onFilterDateChange(e) {
    this.setData({
      filterDate: e.detail.value
    });
  },

  /**
   * 确认筛选
   */
  onFilterConfirm() {
    this.setData({
      currentPage: 0,
      reservations: [],
      hasMore: true
    });

    this.loadReservations(true);
    this.hideFilter();
  },

  /**
   * 取消预约
   */
  async onCancelReservation(e) {
    const id = e.currentTarget.dataset.id;

    try {
      const res = await showModal({
        title: '确认取消',
        content: '确定要取消这个预约吗？车位将重新变为可用状态。',
        confirmText: '确定',
        cancelText: '取消',
        confirmColor: '#f5222d'
      });

      if (!res.confirm) {
        return;
      }

      showLoading('取消中...');

      const db = app.getDB();

      // 更新预约状态为已取消
      await db.collection('reservations')
        .doc(id)
        .update({
          data: {
            status: 'cancelled',
            cancel_time: new Date().getTime()
          }
        });

      // 更新发布状态为可用
      const reservationRes = await db.collection('reservations').doc(id).get();
      const reservation = reservationRes.data;

      if (reservation && reservation.release_id) {
        await db.collection('parking_releases')
          .doc(reservation.release_id)
          .update({
            data: {
              status: 'available'
            }
          });
      }

      hideLoading();
      showToast('已取消预约');

      // 刷新列表
      this.loadReservations(true);
    } catch (err) {
      hideLoading();
      console.error('取消预约失败:', err);
      showToast('取消失败，请重试');
    }
  },

  /**
   * 查看预约详情
   */
  onViewReservation(e) {
    const id = e.currentTarget.dataset.id;
    // TODO: 跳转到详情页面
    showToast('查看详情功能开发中');
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
