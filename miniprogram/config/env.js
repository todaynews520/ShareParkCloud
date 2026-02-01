/**
 * 云开发环境配置
 *
 * 使用说明:
 * 1. 开发环境：使用开发环境ID
 * 2. 生产环境：部署时替换为生产环境ID
 * 3. 环境ID获取：微信开发者工具 -> 云开发 -> 设置 -> 环境ID
 *
 * 安全建议:
 * - 不要将生产环境ID提交到版本控制系统
 * - 使用 .gitignore 排除敏感配置
 * - 或使用环境变量管理
 */

// 根据不同环境配置
const ENV_CONFIG = {
  // 开发环境
  development: {
    CLOUD_ENV: 'cloud1-4gu1xbu13e161c48',
    API_BASE: ''
  },
  // 生产环境 - 部署时替换
  production: {
    CLOUD_ENV: '', // 替换为生产环境ID
    API_BASE: ''
  }
};

// 当前环境配置（可根据实际情况切换）
const currentEnv = 'development'; // 'development' 或 'production'

module.exports = {
  // 云开发环境ID
  CLOUD_ENV: ENV_CONFIG[currentEnv].CLOUD_ENV,

  // API基础地址（如需要）
  API_BASE: ENV_CONFIG[currentEnv].API_BASE,

  // 当前环境标识
  ENV: currentEnv,

  // 调试模式
  DEBUG: currentEnv === 'development'
};
