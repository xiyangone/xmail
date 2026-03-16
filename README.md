<p align="center">
  <img src="public/icons/icon-192x192.png" alt="XiYang Mail Logo" width="100" height="100">
  <h1 align="center">XiYang Mail</h1>
</p>

<p align="center">
  一个基于 NextJS + Cloudflare 技术栈构建的临时邮箱服务🎉
</p>

<p align="center">
  <a href="#在线演示">在线演示</a> •
  <a href="#文档">文档</a> •
  <a href="#特性">特性</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#本地运行">本地运行</a> •
  <a href="#部署">部署</a> •
  <a href="#邮箱域名配置">邮箱域名配置</a> •
  <a href="#权限系统">权限系统</a> •
  <a href="#卡密系统">卡密系统</a> •
  <a href="#系统设置">系统设置</a> •
  <a href="#发件功能">发件功能</a> •
  <a href="#Webhook 集成">Webhook 集成</a> •
  <a href="#OpenAPI">OpenAPI</a> •
  <a href="#环境变量">环境变量</a> •
  <a href="#Github OAuth App 配置">Github OAuth App 配置</a> •
  <a href="#贡献">贡献</a> •
  <a href="#许可证">许可证</a> •
  <a href="#交流群">交流群</a> •
  <a href="#支持">支持</a>
</p>

## 在线演示

