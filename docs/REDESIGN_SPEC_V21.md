# 命途回廊 COINFALL · v2.1 改造规格书（唯一事实源）

> 本文件是 v2.1 全部改造的唯一事实源。所有并行代理以本文件为准：命名、路径、台词、数值、文风一律照此执行。
> 冲突处理：v2.1 规格书 > v2.0 规格书 > 现有代码。游戏保持纯 HTML/CSS/JS、零构建、file:// 与 node server.mjs:8787 均可运行。
> 全部要求一次性完成，未达交付标准不得收尾。最终 commit+push 由 MainAgent 执行，任何子代理不得推送。

---

## 0. 总验收清单（全部完成才允许收尾）

- [ ] **SpeechSynthesis 全站零残留**：game.js 中所有 speak()/voice()/speechSynthesis/SpeechSynthesisUtterance/voiceTone/set-voice-uri/"系统 TTS"选项全部移除；任何播报只播 wav，缺失静默，**禁止任何 TTS 兜底**
- [ ] 技能名播报：assets/audio/voice/say/ 下 40 个词真人 wav 全部落位，放技能/结算时按词播放，缺词静默
- [ ] 5 套旁白包（narrator/ 30 条）+ 剧情语音（story/ 7 条）用"真人配音质感"prompt 重新生成；非静音（RMS 校验）抽检通过
- [ ] 设置界面：保留音色包选择器 + **试听按钮**；删除系统 TTS 选择器与 voiceTone；语音总开关保留；切换后播报点真实生效
- [ ] 知识库 codex-data.js **全量网文化重写**（44 英雄/190 卡/8 域/3 新模式/规则书），短段落、口语化、悬念钩子、对话感、爽点前置；游戏内 codex 界面美化（真实素材装饰）
- [ ] 新增 4 名英雄（new-09..new-12）：立绘、char 语音 4 条、传记、签名卡、引擎机制全链路
- [ ] 新增 16 张卡（attack/defense/control/risk-035..037、style-039..042）：专属卡面、引擎效果、图鉴/知识库同步
- [ ] 新增 3 个模式（乱序法则/轮抽赌局/双倍筹码）：引擎实现、模式列表/图鉴、测试覆盖
- [ ] UI 贴图：CSS 绘制/SVG 视觉元素全部替换为 assets/art/ui/ 真实图片（按钮/图标/边框/卡背/Logo/状态徽章/装饰），CSS 只留布局与动效
- [ ] 一键联机：单一入口，默认零配置公网 PeerJS 通道，局域网/公网同通道可用；UI 只留创建/加入+房间号/密码，其余折叠高级自定义
- [ ] 硬币动效升级：10 套皮肤专属 3D 多轴翻滚/粒子拖尾/落地弹跳震屏/昭金昧红特效/独立粒子色与音效；尊重 reducedMotion
- [ ] npm run test:engine/fun/ui 全绿；Playwright 走查零 404 零页面错误；语音抽检非静音；README 版本 v2.1；通知 MainAgent 上线

---

## 1. 语音系统大改（最高优先级）

### 1.1 删除机器女声（代码整合代理执行）
- 删除 game.js / ai.js / index.html 中：`speechSynthesis`、`SpeechSynthesisUtterance`、`speak()`、`voice()` 的 TTS 分支、`SETTINGS.voiceTone` 及其选择器 `set-voice-uri`、"系统 TTS"选项、任何 `utterance` 引用。
- `assets/assets.js` 的语音播放函数改为：文件存在则播 wav，**缺失即静默**（不再 new SpeechSynthesisUtterance 兜底）。
- 全站搜索 `speechSynthesis`（大小写不敏感）结果必须为 0。

### 1.2 技能名播报（say/ 词表，40 词）
文件：`assets/audio/voice/say/{key}.wav`（key 为下方英文/拼音名，中文文件名有 URL 兼容风险故用 key；代码中 SAY_LABELS 映射 key→中文词用于 UI/图鉴展示）。

