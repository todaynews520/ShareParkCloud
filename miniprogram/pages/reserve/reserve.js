// pages/reserve/reserve.js - 车位预约页面
const app = getApp();
const { showToast, showModal, showLoading, hideLoading, validatePlate, formatDuration } = require('../../utils/common');
const { encryptData, decryptData } = require('../../utils/crypto');
const { Validator } = require('../../utils/validator');
const ErrorHandler = require('../../utils/errorHandler');
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
    submitting: false,
    // 表单验证状态
    formErrors: {
      plateNumber: ''
    },
    // 页面状态
    loading: true,
    error: null,
    // 车位状态检查
    checkingStatus: false,
    statusCheckTimer: null
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
    } else {
      this.setData({ error: '车位信息不存在', loading: false });
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清除状态检查定时器
    if (this.data.statusCheckTimer) {
      clearInterval(this.data.statusCheckTimer);
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

    // 检查车位状态（防止已被他人预约）
    if (this.data.releaseId) {
      this.checkParkingStatus();
    }
  },

  /**
   * 检查车位状态
   */
  async checkParkingStatus() {
    if (!this.data.releaseId || this.data.checkingStatus) {
      return;
    }

    try {
      this.setData({ checkingStatus: true });

      const res = await app.getDB().collection('parking_releases')
        .doc(this.data.releaseId)
        .get();

      if (res.data && res.data.status === 'reserved') {
        // 车位已被预约
        showModal({
          title: '温馨提示',
          content: '该车位刚刚已被其他用户预约，请查看其他车位',
          showCancel: false,
          success: () => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        });
      }
    } catch (err) {
      console.error('检查车位状态失败:', err);
    } finally {
      this.setData({ checkingStatus: false });
    }
  },

  /**
   * 加载车位发布信息
   */
  async loadReleaseInfo(id) {
    try {
      this.setData({ loading: true, error: null });
      showLoading('加载中...');

      const res = await app.getDB().collection('parking_releases')
        .doc(id)
        .get();

      if (!res.data) {
        this.setData({
          error: '车位信息不存在',
          loading: false
        });
        hideLoading();
        return;
      }

      // 检查车位状态
      if (res.data.status !== 'available') {
        this.setData({
          error: '该车位已被预约',
          loading: false
        });
        hideLoading();
        return;
      }

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
        releaseInfo: res.data,
        loading: false
      });

      // 启动状态定时检查（每30秒检查一次）
      this.data.statusCheckTimer = setInterval(() => {
        this.checkParkingStatus();
      }, 30000);

      hideLoading();
    } catch (err) {
      hideLoading();
      this.setData({
        error: '加载失败，请重试',
        loading: false
      });
      ErrorHandler.handle(err, {
        context: 'reserve.loadReleaseInfo',
        showToast: false
      });
    }
  },

  /**
   * 重新加载
   */
  onRetry() {
    if (this.data.releaseId) {
      this.loadReleaseInfo(this.data.releaseId);
    }
  },

  /**
   * 车牌号输入 - 带实时验证
   */
  onPlateInput(e) {
    const value = e.detail.value.trim().toUpperCase();
    this.setData({ plateNumber: value });

    // 实时验证车牌号
    if (value) {
      const result = Validator.plateNumber(value);
      this.setData({
        'formErrors.plateNumber': result.valid ? '' : result.message
      });
    } else {
      this.setData({ 'formErrors.plateNumber': '' });
    }
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
        // 用户拒绝或关闭，提示但允许继续
        showModal({
          title: '提示',
          content: '您未开启通知提醒，预约成功后将无法收到消息通知。是否继续？',
          confirmText: '继续预约',
          cancelText: '重新授权',
          success: (res) => {
            if (!res.confirm) {
              // 用户选择重新授权
              this.onSubscribeMessage();
            }
          }
        });
      }
    } catch (err) {
      hideLoading();
      console.error('订阅失败:', err);
      // 用户拒绝授权或不处理，不影响预约流程
      if (err.errCode === 20004) {
        // 用户关闭了总开关
        showModal({
          title: '无法开启通知',
          content: '您已关闭通知权限，请在系统设置中重新开启。是否继续预约？',
          confirmText: '继续',
          cancelText: '去设置',
          success: (res) => {
            if (res.confirm) {
              // 继续预约流程
            } else {
              // 跳转到设置
              wx.openSetting();
            }
          }
        });
      }
    }
  },

  /**
   * 验证表单
   */
  validateForm() {
    const errors = { plateNumber: '' };
    let isValid = true;

    // 验证车牌号
    if (this.data.role === 'owner') {
      const plateResult = Validator.plateNumber(this.data.plateNumber, { required: true });
      if (!plateResult.valid) {
        errors.plateNumber = plateResult.message;
        isValid = false;
      }
    }

    this.setData({ formErrors: errors });
    return isValid;
  },

  /**
   * 提交预约
   */
  async onSubmit() {
    // 再次检查车位状态
    if (this.data.releaseInfo && this.data.releaseInfo.status !== 'available') {
      showModal({
        title: '预约失败',
        content: '该车位刚刚已被其他用户预约',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      });
      return;
    }

    // 表单验证
    if (!this.validateForm()) {
      showToast('请检查表单填写');
      return;
    }

    // 如果未订阅，提示用户
    if (!this.data.hasSubscribed) {
      const confirmSubscribe = await new Promise((resolve) => {
        showModal({
          title: '开启通知',
          content: '建议开启通知提醒，以便及时收到预约状态更新',
          confirmText: '去开启',
          cancelText: '跳过',
          success: (res) => {
            resolve(res.confirm);
          },
          fail: () => resolve(false)
        });
      });

      if (confirmSubscribe) {
        await this.onSubscribeMessage();
        // 如果用户授权后订阅了，继续；否则继续预约
        return;
      }
    }

    this.setData({ submitting: true });

    try {
      showLoading('预约中...');

      const openid = app.globalData.openid || wx.getStorageSync('openid');
      const userInfo = app.globalData.userInfo || {};

      // 加密车牌号
      const encryptedPlateNumber = await encryptData(this.data.plateNumber);

      // 调用云函数进行预约（使用事务确保原子性）
      const reserveRes = await wx.cloud.callFunction({
        name: 'reserve',
        data: {
          releaseId: this.data.releaseId,
          plateNumber: encryptedPlateNumber,
          role: this.data.role,
          userInfo: userInfo
        }
      });

      if (!reserveRes.result.success) {
        hideLoading();
        const errorMsg = reserveRes.result.errMsg || '预约失败，请重试';

        // 针对不同错误给出不同提示
        if (errorMsg.includes('已被预约')) {
          showModal({
            title: '预约失败',
            content: '该车位刚刚已被其他用户预约，请查看其他车位',
            showCancel: false,
            success: () => {
              wx.switchTab({
                url: '/pages/index/index'
              });
            }
          });
          return;
        }

        showModal({
          title: '预约失败',
          content: errorMsg,
          showCancel: false,
          confirmText: '重试',
          success: (res) => {
            if (res.confirm) {
              this.onSubmit();
            }
          }
        });
        return;
      }

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

      // 显示成功提示
      showModal({
        title: '预约成功',
        content: `您已成功预约${this.data.releaseInfo.parking_info?.spot_number || '车位'}，可以在"个人中心"查看预约详情`,
        showCancel: false,
        confirmText: '查看详情',
        success: () => {
          wx.switchTab({
            url: '/pages/personal/personal'
          });
        }
      });

    } catch (err) {
      hideLoading();
      ErrorHandler.handle(err, {
        context: 'reserve.onSubmit',
        showToast: false,
        onRetry: () => this.onSubmit()
      });
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
