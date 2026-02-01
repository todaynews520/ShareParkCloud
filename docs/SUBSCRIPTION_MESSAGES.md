# 订阅消息功能说明

## 功能概述

本小程序已实现微信订阅消息功能，用户在预约车位和取消预约时会收到微信服务通知。

## 文件结构

```
ShareParkCloud/
├── cloudfunctions/
│   └── notify/
│       ├── index.js       # 云函数入口
│       ├── config.js      # 模板ID配置（服务端）
│       └── package.json
├── miniprogram/
│   ├── config/
│   │   └── template.js    # 模板ID配置（小程序端）
│   └── pages/
│       ├── reserve/       # 预约页面
│       └── personal/      # 个人中心
```

## 配置步骤

### 1. 申请模板消息

登录 [微信公众平台](https://mp.weixin.qq.com/)，按以下步骤操作：

1. 进入 **功能** -> **模板消息**
2. 点击 **模板库**，搜索并添加以下模板：

#### 预约成功通知模板
- **模板名称**: 预约成功通知（或类似名称）
- **所需字段**:
  - 车位号 (thing) - 必填
  - 预约时间 (thing) - 必填
  - 车牌号 (thing) - 可选
  - 备注 (thing) - 可选

#### 预约取消通知模板
- **模板名称**: 预约取消通知（或类似名称）
- **所需字段**:
  - 车位号 (thing) - 必填
  - 预约时间 (thing) - 必填
  - 车牌号 (thing) - 可选

### 2. 配置模板ID

申请到模板后，将模板ID配置到以下文件：

#### 服务端配置
文件: `cloudfunctions/notify/config.js`

```javascript
module.exports = {
  RESERVATION_SUCCESS: '你的预约成功模板ID',
  RESERVATION_CANCEL: '你的预约取消模板ID',
  PROPERTY_NOTIFY: '你的物业通知模板ID' // 可选
};
```

#### 小程序端配置
文件: `miniprogram/config/template.js`

```javascript
module.exports = {
  RESERVATION_SUCCESS: '你的预约成功模板ID',
  RESERVATION_CANCEL: '你的预约取消模板ID'
};
```

### 3. 部署云函数

在微信开发者工具中：

1. 右键点击 `cloudfunctions/notify` 文件夹
2. 选择 **上传并部署：云端安装依赖**
3. 等待部署完成

### 4. 测试功能

1. 在小程序中打开预约页面
2. 点击"订阅通知"按钮授权
3. 完成预约或取消预约
4. 在微信服务通知中查看收到的消息

## 使用说明

### 用户授权

用户在预约页面首次预约时，会弹出订阅授权请求：

- 用户同意: 收到预约成功/取消通知
- 用户拒绝: 不影响预约功能，只是不会收到通知

### 通知时机

- **预约成功通知**: 用户成功预约车位后发送
- **预约取消通知**: 用户取消预约后发送

## 云函数调用

### 发送预约成功通知

```javascript
await wx.cloud.callFunction({
  name: 'notify',
  data: {
    type: 'reservation_success',
    touser: openid,
    page: '/pages/personal/personal',
    data: {
      thing1: { value: 'A101' },        // 车位号
      thing2: { value: '2024-01-01 09:00-12:00' }, // 时间
      thing3: { value: '京A12345' },   // 车牌号
      thing4: { value: '共享车位' },   // 应用名称
      date5: { value: '2024-01-01' }   // 日期
    }
  }
});
```

### 发送预约取消通知

```javascript
await wx.cloud.callFunction({
  name: 'notify',
  data: {
    type: 'reservation_cancel',
    touser: openid,
    page: '/pages/personal/personal',
    data: {
      thing1: { value: 'A101' },        // 车位号
      thing2: { value: '2024-01-01 09:00-12:00' }, // 时间
      thing3: { value: '京A12345' },   // 车牌号
      thing4: { value: '共享车位' },   // 应用名称
      date5: { value: '2024-01-01' }   // 日期
    }
  }
});
```

## 常见问题

### Q: 用户没有收到通知？
A: 检查以下几点：
1. 模板ID是否正确配置
2. 云函数是否已部署
3. 用户是否已授权订阅
4. 模板字段是否匹配

### Q: 订阅授权弹窗没出现？
A: 可能原因：
1. 用户已关闭通知总开关
2. 用户之前已拒绝授权
3. 模板ID配置错误

### Q: 错误码 43101
A: 表示用户未订阅该模板或订阅已过期，需要用户重新授权

### Q: 通知有时效性吗？
A: 微信订阅消息有以下限制：
- 一次性订阅: 用户授权一次，可发送一条消息
- 长期订阅: 特定类目的小程序可申请

建议用户每次预约前都进行授权。

## 注意事项

1. **模板字段限制**: 每个字段有字符数限制（如 thing 类型限20个字符）
2. **发送频率**: 避免频繁发送，以免被微信限流
3. **错误处理**: 发送失败不影响主流程，应静默处理
4. **用户体验**: 提供订阅开关，让用户自主选择

## 后续优化

- [ ] 支持长期订阅消息
- [ ] 添加通知历史记录
- [ ] 支持自定义通知时间
- [ ] 添加物业通知功能
