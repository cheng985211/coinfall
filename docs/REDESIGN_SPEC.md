# 命途回廊 COINFALL · 大改造规格书 v2.0（唯一事实源）

> 本文件是本次"全面重绘 + 动效 + 硬币皮肤系统 + 真人旁白 + 新英雄新卡 + 知识库完善"改造的**唯一事实源**。
> 所有并行子代理必须以本文件为基准：内容、命名、路径、效果数值、台词文本一律以本文件为准，不得自行发明。
> 任何与现有代码冲突之处，按"规格书 > 现有代码"处理；规格书未覆盖处，遵循现有架构与 docs/ 下既有文档。
> 游戏必须保持：纯 HTML/CSS/JS、零构建、file:// 双击可玩、node server.mjs:8787 可玩、tests 通过。

---

## 0. 总验收清单（全部完成才允许收尾）

- [ ] UI 重构为"三国杀式"战斗画面（中央牌桌 + 双方英雄牌 + 底部手牌区），整体简化、去掉繁琐元素
- [ ] 所有主要视觉（背景/立绘/卡面/硬币/世界卡/知识库装饰）使用真实素材，CSS 只做布局与动效，**不再用纯 CSS 程序化美术当主视觉**
- [ ] 动效：出牌、抛币、伤害/治疗/护盾/灼烧/吸血/夺盾/胜利/失败等有像样动画与特效
- [ ] 硬币皮肤 10 套（6 旧 + 4 新），每套独立：正反面图片、抛币粒子/光效、抛币音色、机制特性；游戏内可选并持久化
- [ ] 旁白人声 5 套（男中音庄家/御姐/热血少年/苍老长者/神秘女声），每套 6 句关键旁白，设置内可切换；战斗播报与剧情朗读真人声文件优先、TTS 兜底
- [ ] 新增 8 名英雄（new-01..new-08）与 24 张新卡；已有英雄/卡牌机制差异化重做（至少 12 名英雄机制调整、至少 30 张卡效果重做）
- [ ] 知识库(codex) 五个分类**全部填充完整**（独立验收项）：世界观总纲/八域设定/英雄背景/卡牌来历/玩法规则；40 名英雄人人有传记、174 张卡（150+24）张张有来历；名字/称号/技能/背景/卡牌/世界观互相印证、自洽
- [ ] 战斗 BGM（8 世界 + 菜单）、全套 SFX（14 项）、8 世界战斗背景 + 菜单 + 知识库背景
- [ ] `npm run test:engine`、`test:fun`、`test:ui` 通过（引擎语义变更时同步更新断言）
- [ ] Playwright 桌面 + 移动真机验收无横向溢出/无页面错误
- [ ] artifact-preview 渲染主界面/战斗/知识库/硬币选择/设置截图核对
- [ ] present_files 交付（本地文件 + 启动说明）

---

## 1. 素材落位规范（所有子代理必须遵守）

| 素材 | 路径 | 格式 |
| --- | --- | --- |
| 英雄立绘 | `assets/art/portraits/{角色id}.webp` | webp（由生成图转码） |
| 卡面 | `assets/art/cards/{卡牌id}.png` | png |
| 硬币正/反面 | `assets/art/coins/{skin}-front.jpg` / `assets/art/coins/{skin}-back.jpg` | jpg |
| 背景 | `assets/art/bg/{主题id}.jpg`（菜单 `menu.jpg`、知识库 `codex.jpg`） | jpg |
| 配乐 | `assets/audio/bgm/{主题id}.wav`（菜单 `menu.wav`） | wav |
| 音效 | `assets/audio/sfx/{name}.wav`（name ∈ SFX_NAMES 列表） | wav |
| 角色语音 | `assets/audio/voice/char/{角色id}-{enter\|attack\|win\|lose}.wav` | wav |
| 旁白语音包 | `assets/audio/voice/narrator/{pack}-{line}.wav` | wav |
| 剧情语音 | `assets/audio/voice/story/{key}.wav` | wav |

- 生成工具：图片用 `image_gen`/`image_edit`（**先读 doubao-creative-design skill 走完交付流程**）；音频用 `text_to_audio_plus`（**先读 seed-audio skill**）。
- 转码/压缩：先读 `byted-mediakit-image` skill（webp/jpg 转换、缩放）。卡面统一约 512×712 竖版安全区；立绘约 512×768；硬币正反面各 512×512；背景 16:9 约 1600×900。
- **复用优先**：`generated-images/` 已有大量候选（`ani-01..04`、`neo-01..04`、`wa-01..04`、`wes-01..04`、`w_cth01..04`、`w_cul01..04`、`w_fan01..04`、`w_stm01..04`、`attack-001..027`、顶层 6 张三国杀方向探索图），凡可复用先复用，缺口再生成，避免重复劳动。
- 每个子代理完成后自检：目标文件确实存在、可解码（PIL/`identify` 或浏览器加载）、尺寸/格式符合，并在回执中列出绝对路径清单。

