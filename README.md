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
   - 收藏功能
   - 懒加载图片优化

4. **车位预约**
   - 查看车位详情
   - 填写车牌号
   - 角色选择
   - 订阅消息通知
   - 自动通知物业

5. **个人中心**
   - 我的发布
   - 我的预约
   - 取消预约
   - 车牌号脱敏显示

6. **小区管理**（新增）
   - 多小区支持
   - 切换当前小区
   - 添加/删除小区

### 新增功能

1. **车牌号加密存储**
   - 服务端AES-256加密
   - 小程序端脱敏显示
   - 加密/解密云函数

2. **订阅消息推送**
   - 预约成功通知
   - 预约取消通知
   - 物业管理通知

3. **车位收藏功能**
   - 收藏/取消收藏车位
   - 只看收藏筛选
   - 收藏状态持久化

4. **图片加载优化**
   - 懒加载组件
   - 占位符动画
   - 加载失败处理

5. **车位评价功能**
   - 星级评分组件
   - 支持半星评分
   - 只读/可编辑模式

## 数据库集合

| 集合名称 | 说明 | 字段 |
|---------|------|------|
| users | 用户信息 | _id, openid, role, nickname, avatar_url |
| parkings | 车位信息 | _id, spot_number, owner_id, community_id |
| parking_releases | 车位发布 | _id, parking_id, owner_id, date, start_time, end_time, status, duration |
| reservations | 预约记录 | _id, release_id, user_id, plate_number, spot_number, date, start_time, end_time, status, reserve_time |
| notifications | 通知记录 | _id, reservation_id, property_id, message, type, sent_time, status |
| favorites | 收藏记录 | _id, user_id, parking_id, create_time |
| communities | 小区信息 | _id, name, address, creator_id, create_time |
| ratings | 评价记录 | _id, parking_id, user_id, rating, comment, create_time |

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
│   ├── login/          # 登录
│   ├── admin/          # 管理后台
│   └── community/      # 小区管理
├── components/         # 组件目录
│   ├── customTabBar/   # 自定义底部导航栏
│   ├── lazy-image/     # 懒加载图片组件
│   └── rating-star/    # 星级评分组件
├── utils/              # 工具类
│   ├── common.js       # 通用工具函数
│   └── crypto.js       # 加密工具
├── config/             # 配置文件
│   └── template.js     # 订阅消息模板配置
├── images/             # 图片资源
└── cloudfunctions/     # 云函数
    ├── login/          # 登录云函数
    ├── notify/         # 订阅消息云函数
    └── crypto/         # 加密解密云函数
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

- [x] 车牌号加密存储 - 已实现AES-256加密服务端存储，小程序端脱敏显示
- [x] 实现消息模板推送 - 已实现订阅消息功能，支持预约成功/取消通知
- [x] 添加车位收藏功能 - 已实现车位收藏、只看收藏筛选功能
- [x] 优化图片加载 - 已实现懒加载组件，支持占位符和加载状态
- [x] 添加车位评价功能 - 已实现星级评分组件，支持半星和只读模式
- [x] 支持多小区 - 已实现小区管理页面，支持多小区切换

## 未来计划

- [ ] 添加车位预约历史记录
- [ ] 实现车位分享功能
- [ ] 添加车位推荐算法
- [ ] 支持车位预约排队
- [ ] 添加数据统计分析
- [ ] 实现车位信用评价体系