**通用词（22）**：play 发动技能 / zhao 昭面成功 / mei 昧面反噬 / damage 伤害 / heal 治疗 / shield 护盾 / draw 抽牌 / discard 弃牌 / burn 灼烧 / drain 吸血 / steal 夺盾 / stun 眩晕 / seal 封印 / win 胜利 / lose 败北 / reroll 逆写 / power 蓄力 / weak 虚弱 / guard 坚守 / reflect 反射 / energize 振奋 / fall 阵亡

**类别/场景（6）**：attack 攻击 / defend 防御 / control 控制 / risk 风险 / style 风格 / settle 结算

**主动技名（12）**：tongsha 通杀局 / rongzhu 熔铸偷盾 / xueyue 血月献祭 / zhongxie 重写命运 / yiti 义体过载 / shiyue 誓约壁垒 / qiangxu 强行续更 / zuolun 左轮审判 / tulong 屠龙 / qiangpao 抢跑 / rongke 熔壳 / guozai 过载回响

- 全部用 text_to_audio_plus 生成：中文、短促有力、播报腔（不是唱歌不是朗读长文），2–3 秒内。
- 游戏内用法：打出技能卡后按类别播 attack/defense/control/risk/style 之一（或对应主动技名），抛币结果播 zhao/mei，结算播 win/lose 等；缺词静默。

### 1.3 活人感重生成（旁白代理执行）
- narrator/ 30 条 + story/ 7 条全部重新生成。prompt 明确："真人配音质感、自然口语、有情绪起伏与呼吸停顿、角色扮演语境"。示例写法：
  - house（男中音庄家）："35 岁低沉磁性男中音，赌场庄家，带着玩味与压迫感，自然地说：'命途回廊，已为你开桌。'"
  - mistress（御姐）："30 岁慵懒华丽的御姐声线，气场强大，尾音带笑，自然地说：'……'"
  - youth（少年）："18 岁清亮热血少年音，语速快有冲劲，自然地说：'……'"
  - elder（老者）："70 岁沙哑沧桑老者，语速慢而稳，像守夜人，自然地说：'……'"
  - mystic（神秘女声）："空灵神秘的女声，带距离感与混响，像神谕，自然地说：'……'"
- 每句 ≤12 秒、中文、WAV；生成后校验：文件存在、时长合理、非静音（RMS > 阈值，用 python wave/audioop 或 byted-mediakit-audio skill）。
- 新英雄 new-09..new-12 的 char 语音（enter/attack/win/lose 各 1）按 §3 台词生成（新英雄语音代理执行）。

### 1.4 设置界面（代码整合代理执行）
- 旁白音色包选择器保留（house/mistress/youth/elder/mystic），每项加**试听按钮**（点击播放 narrator/{pack}-open.wav）。
- 删除系统 TTS 选项与 voiceTone；语音总开关保留（关则全部静音）。
- 切换音色包后：旁白/剧情/战斗播报点真实播放对应 pack 的 wav（默认 house）。

---

## 2. 知识库网文化全量重写（内容代理执行）

- 重写 `assets/codex-data.js` 全部内容（结构 world/realms/heroes/cards/rules 五分类保留，字段结构同 v2.0：见 v2.0 规格书 §7.1）。
- **文风硬要求（番茄小说式网文）**：短段落（每段 ≤3 行）；口语化（"你带三张牌进场，庄家不跟你讲道理"）；悬念钩子（每节结尾留钩）；对话感（多用引号对话、第二人称"你"）；爽点前置（先给结果/战力/名场面，再补背景）；**不要辞藻堆砌、不要四字成语连排、不要长定语从句**。
- 人物：**44 名**（40 既有 + new-09..new-12）。既有 40 名**名字与称号保持不变**（避免立绘/语音行连锁改动），传记按网文风重写（"人设卡"：一句身份 + 三句故事 + 一句名言）；new-09..new-12 严格按 §3 设计。
- 卡牌：**190 张**（174 既有 + 16 新卡按 §4）。每张 origin 网文化改写（短、有梗、有画面），echo 保留；新卡 origin 呼应新英雄故事。
- realms：8 域网文化（各 100–250 字 + 风物 3 条）。
- world：总纲/法则/势力/时间线/术语/结局网文化。
- rules：完整规则书网文化，**新增 3 个新模式（§5）的规则段落**、10 套硬币皮肤特性表、24 状态效果表（v2.0 基础上若有新键补充）、术语表、新手提示。
- 校验：node 加载后 CF_CODEX 五键齐全、heroes=44、cards=190、realms=8。UTF-8。
- 全链路同步约束：你只写 codex-data.js；data.js / voice-lines.js 由代码整合代理按本规格书同步（英雄名/台词/卡名与你的文本一致）。文本里英雄名/卡名必须与 §3/§4 名单完全一致。

