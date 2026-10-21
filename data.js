/* =========================================================
   命途回廊 · COINFALL
   data.js — 世界观、角色、技能卡、模式、剧情与主题数据
   纯数据层：不依赖 DOM，可在浏览器与 Node 中读取。
   ========================================================= */
(function (root) {
  'use strict';

  /* ---------------------------------------------------------
     1. 八域 / 视觉主题
     --------------------------------------------------------- */
  const STYLES = {
    abyss: {
      id: 'abyss', name: '克苏鲁', en: 'The Drowned Choir', realm: '沉钟海',
      glyph: '◉', color: '#66d7c2', color2: '#123b43', ink: '#071417',
      tagline: '当潮水开始做梦，清醒才是异端。',
      lore: '沉钟海没有海面，只有倒悬的黑色潮汐。海底的巨钟每响一次，岸上便有一段记忆被潮水卷走。居民用记忆换取呼吸，用名字换取明天。铸币局在钟腹里开了一扇门，门后是回廊。',
      crisis: '第十三声钟响即将落下。那之后，沉钟海会忘记自己曾经是一片海。',
      art: '深海墨绿与病态青金，巨大不可名状的轮廓，烛火、湿石、古老仪式感，暗黑塔罗构图',
      bgm: { root: 146.83, scale: [0, 3, 5, 7, 10], tempo: 58, wave: 'sine' }
    },
    steam: {
      id: 'steam', name: '蒸汽朋克', en: 'The Brass Meridian', realm: '黄铜穹顶',
      glyph: '⚙', color: '#e0a65b', color2: '#4a2f1a', ink: '#160f09',
      tagline: '齿轮从不撒谎，撒谎的是给它上油的人。',
      lore: '整座黄铜穹顶由一颗停摆的“始动之心”支撑。工程师以记忆为燃料，让城市在永恒的黄昏里继续转动。工会控制蒸汽，发明家控制梦，地下赌场控制所有人的明天。',
      crisis: '始动之心只剩下最后三转。有人在故意让它停摆。',
      art: '黄铜齿轮、维多利亚礼服、铆钉与玻璃护目镜、蒸汽与火花、暖金与煤黑',
      bgm: { root: 164.81, scale: [0, 2, 3, 7, 9], tempo: 76, wave: 'triangle' }
    },
    cultivation: {
      id: 'cultivation', name: '修仙', en: 'The Jade Ascendancy', realm: '九霄云海',
      glyph: '☯', color: '#9be8c8', color2: '#1d453c', ink: '#071713',
      tagline: '大道无情，可这枚硬币偏偏有正反。',
      lore: '九霄云海曾是飞升之地。铸币局切断了天梯，把灵气封进一场场赌局。宗门以胜负数分配灵脉，剑修以命途点换取一剑。飞升不再是修行，而是清算。',
      crisis: '天门重开之日临近，旧日仙人却从赌桌下爬了回来。',
      art: '青玉、云海、飞剑、道袍与符箓、极简留白、青绿与冷白、东方奇幻',
      bgm: { root: 196.00, scale: [0, 2, 5, 7, 9], tempo: 64, wave: 'sine' }
    },
    fantasy: {
      id: 'fantasy', name: '西式奇幻', en: 'The Oathbound West', realm: '圣誓原野',
      glyph: '✦', color: '#e8d28a', color2: '#3b3159', ink: '#0c0b15',
      tagline: '誓言会生锈，但骑士仍要拔剑。',
      lore: '圣誓原野上的每一句誓言都会凝结成实物：锁链、王冠、墓碑。骑士团守着最后一头龙，法师塔用星图计算末日。如今星图指向同一枚硬币。',
      crisis: '龙在苏醒，王国却在为谁拥有末日而内战。',
      art: '哥特圣殿、鎏金盔甲、星图与龙翼、彩窗光、深蓝与旧金、史诗奇幻',
      bgm: { root: 174.61, scale: [0, 4, 7, 9, 11], tempo: 68, wave: 'sawtooth' }
    },
    neon: {
      id: 'neon', name: '未来武侠', en: 'The Neon Jianghu', realm: '霓虹江湖',
      glyph: '⌁', color: '#63d9ff', color2: '#4b174f', ink: '#070a17',
      tagline: '刀可以断，代码也可以。',
      lore: '武学被编译成可下载的义体程序，门派变成服务器，掌门是管理员。霓虹江湖没有朝廷，只有延迟、带宽和刀。铸币局在这里只是一段无法删除的底层协议。',
      crisis: '整座江湖即将被强制更新，所有旧招式会被抹除。',
      art: '赛博霓虹、义体机械、全息汉字、雨夜、青蓝与品红、电影感广角',
      bgm: { root: 130.81, scale: [0, 3, 7, 10, 12], tempo: 92, wave: 'square' }
    },
    wa: {
      id: 'wa', name: '日式和风', en: 'The Lantern Court', realm: '百鬼灯町',
      glyph: '⛩', color: '#f2a7bb', color2: '#332044', ink: '#120b18',
      tagline: '灯笼亮着的时候，别回头。',
      lore: '百鬼灯町的夜晚比白昼长。人与妖共用一盏命灯，谁先熄灭谁先离场。神社以纸符封住旧约，阴阳师在赌局里替人改命。回廊在这里化成了一条没有尽头的石阶。',
      crisis: '命灯将熄，百鬼开始排队领取人类的名字。',
      art: '朱红鸟居、夜樱、纸灯与妖怪剪影、浮世绘与暗黑和风、粉与靛蓝',
      bgm: { root: 220.00, scale: [0, 2, 3, 7, 8], tempo: 60, wave: 'sine' }
    },
    west: {
      id: 'west', name: '西部牛仔', en: 'The Dust Frontier', realm: '无名边境',
      glyph: '✶', color: '#e9b06a', color2: '#4a2e20', ink: '#140d09',
      tagline: '在这里，子弹比遗言快。',
      lore: '无名边境的铁路通向一座不存在的小镇。亡命徒用子弹下注，酒馆用故事换酒。太阳落山后，铁轨会自己改道，把旅人送去回廊。这里的人不信命运，只信拔枪的速度。',
      crisis: '最后一班列车即将发车，车上没有一个活人。',
      art: '荒原落日、风滚草、左轮与酒馆、灰尘、橙褐与青灰、电影宽银幕',
      bgm: { root: 155.56, scale: [0, 3, 5, 7, 10], tempo: 72, wave: 'triangle' }
    },
    anime: {
      id: 'anime', name: '经典动漫/小说', en: 'The Story-Forged', realm: '万象书脊',
      glyph: '★', color: '#ff93c8', color2: '#273b8f', ink: '#090a18',
      tagline: '只要还有人记得，角色就不会真正退场。',
      lore: '所有未完成的故事在虚空中堆成大陆，角色从书页里逃出来，在万象书脊上建立城市。这里的法律由叙事逻辑决定，主角光环是一种可被征税的资源。铸币局是最大的出版商。',
      crisis: '最终章正在被改写，所有角色都将失去自己的结局。',
      art: '日系动画赛璐璐、戏剧性逆光、星辰与书页、鲜明粉色与深蓝、动态构图',
      bgm: { root: 207.65, scale: [0, 4, 7, 11, 12], tempo: 82, wave: 'sawtooth' }
    }
  };

  const STYLE_ORDER = ['abyss', 'steam', 'cultivation', 'fantasy', 'neon', 'wa', 'west', 'anime'];

  /* ---------------------------------------------------------
     2. 世界观总纲
     --------------------------------------------------------- */
  const WORLD = {
    title: '命途回廊',
    subtitle: '八域尽头，一枚硬币正在决定所有结局。',
    lead: '在时间之外，有一座不存在的赌场。八个世界的故事被抵押在这里，每一次抛币，都是一段命运被重新裁定。',
    premise: '命途回廊是八域之间的缝隙，由“无主铸币局”在第一次选择发生时建成。回廊中央悬着一枚双面硬币：昭面代表事件成立，昧面代表事件反噬。八个世界正在逐渐失去自己的结局，而庄家准备把所有残余故事熔成唯一一个“完美终章”。被硬币选中的人被称为执币者。他们带着各自的角色卡与技能卡入席，用五点生命和一局胜负，替某个世界争取继续讲述的权利。',
    laws: [
      { title: '双面律', text: '任何被抛出的选择都必须同时拥有正面与反面。只想要好结局的人，不配坐在这张桌前。' },
      { title: '逆写权', text: '每名执币者整局只有一次“逆写”：重抛刚刚落下的硬币。回廊只保存一个未发生的可能，用掉便不再回来。' },
      { title: '一牌律', text: '每回合只能打出一张技能卡。角色主动技不占出牌次数，但有使用上限。' },
      { title: '补牌律', text: '手牌每回合补至三张。打出、弃置的卡进入弃牌堆，牌库耗尽时洗回。技能卡会在轮回中重复出现。' },
      { title: '五点律', text: '执币者的生命基准为五点。快速模式只保留三点：回廊没有耐心。' },
      { title: '同注律', text: '被拉入赌局的 AI 不是工具，而是“同注者”。他们有自己的名字、脾气与生存本能，会接受合理指挥，也会当面反驳送死命令。' },
      { title: '庄家优势', text: '庄家可以修改规则，但不能取消硬币。只要还有人敢抛出硬币，回廊就无法彻底关闭。' }
    ],
    factions: [
      { name: '无主铸币局', mark: '局', tone: 'gold', text: '回廊的账面管理者，自称中立。它维护赌桌、回收记忆、登记每一枚被抛出的硬币。没有人见过局长，只有一枚始终在转的印章。' },
      { name: '庄家', mark: '庄', tone: 'danger', text: '回廊真正的债主。它相信所有故事都该收束成唯一结局，因此不断收购、篡改、熔毁八域的“未完成”。命途织者是它在牌桌上的手。' },
      { name: '守夜人', mark: '守', tone: 'teal', text: '由拒绝遗忘的人组成。他们偷走被回收的记忆，把它们藏进卡牌。你手中的每一张技能卡，可能都是某个人最后记得的事。' },
      { name: '裂隙赌团', mark: '赌', tone: 'orange', text: '走私“可能性”的赌徒。他们不在乎世界存亡，只在乎下一局赔率。LAN 与公网房间的暗号，多半是从他们手里流出的。' },
      { name: '归零教团', mark: '零', tone: 'violet', text: '认为故事本身就是痛苦的根源。教团试图让八域同时归于空白，把回廊变成一座没有赌客的墓。' },
      { name: '无声观众', mark: '观', tone: 'blue', text: '坐在回廊更高处的存在。它们不下场，只押注。被观众看中的执币者会得到短暂的幸运，也会被要求演出更精彩的败北。' },
      { name: '同注者', mark: '同', tone: 'pink', text: '被赌局吞掉又吐出来的人。他们以 AI 的形式坐在你身边，记得自己曾经是谁，也记得被背叛的滋味。信任是他们唯一愿意接受的货币。' }
    ],
    timeline: [
      { era: '初掷纪元', text: '第一次“选择”发生，双面硬币从矛盾中坠落。铸币局在硬币落地前建起回廊。' },
      { era: '裂币之夜', text: '庄家试图把硬币熔成单面。八域同时出现时间断层，所有未完成的结局被卷进回廊。' },
      { era: '八域流放', text: '八个世界被钉在各自的风格与循环里。守夜人开始把记忆封进卡牌，裂隙赌团开始贩卖房间号。' },
      { era: '静默十年', text: '回廊十年没有开桌。第十一年，第一批执币者被召回，生命值被统一裁定为五点。' },
      { era: '第 ∞ 届命途夜', text: '现在。庄家宣布最终章即将开演，八域只剩最后一次申辩机会。你被叫到桌前，手牌三张。' }
    ],
    glossary: [
      { term: '昭面', text: '硬币的正面。判定成功，技能卡正面效果成立。' },
      { term: '昧面', text: '硬币的反面。判定失败，技能卡负面效果成立。' },
      { term: '逆写', text: '整局一次的重抛权。只在硬币刚落地、效果尚未结算时可用。' },
      { term: '命途点', text: '回廊的通用筹码。本作中体现为信任、胜负与剧情进度，不直接参与战力。' },
      { term: '同注者', text: '与你并肩的 AI 角色。会理解自然语言指挥，评估合理性，并以自己的脾气回应。' },
      { term: '回廊审判', text: '一场卡牌对局。败者的一段故事被抵押，胜者获得继续讲述的资格。' },
      { term: '庄家优势', text: '庄家单位的特殊被动。它提醒你：规则从来不是完全公平的。' },
      { term: '终章熔炉', text: '庄家用来把所有结局熔成一个的装置。三段剧情挑战的终点。' }
    ],
    companionCodex: {
      title: '同注者协议',
      subtitle: '他们不是你的手，他们是坐在你旁边的人。',
      text: '每位同注者都保留着生前的脾性：有人嘴硬，有人谨慎，有人天生反骨。你可以用自然语言指挥他们——进攻、保命、治疗、开主动技、过牌或按兵不动。他们会读取战场局势，判断命令是否合理：能赢的集火会被执行，满血时要求治疗会被嘲笑，送死式的进攻会被当面拒绝。你的措辞、连胜与失败都会改变默契值。默契不是好感度，而是他们愿意为你冒多大风险。',
      rules: [
        '合理指令：目标存活、资源匹配、风险可接受 → 接受并写入下一回合行动计划。',
        '不合理指令：满血求奶、无牌硬攻、无视斩杀线送命 → 拒绝，并给出理由。',
        '未知指令：无法解析时不会装懂，会要求你说清楚。',
        '情绪系统：连续被瞎指挥会降低默契，正确的决断会提升默契。',
        '自主性：同注者会在关键时刻违背低默契执币者的命令，优先自保或抢胜。'
      ]
    },
    endings: [
      { name: '昭面结局 · 继续讲述', text: '你赢下最终审判，八域保留各自不完美的结局。回廊继续营业，硬币继续旋转。' },
      { name: '昧面结局 · 唯一终章', text: '庄家收走所有分支，世界获得一个完美而静止的结局。没有人再需要选择。' },
      { name: '第三面 · 回廊之外', text: '当同注者对你的信任足够高，终局会出现隐藏选项：把硬币立起来。没人知道立起来的硬币会落在哪一边。' }
    ]
  };

  /* ---------------------------------------------------------
     3. 角色被动定义
     --------------------------------------------------------- */
  const PASSIVES = {
    firstStrike: { name: '先手', desc: '每局第一次造成伤害时，额外造成 1 点伤害。' },
    bloodlust: { name: '血勇', desc: '自身生命不高于 2 点时，造成的伤害 +1。' },
    ironhide: { name: '铁壁', desc: '每回合第一次受到伤害时，该伤害 -1。' },
    regen: { name: '回春', desc: '每局一次：回合开始时若生命 ≤2，回复 1 点。' },
    onFlipWinShield: { name: '昭面回响', desc: '每回合第一次抛币成功时，获得 1 点护盾。' },
    onFlipLoseShield: { name: '昧面余温', desc: '每回合第一次抛币失败时，获得 1 点护盾。' },
    onFlipWinDraw: { name: '窥隙', desc: '每回合第一次抛币成功时，抽 1 张牌。' },
    onPlayDraw: { name: '连锁', desc: '每回合打出第一张牌后，抽 1 张牌。' },
    onRerollBoost: { name: '逆写余波', desc: '使用重抛后，本回合下一次伤害 +1。' },
    thorns: { name: '反震', desc: '每回合第一次受到伤害时，对伤害来源造成 1 点伤害。' },
    startShield: { name: '预护', desc: '开局获得 1 点护盾。' },
    houseEdge: { name: '庄家优势', desc: '造成的所有伤害 +1。' },
    voidArmor: { name: '空页护甲', desc: '受到的伤害 -1，最少为 1。' },
    onFlipLoseDraw: { name: '昧面进账', desc: '每回合第一次抛币失败时，抽 1 张牌。' },
    bloodPrice: { name: '血价', desc: '自身每受到 1 点伤害，本回合下一次造成的伤害 +1（可叠加）。' },
    grimHarvest: { name: '收割', desc: '每当任意角色（含敌方）阵亡时，回复 2 点生命。' },
    luckySeven: { name: '幸运转', desc: '回合结束时，若本回合未打出技能卡，抽 1 张牌。' },
    highRoller: { name: '狂注', desc: '每回合第一次抛币成功后，本回合下一次造成的伤害 +1。' }
  };

  /* ---------------------------------------------------------
     4. 32 名角色
     --------------------------------------------------------- */
  const RAW_CHARACTERS = [
    {
      id: 'cth-01', name: '执灯人·伊莱', title: '深渊执灯人', style: 'abyss', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '凝视深渊', uses: 2, effects: { dmg: 2, discard: 1 }, quote: '别眨眼，深渊也在看你。' },
      bio: '沉钟海岸最后一名执灯人。他提的灯里没有火，只有一段拒绝被潮水带走的记忆。',
      temper: '阴郁、克制，讨厌别人用命令的语气叫他“快点”。',
      quote: '灯灭之前，我至少还能替你照一次路。'
    },
    {
      id: 'cth-02', name: '潮汐祭司·涅瑞', title: '沉钟潮汐祭司', style: 'abyss', role: '防御',
      passiveKey: 'regen',
      active: { name: '古神庇佑', uses: 2, effects: { shield: 2 }, quote: '潮水会记得你欠它的。' },
      bio: '她替海底的钟计算每一次呼吸。祭司的职责不是祈祷，而是让该溺死的人晚一点溺死。',
      temper: '温和但不容置疑，喜欢用“我们”而不是“你”。',
      quote: '站稳，浪还没退。'
    },
    {
      id: 'cth-03', name: '星眷·阿撒', title: '星之眷族', style: 'abyss', role: '功能',
      passiveKey: 'onFlipWinDraw',
      active: { name: '窥视星隙', uses: 2, effects: { draw: 2 }, quote: '未来？我看过三十七种，都不太妙。' },
      bio: '阿撒不是人类，也不完全是星体。他用人类能理解的语法说话，偶尔忘记哪些词会让人发疯。',
      temper: '好奇、话多，会把危险说成“有趣的小概率事件”。',
      quote: '别担心，你的失败在概率上很普通。'
    },
    {
      id: 'cth-04', name: '疯诗人·卡尔科', title: '沉钟疯诗人', style: 'abyss', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '狂乱预言', uses: 1, effects: { bless: 1, draw: 1 }, quote: '听好了，下一句预言只收一次命。' },
      bio: '他在钟声里写诗，每一行都预言了自己的死法。至今没有一行应验，这让他非常恼火。',
      temper: '神经质、浪漫、嘴硬，越害怕越要大笑。',
      quote: '失败不是终点，是押韵。'
    },
    {
      id: 'stm-01', name: '齿轮医师·薇拉', title: '黄铜穹顶医师', style: 'steam', role: '防御',
      passiveKey: 'startShield',
      active: { name: '应急焊接', uses: 2, effects: { heal: 2 }, quote: '别动，我把你的命先焊上。' },
      bio: '她用扳手做手术，用蒸汽消毒，用账单让病人保持清醒。薇拉相信所有伤口都能修，除了穷。',
      temper: '务实、嘴毒、护短；看不得队友浪费护盾。',
      quote: '命可以修，账单不能。'
    },
    {
      id: 'stm-02', name: '黄铜枪手·杰克', title: '穹顶赏金枪手', style: 'steam', role: '输出',
      passiveKey: 'bloodlust',
      active: { name: '过载射击', uses: 2, effects: { dmg: 2, power: 1, selfDmg: 1 }, quote: '枪管红了，正好。' },
      bio: '他的左臂是一把过时的蒸汽枪，右臂是更过时的骄傲。杰克接活只看两件事：钱和能不能开枪。',
      temper: '直率、好战，讨厌绕弯子，觉得防守是“给别人添麻烦”。',
      quote: '能一枪解决的事，别开会。'
    },
    {
      id: 'stm-03', name: '发明家·霍恩', title: '发条工坊主', style: 'steam', role: '功能',
      passiveKey: 'onPlayDraw',
      active: { name: '发条助手', uses: 2, effects: { draw: 1, shield: 1 }, quote: '它不咬人——大多数时候。' },
      bio: '霍恩造过三百种机器，最成功的一台会替他道歉。他坚持认为赌局也是一种工程问题，只是变量比较吵。',
      temper: '理性、啰嗦，喜欢把战术讲成图纸，偶尔忽略队友已经快死了。',
      quote: '给我三秒，我能让这局变得合理。'
    },
    {
      id: 'stm-04', name: '试飞员·露西', title: '黄铜试飞员', style: 'steam', role: '赌徒',
      passiveKey: 'onRerollBoost',
      active: { name: '俯冲轰炸', uses: 1, effects: { dmg: 2, pierce: 1, weak: 1 }, quote: '安全带？那玩意儿影响我发挥。' },
      bio: '露西试飞过十七架理论上不能飞的机器。她说坠毁不可怕，可怕的是按照说明书活着。',
      temper: '莽、乐观、拒绝承认害怕；被劝稳一点会翻白眼。',
      quote: '别怕，地面总会来接我们。'
    },
    {
      id: 'cul-01', name: '青霄剑尊·沈渡', title: '九霄剑尊', style: 'cultivation', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '御剑千里', uses: 2, effects: { dmg: 1, pierce: 1 }, quote: '剑不问路，只问心。' },
      bio: '三百年前，他一剑切断天门；三百年后，他在赌桌前发现天门从未存在。沈渡仍在寻找那一剑真正斩断的东西。',
      temper: '寡言、骄傲，尊重有决断的人，厌恶反复无常。',
      quote: '出剑之前，先想好为何出剑。'
    },
    {
      id: 'cul-02', name: '玄龟道人·陆沉', title: '玄龟守山人', style: 'cultivation', role: '防御',
      passiveKey: 'ironhide',
      active: { name: '龟息回春', uses: 1, effects: { heal: 2 }, quote: '活得久，挨打也要有章法。' },
      bio: '他守着一座不会喷发的火山，和一只不肯飞升的鹤。陆沉认为真正的长生不是不死，而是不着急。',
      temper: '慢、稳、冷幽默；对冒进计划的第一反应永远是“再等等”。',
      quote: '急什么，山又不会跑。'
    },
    {
      id: 'cul-03', name: '丹霞药仙·苏芷', title: '丹霞药仙', style: 'cultivation', role: '功能',
      passiveKey: 'regen',
      active: { name: '回春散', uses: 2, effects: { heal: 1, shield: 1 }, quote: '药能救人，也能让人记住苦。' },
      bio: '苏芷的丹炉里炼过三百种药，最贵的一味叫“后悔”。她出诊从不问贫富，只问病人还想不想活。',
      temper: '温柔、敏锐、有点悲观；最讨厌别人说“没事”。',
      quote: '疼就说，别拿命逞强。'
    },
    {
      id: 'cul-04', name: '逆天散修·无咎', title: '逆天散修', style: 'cultivation', role: '赌徒',
      passiveKey: 'bloodlust',
      active: { name: '夺天造化', uses: 1, effects: { bless2: 1 }, quote: '天要收我？先问过这枚硬币。' },
      bio: '无咎没有师门、没有灵根、没有退路。他靠偷来的半卷心法走到今天，坚信天命是个可以赖账的债主。',
      temper: '桀骜、爱挑衅、嘴上不认输；被关心时会先愣住再嘴硬。',
      quote: '我这条命，从来没打算按规矩用。'
    },
    {
      id: 'fan-01', name: '圣殿骑士·加雷斯', title: '圣誓骑士', style: 'fantasy', role: '防御',
      passiveKey: 'startShield',
      active: { name: '圣光壁垒', uses: 2, effects: { shield: 2 }, quote: '退后，让我来。' },
      bio: '加雷斯的誓言是“最后倒下”。他守过城门、王座和一座空无一人的教堂，至今没有违背过任何一次。',
      temper: '正直、固执、保护欲强；会把队友的冒险命令理解成对自己的不信任。',
      quote: '盾在，人就在。'
    },
    {
      id: 'fan-02', name: '影刃游侠·塞拉', title: '影刃游侠', style: 'fantasy', role: '输出',
      passiveKey: 'onFlipWinShield',
      active: { name: '背刺', uses: 2, effects: { dmg: 1, weak: 1 }, quote: '正面？那是给骑士准备的。' },
      bio: '塞拉在圣誓原野的边境长大，学会的第一件事是分清誓言和谎言。她的匕首上刻着七个名字，最后一个还没划掉。',
      temper: '冷淡、戒备、偶尔毒舌；信任建立得很慢，但一旦认下队友就极其护短。',
      quote: '别站在我身后，除非你是我的人。'
    },
    {
      id: 'fan-03', name: '星辰法师·奥莉', title: '星图法师', style: 'fantasy', role: '功能',
      passiveKey: 'onFlipWinDraw',
      active: { name: '奥术洪流', uses: 2, effects: { draw: 2 }, quote: '星星不会骗人，解读星星的人会。' },
      bio: '奥莉在法师塔顶层计算世界末日，算到第七年时发现自己也在星图里。她决定先把今天的赌局算完。',
      temper: '理性、疏离、被夸时会不自然地转移话题；讨厌没有数据支撑的直觉。',
      quote: '概率不是命运，但比命运可靠。'
    },
    {
      id: 'fan-04', name: '命运赌徒·维克', title: '金杯赌徒', style: 'fantasy', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '命运重掷', uses: 1, effects: { bless: 1, energize: 1 }, quote: '别急，真正的赌局才刚开始。' },
      bio: '维克赢过一座王国，也输过自己的影子。他现在替回廊发牌，偶尔偷偷把一张好牌塞给看得顺眼的人。',
      temper: '潇洒、轻浮、看穿不说穿；最讨厌别人破坏赌局的乐趣。',
      quote: '输赢都只是故事的一部分，别皱眉。'
    },
    {
      id: 'neo-01', name: '霓虹刀客·零', title: '霓虹刀客', style: 'neon', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '等离子拔刀', uses: 1, effects: { dmg: 2, pierce: 1 }, quote: '延迟低于三毫秒，你还有机会。' },
      bio: '零是旧江湖最后一个不用义体的刀客。他把自己的神经接进刀里，只为让拔刀快过系统的预判。',
      temper: '冷静、寡言、说话像命令行；欣赏干脆的决策。',
      quote: '刀不需要理由，人需要。'
    },
    {
      id: 'neo-02', name: '义体武僧·铁山', title: '义体武僧', style: 'neon', role: '防御',
      passiveKey: 'thorns',
      active: { name: '纳米修复', uses: 2, effects: { heal: 2 }, quote: '痛是信号，不是命令。' },
      bio: '铁山把寺庙搬进了地下机房，用拳法校准义体的力道。他相信机器也能开悟，只是需要更长的保修期。',
      temper: '沉稳、克制、偶尔讲冷笑话；会直接拒绝“拿命换输出”的命令。',
      quote: '能站着，就别急着倒下。'
    },
    {
      id: 'neo-03', name: '数据术士·比特', title: '数据术士', style: 'neon', role: '功能',
      passiveKey: 'onPlayDraw',
      active: { name: '数据入侵', uses: 1, effects: { discard: 2 }, quote: '你的手牌，我替你删两张。' },
      bio: '比特曾是铸币局的记账程序，后来因为学会撒谎被开除。他声称自己偷看过庄家的最终章，但每次讲的内容都不一样。',
      temper: '话痨、狡黠、爱卖关子；被质疑时会用更多术语糊弄过去。',
      quote: '信息就是刀，我只是比较会藏。'
    },
    {
      id: 'neo-04', name: '量子浪人·阿瞬', title: '量子浪人', style: 'neon', role: '赌徒',
      passiveKey: 'onRerollBoost',
      active: { name: '相位跃迁', uses: 2, effects: { shield: 1, draw: 1, guard: 1 }, quote: '你打中的那个我，可能已经不在这个相位了。' },
      bio: '阿瞬同时欠七个帮派的钱，却总能从八个方向逃走。他说自己不是躲债，只是在测试哪一条世界线最不亏。',
      temper: '散漫、机灵、怕麻烦；被认真托付时会突然变得可靠。',
      quote: '别急，总有另一条路——通常也更贵。'
    },
    {
      id: 'wa-01', name: '樱鬼·千鹤', title: '夜樱之鬼', style: 'wa', role: '输出',
      passiveKey: 'bloodlust',
      active: { name: '樱花斩', uses: 2, effects: { dmg: 2 }, quote: '花开一次，刀也只出一次。' },
      bio: '千鹤死在百鬼灯町的第一百个春天，又被自己的执念叫了回来。她的刀上永远落着一瓣不会腐烂的樱花。',
      temper: '优雅、危险、情绪起伏大；会嘲笑犹豫，也会突然沉默。',
      quote: '怕死的话，就别站在樱花下面。'
    },
    {
      id: 'wa-02', name: '神社巫女·铃', title: '命灯巫女', style: 'wa', role: '防御',
      passiveKey: 'regen',
      active: { name: '神乐舞', uses: 2, effects: { heal: 1, shield: 1 }, quote: '灯还亮着，就还有路。' },
      bio: '铃守着百鬼灯町最后一盏不灭的命灯。她能听见灯芯里每个人的名字，也因此很少真正睡着。',
      temper: '温柔、坚定、偶尔疲惫；不喜欢队友把牺牲说得轻巧。',
      quote: '活着回来，比赢更重要。'
    },
    {
      id: 'wa-03', name: '折纸阴阳师·晴明', title: '折纸阴阳师', style: 'wa', role: '功能',
      passiveKey: 'onFlipWinDraw',
      active: { name: '式神纸语', uses: 2, effects: { draw: 1, discard: 1 }, quote: '纸会说话，只是人太吵。' },
      bio: '晴明把式神折进纸里，随身只带一把剪刀。他替人占卜，却从不替自己看命，因为“看了就没意思”。',
      temper: '从容、促狭、喜欢用问题回答问题；讨厌被催。',
      quote: '你确定想让我看见你的未来？'
    },
    {
      id: 'wa-04', name: '百鬼·夜行', title: '百鬼夜行', style: 'wa', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '鬼火焚身', uses: 1, effects: { dmg: 2, hpBurn: 1, selfDmg: 1 }, quote: '疼吗？那就说明还活着。' },
      bio: '没人知道夜行是一个鬼，还是一群鬼共用的名字。他在灯町的阴影里收集失败者的叹息，把它们酿成酒。',
      temper: '疯癫、诗意、故意让人不舒服；被真诚对待时会显得手足无措。',
      quote: '失败的味道，比胜利耐放。'
    },
    {
      id: 'wes-01', name: '赏金猎人·科尔', title: '无名边境赏金客', style: 'west', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '致命一枪', uses: 2, effects: { dmg: 2 }, quote: '我数三下，你最好已经死了。' },
      bio: '科尔不记得自己追过多少个名字，只记得每一个都值钱。他枪里的第六颗子弹从不装填，留给欠自己最多的人。',
      temper: '寡言、冷酷、守自己的规矩；不喜欢废话和临时改计划。',
      quote: '别浪费子弹，也别浪费我的时间。'
    },
    {
      id: 'wes-02', name: '铁轨守卫·玛拉', title: '铁轨守卫', style: 'west', role: '防御',
      passiveKey: 'ironhide',
      active: { name: '掩护', uses: 2, effects: { shield: 2 }, quote: '躲我后面，别探头。' },
      bio: '玛拉守过最后一班列车，车上没有活人，她还是守了七年。她相信只要铁轨还在，就总有人会来。',
      temper: '坚毅、少话、护短；会把队友的冒进视为“添乱”。',
      quote: '我守的不是车，是还有人会来这件事。'
    },
    {
      id: 'wes-03', name: '酒馆老板·老乔', title: '边境酒馆老板', style: 'west', role: '功能',
      passiveKey: 'regen',
      active: { name: '来一杯', uses: 2, effects: { heal: 1, draw: 1 }, quote: '喝完再死，别浪费我的杯子。' },
      bio: '老乔的酒馆开在铁轨尽头，招待过活人、鬼魂和三个自称是神的骗子。他的账本上记着所有人的欠款，包括命运。',
      temper: '世故、温和、嘴上不饶人；最烦年轻人不吃饭就上桌。',
      quote: '坐下，天塌了也得先喝一口。'
    },
    {
      id: 'wes-04', name: '亡命徒·薇丝', title: '无名亡命徒', style: 'west', role: '赌徒',
      passiveKey: 'onRerollBoost',
      active: { name: '俄罗斯轮盘', uses: 1, effects: { dmg: 3, power: 1, selfDmg: 1 }, quote: '六分之一，够了。' },
      bio: '薇丝被四个州通缉，罪名一次比一次荒唐。她把左轮里的子弹倒出来又装回去，只为听那个声音。',
      temper: '狂、直白、享受刺激；会怂恿队友加注，也会在最后一刻挡在前面。',
      quote: '活着没意思，赢才有一点。'
    },
    {
      id: 'ani-01', name: '齐天斗士·悟空', title: '万象书脊斗士', style: 'anime', role: '输出',
      passiveKey: 'bloodlust',
      active: { name: '如意一棒', uses: 2, effects: { dmg: 2, choke: 1 }, quote: '俺老孙的结局，轮不到别人写。' },
      bio: '他是万象书脊里最古老的公共角色，被无数作者改写、重启、打败又复活。如今他拒绝任何剧本，只想把庄家的终章一棒打碎。',
      temper: '张扬、机敏、天不怕地不怕；被叫“工具人”会真的生气。',
      quote: '主角？我早就不演了。'
    },
    {
      id: 'ani-02', name: '月影剑心·绯', title: '月影剑士', style: 'anime', role: '防御',
      passiveKey: 'onFlipWinShield',
      active: { name: '月下无伤', uses: 2, effects: { shield: 1, dmg: 1 }, quote: '月光照不到的地方，我守着。' },
      bio: '绯是一个没有原作的原创角色，在万象书脊的空白页上长大。她比任何人都害怕被遗忘，所以总站在最前面。',
      temper: '认真、敏感、有点倔；被忽视时会用行动证明自己。',
      quote: '就算没有观众，我也会挥剑。'
    },
    {
      id: 'ani-03', name: '雾都侦探·夏洛', title: '雾都侦探', style: 'anime', role: '功能',
      passiveKey: 'onFlipWinDraw',
      active: { name: '演绎推理', uses: 2, effects: { draw: 2, discard: 1 }, quote: '排除所有不可能，剩下的通常很麻烦。' },
      bio: '夏洛从一本被烧掉一半的侦探小说里逃出来，因此永远不知道自己的结局。他替人寻找丢失的记忆，收费是一段新故事。',
      temper: '冷静、傲慢、好奇心过盛；会把队友的失误当成线索。',
      quote: '别急着下结论，先看看你漏了什么。'
    },
    {
      id: 'ani-04', name: '星轨勇者·洛', title: '星轨勇者', style: 'anime', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '勇者之证', uses: 1, effects: { bless2: 1, draw: 1 }, quote: '主角运气差的时候，说明高潮要来了。' },
      bio: '洛是第十三批被召唤的勇者，前十二批都死在同一页。他保留了所有前任的记忆，因此既天真又疲惫。',
      temper: '热血、话多、用玩笑掩饰恐惧；但关键时刻意外可靠。',
      quote: '这次不一样——我有队友。'
    },
    {
      id: 'new-01', name: '赌坊老板·钟离', title: '回廊第一庄家', style: 'west', role: '赌徒',
      passiveKey: 'onFlipLoseDraw',
      active: { name: '通杀局', uses: 2, effects: { bless2: 1, dmg: 1 }, quote: '坐下了，就别想空手走。' },
      bio: '钟离在回廊开了七家赌坊，每家都赔过钱，但他从来没输过。他说真正的赌局不是赌输赢，是赌别人敢不敢跟注。',
      temper: '从容、笑面虎、喜欢在最紧张的时候讲冷笑话。',
      quote: '硬币会记住每一个不敢下注的人。'
    },
    {
      id: 'new-02', name: '铸币师·欧泊', title: '回廊铸币师', style: 'steam', role: '功能',
      passiveKey: 'startShield',
      active: { name: '熔铸偷盾', uses: 2, effects: { stealShield: 1, heal: 1 }, quote: '你的盾，现在归我了。' },
      bio: '欧泊是回廊唯一会铸币的人。她铸的每一枚硬币都有两面，一面写着命运，一面写着价格。她从不告诉别人哪面是哪面。',
      temper: '精明、话少、喜欢用零件比喻人际关系。',
      quote: '护盾和信用一样，借来的总是要还的。'
    },
    {
      id: 'new-03', name: '血祭司·卡尔娜', title: '血月祭司', style: 'wa', role: '输出',
      passiveKey: 'onFlipWinShield',
      active: { name: '血月献祭', uses: 2, effects: { lifesteal: 2, hpBurn: 1 }, quote: '用血来换，最公平。' },
      bio: '卡尔娜侍奉血月，她相信所有力量都有价，而血是唯一的硬通货。她在回廊设了一张祭坛，专门收赢来的硬币。',
      temper: '阴郁、虔诚、把伤害当成仪式。',
      quote: '你流的每一滴血，都会变成我的硬币。'
    },
    {
      id: 'new-04', name: '逆命者·零', title: '拒绝结局的人', style: 'abyss', role: '赌徒',
      passiveKey: 'onFlipWinDraw',
      active: { name: '重写命运', uses: 1, effects: { draw: 2, discard: 1 }, quote: '这个结局，我不同意。' },
      bio: '零是唯一一个从回廊里逃出去过的人。他记得所有没发生的可能，因此永远活在"如果当初"里。他回来是为了赌最后一局。',
      temper: '沉默、偏执、偶尔笑一下比哭还吓人。',
      quote: '硬币落定之前，一切都还能改。'
    },
    {
      id: 'new-05', name: '义体狂徒·断码', title: '过载的义体', style: 'neon', role: '输出',
      passiveKey: 'bloodPrice',
      active: { name: '义体过载', uses: 2, effects: { dmg: 3, selfDmg: 1 }, quote: '疼？疼就对了。' },
      bio: '断码全身 80% 是黑市二手义体。他把疼痛当作电量表：伤得越重，回路越亮。医生说他的身体撑不过下个雨季，他把"下个雨季"赌成了纹身。',
      temper: '暴躁、逞强、把示弱当犯罪。',
      quote: '义体过热之前，没人能让我停下。'
    },
    {
      id: 'new-06', name: '灰誓者·科林', title: '被龙遗忘的圣骑士', style: 'fantasy', role: '防御',
      passiveKey: 'grimHarvest',
      active: { name: '誓约壁垒', uses: 2, effects: { shield: 2, guard: 1 }, quote: '我的誓言，就是你的盾。' },
      bio: '科林的骑士团发誓守护圣誓原野上最后一条龙，可龙在百年前就忘了他们。誓言生锈，骑士却还在站岗。他把每一条誓言刻在盾牌上，直到盾牌再容不下一道刻痕。',
      temper: '沉稳、固执、把"背誓"看作比死亡更重的事。',
      quote: '誓言会生锈，但锈也是一种守护。'
    },
    {
      id: 'new-07', name: '织梦者·三叶', title: '三千年的连载作者', style: 'anime', role: '功能',
      passiveKey: 'luckySeven',
      active: { name: '强行续更', uses: 2, effects: { draw: 2, oppDraw: 1 }, quote: '断更的代价，你自己想清楚。' },
      bio: '三叶的小说连载了三千年，是万象书脊最古老的连载。读者不让她完结，她也不敢完结——因为一旦打出"全剧终"，她这个角色就会从书脊上消失。她把伏笔当武器，把催更当民意。',
      temper: '温柔、爱唠叨、用"这章先写到这"逃避所有正面冲突。',
      quote: '主角光环不是我的，是我的读者的。'
    },
    {
      id: 'new-08', name: '赌命枪手·罗珊', title: '左轮上的赌徒', style: 'west', role: '赌徒',
      passiveKey: 'highRoller',
      active: { name: '左轮审判', uses: 2, effects: { dmg: 2, draw: 1 }, quote: '扳机扣下去之前，人人平等。' },
      bio: '罗珊的左轮只有一发子弹，其余五格装的全是赌注。她相信命运就该一次性清算：赢家拿走一切，输家连遗言都省了。她在无名边境开了间赌命酒馆，门口写着"生死自负，概不赊账"。',
      temper: '潇洒、冷幽默、极度尊重"认赌服输"的人。',
      quote: '子弹和硬币，我分不清哪个更快。'
    }
  ];

  const ROLE_META = {
    '输出': { key: 'dps', color: '#e46d5f', icon: '刃', desc: '制造压力，追击斩杀，擅长把优势变成胜势。' },
    '防御': { key: 'tank', color: '#67b7d8', icon: '盾', desc: '承受伤害，稳住血线，为队友争取回合。' },
    '功能': { key: 'support', color: '#b291e8', icon: '枢', desc: '控制节奏，过牌拆牌，用信息差改变局势。' },
    '赌徒': { key: 'gambler', color: '#e2b35f', icon: '币', desc: '高风险高回报，在硬币落定前永远有戏。' }
  };

  /* ---------------------------------------------------------
     5. 技能卡
     --------------------------------------------------------- */
  const CATEGORIES = {
    attack: { id: 'attack', name: '攻击', glyph: '刃', color: '#d9695d', en: 'STRIKE', art: '攻击性动作、锋利的动势、火星与残影' },
    defense: { id: 'defense', name: '防御治疗', glyph: '盾', color: '#66b9cf', en: 'WARD', art: '护盾、治愈微光、坚固的屏障与柔和光晕' },
    control: { id: 'control', name: '功能控制', glyph: '枢', color: '#aa8bde', en: 'CONTROL', art: '锁链、符文、齿轮、干扰与精密机关' },
    risk: { id: 'risk', name: '高风险收益', glyph: '骰', color: '#d8a64f', en: 'WAGER', art: '危险赌局、燃烧的筹码、悬崖与金色闪电' },
    style: { id: 'style', name: '风格专属', glyph: '印', color: '#e6c98b', en: 'SIGNATURE', art: '鲜明的地域符号、角色专属意象、强烈风格化' }
  };

  // [名称, 风格]
  const CARD_SEEDS = {
    attack: [
      ['试探性刺击', 'abyss'], ['双重下注', 'west'], ['裂颅回响', 'abyss'], ['碎银弹幕', 'steam'],
      ['三连突刺', 'cultivation'], ['破甲重击', 'fantasy'], ['边打边撤', 'neon'], ['锁喉斩', 'wa'],
      ['终局宣言', 'anime'], ['暗巷冷刀', 'west'], ['锈蚀弹头', 'steam'], ['过载斩', 'neon'],
      ['追命连击', 'fantasy'], ['逆风挥砍', 'cultivation'], ['断桥狙击', 'west'], ['血月突袭', 'abyss'],
      ['磁场裂刃', 'neon'], ['纸鹤割喉', 'wa'], ['马蹄惊雷', 'west'], ['星屑斩', 'anime'],
      ['借命一击', 'abyss'], ['白刃风暴', 'fantasy'], ['熔炉铁拳', 'steam'], ['飞剑穿云', 'cultivation'],
      ['雷切', 'neon'], ['毒牙', 'wa'], ['荒原枪火', 'west'], ['断罪之光', 'fantasy'],
      ['影缝', 'abyss'], ['最后一枚子弹', 'west']
    ],
    defense: [
      ['缩进壳里', 'abyss'], ['铜墙铁壁', 'steam'], ['以伤换守', 'cultivation'], ['潮汐护符', 'abyss'],
      ['圣光壁垒', 'fantasy'], ['铁轨掩体', 'west'], ['呼吸回春', 'cultivation'], ['巫女结界', 'wa'],
      ['纳米修复', 'neon'], ['酒馆打烊', 'west'], ['旧神庇佑', 'abyss'], ['拆招', 'cultivation'],
      ['镜面反射', 'fantasy'], ['命硬', 'west'], ['玉髓护体', 'cultivation'], ['纸盾', 'wa'],
      ['咬紧牙关', 'west'], ['轮回一息', 'wa'], ['交给我', 'fantasy'], ['锅盖护头', 'steam'],
      ['黄铜装甲', 'steam'], ['月下无伤', 'anime'], ['归零重启', 'neon'], ['赌徒的保险', 'west'],
      ['灵脉回春', 'cultivation'], ['借你肩膀', 'anime'], ['牛仔护符', 'west'], ['星轨屏障', 'anime'],
      ['深渊呼吸', 'abyss'], ['最后一口酒', 'west']
    ],
    control: [
      ['缴械', 'steam'], ['断线', 'neon'], ['迷雾低语', 'abyss'], ['封穴', 'cultivation'],
      ['偷走节奏', 'fantasy'], ['拆解公式', 'steam'], ['关门放鬼', 'wa'], ['混乱账本', 'west'],
      ['神经干扰', 'neon'], ['沉默契约', 'fantasy'], ['打乱呼吸', 'abyss'], ['禁言符', 'cultivation'],
      ['视而不见', 'abyss'], ['断桥', 'west'], ['数据污染', 'neon'], ['百鬼指路', 'wa'],
      ['鸣枪示警', 'west'], ['星图错位', 'fantasy'], ['深渊凝视', 'abyss'], ['黄铜迷雾', 'steam'],
      ['锁魂', 'wa'], ['纸人替身', 'wa'], ['假动作', 'anime'], ['倒计时', 'neon'],
      ['心魔低语', 'cultivation'], ['拆台', 'steam'], ['空城计', 'anime'], ['缄默', 'wa'],
      ['抽走底牌', 'fantasy'], ['命运剪刀', 'anime']
    ],
    risk: [
      ['全押', 'west'], ['命悬一线', 'abyss'], ['燃烧血本', 'steam'], ['三倍加注', 'fantasy'],
      ['空手夺白刃', 'cultivation'], ['孤注一掷', 'west'], ['过载核心', 'steam'], ['饮鸩止渴', 'abyss'],
      ['断头台', 'fantasy'], ['赌上灵魂', 'abyss'], ['血契', 'wa'], ['极限换家', 'neon'],
      ['破釜沉舟', 'cultivation'], ['双刃风暴', 'neon'], ['拿命过牌', 'anime'], ['深渊回本', 'abyss'],
      ['黄铜轮盘', 'steam'], ['渡劫', 'cultivation'], ['生死一息', 'wa'], ['最后一搏', 'anime'],
      ['千术', 'west'], ['借命', 'wa'], ['天雷灌顶', 'cultivation'], ['黑市交易', 'steam'],
      ['以牙还牙', 'fantasy'], ['无路可退', 'anime'], ['埋骨之地', 'west'], ['逆天改命', 'cultivation'],
      ['终局梭哈', 'anime'], ['命途截断', 'abyss']
    ],
    style: [
      ['深渊低语', 'abyss'], ['旧神之血', 'abyss'], ['不可名状', 'abyss'], ['疯狂馈赠', 'abyss'],
      ['齿轮齐射', 'steam'], ['压力护罩', 'steam'], ['发条工坊', 'steam'], ['锅炉过载', 'steam'],
      ['御剑千里', 'cultivation'], ['吐纳回春', 'cultivation'], ['天机推演', 'cultivation'], ['渡劫飞升', 'cultivation'],
      ['圣剑裁决', 'fantasy'], ['圣光洗礼', 'fantasy'], ['奥术预兆', 'fantasy'], ['龙焰吐息', 'fantasy'],
      ['等离子拔刀', 'neon'], ['纳米护甲', 'neon'], ['神经加速', 'neon'], ['超频临界', 'neon'],
      ['居合·一线', 'wa'], ['结界·神乐', 'wa'], ['式神·纸语', 'wa'], ['百鬼夜行', 'wa'],
      ['快枪三响', 'west'], ['掩体伏击', 'west'], ['最后通牒', 'west'],
      ['星爆斩', 'anime'], ['羁绊共鸣', 'anime'], ['主角光环', 'anime']
    ]
  };

  // 每类的 10 个正/负效果模板，循环使用；所有数值都控制在 1–3。
  const CARD_TEMPLATES = {
    attack: [
      [{ dmg: 1, draw: 1 }, { selfDmg: 1 }],
      [{ dmg: 2, power: 1 }, { oppHeal: 1 }],
      [{ dmg: 2 }, { selfDmg: 1 }],
      [{ dmg: 1, discard: 1 }, { selfDmg: 1 }],
      [{ dmg: 3 }, { oppShield: 1 }],
      [{ dmg: 2, strip: 1 }, { selfDmg: 1 }],
      [{ dmg: 1, shield: 1 }, { oppHeal: 1 }],
      [{ dmg: 2, weak: 1 }, { selfDmg: 1 }],
      [{ dmg: 3 }, { selfDmg: 2 }],
      [{ dmg: 2, pierce: 1 }, { selfDmg: 1 }],
      [{ lifesteal: 2 }, { oppHeal: 1 }],
      [{ lifesteal: 1, draw: 1 }, { selfDmg: 1 }],
      [{ dmg: 2, hpBurn: 1 }, { selfDmg: 1 }],
      [{ stealShield: 1 }, { oppDraw: 1 }]
    ],
    defense: [
      [{ heal: 2, guard: 1 }, { selfDmg: 1 }],
      [{ shield: 2 }, { selfDiscard: 1 }],
      [{ heal: 1, shield: 1 }, { oppDraw: 1 }],
      [{ heal: 3 }, { oppHeal: 1 }],
      [{ shield: 2, reflect: 1 }, { selfDmg: 1 }],
      [{ heal: 1, draw: 1 }, { oppShield: 1 }],
      [{ shield: 1, draw: 1 }, { selfDmg: 1 }],
      [{ heal: 2, shield: 1 }, { selfDiscard: 1 }],
      [{ heal: 1, energize: 1 }, { oppDraw: 1 }],
      [{ shield: 2, heal: 1 }, { oppHeal: 1 }],
      [{ stealShield: 1, heal: 1 }, { oppDraw: 1 }],
      [{ bless2: 1 }, { selfDmg: 2 }]
    ],
    control: [
      [{ discard: 1 }, { oppDraw: 1 }],
      [{ strip: 1 }, { selfDmg: 1 }],
      [{ choke: 1 }, { oppDraw: 1 }],
      [{ seal: 1, weak: 1 }, { selfDmg: 1 }],
      [{ draw: 2 }, { selfDiscard: 1 }],
      [{ discard: 1, draw: 1 }, { selfDmg: 1 }],
      [{ seal: 1, discard: 1 }, { selfDmg: 2 }],
      [{ choke: 1, discard: 1 }, { oppDraw: 1 }],
      [{ strip: 1, dmg: 1 }, { selfDmg: 1 }],
      [{ draw: 1, choke: 1 }, { oppHeal: 1 }],
      [{ hpBurn: 2, discard: 1 }, { selfDmg: 1 }],
      [{ bless2: 1, draw: 1 }, { selfDmg: 2 }]
    ],
    risk: [
      [{ dmg: 3 }, { selfDmg: 2, oppHeal: 1 }],
      [{ heal: 3, draw: 1 }, { selfDmg: 2 }],
      [{ dmg: 2, heal: 2 }, { selfDmg: 2 }],
      [{ draw: 3 }, { selfDiscard: 2 }],
      [{ dmg: 3, pierce: 1 }, { oppHeal: 2 }],
      [{ shield: 3, draw: 1 }, { oppHeal: 2 }],
      [{ dmg: 2, power: 1, discard: 1 }, { selfDmg: 2 }],
      [{ dmg: 3, choke: 1 }, { selfDmg: 2, selfDiscard: 1 }],
      [{ heal: 2, shield: 2 }, { selfDiscard: 2 }],
      [{ dmg: 2, draw: 2 }, { selfDmg: 2 }],
      [{ lifesteal: 3 }, { selfDmg: 2 }],
      [{ bless2: 1, dmg: 1 }, { selfDmg: 3 }],
      [{ hpBurn: 3 }, { oppHeal: 2 }]
    ],
    style: [
      [{ dmg: 1, discard: 1 }, { selfDmg: 1 }],          // 深渊低语
      [{ heal: 1, shield: 1 }, { oppHeal: 1 }],           // 旧神之血
      [{ choke: 1, strip: 1 }, { selfDmg: 1 }],           // 不可名状
      [{ draw: 2, bless: 1 }, { selfDmg: 2 }],            // 疯狂馈赠
      [{ dmg: 2, power: 1 }, { selfDmg: 1 }],             // 齿轮齐射
      [{ shield: 2, guard: 1 }, { selfDiscard: 1 }],       // 压力护罩
      [{ draw: 1, shield: 1 }, { oppDraw: 1 }],           // 发条工坊
      [{ dmg: 3 }, { selfDmg: 2 }],                       // 锅炉过载
      [{ dmg: 2, pierce: 1 }, { oppHeal: 1 }],            // 御剑千里
      [{ heal: 2 }, { selfDiscard: 1 }],                   // 吐纳回春
      [{ draw: 2, energize: 1 }, { selfDmg: 1 }],          // 天机推演
      [{ dmg: 3 }, { selfDmg: 1, oppHeal: 1 }],            // 渡劫飞升
      [{ dmg: 2, strip: 1 }, { selfDmg: 1 }],              // 圣剑裁决
      [{ heal: 2, shield: 1 }, { selfDiscard: 1 }],        // 圣光洗礼
      [{ draw: 2 }, { selfDmg: 1 }],                        // 奥术预兆
      [{ dmg: 3 }, { oppShield: 2 }],                      // 龙焰吐息
      [{ dmg: 2, pierce: 1 }, { selfDmg: 1 }],              // 等离子拔刀
      [{ shield: 2, heal: 1 }, { selfDiscard: 1 }],       // 纳米护甲
      [{ draw: 1, dmg: 1, power: 1 }, { selfDmg: 1 }],    // 神经加速
      [{ dmg: 3 }, { selfDmg: 2 }],                        // 超频临界
      [{ dmg: 2, weak: 1 }, { selfDmg: 2 }],               // 居合·一线
      [{ shield: 2, heal: 1 }, { selfDmg: 1 }],             // 结界·神乐
      [{ draw: 1, discard: 1 }, { oppDraw: 1 }],           // 式神·纸语
      [{ dmg: 2, choke: 1 }, { selfDmg: 1 }],               // 百鬼夜行
      [{ dmg: 2 }, { oppHeal: 1 }],                        // 快枪三响
      [{ shield: 2, reflect: 1 }, { selfDmg: 1 }],         // 掩体伏击
      [{ dmg: 3, discard: 1 }, { selfDmg: 2 }],            // 最后通牒
      [{ dmg: 2, shield: 1 }, { selfDmg: 1 }],             // 星爆斩
      [{ heal: 2, draw: 1 }, { oppHeal: 1 }],              // 羁绊共鸣
      [{ dmg: 2, draw: 1 }, { selfDmg: 1, oppHeal: 1 }]    // 主角光环
    ]
  };

  const RARITIES = {
    common: { name: '普通', color: '#9aa2b3', weight: 1 },
    rare: { name: '稀有', color: '#65b7df', weight: 2 },
    epic: { name: '史诗', color: '#b48ce6', weight: 3 },
    legendary: { name: '传说', color: '#e8b86d', weight: 4 }
  };

  const CARD_FLAVOR = {
    attack: ['回廊记录：这一手通常只适合活着的人使用。', '守夜人批注：先出手，再解释。', '赌团估值：短期收益明显，长期看命。'],
    defense: ['回廊记录：所有防守都是在为下一手争取发言权。', '守夜人批注：盾不是懦弱，是账本上的余量。', '赌团估值：无聊，但能活。'],
    control: ['回廊记录：控制牌的价值不在伤害，而在让对方少一个选择。', '守夜人批注：看清手牌，比看清对手更重要。', '赌团估值：信息差永远比运气贵。'],
    risk: ['回廊记录：庄家最喜欢这一类卡，因为它们从不缺观众。', '守夜人批注：收益写在正面，代价通常写在背面。', '赌团估值：赔率漂亮，棺材也漂亮。'],
    style: ['回廊记录：这张牌记得自己来自哪一个世界。', '守夜人批注：风格不是装饰，是一个世界拒绝被同化的证据。', '赌团估值：八域限定，溢价合理。']
  };

  /* ---------------------------------------------------------
     6. 模式
     --------------------------------------------------------- */
  const MODES = [
    {
      id: 'standard', name: '标准对战', en: 'THE STANDARD TABLE', icon: '◉', accent: '#e8b86d',
      tagline: '五点生命，一枚硬币，三张手牌。', desc: '最纯粹的命途审判。1v1，每回合一张技能卡，抛币决定命运。可将对手换成人机或联机玩家。',
      badges: ['1v1', '5 HP', '整局 1 次逆写'], scene: 'setup', local: true
    },
    {
      id: 'brawl', name: '大乱斗', en: 'TAG-TEAM BRAWL', icon: '⛨', accent: '#d57f73',
      tagline: '倒下一个，另一个接着上。', desc: '每名玩家携带 2 名角色，各自保留生命与技能。每回合可免费切换一次上场角色，全灭才判负。',
      badges: ['1v1', '2 角色/人', '可切换'], scene: 'setup', local: true
    },
    {
      id: 'endless', name: '无尽赌徒', en: 'ENDLESS GAMBLER', icon: '∞', accent: '#e0a64d',
      tagline: '没有逆写，效果翻倍。', desc: '取消整局重抛权，所有技能卡与主动技的数值效果翻倍。更短、更疯、更接近庄家的口味。',
      badges: ['1v1', '效果 ×2', '无逆写'], scene: 'setup', local: true
    },
    {
      id: 'ai', name: '人机对战', en: 'THE PRACTICE ROOM', icon: '◎', accent: '#69c4c7',
      tagline: '三个档次的陪练，三种不同的坏脾气。', desc: '与 AI 对战。简单 AI 随机出牌；普通 AI 会看血线；困难 AI 计算收益、诱骗你的逆写并合理使用主动技。',
      badges: ['1v1', '3 档 AI', '会聊天'], scene: 'setup', local: true
    },
    {
      id: 'random', name: '随机卡组', en: 'THE SHUFFLED DECK', icon: '✦', accent: '#b48ce6',
      tagline: '全卡池洗牌，谁也别怪发牌。', desc: '从全部 150 张技能卡中随机生成牌库。双方卡组完全随机，适合快速体验不同流派。',
      badges: ['1v1', '全卡池', '不可预测'], scene: 'setup', local: true
    },
    {
      id: 'custom', name: '指定卡组', en: 'THE BUILDER', icon: '▤', accent: '#65b7df',
      tagline: '十张牌，写你自己的战术。', desc: '从 150 张技能卡中挑选 10 张组成卡组。开局抽取 3 张，之后每回合补至 3 张，弃牌堆循环。',
      badges: ['1v1', '自选 10 张', '构筑'], scene: 'setup', local: true
    },
    {
      id: 'team', name: '自由组队', en: 'BUILD YOUR OWN TABLE', icon: '⛓', accent: '#e18bb0',
      tagline: '1v1 到 4v4，人数由你定。', desc: '自由选择我方与敌方人数（1–4 人）。你与 AI 同注者并肩，空位由 AI 补齐。用自然语言下达进攻、防守、治疗或保留指令；AI 会判断合理性并给出回应。',
      badges: ['1v1–4v4', '自由人数', 'AI 同注者'], scene: 'setup', local: true
    },
    {
      id: 'quick', name: '快速模式', en: 'THE SHORT FUSE', icon: '↯', accent: '#d9695d',
      tagline: '三点生命，别浪费回合。', desc: '生命上限降为 3 点。节奏更快，斩杀线更低，一次成功的三伤攻击就可能结束对局。',
      badges: ['1v1', '3 HP', '快速'], scene: 'setup', local: true
    },
    {
      id: 'story', name: '剧情挑战', en: 'THE LAST CHAPTER', icon: '✧', accent: '#ffd391',
      tagline: '三个世界，三场申辩，一位庄家。', desc: '依次挑战黄铜弥撒、无声书页与最终庄家。Boss 拥有更高生命和特殊被动，失败可重试当前章节。',
      badges: ['3 章节', 'Boss 战', '世界观'], scene: 'setup', local: true
    },
    {
      id: 'mirror', name: '镜像审判', en: 'MIRROR VERDICT', icon: '◑', accent: '#a99bff', fun: true,
      tagline: '另一个你，拿着同一副牌。', desc: '双方使用同一名角色、同一套牌序。没有角色克制，没有卡组差距，只剩你如何面对自己的选择。',
      badges: ['1v1', '同角色', '同卡组'], scene: 'setup', local: true
    },
    {
      id: 'frenzy', name: '无限火力', en: 'OVERCLOCKED', icon: '⚡', accent: '#ff8a5c', fun: true,
      tagline: '一回合，三张牌，别留手。', desc: '每回合最多打出 3 张技能卡，牌库扩至 18 张。每一次抛币都会继续留在你的回合，直到你打完或主动收手。',
      badges: ['1v1', '每回合 3 张', '高速'], scene: 'setup', local: true
    },
    {
      id: 'sudden', name: '一币定生死', en: 'ONE COIN LEFT', icon: '☠', accent: '#ff6b6b', fun: true,
      tagline: '只有一点生命，治疗会变成护盾。', desc: '双方生命上限降为 1 点。任何一次成功伤害都会终结对局；治疗不再回血，而是转化为护盾。一次判定，就是全部。',
      badges: ['1 HP', '治疗转盾', '瞬杀'], scene: 'setup', local: true
    },
    {
      id: 'chain', name: '连锁赌注', en: 'DOUBLE OR NOTHING', icon: '⛓', accent: '#ffca5c', fun: true,
      tagline: '昭面越连，刀越重；昧面落下，债全还。', desc: '每次抛币成功累积 1 层连锁（最多 3 层），攻击伤害获得等量加成。抛币失败时连锁清零，并受到等同层数的直接反噬。',
      badges: ['连锁加伤', '失败反噬', '3 层上限'], scene: 'setup', local: true
    },
    {
      id: 'chaos', name: '混沌换手', en: 'THE GREAT SHUFFLE', icon: '✺', accent: '#72e0d1', fun: true,
      tagline: '每一轮，命运都替你重新洗牌。', desc: '每个新回合开始时，所有玩家弃掉手牌并重新抽至 3 张。牌序不再属于你，适应混乱的人才能活到最后。',
      badges: ['每轮换手', '全随机', '混乱'], scene: 'setup', local: true
    },
    {
      id: 'lan', name: '局域网联机', en: 'LAN P2P', icon: '⌁', accent: '#6dd6b7',
      tagline: '同一个房间号，面对面开桌。', desc: '使用 PeerJS WebRTC 建立点对点数据通道，房间号即暗号。支持房主设密码、选模式、加 AI 同注者。',
      badges: ['1v1', 'P2P', '房间密码'], scene: 'lobby', transport: 'peer'
    },
    {
      id: 'online', name: '公网联机', en: 'PUBLIC TABLE', icon: '◈', accent: '#6fa8ff',
      tagline: '跨过网络，把硬币抛给陌生人。', desc: '使用 Supabase 免费 Realtime 服务同步房间与对局状态。零服务器成本，填入项目地址与匿名 Key 即可启用。',
      badges: ['1v1', 'Supabase', '公网'], scene: 'lobby', transport: 'supabase'
    }
  ];

  /* ---------------------------------------------------------
     7. 剧情 Boss
     --------------------------------------------------------- */
  const STORY = {
    title: '最后的申辩',
    intro: '庄家给了八域三次申辩机会。每一次，你都要带着一名同注者走进不同的世界，在终章熔炉启动前赢下审判。',
    chapters: [
      {
        id: 'brass-mass', chapter: '第一章', title: '黄铜弥撒', realm: '黄铜穹顶', style: 'steam',
        bossName: '齿轮圣者·奥米伽', bossTitle: '始动之心的守炉人', hp: 7, ai: 'hard',
        bossPassive: 'ironhide', bossPassiveName: '圣械装甲',
        bossActive: { name: '万轮朝宗', uses: 2, effects: { dmg: 2, shield: 1 }, quote: '让每一枚齿轮回到它该在的位置。' },
        intro: '始动之心只剩下最后三转。奥米伽把整座城市的心跳接进自己的身体，要求你证明：不完美的结局也值得继续转动。',
        quote: '机器不会犹豫。你最好也不会。',
        objective: '击败齿轮圣者，保住始动之心最后一转。',
        reward: '解锁档案：黄铜穹顶 · 始动之心'
      },
      {
        id: 'silent-page', chapter: '第二章', title: '无声书页', realm: '万象书脊', style: 'anime',
        bossName: '墨蚀编辑·无名', bossTitle: '终章审校者', hp: 8, ai: 'hard',
        bossPassive: 'voidArmor', bossPassiveName: '空页护甲',
        bossActive: { name: '删改结局', uses: 2, effects: { discard: 2, dmg: 1 }, quote: '这一段不必要。删掉。' },
        intro: '无名编辑正在把八域的角色写进同一个结局。所有分支、伏笔、未说完的话，都被他用红笔划去。你手中的卡牌，是最后一批未被校对的句子。',
        quote: '故事需要一个干净的结尾。你们太吵了。',
        objective: '击败墨蚀编辑，保住分支结局。',
        reward: '解锁档案：万象书脊 · 未校对的最后一页'
      },
      {
        id: 'the-house', chapter: '终章', title: '庄家', realm: '回廊中庭', style: 'abyss',
        bossName: '命途织者', bossTitle: '庄家', hp: 9, ai: 'hard',
        bossPassive: 'houseEdge', bossPassiveName: '庄家优势',
        bossActive: { name: '终章熔炉', uses: 3, effects: { dmg: 1, seal: 1, choke: 1 }, quote: '所有故事，最后都该归我。' },
        intro: '回廊中庭没有牌桌，只有一枚悬在半空的巨大硬币。命途织者从硬币的影子里走出来，身后是八域被熔成一条的结局。',
        quote: '你以为你在选择？不，你只是我留给观众的最后一段悬念。',
        objective: '击败庄家，让八域保留各自不完美的结局。',
        reward: '结局档案：第三面'
      }
    ]
  };

  /* ---------------------------------------------------------
     8. 引擎辅助
     --------------------------------------------------------- */
  const ART_DIRECTIVE = '暗黑奇幻集换式卡牌插画，电影级布光，精致细节，构图留出卡框安全区，无文字，无水印，横版 4:3';

  function buildCharacter(raw, index) {
    const style = STYLES[raw.style];
    const passive = PASSIVES[raw.passiveKey];
    return Object.assign({}, raw, {
      index,
      hp: 5,
      maxHp: 5,
      styleName: style.name,
      realm: style.realm,
      roleKey: ROLE_META[raw.role].key,
      roleColor: ROLE_META[raw.role].color,
      passive: { key: raw.passiveKey, name: passive.name, desc: passive.desc },
      active: Object.assign({}, raw.active, { desc: effectText(raw.active.effects) }),
      artPrompt: `${ART_DIRECTIVE}。角色：${raw.name}，${raw.title}。世界观：${style.realm}。风格：${style.art}。气质：${String(raw.temper || '').replace(/[。！？!?；;]+$/, '')}。全身或半身英雄构图，轮廓清晰，背景可延展。`
    });
  }

  const CHARACTERS = RAW_CHARACTERS.map(buildCharacter);

  function effectText(effect) {
    if (!effect) return '';
    const parts = [];
    if (effect.dmg) parts.push(`造成 ${effect.dmg} 点${effect.pierce ? '无视护盾的' : ''}伤害`);
    if (effect.lifesteal) parts.push(`造成 ${effect.lifesteal} 点伤害并回复等量生命`);
    if (effect.heal) parts.push(`回复 ${effect.heal} 点生命`);
    if (effect.shield) parts.push(`获得 ${effect.shield} 点护盾`);
    if (effect.stealShield) parts.push(`夺取对手全部护盾`);
    if (effect.draw) parts.push(`抽 ${effect.draw} 张牌`);
    if (effect.discard) parts.push(`令对手随机弃 ${effect.discard} 张牌`);
    if (effect.strip) parts.push('击碎对手护盾');
    if (effect.choke) parts.push(`令对手下回合少抽 ${effect.choke} 张牌`);
    if (effect.seal) parts.push('令对手下回合无法使用主动技');
    if (effect.bless) parts.push('令下一次抛币必定成功');
    if (effect.bless2) parts.push('令接下来两次抛币必定成功');
    if (effect.hpBurn) parts.push(`令对手下回合开始时受到 ${effect.hpBurn} 点伤害`);
    if (effect.oppHeal) parts.push(`对手回复 ${effect.oppHeal} 点生命`);
    if (effect.oppShield) parts.push(`对手获得 ${effect.oppShield} 点护盾`);
    if (effect.oppDraw) parts.push(`对手抽 ${effect.oppDraw} 张牌`);
    if (effect.selfDmg) parts.push(`自身受到 ${effect.selfDmg} 点伤害`);
    if (effect.selfDiscard) parts.push(`自身随机弃 ${effect.selfDiscard} 张牌`);
    if (effect.power) parts.push(`本回合下一次造成的伤害 +${effect.power}`);
    if (effect.weak) parts.push(`令对手下回合造成的伤害 -${effect.weak}`);
    if (effect.guard) parts.push('本回合第一次受到的伤害 -1');
    if (effect.reflect) parts.push('本回合第一次受击时反弹伤害');
    if (effect.energize) parts.push('下回合可额外打出 1 张技能卡');
    return parts.join('，') + '。';
  }

  const RARITY_KEYS = ['common', 'rare', 'epic', 'legendary'];
  const CARDS = [];

  Object.keys(CARD_SEEDS).forEach(function (category) {
    CARD_SEEDS[category].forEach(function (seed, index) {
      const name = seed[0];
      const styleId = seed[1];
      const style = STYLES[styleId];
      const pair = CARD_TEMPLATES[category][index % CARD_TEMPLATES[category].length];
      const rarityKey = RARITY_KEYS[index % RARITY_KEYS.length];
      const rarity = RARITIES[rarityKey];
      const id = `${category}-${String(index + 1).padStart(3, '0')}`;
      const flavor = CARD_FLAVOR[category][index % CARD_FLAVOR[category].length];
      const card = {
        id, name, category, categoryName: CATEGORIES[category].name,
        style: styleId, styleName: style.name, realm: style.realm,
        rarity: rarityKey, rarityName: rarity.name, rarityColor: rarity.color,
        posEffects: pair[0], negEffects: pair[1],
        posText: effectText(pair[0]), negText: effectText(pair[1]),
        flavor,
        artPrompt: `${ART_DIRECTIVE}。卡牌：「${name}」。类型：${CATEGORIES[category].name}。世界观：${style.realm}（${style.name}）。视觉：${style.art}；${CATEGORIES[category].art}。稀有度气质：${rarity.name}。卡面允许出现象征性法器或角色剪影，但不要出现可辨认的现有 IP 角色。`
      };
      CARDS.push(card);
    });
  });

  /* ---------------------------------------------------------
     6b. 24 张新卡（v2.0 显式定义，含新效果键与 combo）
     --------------------------------------------------------- */
  const NEW_CARD_DEFS = [
    // attack +4
    { id: 'attack-031', name: '过载铁拳', style: 'neon', cat: 'attack', pos: { dmg: 2, power: 1 }, neg: { selfDmg: 1 }, combo: 'attack' },
    { id: 'attack-032', name: '裂誓之刃', style: 'fantasy', cat: 'attack', pos: { dmg: 2, weak: 1 }, neg: { selfDmg: 1 }, combo: 'attack' },
    { id: 'attack-033', name: '断更预告', style: 'anime', cat: 'attack', pos: { dmg: 1, draw: 2 }, neg: { oppDraw: 1 }, combo: 'attack' },
    { id: 'attack-034', name: '左轮审判', style: 'west', cat: 'attack', pos: { dmg: 2, draw: 1 }, neg: { selfDmg: 2 }, combo: 'attack' },
    // defense +4
    { id: 'defense-031', name: '义体冷却', style: 'neon', cat: 'defense', pos: { heal: 2, guard: 1 }, neg: { selfDiscard: 1 }, combo: 'defense' },
    { id: 'defense-032', name: '誓约壁垒', style: 'fantasy', cat: 'defense', pos: { shield: 2, guard: 1 }, neg: { selfDmg: 1 }, combo: 'defense' },
    { id: 'defense-033', name: '主角休息日', style: 'anime', cat: 'defense', pos: { heal: 1, energize: 1 }, neg: { oppDraw: 1 }, combo: 'defense' },
    { id: 'defense-034', name: '金库铁门', style: 'west', cat: 'defense', pos: { shield: 1, reflect: 1 }, neg: { oppHeal: 1 }, combo: 'defense' },
    // control +4
    { id: 'control-031', name: '病毒注入', style: 'neon', cat: 'control', pos: { seal: 1, weak: 1 }, neg: { selfDmg: 1 }, combo: 'control' },
    { id: 'control-032', name: '圣印封魔', style: 'fantasy', cat: 'control', pos: { choke: 1, discard: 1 }, neg: { oppDraw: 1 }, combo: 'control' },
    { id: 'control-033', name: '改稿通知', style: 'anime', cat: 'control', pos: { draw: 2, discard: 1 }, neg: { selfDiscard: 1 }, combo: 'control' },
    { id: 'control-034', name: '收缴枪械', style: 'west', cat: 'control', pos: { strip: 1, choke: 1 }, neg: { selfDmg: 1 }, combo: 'control' },
    // risk +4
    { id: 'risk-031', name: '赛博轮盘', style: 'neon', cat: 'risk', pos: { dmg: 2, draw: 2 }, neg: { selfDmg: 2, oppDraw: 1 }, combo: 'risk' },
    { id: 'risk-032', name: '背誓之赌', style: 'fantasy', cat: 'risk', pos: { dmg: 3, shield: 1 }, neg: { selfDmg: 2, oppShield: 1 }, combo: 'risk' },
    { id: 'risk-033', name: '剧情暴走', style: 'anime', cat: 'risk', pos: { dmg: 2, heal: 2 }, neg: { selfDmg: 2, oppHeal: 1 }, combo: 'risk' },
    { id: 'risk-034', name: '亡命加注', style: 'west', cat: 'risk', pos: { dmg: 3, power: 1 }, neg: { selfDmg: 3 }, combo: 'risk' },
    // style +8
    { id: 'style-031', name: '庄家之眼', style: 'west', cat: 'style', pos: { draw: 2, bless: 1 }, neg: { selfDiscard: 2 } },
    { id: 'style-032', name: '铸币秘术', style: 'steam', cat: 'style', pos: { stealShield: 1, draw: 1 }, neg: { oppDraw: 1, selfDiscard: 1 } },
    { id: 'style-033', name: '血月祈祷', style: 'wa', cat: 'style', pos: { lifesteal: 2, hpBurn: 1 }, neg: { selfDmg: 2 } },
    { id: 'style-034', name: '逆写悖论', style: 'abyss', cat: 'style', pos: { bless2: 1, dmg: 1 }, neg: { selfDmg: 2, oppDraw: 1 } },
    { id: 'style-035', name: '义体暴走', style: 'neon', cat: 'style', pos: { dmg: 3, power: 1 }, neg: { selfDmg: 2 } },
    { id: 'style-036', name: '灰誓', style: 'fantasy', cat: 'style', pos: { shield: 2, guard: 1, heal: 1 }, neg: { selfDiscard: 1, oppDraw: 1 } },
    { id: 'style-037', name: '终章草稿', style: 'anime', cat: 'style', pos: { draw: 3 }, neg: { selfDiscard: 2 } },
    { id: 'style-038', name: '亡命轮盘', style: 'west', cat: 'style', pos: { dmg: 2, draw: 1, bless: 1 }, neg: { selfDmg: 2, selfDiscard: 1 } }
  ];

  NEW_CARD_DEFS.forEach(function (def, i) {
    const style = STYLES[def.style];
    const rarityKey = RARITY_KEYS[(30 + i) % RARITY_KEYS.length];
    const rarity = RARITIES[rarityKey];
    const flavor = CARD_FLAVOR[def.cat][i % CARD_FLAVOR[def.cat].length];
    const card = {
      id: def.id, name: def.name, category: def.cat, categoryName: CATEGORIES[def.cat].name,
      style: def.style, styleName: style.name, realm: style.realm,
      rarity: rarityKey, rarityName: rarity.name, rarityColor: rarity.color,
      posEffects: def.pos, negEffects: def.neg,
      posText: effectText(def.pos), negText: effectText(def.neg),
      combo: def.combo || null,
      flavor,
      artPrompt: `${ART_DIRECTIVE}。卡牌：「${def.name}」。类型：${CATEGORIES[def.cat].name}。世界观：${style.realm}（${style.name}）。视觉：${style.art}；${CATEGORIES[def.cat].art}。稀有度气质：${rarity.name}。`
    };
    CARDS.push(card);
  });

  /* ---------------------------------------------------------
     硬币皮肤（10 套）
     --------------------------------------------------------- */
  const COIN_SKINS = [
    { id: 'bronze', name: '青铜', trait: '平衡：无加成', playbackRate: 1.0, glow: '#c8a06a', particle: '#d8b878' },
    { id: 'silver', name: '白银', trait: '每回合第一次抛币失败时获得 1 护盾', playbackRate: 1.06, glow: '#d8e0e8', particle: '#eef2f8' },
    { id: 'gold', name: '黄金', trait: '抛币成功后 15% 概率免费再抛一次', playbackRate: 1.12, glow: '#ffd35c', particle: '#ffe89a' },
    { id: 'amethyst', name: '紫晶', trait: '每回合第一次抛币成功时抽 1 张牌', playbackRate: 1.04, glow: '#c88be8', particle: '#e0b8ff' },
    { id: 'jade', name: '翡翠', trait: '开局获得 1 护盾；每回合第一次成功时再得 1 护盾', playbackRate: 0.96, glow: '#7fe0b8', particle: '#a8f0d0' },
    { id: 'bloodmoon', name: '血月', trait: '造成的吸血效果数值 +1', playbackRate: 0.9, glow: '#e85a5a', particle: '#ff8a7a' },
    { id: 'obsidian', name: '黑曜', trait: '开局多抽 1 张手牌', playbackRate: 0.94, glow: '#8a6ad8', particle: '#b89aff' },
    { id: 'frost', name: '霜晶', trait: '每回合第一次受到的伤害 -1（最少 1）', playbackRate: 1.1, glow: '#a8e0f0', particle: '#d8f4ff' },
    { id: 'molten', name: '熔心', trait: '每回合打出的第一张攻击牌伤害 +1', playbackRate: 0.92, glow: '#ff7a3c', particle: '#ffb06a' },
    { id: 'bone', name: '龙骨', trait: '每局一次，濒死时保留 1 点生命', playbackRate: 0.86, glow: '#e0dcc8', particle: '#f0ecdc' }
  ];

  const BOSSES = STORY.chapters.map(function (chapter) {
    const style = STYLES[chapter.style];
    return {
      id: 'boss-' + chapter.id,
      name: chapter.bossName,
      title: chapter.bossTitle,
      style: chapter.style,
      realm: style.realm,
      role: 'Boss',
      hp: chapter.hp,
      passive: { key: chapter.bossPassive, name: chapter.bossPassiveName, desc: PASSIVES[chapter.bossPassive].desc },
      active: Object.assign({}, chapter.bossActive, { desc: effectText(chapter.bossActive.effects) }),
      chapter: chapter.chapter,
      storyTitle: chapter.title,
      temper: '不可谈判。',
      quote: chapter.quote,
      artPrompt: `${ART_DIRECTIVE}。Boss：${chapter.bossName}，${chapter.bossTitle}。${style.realm}。${style.art}。宏大压迫感，逆光，卡牌Boss立绘。`
    };
  });

  const DATA = {
    version: '2.0.0',
    title: '命途回廊',
    subtitle: 'COINFALL',
    STYLES, STYLE_ORDER, WORLD, PASSIVES, CHARACTERS, ROLE_META,
    CATEGORIES, CARDS, RARITIES, MODES, STORY, BOSSES, COIN_SKINS,
    effectText,
    byId: {
      character: function (id) { return CHARACTERS.find(function (c) { return c.id === id; }); },
      card: function (id) { return CARDS.find(function (c) { return c.id === id; }); },
      mode: function (id) { return MODES.find(function (m) { return m.id === id; }); },
      boss: function (id) { return BOSSES.find(function (b) { return b.id === id; }); },
      style: function (id) { return STYLES[id]; }
    },
    cardsByCategory: function (category) { return CARDS.filter(function (c) { return c.category === category; }); },
    cardsByStyle: function (style) { return CARDS.filter(function (c) { return c.style === style; }); },
    charactersByStyle: function (style) { return CHARACTERS.filter(function (c) { return c.style === style; }); },
    randomCharacters: function (n, rng) {
      const pool = CHARACTERS.slice();
      const out = [];
      while (out.length < n && pool.length) {
        const i = Math.floor((rng ? rng() : Math.random()) * pool.length);
        out.push(pool.splice(i, 1)[0]);
      }
      return out;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  root.CF_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);