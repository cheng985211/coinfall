# AI 接口与“同注者”配置指南

命途回廊的 AI 有两层：

1. **本地启发式 AI**：永远可用，不联网、不需要 Key。负责出牌、逆写、简单回复。
2. **远程 LLM 增强**：任意 OpenAI 兼容接口。负责更自然的指挥理解、战斗决策、嘴炮与战后总结。

远程失败会自动回退本地逻辑，不会卡住对局。

---

## 1. 最快配置（直接连模型）

1. 打开游戏 → 右上角「设置」→「AI 接口」。
2. 填写：

| 字段 | 推荐值 |
| --- | --- |
| 接口地址 | `https://maas.qianwenaiapi.com/compatible-mode/v1` |
| 模型 | `deepseek-v4.1-flash-1017` |
| API Key | 你自己的 Key |
| 超时 | `12000`（弱网可 20000） |
| 启用远程 AI | 打开 |
| 困难 AI 使用远程决策 | 可选；打开后困难 AI 会调用模型算牌 |

3. 点「测试连接」。成功会显示模型回复的“在。”。
4. 点「保存设置」。

> 游戏只会在浏览器里保存 Key 到 `localStorage`，不会上传到本项目自己的服务器（本项目没有服务器）。但浏览器会直连模型服务，Key 会出现在本机请求头里。**不要在网吧、共享电脑或公开演示机上填真实 Key。**

### 网络要求

- 模型服务必须允许浏览器跨域（CORS）。若不支持，浏览器会报 `Failed to fetch` 或 CORS 错误，请使用下一节的代理。
- 某些网络会拦截模型域名；先在浏览器新标签页访问 Base URL，确认可达。
- HTTPS 页面不能请求 HTTP 接口（混合内容）。公网部署必须使用 HTTPS 代理。

---

## 2. 推荐配置（服务端代理，Key 不下发）

项目自带一个零依赖本地代理：`tools/ai-proxy.mjs`。

### Windows PowerShell

```powershell
cd coinfall
$env:UPSTREAM_KEY="sk-你的真实Key"
node tools/ai-proxy.mjs
```

### macOS / Linux

```bash
cd coinfall
UPSTREAM_KEY=sk-你的真实Key node tools/ai-proxy.mjs
```

然后游戏设置：

| 字段 | 值 |
| --- | --- |
| 接口地址 | `http://127.0.0.1:8788/v1` |
| 模型 | `deepseek-v4.1-flash-1017` |
| API Key | `local-proxy`（代理不校验，随便填一个非空值） |

代理会转发到：

```text
https://maas.qianwenaiapi.com/compatible-mode/v1/chat/completions
```

### 公网部署代理

把同样的逻辑部署到 Cloudflare Workers / Vercel / 任意 Node 主机，设置环境变量 `UPSTREAM_KEY`，并把游戏里的 Base URL 改成：

```text
https://你的代理域名/v1
```

Cloudflare Worker 最小示例：

```js
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }
    if (req.method !== 'POST' || !new URL(req.url).pathname.endsWith('/chat/completions')) {
      return new Response('Not found', { status: 404 });
    }
    const upstream = await fetch('https://maas.qianwenaiapi.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.UPSTREAM_KEY },
      body: req.body
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors(), 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
function cors() {
  return {
    'Access-Control-Allow-Origin': 'https://你的站点域名',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}
```

> 公网代理一定要加：来源白名单、速率限制、请求体大小限制、可选登录鉴权。否则你的 Key 会变成别人的免费额度。

---

## 3. “同注者”怎么理解你的话

在战斗右侧「战术频道」输入自然语言，或点快捷指令：

- 集火对面输出
- 先保命，上盾
- 给我治疗
- 开主动技
- 过牌找机会
- 按兵不动，留着

底层解析覆盖这些意图：

| 意图 | 触发示例 |
| --- | --- |
| `attack` / `focus` | 打、集火、揍、秒、点掉 |
| `defend` | 防、盾、保命、别死 |
| `heal` | 奶、治疗、回血、救我 |
| `active` | 开技能、放大、用主动 |
| `draw` | 过牌、找牌、抽 |
| `hold` | 留着、别动、存着、等一下 |
| `holdActive` | 技能留着、先别开大 |
| `status` | 你还行吗、汇报、什么情况 |
| `praise` | 牛、漂亮、好配合 |
| `insult` | 菜、会不会玩、坑 |
| `greeting` | 你好、在吗、搭档 |