---

## 3. 新增 4 名英雄（new-09..new-12）

### new-09 棋鬼·白弈（cultivation / 赌徒）
- 被动 `lootOnDiscard`「打劫」：每当自己弃牌时抽 1 张牌（每回合限 1 次）。
- 主动「屠龙」×2：弃 2 张手牌，本回合下一次造成的伤害 +3。
- bio：白弈在九霄云海摆了三千年的棋摊，从不让子。有人说他早就死了，现在摆棋的是他留下的残局在替身。死局不可怕，可怕的是死局里长出了劫材。
- temper：沉默、算尽、把"让子"当侮辱。
- quote：「棋盘上没有废子，只有还没落的地方。」
- voice: enter「落子。」attack「打劫！」win「屠龙。」lose「……劫材，没了。」
- 签名卡 style-039「打劫」：{dmg:1, draw:1} / neg {selfDiscard:1}。

### new-10 代笔·墨（anime / 功能）
- 被动 `onStyleDraw`「代笔」：每回合第一次打出风格牌时抽 1 张牌。
- 主动「抢跑」×2：获得振奋（energize 1，下回合可多打 1 张牌）。
- bio：墨是三叶连载社的资深代笔。三千年里他替三百个烂尾故事签过名，唯独把自己的名字弄丢了。现在他只认稿费，不认读者。
- temper：市侩、毒舌、对"完结"有生理性恐惧。
- quote：「稿费照付，署名免谈。」
- voice: enter「这章，我写。」attack「交稿！」win「代笔，也是笔。」lose「……被退稿了。」
- 签名卡 style-040「终章代笔」：{draw:2, energize:1} / neg {selfDiscard:2}。

### new-11 炉匠·凯德（steam / 防御）
- 被动 `hitToShield`「吸热」：每回合第一次受到伤害时获得 1 护盾。
- 主动「熔壳」×2：弃 1 张手牌，获得 2 护盾。
- bio：凯德把整座熔炉焊在了背上，烫痕就是他的军功章。黄铜穹顶的人怕冷，他只怕一件事——炉子熄火。
- temper：豪迈、护短、把"冷"当骂人的话。
- quote：「炉火旺着呢，还轮不到你冷。」
- voice: enter「炉子，热了。」attack「煅！」win「好钢。」lose「炉……凉了。」
- 签名卡 style-041「余温」：{shield:2, heal:1} / neg {selfDiscard:1}。

### new-12 低语者·弥拉（abyss / 输出）
- 被动 `underdogDraw`「死线」：回合结束时若自身生命低于对手，抽 1 张牌。
- 主动「过载回响」×2：本回合下一次伤害 +1；若本回合已受到伤害，则改为 +2。
- bio：弥拉在沉钟海里捡到过所有人的遗言。她把这些话复述出来，每复述一句，就有一个人倒下。没人敢听她唱歌，但所有人都听见了。
- temper：平静、残忍、把"听"当成索取。
- quote：「我在唱你的遗言，你听不见吗？」
- voice: enter「听见了吗。」attack「回响。」win「遗言，成真了。」lose「……声音，沉下去了。」
- 签名卡 style-042「余响」：{dmg:2, lifesteal:1} / neg {selfDmg:2, oppHeal:1}。