---

## 2. 硬币皮肤（10 套）

### 2.1 皮肤清单与特性（机制由代码整合代理在引擎实现）

| skin id | 名称 | 特性（机械加成） |
| --- | --- | --- |
| bronze | 青铜 | 平衡：无加成 |
| silver | 白银 | 防御倾向：每回合第一次抛币**失败**时获得 1 护盾 |
| gold | 黄金 | 财运：抛币**成功**后，有 15% 概率免费再抛一次（该次结果必须接受） |
| amethyst | 紫晶 | 抽牌倾向：每回合第一次抛币**成功**时抽 1 张牌 |
| jade | 翡翠 | 护佑：开局获得 1 护盾；每回合第一次抛币**成功**时获得 1 护盾 |
| bloodmoon | 血月 | 血誓：造成的**吸血**效果数值 +1（即 lifesteal:2→3） |
| obsidian | 黑曜 | 起势：开局多抽 1 张手牌 |
| frost | 霜晶 | 霜甲：每回合第一次受到的伤害 -1（最少 1） |
| molten | 熔心 | 熔铸：每回合打出的**第一张攻击牌**伤害 +1 |
| bone | 龙骨 | 余命：每局一次，自身生命降至 1 且未死亡时，回复 1 点生命 |

- 皮肤选择界面：设置弹窗内改为"图卡式选择器"（每张皮肤显示正反面小图 + 名称 + 特性一句话），持久化到 `SETTINGS.coinSkin`（localStorage）。硬币选择同时出现在战前配置页（可选）。
- 抛币音色差异：播放 `sfx/coin.wav` 时按皮肤调整 playbackRate（bronze 1.0 / silver 1.06 / gold 1.12 / amethyst 1.04 / jade 0.96 / bloodmoon 0.9 / obsidian 0.94 / frost 1.1 / molten 0.92 / bone 0.86）。
- 抛币粒子/光效差异（fx-canvas 或 CSS filter 实现）：gold 金色星屑、silver 银白闪光、bronze 黄铜微尘、amethyst 紫晶碎光、jade 翡翠绿萤、bloodmoon 血色雾霭、obsidian 暗紫涡纹、frost 冰晶碎屑、molten 赤红火星、bone 苍白烟尘。战斗硬币落地后的 glow 颜色随皮肤变化。
- 战斗硬币、翻币弹窗硬币、首页 hero-coin 三处统一使用皮肤图片（正面 `front.jpg`、反面 `back.jpg`），CSS 仅负责 3D 翻转与动画。

### 2.2 新增 4 套皮肤图片（硬币代理负责生成）

1. `obsidian-front.jpg` / `obsidian-back.jpg`：黑曜石质感，暗紫-漆黑渐变，表面裂纹与微光，正反面各有"昭/昧"风格符号（可用中文"昭/昧"字，或因果环/逆流符号），高级暗黑风。
2. `frost-front.jpg` / `frost-back.jpg`：霜晶质感，冰蓝-透白，霜花纹路与冰棱，冷冽光晕。
3. `molten-front.jpg` / `molten-back.jpg`：熔金质感，赤红-橙金，流动熔岩纹与火星，灼热光晕。
4. `bone-front.jpg` / `bone-back.jpg`：骨白质感，米白-灰褐，骨纹与刻痕，古老庄严。

（既有 6 套 gold/silver/bronze/jade/amethyst/bloodmoon 图片已存在 `assets/art/coins/`，如观感不佳可重制，但文件名不变。）

---

## 3. 旁白人声（5 套 × 6 句）

### 3.1 语音包契约

文件：`assets/audio/voice/narrator/{pack}-{line}.wav`

| pack id | 名称 | 人设 |
| --- | --- | --- |
| house | 庄家·男中音 | 低沉磁性、从容不迫、略带戏谑的中年男声 |
| mistress | 御姐·魅影 | 慵懒华丽、气场强大的成熟女声 |
| youth | 少年·热血 | 明亮有冲劲的青少年男声 |
| elder | 老者·守夜人 | 沙哑沧桑、慢而稳的老者声音 |
| mystic | 神秘女声·回声 | 空灵、带混响与距离感的神秘女声 |

| line key | 用途 | 各包同一句文案（人设化演绎） |
| --- | --- | --- |
| open | 开场白（入席/主页进入） | "命途回廊，已为你开桌。带好你的三张手牌，别回头。" |
| coin | 抛币瞬间 | "硬币离手了。昭面成，昧面败——命运，开始说话。" |
| win | 本局胜利 | "这一局，故事站在你这边。回廊，记你一页。" |
| lose | 本局败北 | "硬币落向了另一边。回廊会记住你——以及你欠下的那一页。" |
| story | 章节转折（剧情开场） | "终章熔炉已经点火。八域的结局，正在被称量。" |
| end | 终局/结算 | "无论落在哪一面，回廊都不会真正关门。因为还有人，敢抛硬币。" |

