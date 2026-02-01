**任务描述：**  
请基于以下需求，使用微信小程序开发框架生成完整的代码。小程序名称为“共享车位”，旨在解决小区车位闲置问题。业主可以发布闲置车位信息（包括车位号、日期、时间段），其他业主可以浏览并预约使用（填写车牌号），预约成功后自动通知物业管理人员（发送消息告知车牌号、时间段和车位号，确保车辆可进入地下车库并规范停车）。  

使用微信小程序原生框架（wxml、wxss、js），结合微信云开发（CloudBase）作为后端（数据库、云函数）。如果需要第三方库，仅使用微信支持的内置API。生成代码时，确保：  
- 代码结构清晰：包括app.js、app.json、pages目录下的页面文件（index、publish、reserve、personal等）。  
- 实现用户认证（微信登录）。  
- 处理数据存储和查询（使用云数据库）。  
- 集成微信消息推送（模板消息）用于物业通知。  
- 添加错误处理和用户反馈（如toast提示）。  
- 界面简洁、移动端适配。  
- 输出完整代码文件列表，并在每个文件开头添加注释说明功能。  

**项目背景与目标：**  
- 背景：小区地下车位常闲置，业主可共享闲置时段给其他业主使用。  
- 目标：提高车位利用率；方便发布/预约；自动通知物业避免纠纷。  
- 范围：针对单一小区；不包括支付或硬件集成；初始版本支持基本CRUD操作。  
- 假设：用户均为小区业主或物业，通过微信登录验证；数据隐私保护（加密车牌号）。  

**用户角色：**  
- 业主（拥有者）：发布闲置车位，查看预约。  
- 业主（使用者）：浏览/预约车位，填写车牌。  
- 物业：接收预约通知，查看日志。  

**功能需求（请按模块生成代码）：**  

1. **用户认证与注册模块：**
   - 通过wx.login获取code，调用云函数交换openid。
   - 业主需提供车牌号信息。
   - 不强制绑定角色，在发布车位或预约时动态选择角色（业主/物业）。
   - 代码示例：在app.js中初始化登录逻辑；在登录页处理用户信息获取。  

2. **车位发布模块：**
   - 页面：publish.wxml（表单：车位号输入、日期选择器、时间段picker、角色选择）。
   - 逻辑：业主提交后，调用云函数插入发布信息到数据库（集合：parking_releases）。
   - 输入：车位号（string）、日期（YYYY-MM-DD）、时间段（HH:mm - HH:mm）、角色（业主/物业）。
   - 输出：发布成功toast，更新列表。
   - 验证：检查时间段不冲突（与同一车位其他发布比较）。

   - **车位号管理**：先创建车位信息到 parkings 集合，获取 parking_id 后创建发布记录。
   - **角色选择**：发布时动态选择角色，若选择业主则需输入车牌号。  

3. **车位浏览与搜索模块：**  
   - 页面：index.wxml（列表显示可用车位，支持下拉刷新）。  
   - 逻辑：调用云函数查询可用发布（where: {status: 'available', date >= today}），支持过滤（日期、时间）。  
   - 显示：车位号、日期、时间段、状态。  
   - 交互：点击项跳转到预约页。  

4. **车位预约模块：**
   - 页面：reserve.wxml（显示选中车位详情，输入车牌号、角色选择）。
   - 逻辑：提交后，更新发布状态为'reserved'，插入预约记录（集合：reservations），调用云函数发送通知。
   - 输入：车牌号（string，验证格式如"京A12345"）、角色（业主/物业）。
   - 输出：预约成功toast，通知物业。
   - 验证：检查车位是否可用，避免重复预约。

   - **角色选择**：预约时动态选择角色，若选择业主则需输入车牌号。  

5. **物业通知模块：**
   - 逻辑：预约成功后，使用wx.requestSubscribeMessage订阅模板消息，然后调用云函数wx.cloud.callFunction发送模板消息给物业用户（openid）。
   - 消息内容：`车牌号: [plate]，时间段: [time]，车位号: [spot]，请放行车辆。`
   - 通过 parking_id 关联到 parkings 集合获取 spot_number。
   - 对于物业：提供通知列表页，查询所有预约。

   - **车位号关联**：通过 parking_id 关联到 parkings 集合，获取 spot_number 用于通知。  

6. **个人中心模块：**  
   - 页面：personal.wxml（tab切换：我的发布、我的预约）。  
   - 逻辑：查询用户相关记录，支持取消预约（更新状态，回滚发布）。  

7. **系统管理模块（物业专用）：**  
   - 页面：admin.wxml（日志列表：所有预约详情）。  
   - 逻辑：物业登录后可见，查询reservations集合。  

**数据模型（请在云函数中定义集合）：**
- 用户集合 (users)：{ _id, openid, role: 'owner'|'property', nickname }
- 车位集合 (parkings)：{ _id, spot_number, owner_id }
- 发布集合 (parking_releases)：{ _id, parking_id, owner_id, date, start_time, end_time, status: 'available'|'reserved' }
- 预约集合 (reservations)：{ _id, release_id, user_id, plate_number, spot_number, date, start_time, end_time, status: 'pending'|'confirmed'|'cancelled', reserve_time }
- 通知集合 (notifications)：{ _id, reservation_id, property_id, message, type: 'property'|'user', sent_time, status: 'pending'|'sent'|'failed' }  

**非功能需求：**  
- 性能：页面加载<2s，使用云数据库分页查询。  
- 安全：车牌号加密存储（使用wx.setStorageSync本地缓存敏感数据）；角色权限检查（云函数中）。  
- 界面：使用微信组件（如picker、list、button）；样式统一（蓝色调，字体14px）。  
- 错误处理：网络失败重试；无效输入提示。  
- 测试点：模拟发布-预约-通知流程。  

**生成代码要求：**
- 输出格式：每个文件独立代码块，如"// app.js"后跟代码。
- 完整性：包括全局配置（app.json: pages, tabBar）。
- 最佳实践：使用Promise处理异步；添加loading动画。
- 车位管理：发布前需先在 parkings 集合创建车位信息，获取 parking_id 后创建发布记录。
- 角色选择：在发布车位和预约时动态选择角色，若为业主需输入车牌号。
- 如果需要扩展：支持多小区（添加neighborhood_id字段）。  