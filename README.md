# 许忠锦 & 李姝洁 婚礼请柬网站

## 项目结构

```
index.html          请柬主页
rsvp.html            回执问卷页
style.css            样式
script.js            滚动动画
functions/api/rsvp.js  Cloudflare Pages Function，处理问卷提交，写入 D1 数据库
schema.sql            数据库表结构
```

## 部署步骤

### 1. 推送代码到 GitHub
代码已经在这个 repo 里了。

### 2. 在 Cloudflare 创建 Pages 项目
1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com)
2. 左侧菜单 → **Workers & Pages** → **创建** → **Pages** → **连接到 Git**
3. 选择 `zhongjin-shujie-wedding` 这个 repo
4. Build 设置：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `/`
5. 点击部署，几分钟后你会拿到一个 `xxx.pages.dev` 的免费链接

> 注意：直接用本地静态服务器打开页面时，首页和回执页可以预览；但提交回执需要 Cloudflare Pages Functions 和 D1 绑定，不能只靠 `python -m http.server` 完整测试。

### 3. 创建 D1 数据库

在你的电脑上（需要先装 Node.js）：

```bash
npm install -g wrangler
wrangler login
wrangler d1 create wedding-rsvp
```

执行后会输出一个 `database_id`，记下来。

然后初始化表结构：

```bash
wrangler d1 execute wedding-rsvp --remote --file=./schema.sql
```

### 4. 把数据库绑定到 Pages 项目

1. Cloudflare Dashboard → 你的 Pages 项目 → **Settings** → **Bindings**
2. 添加 **D1 database**
3. **Variable name** 填：`WEDDING_DB`
4. **D1 database** 选择刚创建的 `wedding-rsvp`
5. 保存后，触发一次重新部署（Deployments → Retry deployment）使绑定生效

### 5. 设置查看密钥（可选，用于你自己查看回复）

1. 同样在 **Settings** → **Environment variables**
2. 新增变量：`RSVP_VIEW_KEY`，值设成一个只有你知道的字符串，比如 `xu-li-2025-secret`
3. 部署后，访问 `https://你的域名/api/rsvp?key=xu-li-2025-secret` 就能看到所有回执的 JSON 数据

> 之后如果想要更方便的表格视图（不用看 JSON），告诉我，我可以再加一个简单的查看页面。

### 6.（可选）绑定自定义域名
Pages 项目 → **Custom domains** → 添加你购买的域名，按提示配置 DNS 即可。

---

## 后续可以做的事

- [ ] 替换 `index.html` 里的图片/视频占位符为真实素材
- [ ] 调整问卷问题（在 `rsvp.html` 里改）
- [ ] 加一个简单的后台页面查看所有回执（不用看 JSON）
- [ ] 绑定自定义域名