- 每个 pack 的 6 句文案**按各自人设演绎**（同一句文案，不同音色/语气/断句），情绪饱满的中文。
- 播放规则（代码整合代理实现）：设置中可切换 `SETTINGS.voicePack`（默认 house，含"系统 TTS"回退项）；开场白/抛币播报/胜负播报/剧情章节开场优先播放对应 pack 的 wav，缺失时回退 TTS（voice-lines.js 提供文本）。
- 另外生成剧情专用语音（庄家口吻，默认用 house 音色）：
  - `story/ch1-open.wav` "黄铜弥撒——齿轮停摆的那一刻，账就开始算了。"
  - `story/ch2-open.wav` "无声书页——这里没有声音，只有被撕掉的结局。"
  - `story/ch3-open.wav` "庄家登场。所有故事，都该有唯一的终章。"
  - `story/boss-in.wav` "审判开始。硬币，由我来抛。"
  - `story/end-mercy.wav` "你赢了。八域保留各自不完美的结局。"
  - `story/end-house.wav` "庄家收走了所有分支。世界，归于静止。"
  - `story/end-edge.wav` "你把硬币立起来了。没有人知道它会落向哪边。"

### 3.2 新英雄角色语音（8 名 × 4 场景 = 32 条 wav）

文件：`assets/audio/voice/char/{id}-{enter|attack|win|lose}.wav`，文案见 §5 每名英雄的 `voice` 字段，按人设情绪饱满演绎。

---

## 4. 背景 / 音乐 / 音效清单

### 4.1 背景图（背景代理负责）

| 文件 | 内容 |
| --- | --- |
| `assets/art/bg/menu.jpg` | 主页背景：回廊赌场大厅，暗金与墨黑，巨幅双面硬币挂饰，牌桌剪影，电影级纵深（如现有不佳则重制，文件名不变） |
| `assets/art/bg/battle-bg.jpg` | 通用战斗背景：中央牌桌俯视/斜视构图，暗色织物桌面 + 两侧座位剪影，留出 UI 安全区（作为战斗页兜底背景） |
| `assets/art/bg/abyss.jpg` | 克苏鲁·沉钟海战斗背景（如现有不佳可重制） |
| `assets/art/bg/steam.jpg` | 蒸汽朋克·黄铜穹顶：齿轮穹顶、蒸汽管道、暖金灯光 |
| `assets/art/bg/cultivation.jpg` | 修仙·九霄云海：云海、飞剑、青玉宫殿、留白 |
| `assets/art/bg/fantasy.jpg` | 西式奇幻·圣誓原野：哥特圣殿、彩窗、龙翼剪影 |
| `assets/art/bg/neon.jpg` | 未来武侠·霓虹江湖：雨夜霓虹、义体剪影、全息汉字 |
| `assets/art/bg/wa.jpg` | 日式和风·百鬼灯町：朱红鸟居、夜樱、纸灯 |
| `assets/art/bg/west.jpg` | 西部牛仔·无名边境：荒原落日、铁轨、酒馆 |
| `assets/art/bg/anime.jpg` | 经典动漫/小说·万象书脊：星辰书页、逆光、高饱和 |
| `assets/art/bg/codex.jpg` | 知识库背景：图书馆/档案室，暖色书架与悬浮书页，静谧庄严 |

- 战斗页按所选主题切换 `bg/{theme}.jpg`；知识库页用 `codex.jpg`；主页用 `menu.jpg`。8 世界战斗背景要求**暗部足够（深色区占比大）**，保证 UI 可读性。

### 4.2 BGM（音频代理负责，`text_to_audio_plus` 生成）

| 文件 | 氛围 |
| --- | --- |
| `assets/audio/bgm/menu.wav` | 回廊大厅：神秘、循环、约 24–30s 无缝感 |
| `assets/audio/bgm/abyss.wav` | 沉钟海：低频钟鸣、水底回声、压抑 |
| `assets/audio/bgm/steam.wav` | 黄铜穹顶：机械节拍、蒸汽脉冲、工业华尔兹感 |
| `assets/audio/bgm/cultivation.wav` | 九霄云海：空灵古筝/笛韵感、飘渺 |
| `assets/audio/bgm/fantasy.wav` | 圣誓原野：史诗弦乐、号角、庄严 |
| `assets/audio/bgm/neon.wav` | 霓虹江湖：合成器、鼓点、赛博夜雨 |
| `assets/audio/bgm/wa.wav` | 百鬼灯町：三味线/太鼓感、和风妖异 |
| `assets/audio/bgm/west.wav` | 无名边境：口琴/吉他、荒野风滚草、孤寂 |
| `assets/audio/bgm/anime.wav` | 万象书脊：热血动漫 OP 感、明亮动感 |

均为纯音乐/氛围（无人声歌词），时长 20–40s，情绪与主题吻合。

### 4.3 SFX（音频代理负责）

