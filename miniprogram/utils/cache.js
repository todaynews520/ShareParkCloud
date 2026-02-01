/**
 * 数据缓存工具类
 * 提供内存缓存、本地存储缓存、过期策略等功能
 */

/**
 * 缓存管理器类
 */
class Cache {
  // 内存缓存
  static memory = new Map();
  // 缓存时间戳
  static timestamps = new Map();
  // 缓存配置
  static config = {
    // 默认缓存时间（毫秒）
    defaultTTL: 5 * 60 * 1000, // 5分钟
    // 最大内存缓存数量
    maxMemorySize: 50,
    // 是否启用本地存储缓存
    enableStorageCache: true,
    // 本地存储缓存key前缀
    storagePrefix: 'cache_'
  };

  /**
   * 设置缓存配置
   */
  static setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存key
   * @param {number} ttl - 缓存时间（毫秒），可选
   * @returns {*} 缓存值，不存在或过期返回null
   */
  static get(key, ttl = this.config.defaultTTL) {
    // 先从内存获取
    const memoryValue = this.getFromMemory(key, ttl);
    if (memoryValue !== null) {
      return memoryValue;
    }

    // 再从本地存储获取
    if (this.config.enableStorageCache) {
      return this.getFromStorage(key, ttl);
    }

    return null;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存key
   * @param {*} value - 缓存值
   * @param {number} ttl - 缓存时间（毫秒）
   * @param {boolean} persist - 是否持久化到本地存储
   */
  static set(key, value, ttl = this.config.defaultTTL, persist = false) {
    // 设置内存缓存
    this.setToMemory(key, value, ttl);

    // 持久化到本地存储
    if (persist && this.config.enableStorageCache) {
      this.setToStorage(key, value, ttl);
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存key
   */
  static delete(key) {
    // 删除内存缓存
    this.memory.delete(key);
    this.timestamps.delete(key);

    // 删除本地存储缓存
    if (this.config.enableStorageCache) {
      try {
        wx.removeStorageSync(this.config.storagePrefix + key);
      } catch (e) {
        console.error('删除本地缓存失败:', e);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  static clear() {
    // 清空内存缓存
    this.memory.clear();
    this.timestamps.clear();

    // 清空本地存储缓存
    if (this.config.enableStorageCache) {
      try {
        const res = wx.getStorageInfoSync();
        const keys = res.keys.filter(k => k.startsWith(this.config.storagePrefix));
        keys.forEach(k => wx.removeStorageSync(k));
      } catch (e) {
        console.error('清空本地缓存失败:', e);
      }
    }
  }

  /**
   * 检查缓存是否存在且有效
   * @param {string} key - 缓存key
   * @returns {boolean}
   */
  static has(key) {
    return this.get(key) !== null;
  }

  /**
   * 从内存获取缓存
   */
  static getFromMemory(key, ttl) {
    if (!this.memory.has(key)) {
      return null;
    }

    // 检查是否过期
    const timestamp = this.timestamps.get(key) || 0;
    if (Date.now() - timestamp > ttl) {
      this.memory.delete(key);
      this.timestamps.delete(key);
      return null;
    }

    return this.memory.get(key);
  }

  /**
   * 设置内存缓存
   */
  static setToMemory(key, value, ttl) {
    // 限制内存缓存大小
    if (this.memory.size >= this.config.maxMemorySize) {
      // 删除最早的缓存
      const firstKey = this.memory.keys().next().value;
      this.memory.delete(firstKey);
      this.timestamps.delete(firstKey);
    }

    this.memory.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  /**
   * 从本地存储获取缓存
   */
  static getFromStorage(key, ttl) {
    try {
      const storageKey = this.config.storagePrefix + key;
      const data = wx.getStorageSync(storageKey);

      if (!data) {
        return null;
      }

      // 检查是否过期
      if (Date.now() - data.timestamp > ttl) {
        wx.removeStorageSync(storageKey);
        return null;
      }

      return data.value;
    } catch (e) {
      console.error('读取本地缓存失败:', e);
      return null;
    }
  }

  /**
   * 设置本地存储缓存
   */
  static setToStorage(key, value, ttl) {
    try {
      const storageKey = this.config.storagePrefix + key;
      const data = {
        value: value,
        timestamp: Date.now(),
        ttl: ttl
      };
      wx.setStorageSync(storageKey, data);
    } catch (e) {
      console.error('写入本地缓存失败:', e);
    }
  }

  /**
   * 获取或设置缓存（如果不存在则执行回调获取值）
   * @param {string} key - 缓存key
   * @param {Function} fetchFn - 获取数据的异步函数
   * @param {number} ttl - 缓存时间
   * @param {boolean} persist - 是否持久化
   */
  static async getOrSet(key, fetchFn, ttl = this.config.defaultTTL, persist = false) {
    // 尝试从缓存获取
    const cached = this.get(key, ttl);
    if (cached !== null) {
      return cached;
    }

    // 执行回调获取数据
    try {
      const value = await fetchFn();
      this.set(key, value, ttl, persist);
      return value;
    } catch (error) {
      console.error('获取数据失败:', error);
      throw error;
    }
  }

  /**
   * 批量获取缓存
   * @param {string[]} keys - 缓存key数组
   * @returns {Object} key-value对象
   */
  static getMany(keys) {
    const result = {};
    keys.forEach(key => {
      result[key] = this.get(key);
    });
    return result;
  }

  /**
   * 批量设置缓存
   * @param {Object} items - key-value对象
   * @param {number} ttl - 缓存时间
   */
  static setMany(items, ttl = this.config.defaultTTL) {
    Object.keys(items).forEach(key => {
      this.set(key, items[key], ttl);
    });
  }

  /**
   * 清理过期缓存
   */
  static cleanExpired() {
    const now = Date.now();

    // 清理内存缓存
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > this.config.defaultTTL) {
        this.memory.delete(key);
        this.timestamps.delete(key);
      }
    }

    // 清理本地存储缓存
    if (this.config.enableStorageCache) {
      try {
        const res = wx.getStorageInfoSync();
        const keys = res.keys.filter(k => k.startsWith(this.config.storagePrefix));

        keys.forEach(storageKey => {
          try {
            const data = wx.getStorageSync(storageKey);
            if (data && data.timestamp && now - data.timestamp > data.ttl) {
              wx.removeStorageSync(storageKey);
            }
          } catch (e) {
            // 数据格式错误，直接删除
            wx.removeStorageSync(storageKey);
          }
        });
      } catch (e) {
        console.error('清理过期缓存失败:', e);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  static getStats() {
    return {
      memory: {
        size: this.memory.size,
        keys: Array.from(this.memory.keys())
      },
      storage: this.getStorageStats()
    };
  }

  /**
   * 获取本地存储缓存统计
   */
  static getStorageStats() {
    if (!this.config.enableStorageCache) {
      return { size: 0 };
    }

    try {
      const res = wx.getStorageInfoSync();
      const cacheKeys = res.keys.filter(k => k.startsWith(this.config.storagePrefix));
      return {
        size: cacheKeys.length,
        keys: cacheKeys.map(k => k.replace(this.config.storagePrefix, ''))
      };
    } catch (e) {
      return { size: 0 };
    }
  }
}

// 页面级缓存装饰器
function withCache(options = {}) {
  const {
    key,
    ttl = Cache.config.defaultTTL,
    persist = false
  } = options;

  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const cacheKey = typeof key === 'function' ? key.apply(this, args) : key;

      // 尝试从缓存获取
      const cached = Cache.get(cacheKey, ttl);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 设置缓存
      Cache.set(cacheKey, result, ttl, persist);

      return result;
    };

    return descriptor;
  };
}

module.exports = {
  Cache,
  withCache
};
