// jest.config.js - Jest 测试配置
module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // 测试覆盖范围
  collectCoverageFrom: [
    'miniprogram/**/*.js',
    '!miniprogram/**/*.spec.js',
    '!miniprogram/**/__tests__/**',
    '!miniprogram/app.js'
  ],

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },

  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/miniprogram/$1',
    '^@utils/(.*)$': '<rootDir>/miniprogram/utils/$1',
    '^@services/(.*)$': '<rootDir>/miniprogram/services/$1',
    '^@config/(.*)$': '<rootDir>/miniprogram/config/$1'
  },

  // 转换配置
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // 忽略的模块
  transformIgnorePatterns: [
    'node_modules/(?!(wx-server-sdk)/)'
  ],

  // 全局设置文件
  setupFiles: ['<rootDir>/jest.setup.js'],

  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov', 'html'],

  // 测试超时时间
  testTimeout: 10000
}