### 新被动（引擎新增 4 个，PASSIVES 注册 + 钩子）
```js
lootOnDiscard: { name:'打劫', desc:'每当你弃牌时抽 1 张牌（每回合限 1 次）。' }
onStyleDraw:   { name:'代笔', desc:'每回合第一次打出风格牌时抽 1 张牌。' }
hitToShield:   { name:'吸热', desc:'每回合第一次受到伤害时获得 1 护盾。' }
underdogDraw:  { name:'死线', desc:'回合结束时若自身生命低于对手，抽 1 张牌。' }
```

---

## 4. 新增 16 张卡（代码整合代理加入 data.js，id 顺延）

**attack（+3）**
| id | 名 | 风格 | 正面 | 反面 |
| --- | --- | --- | --- | --- |
| attack-035 | 弃车保帅 | cultivation | {dmg:3, selfDiscard:1} | {selfDmg:2} |
| attack-036 | 抢跑章节 | anime | {dmg:1, energize:1} | {oppDraw:1} |
| attack-037 | 熔芯一击 | steam | {dmg:2, shield:1} | {selfDmg:2} |

**defense（+3）**
| id | 名 | 风格 | 正面 | 反面 |
| --- | --- | --- | --- | --- |
| defense-035 | 金角 | cultivation | {shield:1, draw:1} | {oppHeal:1} |
| defense-036 | 角色设定 | anime | {heal:1, reflect:1} | {oppDraw:1} |
| defense-037 | 熔壳 | steam | {shield:2, energize:1} | {selfDmg:1} |

**control（+3）**
| id | 名 | 风格 | 正面 | 反面 |
| --- | --- | --- | --- | --- |
| control-035 | 一子双征 | cultivation | {choke:1, discard:1} | {selfDiscard:1} |
| control-036 | 审核驳回 | anime | {seal:1, choke:1} | {oppDraw:1} |
| control-037 | 断供 | steam | {strip:1, weak:1} | {selfDmg:1} |

**risk（+3）**
| id | 名 | 风格 | 正面 | 反面 |
| --- | --- | --- | --- | --- |
| risk-035 | 天元赌局 | cultivation | {dmg:2, draw:2} | {selfDmg:2, selfDiscard:1} |
| risk-036 | 烂尾风波 | anime | {dmg:1, draw:3} | {selfDiscard:2} |
| risk-037 | 过载注汽 | steam | {dmg:3, shield:1} | {selfDmg:3} |

**style（+4，新英雄签名卡，见 §3）**：style-039 打劫 / style-040 终章代笔 / style-041 余温 / style-042 余响。

- 卡面：卡面代理生成 `assets/art/cards/{id}.png`，风格沿用既有暗黑奇幻 TCG，突出各自世界意象（cultivation 棋盘/棋、anime 稿纸/笔、steam 熔炉/齿轮、abyss 深渊/遗言）。
- 每张卡在知识库有网文化 origin（§2）。

---

## 5. 新增 3 个模式（引擎实现 + 模式列表/图鉴 + 测试覆盖）

### 5.1 random-rules 乱序法则
- 规则：每回合开始时从法则池随机抽 1 条，当回合生效，下回合重抽。法则池（6 条）：
  1. 本回合昭面成功时额外造成 1 点伤害
  2. 本回合昧面也触发正面效果（不触发反面）
  3. 本回合每名角色可打出 2 张技能卡
  4. 本回合第一张技能卡伤害 +1
  5. 本回合治疗与护盾数值 +1
  6. 本回合开始双方各抽 1 张牌
- UI：判定横幅下显示"本回合法则：xxx"。
- 引擎：beginTurn roll 法则 → 设置当回合修饰符（damageMod/healMod/maxCards/meiTriggerPos 等）；endTurn 清除。