`assets/audio/sfx/` 下：click / card(已有，可重制) / coin / success / fail / damage / heal / shield / active / victory / defeat / chat / draw / play —— 共 14 项全部落位为 wav（短促、清脆、有质感，中文卡牌游戏风格）。

---

## 5. 英雄表（40 名）

> 32 名既有英雄（cth-01..ani-04）：**id 一律不变**；名字/称号/被动/主动/传记允许按"名字—背景—技能互相吻合"原则由代码整合代理微调（保留原世界观归属）。至少 12 名既有英雄须做机制调整（换新被动 / 主动技重设计 / 数值重平衡），具体由代码整合代理决定并在 data.js 落地，但必须保持可玩性与测试通过。
> 8 名新英雄（new-01..new-08）如下，**全链路**：data.js → 引擎 → 图鉴/战斗 UI → 知识库 → 语音行 → 立绘 → 卡面。

### 已知遗留问题（代码整合代理必须修复）
- `data.js` new-01 引用的被动 `onFlipLoseDraw` **未在 PASSIVES 定义**（会导致数据加载崩溃），需补定义 + 引擎钩子。
- new-01..new-04 尚未有立绘/语音/知识库条目；new-01..04 的 active 效果键（bless2/stealShield/lifesteal/hpBurn）已在 game.js 实现，但需全链路核对。

### 8 名新英雄完整设计

**new-01 赌坊老板·钟离**（west / 赌徒）【已存在于 data.js，保持】
- 称号：回廊第一庄家。被动：`onFlipLoseDraw` 昧面进账——每回合第一次抛币失败时抽 1 张牌。主动「通杀局」×2：{bless2:1, dmg:1}。
- bio（知识库长版）：钟离在回廊开了七家赌坊，每家都赔过钱，但他从来没输过。他从不押注结果，只押注"别人敢不敢跟注"……
- voice: enter「坐下了，就别想空手走。」attack「跟，还是不跟？」win「通杀。」lose「这局……算你赢。」

**new-02 铸币师·欧泊**（steam / 功能）【已存在于 data.js，保持】
- 称号：回廊铸币师。被动：`startShield` 预护。主动「熔铸偷盾」×2：{stealShield:1, heal:1}。
- voice: enter「你的盾，现在归我了。」attack「熔了它。」win「成色不错。」lose「铸废了……」

**new-03 血祭司·卡尔娜**（wa / 输出）【已存在于 data.js，保持】
- 称号：血月祭司。被动：`onFlipWinShield` 昭面回响。主动「血月献祭」×2：{lifesteal:2, hpBurn:1}。
- voice: enter「用血来换，最公平。」attack「血月，见证。」win「祭品收下了。」lose「血……流干了。」

**new-04 逆命者·零**（abyss / 赌徒）【已存在于 data.js，保持】
- 称号：拒绝结局的人。被动：`onFlipWinDraw` 窥隙。主动「重写命运」×1：{draw:2, discard:1}。
- voice: enter「这个结局，我不同意。」attack「改写。」win「命运，改好了。」lose「结局……还是落定了。」

**new-05 义体狂徒·断码**（neon / 输出）
- 称号：过载的义体。被动：`bloodPrice` 血价——自身每受到 1 点伤害，本回合下一次造成的伤害 +1（可叠加）。
- 主动「义体过载」×2：{dmg:3, selfDmg:1}，quote「疼？疼就对了。」
- bio：断码全身 80% 是黑市二手义体。他把疼痛当作电量表：伤得越重，回路越亮。医生说他的身体撑不过下个雨季，他把"下个雨季"赌成了纹身。
- temper：暴躁、逞强、把示弱当犯罪。
- quote：「义体过热之前，没人能让我停下。」
- voice: enter「过载，启动。」attack「烧穿你！」win「电量，还够。」lose「回路……熔断了。」

**new-06 灰誓者·科林**（fantasy / 防御）
- 称号：被龙遗忘的圣骑士。被动：`grimHarvest` 收割——每当任意角色（含敌方）阵亡时，回复 2 点生命。
- 主动「誓约壁垒」×2：{shield:2, guard:1}，quote「我的誓言，就是你的盾。」
- bio：科林的骑士团发誓守护圣誓原野上最后一条龙，可龙在百年前就忘了他们。誓言生锈，骑士却还在站岗。他把每一条誓言刻在盾牌上，直到盾牌再容不下一道刻痕。
- temper：沉稳、固执、把"背誓"看作比死亡更重的事。
- quote：「誓言会生锈，但锈也是一种守护。」
- voice: enter「以誓约之名，列阵。」attack「此盾，不退。」win「誓言，兑现。」lose「誓约……碎了。」

