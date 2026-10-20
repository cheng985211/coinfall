# 部署与公网联机指南

本项目是纯静态站点：没有构建步骤，没有应用服务器。部署只需要托管 `index.html`、`style.css`、`data.js`、`ai.js`、`net.js`、`game.js` 等静态文件。

联机分两条独立通道：

- **局域网 / P2P**：PeerJS 信令 + WebRTC，房间号即入口。
- **公网**：Supabase Realtime Broadcast + Presence，免费额度足够朋友局。

两者都不需要你运行游戏逻辑服务器；房主浏览器就是权威节点。

---

## 1. 本地运行

### Windows

双击 `start.bat`。

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
```

### 手动

```bash
node server.mjs
# 或
python -m http.server 8787 --bind 0.0.0.0
```

打开 <http://127.0.0.1:8787/>。

`server.mjs` 会打印所有局域网 IPv4 地址。手机与电脑连同一个 Wi-Fi，访问 `http://电脑IP:8787/`。

### 端口被占用

```powershell
$env:PORT=9000; node server.mjs
```

```bash
PORT=9000 node server.mjs
```

### 手机打不开

1. 确认同一网段（不是访客 Wi-Fi / AP 隔离）。
2. Windows 防火墙允许 Node.js 专用网络入站；或临时关闭防火墙测试。
3. 公司/学校网络可能禁止设备互访。

---

## 2. 部署到 GitHub Pages（推荐，永久免费）

### 2.1 前置

- GitHub 账号。
- 已安装 `git`，并登录 `gh`（可选，但最快）。

### 2.2 创建仓库并推送

在项目根目录 `coinfall/`：

```bash
git init
git add .
git commit -m "feat: Coinfall v1.0 playable release"
gh repo create coinfall --public --source=. --remote=origin --push
```

若不用 `gh`：

1. 在 GitHub 网页新建空仓库 `coinfall`（不要勾选 README）。
2. 执行：

```bash
git remote add origin https://github.com/<你的用户名>/coinfall.git
git branch -M main
git push -u origin main
```

### 2.3 开启 Pages

**方式 A：网页**

1. 仓库 → Settings → Pages。
2. Source 选 `Deploy from a branch`。
3. Branch 选 `main`，目录选 `/ (root)`。
4. Save。

**方式 B：命令行**

```bash
gh api -X POST repos/<你的用户名>/coinfall/pages \
  -f source[branch]=main \
  -f source[path]=/
```

等待 1–3 分钟，访问：

```text
https://<你的用户名>.github.io/coinfall/
```

本项目已带 `.nojekyll`，避免 Jekyll 忽略以下划线开头的文件。

### 2.4 更新

```bash
git add .
git commit -m "update"
git push
```

Pages 会自动重新构建。

### 2.5 自定义域名

1. 仓库 Settings → Pages → Custom domain，填入域名。
2. DNS 添加 `CNAME` 指向 `<用户名>.github.io`。
3. 开启 Enforce HTTPS。
4. 或在仓库根目录放 `CNAME` 文件（内容为域名）。

---

## 3. Supabase 公网联机

### 3.1 创建项目

1. 打开 <https://supabase.com/>，注册/登录。
2. New project：选一个区域（靠近玩家），设置数据库密码。
3. 等待项目初始化完成。

### 3.2 执行 SQL

1. 左侧 SQL Editor → New query。
2. 粘贴 `supabase/schema.sql` 全文。
3. Run。

也可以在本地用 psql：

```bash
psql "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" \
  -f supabase/schema.sql
```

### 3.3 确认 Realtime

Supabase 新项目默认启用 Realtime。若被关闭：

1. Database → Replication → Realtime，确认开启。
2. 本项目使用 **Broadcast + Presence**，不依赖表复制；频道本身不需要额外发布设置。
3. `coinfall_rooms` 表只用于可选的房间目录，不参与对局同步。

### 3.4 填入游戏

1. Supabase → Project Settings → API。
2. 复制：
   - Project URL：`https://xxxx.supabase.co`
   - anon public key：`eyJ...`
3. 游戏 → 设置 → 联机 → 填入两项 → 保存。
4. 房主选「公网联机」创建房间；访客用房间号 + 密码加入。

> anon key 是公开客户端凭据，可以放在前端；不要使用 `service_role` key。安全性由 RLS 保证。

### 3.5 验证

1. 两个浏览器窗口（或一台电脑 + 一部手机）打开站点。
2. 房主创建公网房间，记下 `CF-XXXX` 与密码。
3. 访客加入，房主开桌。
4. 双方各出一张牌，确认回合、血量、聊天同步。
5. 关闭房主页面，确认访客收到“房主已离开”。

### 3.6 免费额度与限制

- 免费版对 Realtime 并发连接、消息量、数据库有配额，朋友局足够；大量公开房间需升级或自建。
- 一个房间当前只支持 **1 名真人访客**；队伍其他席位由 AI 填充。
- 房间状态没有服务端清理任务；可在 SQL Editor 手动清理，或配置 pg_cron：

```sql
select cron.schedule(
  'coinfall-cleanup',
  '*/30 * * * *',
  $$delete from public.coinfall_rooms where updated_at < now() - interval '1 day'$$
);
```

