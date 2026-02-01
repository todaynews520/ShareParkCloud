# 共享车位小程序

## 项目说明

这是一个基于微信小程序原生的"共享车位"项目，旨在解决小区车位闲置问题。

## 功能特性

### 用户角色
- **业主**：发布闲置车位、预约车位
- **物业**：接收预约通知、管理预约

### 核心功能

1. **用户认证**
   - 微信登录
   - 角色选择（业主/物业）

2. **车位发布**
   - 输入车位号
   - 选择日期和时间
   - 时长选择（支持双向计算：选择时长或结束时间）
   - 时间段冲突检测

3. **车位浏览**
   - 查看可用车位列表
   - 按日期筛选
   - 只显示当前时间之后的车位

4. **车位预约**
   - 查看车位详情
   - 填写车牌号
   - 角色选择
   - 自动通知物业

5. **个人中心**
   - 我的发布
   - 我的预约
   - 取消预约

## 数据库集合

| 集合名称 | 说明 | 字段 |
|---------|------|------|
| users | 用户信息 | _id, openid, role, nickname |
| parkings | 车位信息 | _id, spot_number, owner_id |
| parking_releases | 车位发布 | _id, parking_id, owner_id, date, start_time, end_time, status, duration |
| reservations | 预约记录 | _id, release_id, user_id, plate_number, spot_number, date, start_time, end_time, status, reserve_time |
| notifications | 通知记录 | _id, reservation_id, property_id, message, type, sent_time, status |

## 云开发配置

### 1. 初始化云开发

1. 登录 [微信云开发控制台](https://console.cloud.tencent.com/tcb)
2. 创建一个新的云开发环境
3. 获取环境ID，替换代码中的 `'your-env-id'`

### 2. 配置云函数

创建以下云函数：

**login 云函数**
- 用于获取用户 openid
- 文件：`cloudfunctions/login/index.js`

**notify 云函数**
- 用于发送通知
- 文件：`cloudfunctions/notify/index.js`

### 3. 配置模板消息

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入"模板消息"页面
3. 添加新模板，包含以下字段：
   - 车位号
   - 时间段
   - 车牌号
   - 通知标题
   - 时间

### 4. 配置安全域名

在微信开发者工具中：
1. 点击"详情"
2. 找到"本地设置"
3. 勾选"不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书"

## 快速开始

1. 安装微信开发者工具
2. 导入项目到开发者工具
3. 修改 `app.js` 中的云开发环境ID
4. 编译运行

## 页面结构

```
miniprogram/
├── app.js              # 小程序入口文件
├── app.json            # 全局配置
├── app.wxss            # 全局样式
├── pages/              # 页面目录
│   ├── index/          # 车位浏览
│   ├── publish/        # 车位发布
│   ├── reserve/        # 车位预约
│   ├── personal/       # 个人中心
│   └── login/          # 登录
├── components/         # 组件目录
│   └── customTabBar/   # 自定义底部导航栏
├── utils/              # 工具类
│   └── common.js       # 通用工具函数
├── images/             # 图片资源
└── cloudfunctions/     # 云函数
    ├── login/          # 登录云函数
    └── notify/         # 通知云函数
```

## 数据流程

### 发布车位流程
```
1. 用户填写车位信息
2. 验证车位号
3. 检查时间冲突
4. 创建车位信息（parkings集合）
5. 创建发布记录（parking_releases集合）
```

### 预约车位流程
```
1. 用户选择车位
2. 填写车牌号
3. 验证预约
4. 更新发布状态为 reserved
5. 创建预约记录（reservations集合）
6. 发送通知给物业
```

## 注意事项

1. **环境ID**：务必替换 `app.js` 中的 `'your-env-id'` 为真实的云开发环境ID
2. **车牌号**：车牌号会明文存储，建议在生产环境进行加密
3. **模板消息**：需要先在微信公众平台配置模板消息，并引导用户订阅
4. **时间段冲突**：同一车位在同一时间段不能重复发布或预约

## 后续优化

- [ ] 车牌号加密存储
- [ ] 实现消息模板推送
- [ ] 添加车位收藏功能
- [ ] 优化图片加载
- [ ] 添加车位评价功能
- [ ] 支持多小区
