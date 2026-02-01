// pages/reserve/reserve.js - 车位预约页面
const app = getApp();
const { showToast, showModal, showLoading, hideLoading, validatePlate, formatDuration } = require('../../utils/common');
const TEMPLATE_IDS = require('../../config/template.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    releaseId: '', // 车位发布ID
    releaseInfo: null, // 车位发布信息
    role: 'owner', // owner 或 property
    plateNumber: '', // 车牌号
    hasSubscribed: false, // 是否已订阅消息
    submitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({
        releaseId: options.id
      });
      this.loadReleaseInfo(options.id);
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 确保自定义导航栏的选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }

    // 检查是否已订阅
    if (!this.data.hasSubscribed) {
      this.setData({ hasSubscribed: wx.getStorageSync('reserve_subscribed') || false });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  /**
   * 加载车位发布信息
   */
  async loadReleaseInfo(id) {
    try {
      showLoading('加载中...');

      const res = await app.getDB().collection('parking_releases')
        .doc(id)
        .get();

      if (res.data) {
        // 加载车位信息
        if (res.data.parking_id && res.data.parking_id._id) {
          const parkingRes = await app.getDB().collection('parkings')
            .doc(res.data.parking_id._id)
            .get();
          res.data.parking_info = parkingRes.data;
        }

        // 加载发布者信息
        if (res.data.owner_id && res.data.owner_id.openid) {
          const userRes = await app.getDB().collection('users')
            .where({ openid: res.data.owner_id.openid })
            .get();
          res.data.owner_info = userRes.data[0] || {};
        }

        this.setData({
          releaseInfo: res.data
        });
      }

      hideLoading();
    } catch (err) {
      hideLoading();
      console.error('加载发布信息失败:', err);
      showToast('加载失败');
    }
  },

  /**
   * 车牌号输入
   */
  onPlateInput(e) {
    this.setData({
      plateNumber: e.detail.value.trim()
    });
  },

  /**
   * 角色切换
   */
  onRoleChange(e) {
    this.setData({
      role: e.detail.value
    });
  },

  /**
   * 订阅消息
   * 需要在微信公众平台配置模板消息
   */
  async onSubscribeMessage() {
    try {
      showLoading('正在请求通知权限...');

      // 订阅多个模板消息
      const res = await wx.requestSubscribeMessage({
        tmplIds: [
          TEMPLATE_IDS.RESERVATION_SUCCESS,
          TEMPLATE_IDS.RESERVATION_CANCEL
        ]
      });

      hideLoading();

      // 检查订阅状态
      const hasSubscribed = Object.values(res).some(status => status === 'accept');

      if (hasSubscribed) {
        wx.setStorageSync('reserve_subscribed', true);
        wx.setStorageSync('reserve_subscribe_time', Date.now());
        this.setData({ hasSubscribed: true });
        showToast('已开启通知提醒');
      } else {
        showToast('取消订阅通知');
      }
    } catch (err) {
      hideLoading();
      console.error('订阅失败:', err);
      // 用户拒绝授权或不处理，不影响预约流程
      if (err.errCode === 20004) {
        // 用户关闭了总开关
        showToast('请在设置中开启通知权限');
      }
    }
  },

  /**
   * 提交预约
   */
  async onSubmit() {
    // 表单验证
    if (!this.data.releaseInfo) {
      showToast('车位信息不存在');
      return;
    }

    if (!this.data.plateNumber) {
      showToast('请输入车牌号');
      return;
    }

    if (!validatePlate(this.data.plateNumber)) {
      showToast('车牌号格式不正确');
      return;
    }

    if (this.data.role === 'owner' && !this.data.plateNumber) {
      showToast('请输入车牌号');
      return;
    }

    // 检查是否已预约
    if (this.data.releaseInfo.status === 'reserved') {
      showToast('该车位已被预约');
      return;
    }

    this.setData({ submitting: true });

    try {
      showLoading('预约中...');

      const db = app.getDB();
      const openid = app.globalData.openid || wx.getStorageSync('openid');
      const userInfo = app.globalData.userInfo || {};

      // 更新发布状态
      await db.collection('parking_releases')
        .doc(this.data.releaseId)
        .update({
          data: {
            status: 'reserved',
            reserve_time: new Date().getTime()
          }
        });

      // 创建预约记录
      await db.collection('reservations').add({
        data: {
          release_id: this.data.releaseId,
          user_id: openid,
          user_nickname: userInfo.nickname || '业主',
          plate_number: this.data.plateNumber,
          role: this.data.role, // 记录角色
          spot_number: this.data.releaseInfo.parking_info && this.data.releaseInfo.parking_info.spot_number || '未知',
          date: this.data.releaseInfo.date,
          start_time: this.data.releaseInfo.start_time,
          end_time: this.data.releaseInfo.end_time,
          status: 'confirmed',
          reserve_time: new Date().getTime()
        }
      });

      // 调用通知函数
      await this.sendPropertyNotification(this.data.releaseInfo);

      // 如果已订阅，发送订阅消息
      if (this.data.hasSubscribed) {
        try {
          await this.sendSubscribeMessage(this.data.releaseInfo);
        } catch (err) {
          console.error('发送订阅消息失败:', err);
        }
      }

      hideLoading();
      showToast('预约成功');

      // 延迟后返回首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
    } catch (err) {
      hideLoading();
      console.error('预约失败:', err);
      showToast('预约失败，请重试');
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 发送订阅消息（使用云函数）
   */
  async sendSubscribeMessage(releaseInfo) {
    try {
      const openid = app.globalData.openid || wx.getStorageSync('openid');

      // 调用云函数发送订阅消息
      await wx.cloud.callFunction({
        name: 'notify',
        data: {
          type: 'reservation_success',
          touser: openid,
          page: '/pages/personal/personal',
          data: {
            thing1: {
              value: releaseInfo.parking_info && releaseInfo.parking_info.spot_number || '未知'
            },
            thing2: {
              value: `${releaseInfo.date} ${releaseInfo.start_time}-${releaseInfo.end_time}`
            },
            thing3: {
              value: this.data.plateNumber || '未填写'
            },
            thing4: {
              value: '共享车位'
            },
            date5: {
              value: releaseInfo.date || ''
            }
          }
        }
      });

      console.log('订阅消息发送成功');
    } catch (err) {
      console.error('发送订阅消息失败:', err);
      // 不影响预约流程，静默处理
    }
  },

  /**
   * 发送物业通知
   */
  async sendPropertyNotification(releaseInfo) {
    try {
      // 查询物业用户
      const propertyUsers = await app.getDB().collection('users')
        .where({ role: 'property' })
        .get();

      for (const user of propertyUsers.data) {
        try {
          // 调用云函数发送通知
          await app.getDB().collection('notifications').add({
            data: {
              reservation_id: this.data.releaseId,
              property_id: user._id,
              property_openid: user.openid,
              message: `有新预约：车位号${releaseInfo.parking_info && releaseInfo.parking_info.spot_number || '未知'}，时间段${releaseInfo.date} ${releaseInfo.start_time}-${releaseInfo.end_time}，车牌号${this.data.plateNumber}`,
              type: 'property',
              sent_time: new Date().getTime(),
              status: 'pending'
            }
          });
        } catch (err) {
          console.error('发送通知失败:', err);
        }
      }
    } catch (err) {
      console.error('查询物业用户失败:', err);
    }
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