---

## 4. PeerJS 局域网 / P2P

### 4.1 默认

游戏默认使用 PeerJS 公共云信令：

```text
wss://0.peerjs.com
```

- 房间号映射为固定 peer id：`coinfall-v1-<code>`。
- 密码做哈希门槛校验；不是加密。
- 握手成功后，对局数据走 WebRTC DataChannel，不经过信令服务器。

### 4.2 自建 PeerServer

公共信令被屏蔽、或想完全掌控时：

```bash
npm install -g peer
peerjs --port 9000 --key peerjs --path /myapp
```

若在公网，需放在 HTTPS 反向代理后（Nginx/Caddy）。

游戏 → 设置 → 联机：

| 字段 | 值 |
| --- | --- |
| PeerServer Host | `peer.example.com` |
| 端口 | `443`（HTTPS）或 `9000` |
| 使用 HTTPS | 打开 |

> 自建 PeerServer 只负责信令；真正的对局数据仍是 P2P。双方网络需允许 WebRTC（UDP/TCP），对称 NAT 下可能需要 TURN 服务器。PeerJS 默认仅 STUN；复杂网络下连接失败属于预期，可改用 Supabase 公网模式。

### 4.3 “局域网”为什么还需要联网？

因为首次握手需要信令服务器交换 SDP/ICE。要完全离线：

1. 自建 PeerServer 并让双方可达。
2. 在设置中填自建地址。
3. 或改用同一台设备的热点 + 本地 PeerServer。

---

## 5. 其他静态托管

任何能提供静态文件的服务都可以：

- **Cloudflare Pages**：Build command 留空，Output directory 填 `/`。
- **Netlify**：拖拽整个目录，publish directory 为根。
- **Vercel**：Framework Preset 选 Other，Build Command 留空。
- **Nginx**：

```nginx
server {
  listen 80;
  server_name coinfall.example.com;
  root /var/www/coinfall;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|png|jpg|webp|svg|woff2)$ {
    expires 7d;
    add_header Cache-Control "public";
  }
}
```

> 公网必须 HTTPS：WebRTC、语音识别、剪贴板等 API 在非安全上下文会被浏览器限制。

---

## 6. 发布前检查清单

- [ ] `index.html` 能直接打开，控制台无报错。
- [ ] 32 角色 / 150 卡 / 16 模式在游戏内数量正确。
- [ ] 标准、自由组队 4v4、五个娱乐模式各开一局。
- [ ] 手机竖屏无横向溢出，手牌可点。
- [ ] 设置保存后刷新仍生效。
- [ ] 自定义卡组保存 10 张后能开局。
- [ ] 双页面 PeerJS 能互出牌、聊天、回合同步。
- [ ] Supabase 公网双页面能加入、开局、同步。
- [ ] 没有任何真实 API Key 被提交（搜索 `sk-`）。
- [ ] `shots/`、`node_modules/` 未提交。
- [ ] README 的在线地址与实际 Pages 地址一致。
- [ ] 版权说明与 AI 生成图许可已确认。

---

## 7. 安全说明

| 项目 | 现状 | 生产建议 |
| --- | --- | --- |
| 房间密码 | 前端哈希门槛 | 服务端鉴权、限速、失败锁定 |
| Supabase anon key | 公开客户端凭据 | 严格 RLS；敏感操作走 Edge Function |
| AI Key | 浏览器 localStorage | 服务端代理，Key 不下发 |
| 对局权威 | 房主浏览器 | 排位赛用服务端引擎 + 回放校验 |
| 房间表写入 | 匿名可写（演示） | 关闭写入或改用 Edge Function |
| XSS | 用户文本经 `esc()` 转义 | 持续审计所有 `innerHTML` 拼接 |

---

## 8. 回滚

GitHub Pages：

```bash
git revert <commit>
git push
```

或仓库 Actions / Deployments 里重新部署上一个提交。

Supabase：

- 对局数据不落库，回滚前端即可。
- 房间表可 `drop table public.coinfall_rooms;` 后重新执行 schema。

---

## 9. 常见故障

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 页面空白 | 脚本 404 / 路径错误 | 确认 6 个 JS/CSS 与 index.html 同目录 |
| `Peer is not defined` | CDN 被拦截 | 换网络；或自建 PeerServer 并本地托管 peerjs |
| `peer-unavailable` | 房间号错 / 房主已关 | 确认房主仍在等待，重新生成房间 |
| `network` / 信令超时 | 公共 PeerServer 不可达 | 自建 PeerServer 或改用 Supabase |
| Supabase 超时 | URL/Key 错、Realtime 未开 | 检查 Project URL、anon key、Realtime |
| 手机连不上局域网 | 防火墙 / AP 隔离 | 允许 Node 入站；换同一路由器 |
| 语音不工作 | 浏览器不支持 / 非 HTTPS | 用 Chrome/Edge；HTTPS 部署 |
| 图片/截图 404 | 未提交 `shots/` | README 图片改为在线图或提交截图 |

---

*部署完成后，把 README 里的在线地址替换成你的实际 Pages 地址。*