[https://mail.xiyangone.cn/](https://mail.xiyangone.cn/)

> 本项目基于 [MoeMail](https://github.com/beilunyang/moemail) 进行二次开发和优化
>
> 开发者哔哩哔哩主页: [https://space.bilibili.com/272756942](https://space.bilibili.com/272756942)

## 文档

**完整文档**: [https://docs.moemail.app](https://docs.moemail.app)

文档站点包含详细的使用指南、API 文档、部署教程等完整信息。

## 特性

- 🔒 **隐私保护**：保护您的真实邮箱地址，远离垃圾邮件和不必要的订阅
- ⚡ **实时收件**：可配置的自动轮询，即时接收邮件通知（支持 5-60 秒刷新间隔）
- ⏱️ **灵活有效期**：支持 1 小时、24 小时、3 天或永久有效，默认过期时间为 3 天
- 🎨 **主题切换**：支持亮色和暗色模式
- 📱 **响应式设计**：完美适配桌面和移动设备
- 🔄 **自动清理**：自动清理过期的邮箱和邮件
- 📱 **PWA 支持**：支持 PWA 安装
- 💸 **免费自部署**：基于 Cloudflare 构建, 可实现免费自部署，无需任何费用
- 🎉 **可爱的 UI**：简洁可爱萌萌哒 UI 界面，集成 JetBrains Mono Nerd Font 字体
- 📤 **发件功能**：支持使用临时邮箱发送邮件，基于 Resend 服务
- 🔔 **Webhook 通知**：支持通过 webhook 接收新邮件通知
- 🛡️ **权限系统**：支持基于角色的权限控制系统
- 🔑 **OpenAPI**：支持通过 API Key 访问 OpenAPI
- 🎫 **卡密系统**：支持通过卡密快速创建临时账号，支持单邮箱和多邮箱模式，支持卡密重置和重复登录
- 🏷️ **域名标签管理**：优化的域名配置界面，支持标签式显示和批量添加，智能分组排序（顶级域名优先，同级别按字母顺序，同组内按长度排序）
- 🚀 **性能优化**：React.memo、useMemo、useCallback 优化，更快的渲染速度
- 🎯 **智能聚焦**：所有页面和对话框自动聚焦到合适的输入框，提升用户体验
- 📦 **批量操作**：邮箱列表和用户管理支持批量选择和批量删除功能
- 🔄 **无感刷新**：删除操作后自动无感刷新列表，保持用户体验流畅
- ⏱️ **倒计时同步**：邮件列表倒计时与后端轮询完美同步，避免时间差
- 🔢 **智能验证码识别**：自动识别邮件中的验证码并替换发件人位置显示，一键复制，支持多种格式（"Your verification code is: 672246"、"验证码: 123456" 等）
- 🔀 **邮箱切换优化**：切换邮箱时立即清空消息列表和重置状态，避免显示上一个邮箱的内容，提升切换体验
- 🤖 **智能验证码获取 API**：提供 API 接口自动从邮件列表中提取验证码，支持发件人过滤、轮询间隔和超时配置，适用于自动化测试和注册流程
- 🔗 **分享功能**：支持生成邮箱分享链接，可设置有效期（1小时/24小时/3天/永久），支持桌面端双栏布局和移动端单栏布局，完整的错误处理和过期状态显示
- 🎨 **优雅的对话框遮罩**：对话框打开时背景半透明暗化，选择器下拉菜单正确显示在最上层，支持鼠标滚轮快速切换域名
- ⚡ **性能优化加载**：Profile页面使用动态导入优化加载速度，配置组件按需加载，提升首屏渲染性能
- 🛡️ **皇帝用户保护**：用户管理页面皇帝用户无法被删除、无法被选中批量删除，确保系统管理员账号安全
- 🔄 **实时UI更新**：邮箱删除后立即更新列表和选中状态，无需等待轮询，提供即时反馈
- 🎯 **优雅的加载状态**：邮件列表加载时显示明显的"加载中..."提示和旋转动画，配合半透明骨架屏
- 🌐 **域名验证增强**：支持带数字的顶级域名（如 `aaugment.de5.net`），更灵活的域名配置
- 🔐 **OAuth注册控制**：关闭注册时同时阻止GitHub OAuth创建新用户，防止绕过注册限制
- 🔤 **纯字母前缀格式**：新增纯随机字母（无数字）的邮箱前缀生成选项
- 🛡️ **安全加固**：PBKDF2 密码哈希、API Key 哈希存储、iframe XSS 防护（srcdoc + sandbox + CSP）、安全响应头
- 🤖 **Turnstile 人机验证**：集成 Cloudflare Turnstile，登录/注册/卡密登录全链路防机器人
- ⚛️ **数据一致性**：卡密激活使用 D1 db.batch() 原子操作，杜绝中途失败导致的脏数据
- 🌐 **国际化 (i18n)**：基于 next-intl 的中英文双语支持，cookie 切换语言，无路由前缀，全页面覆盖

## 技术栈

- **框架**: [Next.js](https://nextjs.org/) 15.5.9 (App Router)
- **平台**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **数据库**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **认证**: [NextAuth](https://authjs.dev/getting-started/installation?framework=Next.js) 配合 GitHub 登录
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 组件**: 基于 [Radix UI](https://www.radix-ui.com/) 的自定义组件
- **邮件处理**: [Cloudflare Email Workers](https://developers.cloudflare.com/email-routing/)
- **类型安全**: [TypeScript](https://www.typescriptlang.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **PWA**: [Serwist](https://serwist.pages.dev/) (Service Worker)
- **国际化**: [next-intl](https://next-intl.dev/) (中英双语)

## 本地运行

### 前置要求

- Node.js 22+
- Pnpm
- Wrangler CLI
- Cloudflare 账号

### 安装

1. 克隆仓库：

```bash
git clone https://github.com/xiyangone/xmail.git
cd xmail
```

2. 安装依赖：

```bash
pnpm install
```

3. 设置 wrangler：

```bash
cp wrangler.example.json wrangler.json
cp wrangler.email.example.json wrangler.email.json
cp wrangler.cleanup.example.json wrangler.cleanup.json
```

设置 Cloudflare D1 数据库名以及数据库 ID

4. 设置环境变量：

```bash
cp .env.example .env.local
```

设置 AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, AUTH_SECRET

5. 创建本地数据库表结构

```bash
pnpm db:migrate-local
```

### 开发

1. 启动开发服务器：

```bash
pnpm dev
```

2. 测试邮件 worker：
   目前无法本地运行并测试，请使用 wrangler 部署邮件 worker 并测试

```bash
pnpm deploy:email
```

3. 测试清理 worker：

```bash
pnpm dev:cleanup
pnpm test:cleanup
```

4. 生成 Mock 数据（邮箱以及邮件消息）

```bash
pnpm generate-test-data
```

### 本地测试

在提交代码前,建议运行以下命令进行测试:

1. **代码检查**：

```bash
pnpm lint
```

2. **生产构建测试**：

```bash
pnpm build
```

3. **类型检查**：

```bash
pnpm type-check
```

## 部署

### 视频版保姆级部署教程

https://www.bilibili.com/video/BV19wrXY2ESM/

### 本地 Wrangler 部署

1. 创建 .env 文件

```bash
cp .env.example .env
```

2. 在 .env 文件中设置[环境变量](#环境变量)

3. 运行部署脚本

```bash
pnpm dlx tsx ./scripts/deploy/index.ts
```

### Github Actions 部署

本项目可使用 GitHub Actions 实现自动化部署。支持以下触发方式：

1. **自动触发**：推送新的 tag 时自动触发部署流程
2. **手动触发**：在 GitHub Actions 页面手动触发

#### 部署步骤

1. 在 GitHub 仓库设置中添加以下 Secrets：

   - `CLOUDFLARE_API_TOKEN`: Cloudflare API 令牌
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账户 ID
   - `AUTH_GITHUB_ID`: GitHub OAuth App ID
   - `AUTH_GITHUB_SECRET`: GitHub OAuth App Secret
   - `AUTH_SECRET`: NextAuth Secret，用来加密 session，请设置一个随机字符串
   - `CUSTOM_DOMAIN`: 网站自定义域名，用于访问 XiYang Mail (可选，如果不填，则使用 Workers 默认域名 *.workers.dev)
   - `PROJECT_NAME`: Worker 名称（可选，如果不填，则为 xmail）
   - `DATABASE_NAME`: D1 数据库名称 (可选，如果不填，则为 xmail-db)
   - `KV_NAMESPACE_NAME`: Cloudflare KV namespace 名称，用于存储网站配置 （可选，如果不填，则为 xmail-kv）
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Cloudflare Turnstile 站点密钥（可选，不配置则跳过人机验证）
   - `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile 密钥（可选，与站点密钥配对使用）

2. 选择触发方式：

   **方式一：推送 tag 触发**

   ```bash
   # 创建新的 tag
   git tag v1.0.0

   # 推送 tag 到远程仓库
   git push origin v1.0.0
   ```

   **方式二：手动触发**

   - 进入仓库的 Actions 页面
   - 选择 "Deploy" workflow
   - 点击 "Run workflow"

3. 部署进度可以在仓库的 Actions 标签页查看

#### 注意事项

- 确保所有 Secrets 都已正确设置
- 使用 tag 触发时，tag 必须以 `v` 开头（例如：v1.0.0）

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xiyangone/xmail)

## 邮箱域名配置

在 XiYang Mail 个人中心页面，可以配置网站的邮箱域名，支持多域名配置。

### 域名管理界面优化

新版本采用了更直观的标签式域名管理界面：

- 🏷️ **标签式显示**：每个域名显示为独立的标签，清晰明了
- ➕ **快速添加**：点击"添加域名"按钮即可输入新域名
- 🗑️ **一键删除**：每个域名标签带有删除按钮，点击即可移除
- 📋 **批量操作**：支持粘贴多个域名（逗号、空格、换行分隔），自动识别并批量添加
- ✅ **格式验证**：自动验证域名格式，防止输入错误
- 📏 **滚动显示**：域名数量过多时自动显示滚动条，节省空间

![邮箱域名配置](https://pic.otaku.ren/20241227/AQAD88AxG67zeVd-.jpg "邮箱域名配置")

### Cloudflare 邮件路由配置

为了使邮箱域名生效，还需要在 Cloudflare 控制台配置邮件路由，将收到的邮件转发给 Email Worker 处理。

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 选择您的域名
3. 点击左侧菜单的 "电子邮件" -> "电子邮件路由"
4. 如果显示 “电子邮件路由当前被禁用，没有在路由电子邮件”，请点击 "启用电子邮件路由"
   ![启用电子邮件路由](https://pic.otaku.ren/20241223/AQADNcQxG_K0SVd-.jpg "启用电子邮件路由")
5. 点击后，会提示你添加电子邮件路由 DNS 记录，点击 “添加记录并启用” 即可
   ![添加电子邮件路由 DNS 记录](https://pic.otaku.ren/20241223/AQADN8QxG_K0SVd-.jpg "添加电子邮件路由 DNS 记录")
6. 配置路由规则：
   - Catch-all 地址: 启用 "Catch-all"
   - 编辑 Catch-all 地址
   - 操作: 选择 "发送到 Worker"
   - 目标位置: 选择刚刚部署的 "email-receiver-worker"
   - 保存
     ![配置路由规则](https://pic.otaku.ren/20241223/AQADNsQxG_K0SVd-.jpg "配置路由规则")

### 注意事项

- 确保域名的 DNS 托管在 Cloudflare
- Email Worker 必须已经部署成功
- 如果 Catch-All 状态不可用(一直 loading)，请点击`路由规则`旁边的`目标地址`, 进去绑定一个邮箱

## 权限系统

本项目采用基于角色的权限控制系统（RBAC）。

### 角色配置

新用户默认角色由皇帝在个人中心的网站设置中配置：

- 公爵：新用户将获得临时邮箱、Webhook 配置权限以及 API Key 管理权限
- 骑士：新用户将获得临时邮箱和 Webhook 配置权限
- 平民：新用户无任何权限，需要等待皇帝册封为骑士或公爵

### 角色等级

系统包含五个角色等级：

1. **皇帝（Emperor）**

   - 网站所有者
   - 拥有所有权限
   - 每个站点只能有一个皇帝

2. **公爵（Duke）**

   - 超级用户
   - 可以使用临时邮箱功能
   - 可以配置 Webhook
   - 可以使用创建 API Key 调用 OpenAPI
   - 可以被皇帝贬为骑士或平民

3. **骑士（Knight）**

   - 高级用户
   - 可以使用临时邮箱功能
   - 可以配置 Webhook
   - 可以被皇帝贬为平民或册封为公爵

4. **平民（Civilian）**

   - 普通用户
   - 无任何权限
   - 可以被皇帝册封为骑士或者公爵

5. **临时用户（Temp User）**
   - 通过卡密创建的临时账号
   - 只能接收邮件，无法发送邮件
   - 无法删除或修改绑定的邮箱地址
   - 账号有效期为 7 天，到期自动删除

### 角色升级

1. **成为皇帝**

   - 第一个访问 `/api/roles/init-emperor` 接口的用户将成为皇帝，即网站所有者
   - 站点已有皇帝后，无法再提升其他用户为皇帝

2. **角色变更**
   - 皇帝可以在个人中心页面将其他用户设为公爵、骑士或平民

### 权限说明

- **邮箱管理**：创建和管理临时邮箱
- **Webhook 管理**：配置邮件通知的 Webhook
- **API Key 管理**：创建和管理 API 访问密钥
- **用户管理**：升降用户角色
- **系统设置**：管理系统全局设置

## 卡密系统

XiYang Mail 支持通过卡密快速创建临时账号，用户可以跳过注册流程直接获得临时邮箱访问权限。

### 功能特性

- 🎫 **快速入门**：通过卡密跳过注册，直接获得临时账号
- 📧 **邮箱绑定**：支持单邮箱和多邮箱两种模式
  - **单邮箱模式**：一个卡密绑定一个特定邮箱地址
  - **多邮箱模式**：一个卡密绑定多个预设邮箱地址
- ⏰ **自动过期**：临时账号有效期可配置（默认 7 天），到期自动删除
- 🔒 **权限限制**：只能接收邮件，无法发送邮件或删除邮箱
- 🛡️ **安全管控**：管理员可以生成、查看、重置和删除卡密
- 🔄 **卡密重置**：支持重置卡密状态，允许重复登录（保留用户数据）

### 卡密格式

卡密采用统一格式：`XYMAIL-XXXX-XXXX-XXXX`

### 管理员功能

**皇帝**角色可以在 `/admin/card-keys` 页面管理卡密：

1. **生成卡密**

   - 选择卡密模式（单邮箱/多邮箱）
   - **单邮箱模式**：输入一个绑定的邮箱地址
   - **多邮箱模式**：输入多个邮箱地址（逗号或换行分隔）
   - 设置有效期（支持分钟/小时/天单位，默认 7 天）
   - 支持批量生成
   - 生成后显示在卡密列表中

2. **卡密管理**

   - 查看所有卡密列表
   - 显示卡密状态（未使用/已使用/已过期）
   - 显示卡密模式和绑定的邮箱地址
   - 一键复制卡密到剪贴板
   - 重置已使用的卡密（允许重复登录）
   - 删除卡密（级联删除关联数据）

3. **自动清理**
   - 系统会自动清理过期的临时账号
   - 支持手动触发清理操作
   - 可配置定时清理任务

### 用户使用流程

1. **获取卡密**

   - 从管理员处获得卡密

2. **卡密登录**

   - 访问登录页面
   - 切换到"卡密登录"标签
   - 输入卡密并登录

3. **使用临时账号**
   - 自动创建临时账号并绑定邮箱
   - **单邮箱模式**：只能接收邮件到绑定的邮箱地址
   - **多邮箱模式**：可以接收邮件到所有绑定的邮箱地址
   - 无法创建新邮箱或发送邮件
   - 默认 7 天后账号自动删除（可配置）

### 权限限制

临时用户的权限受到严格限制：

- ✅ **可以做的**：

  - 接收邮件到绑定的邮箱地址（单邮箱或多邮箱）
  - 查看收到的邮件内容
  - 查看邮箱列表（仅显示绑定的邮箱）

- ❌ **不能做的**：
  - 创建新的邮箱地址
  - 删除或修改绑定的邮箱
  - 发送邮件
  - 配置 Webhook
  - 创建 API Key
  - 访问管理功能

### 自动清理机制

系统提供自动清理过期临时账号的功能：

1. **API 清理**

   - 提供 `/api/cleanup/temp-accounts` 接口
   - 支持手动调用清理过期账号

2. **定时清理**

   - 可配置 Cloudflare Worker 定时任务
   - **每 30 分钟**自动执行清理过期账号
   - 清理时会删除相关用户数据和邮箱

3. **配置定时任务**

   ```bash
   # 复制配置文件
   cp wrangler.temp-cleanup.example.json wrangler.temp-cleanup.json

   # 修改配置中的 SITE_URL 和 KV_NAMESPACE_ID
   # 部署定时清理 Worker（默认每 30 分钟执行一次）
   wrangler deploy --config wrangler.temp-cleanup.json
   ```

### 注意事项

- 🔐 **安全性**：卡密一次性使用，使用后无法重复使用
- ⏰ **有效期**：临时账号严格按照 7 天有效期执行
- 📧 **邮箱绑定**：每个卡密只能绑定一个邮箱地址
- 🗑️ **自动清理**：过期账号会被自动删除，无法恢复
- 👑 **管理权限**：只有皇帝角色可以生成和管理卡密

## 系统设置

系统设置存储在 Cloudflare KV 中，包括以下内容：

- `DEFAULT_ROLE`: 新注册用户默认角色，可选值为 `CIVILIAN`、`KNIGHT`、`DUKE`
- `EMAIL_DOMAINS`: 支持的邮箱域名，多个域名用逗号分隔
- `ADMIN_CONTACT`: 管理员联系方式
- `MAX_EMAILS`: 每个用户可创建的最大邮箱数量
- `EMAIL_PREFIX_LENGTH`: 邮箱前缀长度（4-20 位，默认 8 位）
- `EMAIL_PREFIX_FORMAT`: 邮箱前缀生成格式
- `MESSAGE_POLL_INTERVAL`: 消息自动刷新间隔（毫秒，默认 15000，建议 5000-30000）

**皇帝**角色可以在个人中心页面设置

### 消息自动刷新配置

系统支持可配置的消息自动刷新功能，管理员可以在网站设置中调整刷新间隔。前端倒计时和后端轮询完全同步，确保刷新时间准确一致。

**配置方式**：

1. 皇帝角色登录系统
2. 进入个人中心 → 网站设置
3. 找到"消息自动刷新配置"部分
4. 设置刷新间隔（3000-60000 毫秒）
5. 保存配置

**同步机制**：

- 前端倒计时每秒递减，归零时自动触发刷新
- 手动刷新后倒计时自动重置
- 倒计时进度环形图实时显示刷新进度

**Cloudflare 免费套餐限制**：

- Workers 请求：100,000 次/天
- 假设 100 个活跃用户，5 秒刷新会产生约 1,728,000 次/天请求
- 建议根据实际用户数量调整：
  - 小规模（<10 用户）：5 秒安全 ✅
  - 中等规模（10-50 用户）：10-15 秒 ⚠️
  - 大规模（>50 用户）：20-30 秒或升级套餐 ❌

### 邮箱前缀生成配置

当用户创建邮箱时不输入前缀，系统会根据配置自动生成。支持以下格式：

| 格式选项        | 说明                        | 示例                     |
| --------------- | --------------------------- | ------------------------ |
| 随机字符串      | 字母+数字的随机组合（默认） | `Rx4Tn2kP`               |
| 纯随机字母      | 纯字母随机组合（无数字）    | `abcdefgh`、`xyzwvuts`   |
| 名字+随机数字   | 常见英文名+3-5 位数字       | `james123`、`emma4567`   |
| 名字+日期       | 常见英文名+月份日期(MMDD)   | `john0524`、`mary1208`   |
| 名字+年份       | 常见英文名+随机年份(YYYY)   | `david1995`、`sarah2001` |
| 随机字符串+日期 | 随机字符+月份日期(MMDD)     | `abc0524`、`xyz1208`     |
| 随机字符串+年份 | 随机字符+随机年份(YYYY)     | `xyz1995`、`abc2001`     |

**配置方式**：

1. 皇帝角色登录系统
2. 进入个人中心 → 网站设置
3. 找到"邮箱前缀生成配置"部分
4. 设置前缀长度（4-20 位）
5. 选择生成格式
6. 保存配置

**使用说明**：

- 前端创建邮箱时可以留空前缀，系统会自动生成
- 点击刷新按钮可预览当前配置生成的前缀
- 用户也可以手动输入自定义前缀

**名字生成库**：

当前使用内置的常见英文名字列表（共 120 个名字：60 个男性名字 + 60 个女性名字）。

- **优势**: 零依赖，无额外包大小，符合 Cloudflare Edge Runtime 限制
- **扩展**: 可以在 `app/lib/email-generator.ts` 中的 `COMMON_NAMES` 数组添加更多名字
- **替代方案**: 如需使用第三方库，推荐轻量级的 `casual` (约 100KB) 或 `chance` (约 200KB)
- **不推荐**: `@faker-js/faker` 完整版约 5MB，会超出 Edge Runtime 1MB 代码限制

## 发件功能

XiYang Mail 支持使用临时邮箱发送邮件，基于 [Resend](https://resend.com/) 服务。

### 功能特性

- 📨 **临时邮箱发件**：可以使用创建的临时邮箱作为发件人发送邮件
- 🎯 **角色权限控制**：不同角色有不同的每日发件限制
- 💌 **支持 HTML**：支持发送富文本格式邮件

### 角色发件权限

| 角色                 | 每日发件限制 | 说明                    |
| -------------------- | ------------ | ----------------------- |
| 皇帝 (Emperor)       | 无限制       | 网站管理员，无发件限制  |
| 公爵 (Duke)          | 5 封/天      | 默认每日可发送 5 封邮件 |
| 骑士 (Knight)        | 2 封/天      | 默认每日可发送 2 封邮件 |
| 平民 (Civilian)      | 禁止发件     | 无发件权限              |
| 临时用户 (Temp User) | 禁止发件     | 卡密用户无发件权限      |

> 💡 **提示**：皇帝可以在个人中心的邮件服务配置中自定义公爵和骑士的每日发件限制。

### 配置发件服务

1. **获取 Resend API Key**

   - 访问 [Resend 官网](https://resend.com/) 注册账号
   - 在控制台中创建 API Key
   - 复制 API Key 供后续配置使用

2. **配置发件服务**

   - 皇帝角色登录 XiYang Mail
   - 进入个人中心页面
   - 在"Resend 发件服务配置"部分：
     - 启用发件服务开关
     - 填入 Resend API Key
     - 设置公爵和骑士的每日发件限制（可选）
   - 点击保存配置

3. **验证配置**
   - 配置保存后，有权限的用户在邮箱列表页面会看到"发送邮件"按钮
   - 点击按钮可以打开发件对话框进行测试

### 使用发件功能

1. **创建临时邮箱**

   - 在邮箱页面创建一个新的临时邮箱

2. **发送邮件**

   - 在邮箱列表中找到要使用的邮箱
   - 点击邮箱旁边的"发送邮件"按钮
   - 在弹出的对话框中填写：
     - 收件人邮箱地址
     - 邮件主题
     - 邮件内容（支持 HTML 格式）
   - 点击"发送"按钮

3. **查看发送记录**
   - 发送的邮件会自动保存到对应邮箱的消息列表中
   - 可以在邮箱详情页面查看所有发送和接收的邮件

### 注意事项

- 📋 **Resend 限制**：请注意 Resend 服务的发送限制和定价政策
- 🔐 **域名验证**：使用自定义域名发件需要在 Resend 中验证域名
- 🚫 **反垃圾邮件**：请遵守邮件发送规范，避免发送垃圾邮件
- 📊 **配额监控**：系统会自动统计每日发件数量，达到限额后将无法继续发送
- 🔄 **配额重置**：每日发件配额在每天 00:00 自动重置

## Webhook 集成

当收到新邮件时，系统会向用户配置并且已启用的 Webhook URL 发送 POST 请求。

### 请求头

```http
Content-Type: application/json
X-Webhook-Event: new_message
```

### 请求体

```json
{
  "emailId": "email-uuid",
  "messageId": "message-uuid",
  "fromAddress": "sender@example.com",
  "subject": "邮件主题",
  "content": "邮件文本内容",
  "html": "邮件HTML内容",
  "receivedAt": "2024-01-01T12:00:00.000Z",
  "toAddress": "your-email@moemail.app"
}
```

### 配置说明

1. 点击个人头像，进入个人中心
2. 在个人中心启用 Webhook
3. 设置接收通知的 URL
4. 点击测试按钮验证配置
5. 保存配置后即可接收新邮件通知

### 测试

项目提供了一个简单的测试服务器, 可以通过如下命令运行:

```bash
pnpm webhook-test-server
```

测试服务器会在本地启动一个 HTTP 服务器，监听 3001 端口（http://localhost:3001）, 并打印收到的 Webhook 消息详情。

如果需要进行外网测试，可以通过 Cloudflare Tunnel 将服务暴露到外网：

```bash
pnpx cloudflared tunnel --url http://localhost:3001
```

### 注意事项

- Webhook 接口应在 10 秒内响应
- 非 2xx 响应码会触发重试

## 分享功能

XiYang Mail 支持生成邮箱分享链接，方便与他人分享邮件内容。

### 功能特性

- 📧 **邮箱分享**：分享整个邮箱，他人可查看该邮箱的所有邮件
- ⏰ **灵活有效期**：支持 1小时、24小时、3天或永久有效
- 🔗 **一键复制**：快速复制分享链接到剪贴板
- 📱 **响应式设计**：桌面端双栏布局，移动端单栏布局
- 🎨 **主题支持**：支持亮色和暗色模式
- ⚠️ **过期提示**：链接过期后显示明确的错误提示

### 使用方法

1. 在邮箱列表中找到要分享的邮箱
2. 点击邮箱旁边的"分享"按钮
3. 在弹出的对话框中：
   - 选择链接有效期（1小时/24小时/3天/永久）
   - 点击"创建链接"按钮
4. 创建成功后，可以：
   - 点击链接在新标签页中预览
   - 点击"复制"按钮复制链接
   - 点击"删除"按钮删除分享链接

### 分享链接格式

- **邮箱分享链接**：`https://your-domain.com/shared/{token}`

### 分享页面功能

- 显示邮箱地址和过期时间
- 显示该邮箱的所有邮件列表
- 桌面端：左侧邮件列表，右侧邮件详情
- 移动端：单栏布局，支持返回导航
- 支持HTML和纯文本两种查看模式
- 支持刷新邮件列表

### 安全说明

- 🔒 **Token 安全**：分享链接使用 16 位随机 token，难以猜测
- ⏰ **自动过期**：链接到期后自动失效，无法访问
- 🗑️ **随时删除**：可以随时删除分享链接，立即失效
- 👁️ **只读访问**：分享链接只能查看内容，无法修改或删除

### 注意事项

- 分享链接可以被任何人访问，请谨慎分享敏感信息
- 建议为敏感邮件设置较短的有效期
- 删除分享链接后，该链接将立即失效
- 过期的分享链接会显示 410 Gone 错误页面

## OpenAPI

本项目提供了 OpenAPI 接口，支持通过 API Key 进行访问。API Key 可以在个人中心页面创建（需要是公爵或皇帝角色）。

### 使用 API Key

在请求头中添加 API Key：

```http
X-API-Key: YOUR_API_KEY
```

### API 接口

#### 获取系统配置

```http
GET /api/config
```

返回响应：

```json
{
  "defaultRole": "CIVILIAN",
  "emailDomains": "moemail.app,example.com",
  "adminContact": "admin@example.com",
  "maxEmails": "10"
}
```

响应字段说明：

- `defaultRole`: 新用户默认角色，可选值：`CIVILIAN`（平民）、`KNIGHT`（骑士）、`DUKE`（公爵）
- `emailDomains`: 支持的邮箱域名，多个域名用逗号分隔
- `adminContact`: 管理员联系方式
- `maxEmails`: 每个用户可创建的最大邮箱数量

#### 创建临时邮箱

```http
POST /api/emails/generate
Content-Type: application/json

{
  "name": "test",
  "expiryTime": 3600000,
  "domain": "moemail.app"
}
```

参数说明：

- `name`: 邮箱前缀，可选
- `expiryTime`: 有效期（毫秒），可选值：3600000（1 小时）、86400000（1 天）、604800000（7 天）、0（永久）
- `domain`: 邮箱域名，可通过 `/api/config` 接口获取

返回响应：

```json
{
  "id": "email-uuid-123",
  "email": "test@moemail.app"
}
```

响应字段说明：

- `id`: 邮箱的唯一标识符
- `email`: 创建的邮箱地址

#### 获取邮箱列表

```http
GET /api/emails?cursor=xxx
```

参数说明：

- `cursor`: 分页游标，可选

返回响应：

```json
{
  "emails": [
    {
      "id": "email-uuid-123",
      "address": "test@moemail.app",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "expiresAt": "2024-01-02T12:00:00.000Z",
      "userId": "user-uuid-456"
    }
  ],
  "nextCursor": "encoded-cursor-string",
  "total": 5
}
```

响应字段说明：

- `emails`: 邮箱列表数组
- `nextCursor`: 下一页游标，用于分页请求
- `total`: 邮箱总数量

#### 获取指定邮箱邮件列表

```http
GET /api/emails/{emailId}?cursor=xxx
```

参数说明：

- `emailId`: 邮箱的唯一标识符，必填
- `cursor`: 分页游标，可选

返回响应：

```json
{
  "messages": [
    {
      "id": "message-uuid-789",
      "from_address": "sender@example.com",
      "subject": "邮件主题",
      "received_at": 1704110400000
    }
  ],
  "nextCursor": "encoded-cursor-string",
  "total": 3
}
```

响应字段说明：

- `messages`: 邮件列表数组
- `nextCursor`: 下一页游标，用于分页请求
- `total`: 邮件总数量

#### 删除邮箱

```http
DELETE /api/emails/{emailId}
```

参数说明：

- `emailId`: 邮箱的唯一标识符，必填

返回响应：

```json
{
  "success": true
}
```

响应字段说明：

- `success`: 删除操作是否成功

#### 获取单封邮件内容

```http
GET /api/emails/{emailId}/{messageId}
```

参数说明：

- `emailId`: 邮箱的唯一标识符，必填
- `messageId`: 邮件的唯一标识符，必填

返回响应：

```json
{
  "message": {
    "id": "message-uuid-789",
    "from_address": "sender@example.com",
    "subject": "邮件主题",
    "content": "邮件文本内容",
    "html": "<p>邮件HTML内容</p>",
    "received_at": 1704110400000
  }
}
```

响应字段说明：

- `message`: 邮件详细信息对象
- `id`: 邮件的唯一标识符
- `from_address`: 发件人邮箱地址
- `subject`: 邮件主题
- `content`: 邮件纯文本内容
- `html`: 邮件 HTML 内容
- `received_at`: 接收时间（时间戳）

#### 智能获取验证码

```http
POST /api/emails/{emailId}/verification-code
Content-Type: application/json

{
  "fromAddress": "verify.windsurf.ai",
  "interval": 3000,
  "timeout": 60000
}
```

参数说明：

- `emailId`: 邮箱的唯一标识符，必填
- `fromAddress`: 发件人地址过滤（可选），例如 "verify.windsurf.ai"，如果不指定则从最新邮件中提取
- `interval`: 轮询间隔（毫秒），可选，默认 3000ms
- `timeout`: 超时时间（毫秒），可选，默认 60000ms

返回响应：

```json
{
  "code": "123456",
  "success": true
}
```

响应字段说明：

- `code`: 提取到的验证码
- `success`: 操作是否成功

错误响应：

```json
{
  "error": "未找到验证码",
  "success": false
}
```

**使用场景**：

此 API 适用于自动化测试和注册流程，可以自动从邮件中提取验证码。例如：

1. **自动化注册流程**：创建临时邮箱 → 提交注册表单 → 调用此 API 获取验证码 → 完成注册
2. **自动化测试**：测试需要邮箱验证的功能时，自动获取验证码
3. **批量操作**：批量注册账号时，自动获取每个邮箱的验证码

**工作原理**：

1. API 会定期轮询指定邮箱的邮件列表（默认每 3 秒一次）
2. 如果指定了 `fromAddress`，则只查找来自该发件人的邮件
3. 从邮件的 HTML 或文本内容中提取验证码
4. 支持多种验证码格式：`<h1 class="code">123456</h1>`、"Your verification code is: 123456"、"验证码: 123456" 等
5. 如果在超时时间内未找到验证码，返回错误

### 使用示例

使用 curl 创建临时邮箱：

```bash
curl -X POST https://your-domain.com/api/emails/generate \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test",
    "expiryTime": 3600000,
    "domain": "moemail.app"
  }'
```

使用 JavaScript 获取邮件列表：

```javascript
const res = await fetch("https://your-domain.com/api/emails/your-email-id", {
  headers: {
    "X-API-Key": "YOUR_API_KEY",
  },
});
const data = await res.json();
```

使用 JavaScript 自动获取验证码（自动化注册流程示例）：

```javascript
// 1. 创建临时邮箱
const createEmailRes = await fetch(
  "https://your-domain.com/api/emails/generate",
  {
    method: "POST",
    headers: {
      "X-API-Key": "YOUR_API_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "test",
      expiryTime: 3600000,
      domain: "moemail.app",
    }),
  }
);
const { id: emailId, email } = await createEmailRes.json();

// 2. 使用该邮箱提交注册表单
await fetch("https://example.com/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password: "test123" }),
});

// 3. 自动获取验证码
const codeRes = await fetch(
  `https://your-domain.com/api/emails/${emailId}/verification-code`,
  {
    method: "POST",
    headers: {
      "X-API-Key": "YOUR_API_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fromAddress: "verify.example.com", // 可选：只查找来自该发件人的邮件
      interval: 3000, // 可选：每 3 秒轮询一次
      timeout: 60000, // 可选：60 秒超时
    }),
  }
);
const { code } = await codeRes.json();

// 4. 使用验证码完成注册
await fetch("https://example.com/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, code }),
});

console.log("注册成功！");
```

## 环境变量

本项目使用以下环境变量：

### 认证相关

- `AUTH_GITHUB_ID`: GitHub OAuth App ID
- `AUTH_GITHUB_SECRET`: GitHub OAuth App Secret
- `AUTH_SECRET`: NextAuth Secret，用来加密 session，请设置一个随机字符串

### Cloudflare 配置

- `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID
- `DATABASE_NAME`: D1 数据库名称
- `DATABASE_ID`: D1 数据库 ID (可选, 如果不填, 则会自动通过 Cloudflare API 获取)
- `KV_NAMESPACE_NAME`: Cloudflare KV namespace 名称，用于存储网站配置
- `KV_NAMESPACE_ID`: Cloudflare KV namespace ID，用于存储网站配置 （可选， 如果不填, 则会自动通过 Cloudflare API 获取）
- `CUSTOM_DOMAIN`: 网站自定义域名, 如：moemail.app (可选，如果不填，则使用 Workers 默认域名 *.workers.dev)
- `PROJECT_NAME`: Worker 名称（可选，如果不填，则为 xmail）

### Turnstile 人机验证（可选）

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Cloudflare Turnstile 站点密钥（前端使用）
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile 密钥（后端验证使用）

> 配置方法：在 [Cloudflare Dashboard](https://dash.cloudflare.com/) → 应用程序安全 → Turnstile 中创建站点，获取站点密钥和密钥。不配置时系统自动跳过人机验证。

## Github OAuth App 配置

- 登录 [Github Developer](https://github.com/settings/developers) 创建一个新的 OAuth App
- 生成一个新的 `Client ID` 和 `Client Secret`
- 设置 `Application name` 为 `<your-app-name>`
- 设置 `Homepage URL` 为 `https://<your-domain>`
- 设置 `Authorization callback URL` 为 `https://<your-domain>/api/auth/callback/github`

## 贡献

欢迎提交 Pull Request 或者 Issue 来帮助改进这个项目

## 许可证

本项目采用 [MIT](LICENSE) 许可证

## 交流

<table>
  <tr style="max-width: 360px">
    <td>
      <img src="https://pic.otaku.ren/20250309/AQADAcQxGxQjaVZ-.jpg" />
    </td>
    <td>
      <img src="https://pic.otaku.ren/20250309/AQADCMQxGxQjaVZ-.jpg" />
    </td>
  </tr>
  <tr style="max-width: 360px">
    <td>
      关注公众号，了解更多项目进展以及AI，区块链，独立开发资讯
    </td>
    <td>
      添加微信，备注 "XiYang Mail" 拉你进微信交流群
    </td>
  </tr>
</table>

## 常见问题

### 首次加载或长时间未访问时加载较慢

这是正常现象，主要原因：

- **Cloudflare Workers 冷启动**：首次访问或长时间未访问，Worker 需要启动（100-500ms）
- **D1 数据库初始化**：边缘数据库连接需要建立
- 这是所有边缘计算平台的共同特点

**优化措施**：

- 已优化数据库查询，移除冗余的 COUNT 查询
- 已添加多个数据库索引加速查询
- 冷启动后的后续访问会很快

### 如何部署数据库索引优化

本项目已添加优化的数据库索引，新部署需要运行数据库迁移：

```bash
# 生产环境
npm run db:migrate-remote

# 本地开发
npm run db:migrate-local
```

已添加的索引包括：

- emails 表：用户 ID+创建时间、用户 ID+过期时间复合索引
- messages 表：邮箱 ID+接收时间、邮箱 ID+发送时间复合索引
- card_keys 表：使用状态、过期时间索引
- temp_accounts 表：用户 ID、过期时间、活跃状态+过期时间复合索引

## 支持

如果你喜欢这个项目，欢迎给它一个 Star ⭐️