### 判断逻辑

AI 不是“收到就执行”。它会读：

- 当前血量 / 护盾 / 手牌数 / 主动技剩余次数。
- 指令目标是否合法、是否在攻击范围内。
- 自己的角色定位与性格（`temper`）。
- 对你的 `trust`（0–12）与当前 `mood`（0–100）。
- 指令是否与局势冲突，例如满血时要求治疗、没有主动技时要求开大、让赌徒“别赌”。

结果可能是：

- **接受**：执行并给出符合角色的回应。
- **打折执行**：例如“治疗可以，但我先给自己上盾”。
- **反驳**： “我倒是想奶，可这局还没人受伤。”
- **拒绝**：信任太低或指令明显送死时，带情绪拒绝。

信任会随合理指挥、称赞、共同获胜上升；反复乱指挥、辱骂、送死会下降。心情低时更容易顶嘴。

### 让 AI 更好用的写法

- 说目标：“打对面那个输出”“先杀 B2”。
- 说条件：“他血量低于 2 再开大”“你没盾就先防”。
- 说理由：“对面下回合能斩杀，先保命”。
- 一次说一件事，避免“你又奶我又开大又过牌”这种不可能指令。

---

## 4. 三档 AI 难度

| 难度 | 出牌 | 主动技 | 逆写 |
| --- | --- | --- | --- |
| 简单 | 随机 | 很少用 | 几乎随机 |
| 普通 | 看血线/护盾，带随机扰动 | 22% 概率放弃 | 失败时较常重抛 |
| 困难 | 估算收益、保留关键牌、诱导对手 | 合适时机使用 | 结合局势与 LLM |

在「设置 → AI 接口」打开“困难 AI 使用远程决策”后，困难 AI 可能调用模型做战斗选择；调用失败自动回退本地。

---

## 5. 常见问题

### `Failed to fetch`

- 接口不允许 CORS：用代理。
- HTTPS 页面请求 HTTP：换 HTTPS 代理。
- 域名被网络拦截：换网络或代理。
- Key 错误通常不是这个报错，而是 401。

### `AI 接口 401`

Key 无效、过期、余额不足，或模型服务要求不同的 Header。先在新标签页用 curl 测：

```bash
curl -X POST "https://maas.qianwenaiapi.com/compatible-mode/v1/chat/completions" \
  -H "Authorization: Bearer sk-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4.1-flash-1017","messages":[{"role":"user","content":"只回复：在。"}]}'
```

### `AI 接口 404`

Base URL 路径不对。游戏会自动补 `/chat/completions`；如果你填的地址已经以 `/chat/completions` 结尾，游戏不会重复拼接。

### 回复很慢 / 超时

- 把超时改到 20000。
- 关闭“困难 AI 使用远程决策”，只让聊天走模型。
- 换更快的模型或代理节点。

### AI 不说话

- 确认「启用远程 AI」已打开且 Key 非空。
- 本地模式没有队友时，聊天对象是对手 AI；对手 AI 只在有 AI 对手时回复。
- 浏览器 TTS 不可用只影响语音，不影响文字。

### Key 会不会被提交到 GitHub？

不会。项目没有把 Key 写进任何文件；它只存在浏览器 `localStorage`。但如果你自己改代码把 Key 写进 `ai.js` 再提交，就会泄露。用代理。

---

## 6. 开发者接口

`ai.js` 暴露 `window.CF_AI`：

```js
CF_AI.configure({ enabled: true, baseUrl, apiKey, model, remoteBattle: true });
CF_AI.apiReady();                 // 是否可用
CF_AI.remoteChat(messages, opts); // 原始 Chat Completions
CF_AI.parseCommand(text);         // 指令解析
CF_AI.chooseAction(game, player, opts);
CF_AI.chooseReroll(game, player, pending);
CF_AI.handleCommand(game, ally, commander, text, opts);
```

远程请求格式：

```json
{
  "model": "deepseek-v4.1-flash-1017",
  "messages": [{ "role": "user", "content": "..." }],
  "temperature": 0.75,
  "max_tokens": 420,
  "stream": false
}
```

任何兼容 OpenAI Chat Completions 的服务都可以接入；不要求是默认服务商。

---

*最后更新：v1.0。接口与模型价格以服务商为准。*