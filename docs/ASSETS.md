# 资源与音频规范 · ASSETS

> 本文件说明「命途回廊 COINFALL」的**图片与音频资源目录、命名规范、触发时机、获取来源与许可证**。
> 设计原则：**文件优先，合成兜底**——存在真实素材就用素材，缺失则自动回退到游戏内置的 CSS 程序化美术与 Web Audio 合成音效，**不报错、不打断对局、不改动规则逻辑**。

---

## 1. 目录结构

```text
assets/
├─ assets.js                  # 资源清单 + 文件音频播放层（路径映射、404 回退）
├─ voice-lines.js             # 32 角色 × 4 场景台词脚本（纯文本数据）
├─ art/
│  ├─ portraits/              # 角色立绘（已就位 32 张）
│  │  └─ {角色id}.webp        #   例：cth-01.webp
│  ├─ cards/                  # 卡面插画（可选，缺省回退 CSS 卡面）
│  │  └─ {卡牌id}.webp        #   例：attack-001.webp
│  └─ bg/                     # 界面背景
│     ├─ menu.jpg             #   主界面 / 大厅背景
│     └─ {主题id}.jpg         #   各世界对战背景，例：abyss.jpg
└─ audio/
   ├─ bgm/                    # 循环背景音乐
   │  ├─ menu.wav            #   主界面
   │  └─ {主题id}.wav        #   各世界对战配乐，例：abyss.wav（缺省用程序化 BGM）
   ├─ sfx/                    # 一次性音效
   │  └─ {音效名}.wav
   └─ voice/
      ├─ char/                # 角色语音
      │  └─ {角色id}-{场景}.wav   # 场景 ∈ enter/attack/win/lose
      └─ story/               # 剧情节点语音
         └─ {节点key}.wav
```

> 音频统一使用 **`.wav`**（浏览器原生支持，无需转码）。如需更省体积，可自行转 `.mp3`/`.ogg`，并同步修改 `assets/assets.js` 里的路径后缀。

---

## 2. 命名规范（与代码一一对应）

| 类别 | 路径模板 | 取值 | 示例 |
|---|---|---|---|
| 角色立绘 | `art/portraits/{id}.webp` | 角色 id | `cth-01.webp` |
| 卡面插画 | `art/cards/{id}.webp` | 卡牌 id = `{类别}-{序号}` | `attack-001.webp` |
| 对战背景 | `art/bg/{主题}.jpg` | 主题 id（abyss/steam/cultivation/fantasy/neon/wa/west/anime） | `abyss.jpg` |
| 主背景 | `art/bg/menu.jpg` | 固定 | `menu.jpg` |
| 主配乐 | `audio/bgm/menu.wav` | 固定 | `menu.wav` |
| 主题配乐 | `audio/bgm/{主题}.wav` | 同上 | `abyss.wav` |
| 音效 | `audio/sfx/{名}.wav` | 见下表 | `card.wav` |
| 角色语音 | `audio/voice/char/{id}-{场景}.wav` | 场景 enter/attack/win/lose | `cth-01-enter.wav` |
| 剧情语音 | `audio/voice/story/{key}.wav` | 见 voice-lines.js 的 STORY | `ch1-open.wav` |

### 角色 id 对照（32 名，8 世界 × 4）

| 世界 | 前缀 | id |
|---|---|---|
| 克苏鲁/沉钟海 | cth | cth-01 ~ cth-04 |
| 蒸汽朋克/黄铜穹顶 | stm | stm-01 ~ stm-04 |
| 修仙/九霄云海 | cul | cul-01 ~ cul-04 |
| 西式奇幻/圣誓原野 | fan | fan-01 ~ fan-04 |
| 未来武侠/霓虹江湖 | neo | neo-01 ~ neo-04 |
| 日式和风/百鬼灯町 | wa | wa-01 ~ wa-04 |
| 西部牛仔/无名边境 | wes | wes-01 ~ wes-04 |
| 经典动漫/万象书脊 | ani | ani-01 ~ ani-04 |

### 卡牌 id 规则

`{类别}-{三位序号}`，类别 ∈ `attack / defense / control / risk / style`，各 30 张，序号 001–030。共 150 张。

---

## 3. 触发时机（事件 → 音频/语音）

| 游戏事件 | 触发时机 | 音效（sfx） | 语音 |
|---|---|---|---|
| 点击 UI | 按钮点击 | `click` | — |
| 抽卡 | 回合补牌 / 起手抽牌 | `card`（纸牌声） | — |
| 出牌 | 打出技能卡 | `card` | 攻击/高风险牌由出牌者喊 `attack` 台词 |
| 抛币 | 硬币抛起 | `coin` | — |
| 昭面成功 | 正面结算 | `success` | — |
| 昧面反噬 | 反面结算 | `fail` | — |
| 造成伤害 | 攻击命中 | `damage` | — |
| 治疗/护盾 | 回血/上盾 | `heal` / `shield` | — |
| 主动技 | 角色主动技 | `active` | 朗读主动技台词 |
| 角色登场 | 进入对战首屏 | — | 我方角色 `enter` 台词 |
| 角色倒下 | 生命归零 | — | 该角色 `lose` 台词 |
| 本局胜利 | 审判结束 | `victory` | 我方角色 `win` 台词 |
| 本局败北 | 审判结束 | `defeat` | 我方角色 `lose` 台词 |
| 剧情节点 | 章节开场 / Boss / 结局 | — | 朗读 STORY 对应文案（可放录音） |

