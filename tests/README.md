# 单元测试文档

## 概述

本项目使用 Jest 进行单元测试，覆盖小程序的核心功能模块。

## 测试文件结构

```
ShareParkCloud/
├── jest.config.js              # Jest 配置文件
├── jest.setup.js               # Jest 全局设置（Mock 微信 API）
├── babel.config.js             # Babel 配置
├── package.json                # 测试脚本和依赖
└── miniprogram/
    ├── app.spec.js             # 应用核心功能测试
    ├── utils/
    │   ├── cache.spec.js       # 缓存工具测试
    │   ├── formatter.spec.js   # 格式化工具测试
    │   └── validator.spec.js   # 验证工具测试
    └── services/
        ├── cloud.spec.js       # 云服务测试
        ├── parkingService.spec.js  # 车位服务测试
        └── orderService.spec.js    # 订单服务测试
```

## 安装依赖

```bash
npm install
```

## 运行测试

### 运行所有测试
```bash
npm test
```

### 监视模式（自动重新运行）
```bash
npm run test:watch
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

### 详细输出模式
```bash
npm run test:verbose
```

## 测试覆盖范围

### 工具类测试 (Utils)

#### cache.spec.js - 缓存工具
- ✅ set() - 存储数据
- ✅ get() - 获取数据
- ✅ remove() - 删除数据
- ✅ clear() - 清空缓存
- ✅ 过期时间处理
- ✅ 边界情况处理

#### formatter.spec.js - 格式化工具
- ✅ formatTime() - 时间格式化
- ✅ formatDate() - 日期格式化
- ✅ formatMoney() - 金额格式化
- ✅ timeDiff() - 时间差计算
- ✅ formatDuration() - 时长格式化
- ✅ getRelativeTime() - 相对时间

#### validator.spec.js - 验证工具
- ✅ validatePlateNumber() - 车牌号验证
- ✅ formatPlateNumber() - 车牌号格式化
- ✅ validatePhone() - 手机号验证
- ✅ validatePrice() - 价格验证

### 服务层测试 (Services)

#### cloud.spec.js - 云服务
- ✅ callFunction() - 云函数调用
- ✅ 错误处理
- ✅ 网络异常处理

#### parkingService.spec.js - 车位服务
- ✅ getParkingList() - 获取车位列表
- ✅ getParkingDetail() - 获取车位详情
- ✅ createPublish() - 创建发布
- ✅ getMyPublishList() - 我的发布
- ✅ cancelPublish() - 取消发布

#### orderService.spec.js - 订单服务
- ✅ createOrder() - 创建订单
- ✅ payOrder() - 支付订单
- ✅ getMyOrderList() - 我的订单
- ✅ getOrderDetail() - 订单详情
- ✅ calculatePrice() - 费用计算

### 应用核心测试 (App)

#### app.spec.js - 应用核心
- ✅ onLaunch() - 应用启动
- ✅ checkLoginStatus() - 检查登录状态
- ✅ login() - 用户登录
- ✅ logout() - 退出登录
- ✅ getDB() - 获取数据库实例

## Mock 配置

### 微信 API Mock
在 `jest.setup.js` 中已 Mock 所有常用的微信 API：

```javascript
// 云开发相关
wx.cloud.init()
wx.cloud.callFunction()
wx.cloud.database()

// 本地存储
wx.setStorageSync()
wx.getStorageSync()
wx.removeStorageSync()
wx.clearStorageSync()

// UI 交互
wx.showToast()
wx.showLoading()
wx.hideLoading()
wx.showModal()

// 路由导航
wx.navigateTo()
wx.redirectTo()
wx.switchTab()
wx.reLaunch()

// 其他
wx.getSystemInfo()
wx.createSelectorQuery()
wx.createIntersectionObserver()
```

## 添加新测试

### 1. 创建测试文件

在相应目录下创建 `*.spec.js` 文件：

```javascript
// example.spec.js
const exampleModule = require('./example')

describe('Example Module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should do something', () => {
    const result = exampleModule.doSomething()
    expect(result).toBe('expected value')
  })
})
```

### 2. 编写测试用例

遵循 AAA 模式（Arrange-Act-Assert）：

```javascript
test('should calculate total price', () => {
  // Arrange - 准备测试数据
  const price = 500  // 5元/小时
  const hours = 2

  // Act - 执行被测试的函数
  const result = calculatePrice(price, hours)

  // Assert - 验证结果
  expect(result.total).toBe(1000)
})
```

### 3. 运行测试

```bash
npm test example.spec.js
```

## 调试测试

### 使用 VS Code 调试

1. 安装 Jest Runner 扩展
2. 在测试文件中点击测试名称旁的 ▶️ 按钮
3. 或在命令面板中选择 "Jest: Run Current File"

### 命令行调试

```bash
# 显示详细输出
npm test -- --verbose

# 只运行匹配的测试
npm test -- --testNamePattern="should login"

# 运行特定文件
npm test cache.spec.js
```

## 持续集成

### GitHub Actions 配置示例

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 最佳实践

### 1. 测试命名

- 测试文件: `*.spec.js`
- 描述块: 使用清晰的中文描述
- 测试用例: 使用 `应该...` 格式

```javascript
test('应该正确计算价格', () => {})
test('应该处理无效输入', () => {})
```

### 2. 测试隔离

- 每个测试应该独立运行
- 使用 `beforeEach` 清理状态
- 避免测试之间的依赖

```javascript
beforeEach(() => {
  jest.clearAllMocks()
  // 重置状态
})
```

### 3. Mock 使用

- 只 Mock 必要的外部依赖
- 使用 jest.spyOn 进行部分 Mock
- 测试后恢复原始实现

```javascript
const spy = jest.spyOn(console, 'log')
// 测试代码
spy.mockRestore()
```

### 4. 异步测试

- 使用 async/await
- 确保所有 Promise 被处理
- 设置合理的超时时间

```javascript
test('should handle async operation', async () => {
  const result = await asyncFunction()
  expect(result).toBe('expected')
})
```

## 常见问题

### Q: 测试中找不到 wx 对象？
A: 确保 `jest.setup.js` 已正确配置，并在 `jest.config.js` 中引用。

### Q: Mock 没有生效？
A: 使用 `jest.clearAllMocks()` 在 `beforeEach` 中清除之前的 Mock 状态。

### Q: 测试超时？
A: 在 `jest.config.js` 中增加 `testTimeout` 值，默认是 10000ms。

### Q: 覆盖率不准确？
A: 检查 `collectCoverageFrom` 配置，确保包含了需要测试的文件。

## 贡献指南

添加新功能时，请同时添加对应的单元测试：

1. 为新功能编写测试用例
2. 确保所有测试通过
3. 保持测试覆盖率不低于 60%
4. 提交前运行 `npm run test:coverage`