**new-07 织梦者·三叶**（anime / 功能）
- 称号：三千年的连载作者。被动：`luckySeven` 幸运转——回合结束时，若本回合未打出技能卡，抽 1 张牌。
- 主动「强行续更」×2：{draw:2, oppDraw:1}，quote「断更的代价，你自己想清楚。」
- bio：三叶的小说连载了三千年，是万象书脊最古老的连载。读者不让她完结，她也不敢完结——因为一旦打出"全剧终"，她这个角色就会从书脊上消失。她把伏笔当武器，把催更当民意。
- temper：温柔、爱唠叨、用"这章先写到这"逃避所有正面冲突。
- quote：「主角光环不是我的，是我的读者的。」
- voice: enter「下一章，由我写。」attack「伏笔，回收！」win「这章，圆满。」lose「待续……下回分解。」

**new-08 赌命枪手·罗珊**（west / 赌徒）
- 称号：左轮上的赌徒。被动：`highRoller` 狂注——每回合第一次抛币成功后，本回合下一次造成的伤害 +1。
- 主动「左轮审判」×2：{dmg:2, draw:1}，quote「扳机扣下去之前，人人平等。」
- bio：罗珊的左轮只有一发子弹，其余五格装的全是赌注。她相信命运就该一次性清算：赢家拿走一切，输家连遗言都省了。她在无名边境开了间赌命酒馆，门口写着"生死自负，概不赊账"。
- temper：潇洒、冷幽默、极度尊重"认赌服输"的人。
- quote：「子弹和硬币，我分不清哪个更快。」
- voice: enter「下注吧，命运。」attack「左轮，上膛。」win「庄家通吃。」lose「这发……是空的。」

### 新被动定义（引擎新增，PASSIVES 注册）
```js
bloodPrice:  { name: '血价',  desc: '自身每受到 1 点伤害，本回合下一次造成的伤害 +1（可叠加）。' }
grimHarvest: { name: '收割',  desc: '每当任意角色阵亡时，回复 2 点生命。' }
luckySeven:  { name: '幸运转', desc: '回合结束时，若本回合未打出技能卡，抽 1 张牌。' }
highRoller:  { name: '狂注',  desc: '每回合第一次抛币成功后，本回合下一次造成的伤害 +1。' }
onFlipLoseDraw: { name: '昧面进账', desc: '每回合第一次抛币失败时，抽 1 张牌。' }
```

---

## 6. 新卡（24 张）与新机制

### 6.1 新效果键（引擎新增，含回合钩子）
- `power` 蓄力：本回合下一次造成的伤害 +1（可叠加，回合结束清除）。
- `weak` 虚弱：目标（对手）下回合造成的伤害 -1（回合开始清除）。
- `guard` 坚守：获得"本回合受到的第一次伤害 -1（最少 1）"状态。
- `reflect` 反射：获得"本回合受到第一次伤害时，对来源造成等量伤害"状态。
- `energize` 振奋：下回合可额外打出 1 张技能卡（与 maxCards 叠加，回合结束清除）。
- 全部要在：`effectText` 文案、`ai.js` 效果估值、结算引擎、回合钩子、log/播报文案中落地。

### 6.2 组合机制（新）
- `combo`：卡牌可带 `combo: 'attack'|'defense'|'control'|'risk'|'style'`——若本回合已打出过该类别卡牌，**正面效果额外 +1 伤害（攻击向）或 +1 抽牌（功能向）**（具体按卡面说明）。引擎在 reveal 结算时判断。

### 6.3 新卡清单（代码整合代理加入 data.js，id 顺延）

**attack（+4）**
| id | 名 | 风格 | 正面 | 反面 |
| --- | --- | --- | --- | --- |
| attack-031 | 过载铁拳 | neon | {dmg:2, power:1} | {selfDmg:1} |
| attack-032 | 裂誓之刃 | fantasy | {dmg:2, weak:1} | {selfDmg:1} |
| attack-033 | 断更预告 | anime | {dmg:1, draw:2} | {oppDraw:1} |
| attack-034 | 左轮审判 | west | {dmg:2, draw:1} | {selfDmg:2} |

**defense（+4）**
| id | 名 | 风格 | 正面 | 反面 |
| --- | --- | --- | --- | --- |
| defense-031 | 义体冷却 | neon | {heal:2, guard:1} | {selfDiscard:1} |
| defense-032 | 誓约壁垒 | fantasy | {shield:2, guard:1} | {selfDmg:1} |
| defense-033 | 主角休息日 | anime | {heal:1, energize:1} | {oppDraw:1} |
| defense-034 | 金库铁门 | west | {shield:1, reflect:1} | {oppHeal:1} |

**control（+4）**
| id | 名 | 风格 | 正面 | 反面 |
| --- | --- | --- | --- | --- |
| control-031 | 病毒注入 | neon | {seal:1, weak:1} | {selfDmg:1} |
| control-032 | 圣印封魔 | fantasy | {choke:1, discard:1} | {oppDraw:1} |
| control-033 | 改稿通知 | anime | {draw:2, discard:1} | {selfDiscard:1} |
| control-034 | 收缴枪械 | west | {strip:1, choke:1} | {selfDmg:1} |