### 5.2 draft 轮抽赌局
- 规则：开赛前系统自动模拟"轮抽"组牌：从全卡池 A-B-A-B-A-B 交替为两名玩家各抽 6 张，组成 12 张卡组；玩家可在战前看到自己卡组并"重抽一次"（再跑一轮轮抽）。
- 引擎：构建期算法（buildDraftDeck(seed)）+ 战前显示卡组列表 + 重抽按钮；双方卡组保证 6 攻击/3 防御/3 控制 类别均衡（近似）。
- UI：setup 阶段显示轮抽结果列表 + [重抽一次]。

### 5.3 double-stakes 双倍筹码
- 规则：本局所有正面/反面效果中的伤害、治疗、护盾、抽牌、弃牌数值全部 ×2（pierce/bless 等非数值效果不变）；逆写仍为 1 次。
- 引擎：applyEffects 前对 dmg/heal/shield/draw/discard 数值 ×2 修饰（仅本模式）。
- UI：模式卡说明"所有数值翻倍，翻倍翻倍再翻倍"。

- 三个模式加入 MODES（data.js）+ 模式卡（index.html 由代码代理渲染）+ 知识库 rules（§2）+ tests（test-engine.mjs 覆盖至少 random-rules 与 double-stakes 各一局；draft 覆盖卡组构建）。

---

## 6. UI 贴图替换（UI 贴图代理生成素材，代码整合代理接入）

- 目标：index.html/style.css/game.js 中所有仍用 CSS 绘制或内联 SVG 的视觉元素 → 替换为 `assets/art/ui/` 真实图片。CSS 只保留布局与动效。
- 排查对象：按钮基底、导航/功能图标（含 ☰、×、←、聊天等字符按钮）、弹窗/面板边框、卡背、Logo（"命途回廊 COINFALL"字标与硬币）、状态徽章（昭/昧/灼烧/护盾/眩晕/封印/虚弱/坚守/反射/蓄力/振奋/吸血/夺盾）、装饰（角落纹样/分隔线/桌布纹样）、favicon、规则页/图鉴页装饰。
- 命名规范（全部小写、连字符）：
  - `assets/art/ui/logo.png`（字标+硬币合成）
  - `assets/art/ui/card-back.png`（卡背，2:3 竖版）
  - `assets/art/ui/favicon.png`（方形硬币）
  - `assets/art/ui/buttons/btn-primary.png`、`btn-secondary.png`（横向圆角按钮基底，素色+描边，可拉伸）
  - `assets/art/ui/icons/{settings,close,back,chat,coin,rules,codex,lobby,collection,world,home,reroll}.png`（12 个，白色线稿、透明底、正方形，64×64 以上）
  - `assets/art/ui/frames/{modal,panel,card,codex,badge,result}.png`（6 个，暗金描边+内阴影，四角拉伸）
  - `assets/art/ui/badges/{zhao,mei,burn,shield,stun,seal,weak,guard,reflect,power,energize,drain,steal}.png`（13 个，圆形/六角徽章、透明底、128×128）
  - `assets/art/ui/decor/{corner,divider,table,scroll}.png`（4 个：角落花纹/分隔线/桌布纹样/卷轴边框）
  - 合计 40 个文件。
- 生成：image_gen（先读 doubao-creative-design skill）→ 转码 png/webp（PIL，先确认 Pillow 可用）；复用 generated-images/ 候选优先。
- 接入：代码整合代理将上述素材接入（背景图 url 替换 CSS 渐变/SVG、<img> 或 CSS background-image），图标用于导航按钮（替换 ☰/×/← 字符），状态徽章用于战斗 HUD，卡背用于手牌背面/图鉴。
- 若排查中发现清单未覆盖的 CSS/SVG 视觉元素，代码代理把清单补发给 UI 贴图代理补齐（send_message），再接入。

---

## 7. 一键联机（代码整合代理执行）