**语音兜底**：若 `voice/char/{id}-{场景}.wav` 不存在，自动改用浏览器 **SpeechSynthesis** 朗读 `assets/voice-lines.js` 里的台词（中文语音包缺失时静默）。因此**所有 32×4=128 条台词开箱即发声**，录音是可选增强。

**BGM 切换**：进入主界面播放 `menu` 配乐（或程序化深渊主题）；进入对战按 `setup.theme` 播放对应主题配乐；关闭音乐开关时停止。

---

## 4. 立绘与卡面视觉规范（三国杀风格）

- **卡面比例**：竖版，约 3:4；`.fate-card` 统一宽度、圆角 7px、内阴影。
- **稀有度边框**（按 `data-rarity`）：
  - `common 普通`：钢灰细边；
  - `rare 稀有`：青蓝描边 + 微弱外晕；
  - `epic 史诗`：紫辉 + 双层内框；
  - `legendary 传说`：**鎏金烫边 + 外发光**，hover 增强。
- **角色立绘**：`object-fit: cover` 铺满头像框，底部压暗渐变以保证角标可读；左上角世界 glyph、右下角世界名作为角标徽章。
- **缺失回退**：图片 404 时 `onerror` 自动移除 `<img>`，恢复原有 CSS 程序化人像（环形符文 + 首字母 + 扫描线）。

---

## 5. 素材获取来源与许可证

> 优先选择 **MIT / CC0 / CC-BY** 授权资源。引用 CC-BY 时必须署名。

### 本仓库已内置

| 资源 | 位置 | 来源/许可 |
|---|---|---|
| 32 张角色立绘 | `art/portraits/*.webp` | 本项目按 `assets/art/prompts.json` 的提示词由图像模型生成（原创构图，不含现有 IP） |
| 主/对战背景 `menu.jpg` `abyss.jpg` | `art/bg/` | 本次由图像模型生成（原创） |
| 主配乐 `bgm/menu.wav`、出牌音 `sfx/card.wav` | `audio/` | 本次由音频模型生成（原创） |
| 程序化 BGM/音效/语音 | `game.js` 内 Web Audio / SpeechSynthesis | 代码自带，无第三方素材依赖 |

### 推荐的开源素材源（补充其余 BGM / 音效 / 卡面）

| 来源 | 地址 | 许可 | 用途建议 |
|---|---|---|---|
| Kenney | https://kenney.nl/assets | **CC0** | UI/卡片/通用游戏音效、极简配乐 |
| Freesound | https://freesound.org | 多为 CC0 / CC-BY（按文件标注） | 硬币、抽牌、伤害、胜负等具体音效 |
| OpenGameArt | https://opengameart.org | CC0 / CC-BY / GPL（按文件筛选） | 8 主题循环配乐、东方风 BGM |
| Mixkit | https://mixkit.co | 免费商用（按其条款） | 紧张/胜利/失败短配乐 |
| Kevin MacLeod (incompetech) | https://incompetech.com | **CC-BY 4.0** | 史诗/悬疑类循环 BGM（需署名） |
| Pixabay | https://pixabay.com | Pixabay Content License（近似免费） | 背景图/氛围图 |

> ⚠️ 引用前务必逐条核对该文件的实际许可：Freesound/OpenGameArt 内每个文件许可可能不同。**GPL 类资源不要混入本 MIT 仓库**，除非你愿意整体改用 GPL。CC-BY 资源请在本文件末尾「署名」段补一句 `名字 — 作品名 — CC BY 4.0`。

### 立绘/卡面自行生成规范

- 提示词模板见 `assets/art/prompts.json` 与 `ART_PROMPTS.md`。
- 统一风格词：*Chinese Three Kingdoms trading card game, painterly digital art, dark tarot composition, cinematic rim light, no text, no logo, no watermark*。
- 卡面建议尺寸 1024×1536（3:4），导出 WebP 后按第 2 节命名放入 `art/cards/`。
- **不要**在提示词中输入受版权保护的现有角色名；「经典动漫/小说」世界仅做公共母题风格化。

---

## 6. 如何新增素材（无需改代码）

1. 按第 2 节命名，把文件放进对应目录。
2. 刷新页面即可生效——`assets.js` 会自动优先加载；文件不存在时静默回退。
3. 新增角色语音：把 `{id}-{场景}.wav` 放入 `audio/voice/char/` 即覆盖 TTS。
4. 新增主题配乐：放入 `audio/bgm/{主题id}.wav`，该世界对战即自动换真配乐。