**risk（+4）**
| id | 名 | 风格 | 正面 | 反面 |
| --- | --- | --- | --- | --- |
| risk-031 | 赛博轮盘 | neon | {dmg:2, draw:2} | {selfDmg:2, oppDraw:1} |
| risk-032 | 背誓之赌 | fantasy | {dmg:3, shield:1} | {selfDmg:2, oppShield:1} |
| risk-033 | 剧情暴走 | anime | {dmg:2, heal:2} | {selfDmg:2, oppHeal:1} |
| risk-034 | 亡命加注 | west | {dmg:3, power:1} | {selfDmg:3} |

**style（+8，新英雄签名卡）**
| id | 名 | 风格 | 正面 | 反面 |
| --- | --- | --- | --- | --- |
| style-031 | 庄家之眼 | west | {draw:2, bless:1} | {selfDiscard:2} |
| style-032 | 铸币秘术 | steam | {stealShield:1, draw:1} | {oppDraw:1, selfDiscard:1} |
| style-033 | 血月祈祷 | wa | {lifesteal:2, hpBurn:1} | {selfDmg:2} |
| style-034 | 逆写悖论 | abyss | {bless2:1, dmg:1} | {selfDmg:2, oppDraw:1} |
| style-035 | 义体暴走 | neon | {dmg:3, power:1} | {selfDmg:2} |
| style-036 | 灰誓 | fantasy | {shield:2, guard:1, heal:1} | {selfDiscard:1, oppDraw:1} |
| style-037 | 终章草稿 | anime | {draw:3} | {selfDiscard:2} |
| style-038 | 亡命轮盘 | west | {dmg:2, draw:1, bless:1} | {selfDmg:2, selfDiscard:1} |

- 新卡风格归属与世界观/英雄呼应；稀有度按既有规律分配（common/rare/epic/legendary 循环）。
- 卡面：卡牌代理为上述 24 张生成 png（`assets/art/cards/{id}.png`），风格沿用现有"暗黑奇幻集换式卡牌"方向，突出各自世界意象。
- 每张新卡在知识库"卡牌来历"中要有来历文案（内容代理负责），与 §5 英雄故事链呼应。

### 6.4 既有卡牌重做要求（代码整合代理）
- 至少 30 张既有卡改用新效果键或差异化效果（可引入 combo、power/weak/guard/reflect/energize、lifesteal/hpBurn/stealShield/bless2 组合），避免"换汤不换药"；重做时保持名称与世界观不冲突，并在知识库卡牌来历中同步。
- 至少 12 名既有英雄机制调整（换/加新被动、主动技重设计、数值调整其一即可）。

---

## 7. 知识库（codex）契约

### 7.1 数据文件
- 内容代理产出 **`assets/codex-data.js`**（IIFE，挂 `root.CF_CODEX`），纯数据、无 DOM 依赖、UTF-8（注意：Windows 下写文件用 UTF-8 编码，避免乱码）。
- 结构：
```js
root.CF_CODEX = {
  world: { title, lead, premise, laws:[{title,text}], factions:[{name,mark,text}], timeline:[{era,text}], glossary:[{term,text}], endings:[{name,text}] },
  realms: { '<styleId>': { overview, geography, factions, crisis, loreNotes:[...], heroes:[heroId...] } },  // 8 域全填
  heroes: { '<heroId>': { bio, story, nameOrigin, skillOrigin, relations, quote } },  // 40 名全填（bio 为 1-2 句短版，与 data.js bio 对齐）
  cards: { '<cardId>': { origin, echo } },  // 174 张全填（150 既有 + 24 新卡）
  rules: { intro, win, turnFlow:[...], coinRules:[...], skins:[{id,name,trait}], statusEffects:[{name,desc}], modes:[...], glossary:[...], tips:[...] }
};
```
- 要求：
  1. 五分类**全部填充**，不得留空占位；内容互相印证（英雄名/称号/技能/背景 ↔ 卡牌来历 ↔ 八域设定 ↔ 世界观总纲 ↔ 玩法规则）。
  2. 每名英雄：`bio` 短版（与 data.js bio 同句意）、`story` 长篇传记（200–400 字）、`nameOrigin`（名字/称号来历）、`skillOrigin`（技能名与机制来历）、`relations`（与其他英雄/势力/世界的关联）、`quote`（名言）。
  3. 每张卡：`origin`（60–150 字来历，与所属世界/相关英雄故事呼应）、`echo`（一句话点出它与哪条故事链呼应）。
  4. `rules` 必须覆盖：胜利条件、回合流程、硬币机制、**硬币皮肤特性表（§2.1 全 10 套）**、状态效果表（含新效果键 power/weak/guard/reflect/energize + 旧效果全量）、模式表（16 模式一句话）、术语表、新手提示。
  5. 内容基调：延续现有世界观（命途回廊/双面律/逆写权/八域/无主铸币局/庄家/守夜人等），不得推翻既有设定，只做扩充与自洽。
- 内容代理需先读 `data.js`（英雄/卡/世界现状）与本文档 §5/§6，保证条目与最终数据一致。