- 联机大厅改为"一键联机"单一入口：默认零配置公网通道（PeerJS 公共云 0.peerjs.com，房间号 CF-XXXX + 密码即暗号；局域网同网同通道可用，无需选择 transport）。
- UI 只保留两个动作：**创建房间**（房主称呼/密码可选/模式选择）与**加入房间**（称呼/房间号/密码）；"Supabase/自定义信令"折叠为设置页高级自定义（net.js 能力保留）。
- 移除所有"选择联机方式"类 UI 与阻断逻辑；报错给清晰中文（如"无法连接公共信令，请检查网络后重试"）+ 重试按钮。
- 保持"房主权威、访客发意图"架构；tests/test-online.mjs、test-team-online.mjs 语义不变并跑通。

---

## 8. 硬币动效升级（代码整合代理执行）

- 10 套皮肤各自专属动效（现有 3D 翻转基础上增强）：
  - 抛币 3D **多轴翻滚**（rotateY 主翻转 + rotateX 轻微摆动 + translateY 抛物线），带**轨迹余影**（残影/拖尾）。
  - **粒子拖尾/光晕**：按皮肤色（gold 金 / silver 银白 / bronze 黄铜 / amethyst 紫 / jade 绿 / bloodmoon 红 / obsidian 暗紫 / frost 冰蓝 / molten 赤橙 / bone 骨白）。
  - 落地**弹跳**（scale 回弹 1-2 次）+ 轻微**震屏**（4-6px 一次）。
  - 昭面**金辉**扩散 / 昧面**红煞**扩散专属特效。
  - 音效：sfx/coin.wav 按皮肤 playbackRate 区分（保持 v2.0 表）。
- 全部尊重 `prefers-reduced-motion` 与 `SETTINGS.reducedMotion`（降级为静态结果）。

---

## 9. 分工矩阵（代理范围）

| 代理 | 产出 | 禁止触碰 |
| --- | --- | --- |
| 旁白代理（复用 v2.0 旁白代理） | assets/audio/voice/say/{40 key}.wav + 重生成 narrator/{30}.wav + story/{7}.wav | 其他一切 |
| 新英雄语音代理（复用 v2.0 角色语音代理） | assets/audio/voice/char/new-09..new-12-{enter,attack,win,lose}.wav（16） | 其他一切 |
| 立绘代理（复用 v2.0 立绘代理） | assets/art/portraits/new-09..new-12.webp（4） | 其他一切 |
| 卡面代理（复用 v2.0 卡面代理） | assets/art/cards/{attack,defense,control,risk}-035..037.png + style-039..042.png（16） | 其他一切 |
| 知识库代理（复用 v2.0 内容代理） | assets/codex-data.js 网文化全量重写（44/190/3 模式） | data/game/index/style/voice-lines/tests |
| UI 贴图代理（新建） | assets/art/ui/** 40 文件 | 其他一切 |
| 代码整合代理（复用 v2.0 代码整合代理） | data.js、game.js、index.html、style.css、assets/assets.js、assets/voice-lines.js、ai.js、net.js、tests/、README.md、package.json、docs | 不生成素材（只引用）；不推送 git |

> 所有代理回执：产出文件绝对路径清单 + 自检结果（存在/可解码/尺寸/非静音）。音频代理须做 RMS 非静音抽检。

---

## 10. 验收流程（代码整合完成后由 Orchestrator 执行）

1. 全站 `Grep 'speechSynthesis' -i` 结果 0；`Grep 'voiceTone|系统 TTS|set-voice-uri'` 结果 0。
2. `npm run test:engine`（含新 3 模式覆盖）全绿；`test:fun`、`test:ui` 全绿。
3. Playwright 走查：主页→设置（音色包试听/无系统TTS/语音开关）→标准对战（抛币+技能名播报音频触发）→知识库（网文版五分类+3 新模式规则）→联机大厅（一键联机 UI）→零 404 零页面错误。
4. 语音抽检：say/、narrator/、story/、char/new-09..12 抽样 RMS 非静音、时长合理。
5. artifact-preview / 浏览器截图核对关键画面（主页/战斗/知识库/设置/联机/硬币动效静态帧）。
6. README 版本 v2.1（含 v2.1 新增内容说明）；通知 MainAgent commit+push 与线上冒烟。
