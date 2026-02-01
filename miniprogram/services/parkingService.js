/**
 * 车位服务类
 * 封装车位相关的业务逻辑
 */

const { Cache } = require('../utils/cache');
const ErrorHandler = require('../utils/errorHandler');

class ParkingService {
  /**
   * 获取车位列表
   * @param {Object} options - 查询选项
   * @param {string} options.date - 日期
   * @param {string} options.status - 状态
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页数量
   * @param {boolean} options.useCache - 是否使用缓存
   */
  static async getList(options = {}) {
    const {
      date,
      status = 'available',
      page = 1,
      pageSize = 10,
      useCache = true
    } = options;

    const cacheKey = `parking_list_${date}_${status}_${page}`;
    const db = getApp().getDB();

    // 尝试从缓存获取
    if (useCache) {
      const cached = Cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // 构建查询条件
      const where = { status };
      if (date) {
        where.date = date;
      }

      // 查询数据
      const res = await db.collection('parking_releases')
        .where(where)
        .orderBy('date', 'asc')
        .orderBy('start_time', 'asc')
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .get();

      const list = res.data;

      // 批量获取关联数据
      const enrichedList = await this.enrichWithDetails(list);

      // 设置缓存
      if (useCache) {
        Cache.set(cacheKey, enrichedList, 2 * 60 * 1000); // 缓存2分钟
      }

      return enrichedList;
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'ParkingService.getList',
        showToast: true
      });
      throw error;
    }
  }

  /**
   * 批量获取车位详细信息
   * @param {Array} list - 车位列表
   */
  static async enrichWithDetails(list) {
    const db = getApp().getDB();

    // 收集ID
    const parkingIds = [];
    const ownerOpenids = [];

    for (const item of list) {
      if (item.parking_id && item.parking_id._id) {
        parkingIds.push(item.parking_id._id);
      }
      if (item.owner_id && item.owner_id.openid) {
        ownerOpenids.push(item.owner_id.openid);
      }
    }

    // 批量查询
    const [parkings, users] = await Promise.all([
      this.batchGetParkings(parkingIds),
      this.batchGetUsers(ownerOpenids)
    ]);

    // 构建map
    const parkingsMap = {};
    const usersMap = {};

    parkings.forEach(p => {
      parkingsMap[p._id] = p;
    });

    users.forEach(u => {
      usersMap[u.openid] = u;
    });

    // 组装数据
    return list.map(item => ({
      ...item,
      parking_info: item.parking_id?._id ? (parkingsMap[item.parking_id._id] || { spot_number: '未知' }) : {},
      owner_info: item.owner_id?.openid ? (usersMap[item.owner_id.openid] || { nickname: '业主' }) : {}
    }));
  }

  /**
   * 批量获取车位信息
   */
  static async batchGetParkings(ids) {
    if (ids.length === 0) return [];

    const db = getApp().getDB();
    try {
      const res = await db.collection('parkings')
        .where({
          _id: db.command.in(ids.slice(0, 20))
        })
        .get();
      return res.data;
    } catch (error) {
      console.error('批量获取车位信息失败:', error);
      return [];
    }
  }

  /**
   * 批量获取用户信息
   */
  static async batchGetUsers(openids) {
    if (openids.length === 0) return [];

    const db = getApp().getDB();
    try {
      const res = await db.collection('users')
        .where({
          openid: db.command.in(openids.slice(0, 20))
        })
        .get();
      return res.data;
    } catch (error) {
      console.error('批量获取用户信息失败:', error);
      return [];
    }
  }

  /**
   * 获取车位详情
   * @param {string} id - 车位发布ID
   */
  static async getDetail(id) {
    const cacheKey = `parking_detail_${id}`;
    const db = getApp().getDB();

    // 尝试从缓存获取
    const cached = Cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 获取发布记录
      const releaseRes = await db.collection('parking_releases')
        .doc(id)
        .get();

      if (!releaseRes.data) {
        throw new Error('车位信息不存在');
      }

      const release = releaseRes.data;

      // 获取车位信息
      if (release.parking_id && release.parking_id._id) {
        const parkingRes = await db.collection('parkings')
          .doc(release.parking_id._id)
          .get();
        release.parking_info = parkingRes.data;
      }

      // 获取发布者信息
      if (release.owner_id && release.owner_id.openid) {
        const userRes = await db.collection('users')
          .where({ openid: release.owner_id.openid })
          .get();
        release.owner_info = userRes.data[0] || {};
      }

      // 设置缓存
      Cache.set(cacheKey, release, 5 * 60 * 1000); // 缓存5分钟

      return release;
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'ParkingService.getDetail',
        showToast: true
      });
      throw error;
    }
  }

  /**
   * 发布车位
   * @param {Object} data - 发布数据
   */
  static async publish(data) {
    const {
      spotNumber,
      date,
      startTime,
      endTime,
      duration
    } = data;

    const db = getApp().getDB();
    const openid = getApp().globalData.openid || wx.getStorageSync('openid');

    try {
      // 1. 查找或创建车位记录
      let parkingId;
      const existingParking = await db.collection('parkings')
        .where({
          spot_number: spotNumber,
          owner_id: openid
        })
        .get();

      if (existingParking.data.length > 0) {
        parkingId = existingParking.data[0]._id;
      } else {
        const parkingRes = await db.collection('parkings').add({
          data: {
            spot_number: spotNumber,
            owner_id: openid,
            create_time: new Date().getTime()
          }
        });
        parkingId = parkingRes._id;
      }

      // 2. 检查时间段冲突
      const hasConflict = await this.checkConflict(spotNumber, date, startTime, endTime);
      if (hasConflict) {
        throw new Error('该车位在此时间段已被占用');
      }

      // 3. 获取用户信息
      const userRes = await db.collection('users')
        .where({ openid: openid })
        .get();

      const userInfo = userRes.data[0] || { nickname: '业主' };

      // 4. 创建发布记录
      const releaseRes = await db.collection('parking_releases').add({
        data: {
          parking_id: {
            _id: parkingId,
            spot_number: spotNumber
          },
          owner_id: {
            openid: openid,
            nickname: userInfo.nickname || '业主'
          },
          date: date,
          start_time: startTime,
          end_time: endTime,
          duration: duration,
          status: 'available',
          create_time: new Date().getTime()
        }
      });

      // 清除相关缓存
      this.clearListCache(date);

      return {
        success: true,
        releaseId: releaseRes._id
      };
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'ParkingService.publish',
        showToast: true
      });
      throw error;
    }
  }

  /**
   * 检查时间段冲突
   */
  static async checkConflict(spotNumber, date, startTime, endTime) {
    const db = getApp().getDB();
    const utils = getApp().getUtils();

    try {
      const releases = await db.collection('parking_releases')
        .where({
          status: 'available',
          'parking_id.spot_number': spotNumber,
          date: date
        })
        .get();

      for (const release of releases.data) {
        if (utils.isTimeRangeOverlap(startTime, endTime, release.start_time, release.end_time)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('检查冲突失败:', error);
      return false;
    }
  }

  /**
   * 清除列表缓存
   */
  static clearListCache(date) {
    // 清除相关日期的缓存
    // 实际实现可能需要更复杂的逻辑
    Cache.cleanExpired();
  }
}

module.exports = ParkingService;