### 7.2 UI 接入（代码整合代理负责）
- index.html 已含 codex 5-tab 骨架；接入 `CF_CODEX` 渲染五分类，排版美观：
  - 世界观总纲：总纲 + 核心法则 + 势力 + 时间线 + 术语 + 结局，分区块
  - 八域设定：8 张世界卡（用 `bg/{theme}.jpg` 作卡头背景图 + 世界观色）
  - 英雄背景：40 张英雄卡（立绘缩略图 + 名称/称号/角色定位 + 短 bio），点击展开长传记/名字来历/技能来历/关系
  - 卡牌来历：174 张卡（卡面缩略图 + 名称 + 类别 + 短来历），可按分类/风格筛选，点击展开 origin/echo
  - 玩法规则：完整规则书（§7.1 rules 渲染）
- 知识库背景用 `bg/codex.jpg`，装饰用真实素材，不用纯 CSS 美术。

---

## 8. UI 重构（三国杀式战斗画面）

- 战斗布局目标（桌面 ≥1024px）：
  - 顶部：敌方区域——每名敌方玩家一张"英雄牌"（立绘竖卡 + 名称 + HP/护盾 + 状态徽章），横向排列
  - 中央：牌桌/竞技区——主题战斗背景 + 抛币区（大硬币 + 判定横幅）+ 行动按钮（打出/主动技/结束回合）
  - 底部：我方区域（英雄牌，样式与敌方一致但镜像）+ 手牌区（横排卡面，选中上浮）
  - 右侧（可选收窄）：战术频道/战报（可折叠，战斗时默认收起以简化画面）
- 简化原则：去掉无信息量的装饰层；信息密度下降；重点突出"硬币、手牌、血量"。
- 移动端（≤640px）：纵向堆叠：敌方英雄牌(横条) → 中央抛币区 → 我方英雄牌 → 手牌；手牌可横滑。
- 素材化：战斗背景、英雄立绘、卡面、硬币全用真实素材；血条/护盾/徽章等 HUD 允许 CSS（属于 UI 组件而非"美术"）。
- 图鉴/八域/知识库/设置等页面同样清理纯 CSS 装饰，主视觉素材化。
- 动效要求（fx-canvas 粒子体系 + DOM 动画）：
  - 出牌：手牌飞向桌面中心 + 卡面放大微光
  - 抛币：硬币 3D 翻转 + 皮肤粒子 + 判定光效（昭面金 / 昧面红）
  - 伤害：目标英雄牌红闪 + 伤害数字上浮；治疗绿光 + 数字；护盾蓝环；灼烧橙色火焰；吸血暗红回吸；夺盾灰白破碎
  - 阵亡：英雄牌灰度 + 消散动效；胜利/失败横幅
  - 全部尊重 `SETTINGS.reducedMotion`
- 设置弹窗改造：硬币皮肤图卡选择器（§2.1）、旁白音色选择（5 包 + 系统 TTS）、其余保持。

---

## 9. 代码整合代理硬性约束

1. **唯一写权限**：`data.js`、`game.js`、`index.html`、`style.css`、`assets/voice-lines.js`、`tests/` 下测试文件——只有代码整合代理可写。其他子代理严禁触碰上述文件。
2. 全链路同步：英雄/卡改动必须同时覆盖 data.js → game.js → 图鉴/战斗 UI → 知识库（读 CF_CODEX）→ voice-lines.js → 立绘/卡面（引用路径）。
3. 新文件接入：index.html 增加 `<script src="assets/codex-data.js"></script>`（在 data.js 之后）。
4. 引擎语义改动时同步更新 `tests/test-engine.mjs`、`tests/test-fun.mjs`、`tests/test-ui2.mjs` 断言；**必须保持 232 局引擎模拟可跑完、fun/ui 全绿**。若 `assets/codex-data.js` 尚未就绪（另一代理并行生成中），每 30s 轮询最多 30 分钟；仍缺失则用最小内联兜底内容保证 UI 不崩并在回执中如实报告。
5. 修复 §5 已知遗留问题（onFlipLoseDraw 等）。
6. `ai.js`：新效果键/新被动须加入 AI 估值，避免 AI 变蠢。
7. 联机（net.js / PeerJS / Supabase）与 AI 同注者功能不得破坏；`file://` 与 server 双模式可玩。
8. 交付前自查：`node server.mjs` 起服后 Playwright 快速过一遍主页→设置→标准对战→抛币流程无报错。

---

## 10. 测试与验收流程（整合代理之后执行）

1. `npm run test:engine`（Node 引擎模拟，要求全绿）
2. `npm run test:fun`（Playwright，需先 `node server.mjs` 在 8787）
3. `npm run test:ui`（Playwright 桌面+移动布局）
4. 用 browser-use-automation skill 对成品做一次真人视角验收（进游戏、开一局、切皮肤、换音色、开知识库翻阅）
5. artifact-preview 渲染截图核对（主页/战斗/知识库/硬币选择/设置）
6. 汇总交付：present_files（本地文件 + 启动说明）

---

## 11. 分工矩阵（子代理范围）

| 代理 | 产出（绝对路径落位） | 禁止触碰 |
| --- | --- | --- |
| 硬币代理 | assets/art/coins/{obsidian,frost,molten,bone}-{front,back}.jpg（8 张，可顺带重制旧 6 套） | 其他一切 |
| 旁白代理 | assets/audio/voice/narrator/{house,mistress,youth,elder,mystic}-{open,coin,win,lose,story,end}.wav（30）+ assets/audio/voice/story/{7 个 key}.wav | 其他一切 |
| 角色语音代理 | assets/audio/voice/char/{new-01..new-08}-{enter,attack,win,lose}.wav（32） | 其他一切 |
| 音乐音效代理 | assets/audio/bgm/{menu,abyss,steam,cultivation,fantasy,neon,wa,west,anime}.wav（9）+ assets/audio/sfx/{14 项}.wav | 其他一切 |
| 背景代理 | assets/art/bg/{menu,battle-bg,abyss,steam,cultivation,fantasy,neon,wa,west,anime,codex}.jpg（11 张） | 其他一切 |
| 立绘代理 | assets/art/portraits/{new-01..new-08}.webp（8 张） | 其他一切 |
| 卡面代理 | assets/art/cards/{attack-031..034,defense-031..034,control-031..034,risk-031..034,style-031..038}.png（24 张） | 其他一切 |
| 内容代理 | assets/codex-data.js（知识库全部文本） | data.js/game.js/index.html/style.css/voice-lines.js/tests |
| 代码整合代理 | data.js、game.js、index.html、style.css、assets/voice-lines.js、ai.js、net.js、tests/ 更新（含 §12：AI 密钥默认配置、联机零配置主推 PeerJS、Supabase 降级折叠、README/docs 模型名与版本 v2.0） | 不生成素材文件（只引用）；不推送 git |

> 所有代理回执必须包含：产出文件绝对路径清单 + 自检结果（文件存在/可解码/尺寸格式）。素材代理若复用 generated-images 候选，需说明来源路径。

---

## 12. 新增任务（MainAgent 实测确认，并入代码整合代理统一实现）

### 12.1 AI 密钥接入（已实测：接口/密钥/CORS 全部有效）
- `ai.js` 默认配置改为：
  - `baseUrl = 'https://maas.qianwenaiapi.com/compatible-mode/v1'`
  - `model = 'deepseek-v4.1-flash-1017'`（旧默认 `deepseek1017` 已失效）
  - `apiKey = 'sk-ws-H.PXHLLDE.6wsk.MEYCIQD8cgiyAECrPQo11SxSA1tB54ZCOWArjK-PGsMqQS4TUAIhALb8uR1K0SOMlEQL9cX42-uzYqsMNcjEwbUy8WBrHP8S'`
  - `enabled` 默认开启
- 设置→AI 接口界面默认预填以上三项；用户可改可清空（清空回退本地 AI 启发式）；保留"测试连接"按钮。
- 设置页 AI 面板顶部加**黄色警示条**："公网页面上，此密钥对访问者可见。建议在网关控制台为 Key 设置用量限额；出现异常调用时请及时轮换密钥。"
- 文档同步：README、docs/AI_GUIDE（若存在）中模型名改为 `deepseek-v4.1-flash-1017`。
- **密钥只允许出现在 ai.js 默认值与该警示文案中，不得写入其他任何文档/文件。**
- 网关 CORS 已放行 https://cheng985211.github.io，浏览器直连可用，无需代理。

### 12.2 公网联机零配置（已实测：0.peerjs.com 可达，HTTP 200）
- 联机大厅把 PeerJS 设为主推的「公网联机（零配置）」入口；UI 文案明确写"无需任何配置，公网直连，WebRTC 点对点"；房间号+密码即暗号。
- Supabase 从主流程移除：不再作为必选/默认项，降级为设置页"高级自定义"（net.js 能力保留，UI 弱化折叠，不误导用户）。
- 检查 game.js 中所有"公网联机需要先配置 Supabase"之类的阻断逻辑，确保 peer 路径不被误拦截。
- 联机异常给出清晰中文错误与重试建议。
- 保持"房主权威、访客发意图"既有架构；tests/test-online.mjs、tests/test-team-online.mjs 语义不变（跑通）。

### 12.3 部署（由 MainAgent 最终 commit+push，子代理不得推送）
- 线上站点：https://cheng985211.github.io/coinfall/（GitHub Pages 已启用，200 已验证）。
- README 写明线上地址与"零配置公网联机"说明；版本号升为 **v2.0**（data.js `version`、README、package.json description 等同步）。
- 全部改造完成并自测通过后，由代码整合代理在回执中标注"可交付"，最终提交推送与线上冒烟（tests/test-live.mjs）由 MainAgent 执行。
