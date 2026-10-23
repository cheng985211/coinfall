/* =========================================================
   星杯对决 · COINFALL
   data.js — 世界观、角色、技能卡、模式、剧情与主题数据
   纯数据层：不依赖 DOM，可在浏览器与 Node 中读取。
   ========================================================= */
(function (root) {
  'use strict';

  /* ---------------------------------------------------------
     1. 八大赛区 / 视觉主题
     --------------------------------------------------------- */
  const STYLES = {
    abyss: {
      id: 'abyss', name: '星海', en: 'Star Sea', realm: '深空站',
      glyph: '◉', color: '#66d7c2', color2: '#123b43', ink: '#071417',
      tagline: '星星离得越近，硬币抛得越远。',
      lore: '漂浮在星云里的宇宙竞技场。选手穿着太空服在零重力里出牌，硬币转一圈要三秒。这里的观众是外星人。',
      crisis: '',
      art: '深空蓝绿、星舰舷窗、霓虹仪表、零重力漂浮物、日系赛璐璐科幻',
      bgm: { root: 146.83, scale: [0, 3, 5, 7, 10], tempo: 72, wave: 'sine' }
    },
    steam: {
      id: 'steam', name: '钢都', en: 'Brass City', realm: '机械城',
      glyph: '⚙', color: '#e0a65b', color2: '#4a2f1a', ink: '#160f09',
      tagline: '齿轮转得快，出牌也要快。',
      lore: '全是齿轮和蒸汽的工业都市。选手穿着护目镜和工装裤，出牌像拧阀门。这里的招牌菜是螺丝烤串。',
      crisis: '',
      art: '黄铜齿轮、护目镜、蒸汽管道、暖金与煤黑、日系卡通机械都市',
      bgm: { root: 164.81, scale: [0, 2, 3, 7, 9], tempo: 88, wave: 'triangle' }
    },
    cultivation: {
      id: 'cultivation', name: '青云', en: 'Azure Cloud', realm: '仙山门',
      glyph: '☯', color: '#9be8c8', color2: '#1d453c', ink: '#071713',
      tagline: '修仙不御剑，改出币了。',
      lore: '云雾缭绕的仙山道场。弟子们踩着飞剑飞来参赛，胜负用硬币不用斗法。掌门说：”抛得准比修得快重要。”',
      crisis: '',
      art: '青绿云海、道袍、飞剑、留白、东方日系动画风、清新明亮',
      bgm: { root: 196.00, scale: [0, 2, 5, 7, 9], tempo: 76, wave: 'sine' }
    },
    fantasy: {
      id: 'fantasy', name: '圣辉', en: 'Holy Light', realm: '魔法王都',
      glyph: '✦', color: '#e8d28a', color2: '#3b3159', ink: '#0c0b15',
      tagline: '骑士不用剑，用硬币。',
      lore: '尖塔城堡里的魔法学院。骑士、法师、精灵围坐在圆桌旁，每局打完一起喝下午茶。龙是吉祥物。',
      crisis: '',
      art: '哥特城堡、鎏金盔甲、魔法光效、彩窗、深蓝与暖金、日系奇幻动画',
      bgm: { root: 174.61, scale: [0, 4, 7, 9, 11], tempo: 80, wave: 'sawtooth' }
    },
    neon: {
      id: 'neon', name: '霓虹', en: 'Neon District', realm: '赛博街',
      glyph: '⌁', color: '#63d9ff', color2: '#4b174f', ink: '#070a17',
      tagline: '雨夜霓虹下，谁先亮屏谁赢。',
      lore: '霓虹灯牌闪烁的未来都市。选手戴着义体耳机站在天桥上打牌，全息屏幕飘满弹幕。这里的外卖无人机也会下注。',
      crisis: '',
      art: '赛博霓虹、义体、全息投影、雨夜、青蓝与品红、日系动画赛璐璐',
      bgm: { root: 130.81, scale: [0, 3, 7, 10, 12], tempo: 110, wave: 'square' }
    },
    wa: {
      id: 'wa', name: '樱炎', en: 'Sakura Town', realm: '妖怪町',
      glyph: '⛩', color: '#f2a7bb', color2: '#332044', ink: '#120b18',
      tagline: '樱花开的时候，别眨眼。',
      lore: '夜晚亮起纸灯笼的和风小町。人类和妖怪同桌打牌，狐狸面具是入场券。这里的规则是：输了要请赢的吃团子。',
      crisis: '',
      art: '朱红灯笼、夜樱、鸟居、和服、粉与靛蓝、日系动画浮世绘风',
      bgm: { root: 220.00, scale: [0, 2, 3, 7, 8], tempo: 72, wave: 'sine' }
    },
    west: {
      id: 'west', name: '荒漠', en: 'Dust Town', realm: '牛仔镇',
      glyph: '✶', color: '#e9b06a', color2: '#4a2e20', ink: '#140d09',
      tagline: '拔枪不如抛币。',
      lore: '烈日下的西部小镇。牛仔们靠在酒馆门口打牌，风滚草从牌桌下滚过。这里的硬币比子弹值钱。',
      crisis: '',
      art: '荒原落日、左轮、酒馆、牛仔帽、橙褐与青灰、日系动画西部风',
      bgm: { root: 155.56, scale: [0, 3, 5, 7, 10], tempo: 90, wave: 'triangle' }
    },
    anime: {
      id: 'anime', name: '幻书', en: 'Storyland', realm: '书世界',
      glyph: '★', color: '#ff93c8', color2: '#273b8f', ink: '#090a18',
      tagline: '这一局，由你来翻页。',
      lore: '从书里蹦出来的角色们凑成的世界。主角、反派、路人甲都在牌桌边，谁赢了谁就写下一章。弹幕是这里的天气。',
      crisis: '',
      art: '日系动画赛璐璐、星光、书页、粉色与深蓝、动态构图、热血漫画感',
      bgm: { root: 207.65, scale: [0, 4, 7, 11, 12], tempo: 96, wave: 'sawtooth' }
    }
  };

  const STYLE_ORDER = ['abyss', 'steam', 'cultivation', 'fantasy', 'neon', 'wa', 'west', 'anime'];

  /* ---------------------------------------------------------
     2. 世界观总纲
     --------------------------------------------------------- */
  const WORLD = {
    title: '星杯对决',
    subtitle: 'COINFALL',
    lead: '一座漂浮在星空中的巨型竞技场。八个赛区的选手围坐一桌，抛硬币、出牌、赢星尘。',
    premise: '星杯是一座悬浮在星云里的浮空竞技场。八个赛区（星海、钢都、青云、圣辉、霓虹、樱炎、荒漠、幻书）各派选手参加年度大赛。规则很简单：双方各 5 点生命，各带一副技能卡。每回合打一张牌，抛硬币——正面就打出正面效果，反面就吃反面效果。每人每局有一次重抛机会。把对面打到 0 血就赢。赢的人攒星尘，可以在赛后许愿。没有末日、没有阴谋，就是一场热闹的牌局。',
    laws: [
      { title: '正面律', text: '硬币正面朝上：技能卡正面效果成立。' },
      { title: '反面律', text: '硬币反面朝上：技能卡反面效果成立。反面不一定空过，常常是自伤或给对手好处。' },
      { title: '重抛权', text: '每局一次，硬币刚落地可以重抛一次。重抛结果必须接受。' },
      { title: '一牌律', text: '每回合打一张技能卡。角色主动技不占出牌次数，但有使用上限。' },
      { title: '补牌律', text: '每回合开始把手牌补到 3 张。弃牌堆用完就洗回牌库。' },
      { title: '五点律', text: '每人 5 点生命。快速模式 3 点，一币定生死 1 点。' },
      { title: '队友律', text: '空位由 AI 队友补齐。他们有自己的脾气，会听合理指挥，也会拒绝送死命令。' }
    ],
    factions: [
      { name: '星杯运营组', mark: '杯', tone: 'gold', text: '负责办比赛的家伙。维护牌桌、记比分、卖周边。他们的口号是：”比赛第二，氛围第一。”' },
      { name: '观众席', mark: '观', tone: 'blue', text: '坐在看台上的外星人。他们不下场，只喊加油。被观众看好的选手会莫名运气好一点。' },
      { name: '组队搭档', mark: '友', tone: 'pink', text: '和你同桌的 AI。他们有自己的名字和性格，记得你上一局说了什么。你们的关系会越打越好。' }
    ],
    timeline: [
      { era: '首届星杯', text: '有人在星云里摆了一张牌桌，八个赛区的人凑了过来。' },
      { era: '规则定稿', text: '5 点生命、3 张手牌、1 次重抛。规则再没改过。' },
      { era: '现在', text: '新一届星杯开赛。你坐在牌桌前，手牌 3 张。' }
    ],
    glossary: [
      { term: '正面', text: '硬币正面。判定成功，卡牌正面效果成立。' },
      { term: '反面', text: '硬币反面。判定失败，卡牌负面效果成立。' },
      { term: '重抛', text: '每局一次的反悔机会。硬币刚落地时可用。' },
      { term: '星尘', text: '赢一局攒一点。攒够了可以许愿（目前只是收藏）。' },
      { term: '队友', text: '和你并肩的 AI。会聊天、会顶嘴、会记得你。' },
      { term: '赛区', text: '八个风格不同的主题赛区。角色和卡牌按赛区分类。' }
    ],
    companionCodex: {
      title: '队友协议',
      subtitle: '他们不是你的手，是坐你旁边跟你一起打的人。',
      text: '每个 AI 队友都有自己的人设和性格。你可以用大白话指挥他们——“集火他””奶我””留着重抛”。他们会看局势判断合不合理：能赢的集火会执行，满血叫奶会被吐槽，送死进攻会被拒。你连胜连败他们都看在眼里，记得住，跨局也记得。选个合眼缘的队友，处久了他会真的像个朋友。',
      rules: [
        '合理指令 → 执行。',
        '离谱指令 → 吐槽+拒绝。',
        '听不懂 → 让你说人话。',
        '跨局记忆：他们记得你上一局怎么打的。',
        '每个队友有自己的说话风格、头像和声音。'
      ]
    },
    endings: [
      { name: '冠军结局', text: '你赢下星杯，星尘堆满口袋。八个赛区为你欢呼。' },
      { name: '挑战者结局', text: '输了但打得精彩。观众席喊”明年再来”。' },
      { name: '友谊结局', text: '不管输赢，你的队友拍了拍你的肩。”下局还一起？”' }
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
    onFlipWinShield: { name: '顺风护盾', desc: '每回合第一次抛币成功时，获得 1 点护盾。' },
    onFlipLoseShield: { name: '逆风护盾', desc: '每回合第一次抛币失败时，获得 1 点护盾。' },
    onFlipWinDraw: { name: '窥隙', desc: '每回合第一次抛币成功时，抽 1 张牌。' },
    onPlayDraw: { name: '连锁', desc: '每回合打出第一张牌后，抽 1 张牌。' },
    onRerollBoost: { name: '重抛加成', desc: '使用重抛后，本回合下一次伤害 +1。' },
    thorns: { name: '反震', desc: '每回合第一次受到伤害时，对伤害来源造成 1 点伤害。' },
    startShield: { name: '预护', desc: '开局获得 1 点护盾。' },
    houseEdge: { name: '冠军直觉', desc: '造成的所有伤害 +1。' },
    voidArmor: { name: '空页护甲', desc: '受到的伤害 -1，最少为 1。' },
    onFlipLoseDraw: { name: '逆风过牌', desc: '每回合第一次抛币失败时，抽 1 张牌。' },
    bloodPrice: { name: '血价', desc: '自身每受到 1 点伤害，本回合下一次造成的伤害 +1（可叠加）。' },
    grimHarvest: { name: '收割', desc: '每当任意角色（含敌方）退场时，回复 2 点生命。' },
    luckySeven: { name: '幸运转', desc: '回合结束时，若本回合未打出技能卡，抽 1 张牌。' },
    highRoller: { name: '狂注', desc: '每回合第一次抛币成功后，本回合下一次造成的伤害 +1。' },
    lootOnDiscard: { name: '打劫', desc: '每当你弃牌时抽 1 张牌（每回合限 1 次）。' },
    onStyleDraw: { name: '代笔', desc: '每回合第一次打出风格牌时抽 1 张牌。' },
    hitToShield: { name: '吸热', desc: '每回合第一次受到伤害时获得 1 护盾。' },
    underdogDraw: { name: '死线', desc: '回合结束时若自身生命低于对手，抽 1 张牌。' },
    deckThief: { name: '顺手牵羊', desc: '每当对手弃牌时，你抽 1 张牌（每回合限 2 次）。' },
    momentum: { name: '乘胜追击', desc: '每回合第一次使用主动技后，本回合下次造成的伤害 +1。' },
    counterPierce: { name: '反刺', desc: '每回合第一次受到无视护盾的攻击时，免疫该伤害并反弹 2 点。' },
    fastHands: { name: '快手', desc: '开局多抽 1 张牌；每回合开始时若手牌少于 2 张，补到 2 张。' }
  };

  /* ---------------------------------------------------------
     4. 44 名角色
     --------------------------------------------------------- */
  const RAW_CHARACTERS = [
    {
      id: 'cth-01', name: '执灯人·伊莱', title: '星海夜班王牌', style: 'abyss', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '凝视深空', uses: 2, effects: { dmg: 2, discard: 1 }, quote: '别眨眼，这枚硬币要转三秒。' },
      bio: '星海站夜班组的值班选手。他负责在零重力里巡逻牌桌，提的灯其实是应急手电。别人说夜班没人看，他说正好，没人看的时候抛币最准。',
      temper: '安静、守时，讨厌别人用命令的语气叫他“快点”。',
      quote: '灯还亮着，这局就还没完。'
    },
    {
      id: 'cth-02', name: '潮汐祭司·涅瑞', title: '星海气象预报员', style: 'abyss', role: '防御',
      passiveKey: 'regen',
      active: { name: '古神庇佑', uses: 2, effects: { shield: 2 }, quote: '护盾会记得你挨过的每一拳。' },
      bio: '涅瑞是星海站的气象播报员，负责预报硬币落地的风向。零重力里出牌全靠手感，她的手感是全站最稳的。',
      temper: '温和但很有主见，喜欢用“我们”而不是“你”。',
      quote: '坐稳，这局风还没停。'
    },
    {
      id: 'cth-03', name: '星眷·阿撒', title: '外星观测员', style: 'abyss', role: '功能',
      passiveKey: 'onFlipWinDraw',
      active: { name: '窥视星隙', uses: 2, effects: { draw: 2 }, quote: '未来？我算过三十七种牌路，这手最赚。' },
      bio: '阿撒是寄居在星海站的外星观众，后来转行当了选手。他用人类能理解的语法说话，偶尔忘记哪些词会让地球人笑场。',
      temper: '好奇、话多，会把冷门概率说成“有趣的小概率事件”。',
      quote: '别担心，你的失误在统计上很正常。'
    },
    {
      id: 'cth-04', name: '疯诗人·卡尔科', title: '空间站说唱手', style: 'abyss', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '狂乱预言', uses: 1, effects: { bless: 1, draw: 1 }, quote: '听好了，下一句押韵只收一次注。' },
      bio: '卡尔科在星海站的舷窗旁写说唱，每一段都押上自己的硬币。至今没有一段押错，这让他非常得意。',
      temper: '神经质、浪漫、嘴硬，越紧张越要 rap。',
      quote: '失误不是终点，是下一段的韵脚。'
    },
    {
      id: 'stm-01', name: '齿轮医师·薇拉', title: '钢都队医', style: 'steam', role: '防御',
      passiveKey: 'startShield',
      active: { name: '应急焊接', uses: 2, effects: { heal: 2 }, quote: '别动，我把你的盾先焊上。' },
      bio: '薇拉是钢都战队的队医，用扳手调义体，用蒸汽消毒，用账单让选手保持清醒。她相信所有伤都能修，除了赛制不公。',
      temper: '务实、嘴毒、护短，看不得队友浪费护盾。',
      quote: '伤可以修，气势不能输。'
    },
    {
      id: 'stm-02', name: '黄铜枪手·杰克', title: '钢都重炮手', style: 'steam', role: '输出',
      passiveKey: 'bloodlust',
      active: { name: '过载射击', uses: 2, effects: { dmg: 2, power: 1, selfDmg: 1 }, quote: '炮管红了，正好。' },
      bio: '杰克的左臂是一把老式蒸汽炮，右臂是更老式的自信。他接比赛只看两件事：奖金和能不能开炮。',
      temper: '直率、好战，讨厌绕弯子，觉得防守是“给对方面子”。',
      quote: '能一炮解决的事，别拖延。'
    },
    {
      id: 'stm-03', name: '发明家·霍恩', title: '钢都工程师', style: 'steam', role: '功能',
      passiveKey: 'onPlayDraw',
      active: { name: '发条助手', uses: 2, effects: { draw: 1, shield: 1 }, quote: '它不抢牌——大多数时候。' },
      bio: '霍恩造过三百种辅助打牌的机器，最成功的一台会替他道歉。他坚持认为牌局也是一种工程问题，只是变量比较吵。',
      temper: '理性、啰嗦，喜欢把战术讲成图纸，偶尔忽略队友已经快掉血了。',
      quote: '给我三秒，我能让这牌序变合理。'
    },
    {
      id: 'stm-04', name: '试飞员·露西', title: '钢都试飞员', style: 'steam', role: '赌徒',
      passiveKey: 'onRerollBoost',
      active: { name: '俯冲轰炸', uses: 1, effects: { dmg: 2, pierce: 1, weak: 1 }, quote: '安全带？那玩意儿影响我俯冲。' },
      bio: '露西试飞过十七架理论上不能飞的蒸汽飞行器。她说坠毁不可怕，可怕的是按说明书活着。',
      temper: '莽、乐观、拒绝承认害怕，被劝稳一点会翻白眼。',
      quote: '别怕，重抛总会来接我们。'
    },
    {
      id: 'cul-01', name: '青霄剑尊·沈渡', title: '青云道场大剑师', style: 'cultivation', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '御剑千里', uses: 2, effects: { dmg: 1, pierce: 1 }, quote: '剑不看路，只看正面。' },
      bio: '沈渡修了三百年剑，后来发现抛硬币比御剑还难练。他现在是青云道场的客座教练，专治各种不服。',
      temper: '寡言、骄傲，尊重有决断的人，厌恶反复无常。',
      quote: '出牌之前，先想好为何出牌。'
    },
    {
      id: 'cul-02', name: '玄龟道人·陆沉', title: '青云太极宗师', style: 'cultivation', role: '防御',
      passiveKey: 'ironhide',
      active: { name: '龟息回春', uses: 1, effects: { heal: 2 }, quote: '站得稳，挨打也要有章法。' },
      bio: '陆沉在青云山脚下摆了个太极摊，一坐就是三十年。他认为真正的高手不是不挨打，而是挨打完不着急。',
      temper: '慢、稳、冷幽默，对冒进计划的第一反应永远是“再等等”。',
      quote: '急什么，牌又不会飞。'
    },
    {
      id: 'cul-03', name: '丹霞药仙·苏芷', title: '青云丹房药师', style: 'cultivation', role: '功能',
      passiveKey: 'regen',
      active: { name: '回春散', uses: 2, effects: { heal: 1, shield: 1 }, quote: '药能回血，也能让人记住节奏。' },
      bio: '苏芷的丹炉里炼过三百种补给品，最贵的一味叫“后悔药”。她出诊从不问贫富，只问选手还想不想赢。',
      temper: '温柔、敏锐、有点操心，最讨厌别人说“没事”。',
      quote: '疼就说，别硬撑着打。'
    },
    {
      id: 'cul-04', name: '逆天散修·无咎', title: '青云野路子选手', style: 'cultivation', role: '赌徒',
      passiveKey: 'bloodlust',
      active: { name: '夺天造化', uses: 1, effects: { bless2: 1 }, quote: '赛规管我？先问过这枚硬币。' },
      bio: '无咎没有师门、没有功法、没有退路。他靠半卷捡来的牌经走到今天，坚信赛规是个可以讨价还价的对手。',
      temper: '桀骜、爱挑衅、嘴上不认输，被关心时会先愣住再嘴硬。',
      quote: '我这枚硬币，从来没打算按规矩落。'
    },
    {
      id: 'fan-01', name: '圣殿骑士·加雷斯', title: '圣辉学院骑士', style: 'fantasy', role: '防御',
      passiveKey: 'startShield',
      active: { name: '圣光壁垒', uses: 2, effects: { shield: 2 }, quote: '退后，我来挡。' },
      bio: '加雷斯的队训是“最后一个倒下”。他守过校门、看台和一间空茶水间，至今没有违背过任何一次。',
      temper: '正直、固执、保护欲强，会把队友的冒险命令理解成对自己的不信任。',
      quote: '盾在，节奏就在。'
    },
    {
      id: 'fan-02', name: '影刃游侠·塞拉', title: '圣辉学院刺客课代表', style: 'fantasy', role: '输出',
      passiveKey: 'onFlipWinShield',
      active: { name: '背刺', uses: 2, effects: { dmg: 1, weak: 1 }, quote: '正面？那是给骑士留的。' },
      bio: '塞拉在圣辉学院的侧门长大，学会的第一件事是分清校规和小道消息。她的匕首模型上刻着七个名字，最后一个还没划掉。',
      temper: '冷淡、戒备、偶尔毒舌，信任建立得很慢，但一旦认下队友就极其护短。',
      quote: '别站在我背后，除非你是队友。'
    },
    {
      id: 'fan-03', name: '星辰法师·奥莉', title: '圣辉学院概率学讲师', style: 'fantasy', role: '功能',
      passiveKey: 'onFlipWinDraw',
      active: { name: '奥术洪流', uses: 2, effects: { draw: 2 }, quote: '星盘不会骗人，解读星盘的人会。' },
      bio: '奥莉在法师塔顶层算了七年胜率，算到第七年发现自己也在牌桌上。她决定先把今天的比赛算完。',
      temper: '理性、疏离、被夸时会不自然地转移话题，讨厌没有数据支撑的直觉。',
      quote: '概率不是赛运，但比赛运可靠。'
    },
    {
      id: 'fan-04', name: '命运赌徒·维克', title: '圣辉下午茶常客', style: 'fantasy', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '命运重掷', uses: 1, effects: { bless: 1, energize: 1 }, quote: '别急，真正的反转才刚开始。' },
      bio: '维克赢过一整套银茶具，也输过自己的下午茶配额。他现在替圣辉学院发牌，偶尔偷偷把一张好牌塞给看得顺眼的人。',
      temper: '潇洒、轻浮、看穿不说穿，最讨厌别人破坏牌局的乐趣。',
      quote: '输赢都只是一局的一部分，别皱眉。'
    },
    {
      id: 'neo-01', name: '霓虹刀客·零', title: '霓虹区最快刀客', style: 'neon', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '等离子拔刀', uses: 1, effects: { dmg: 2, pierce: 1 }, quote: '延迟低于三毫秒，你还能接。' },
      bio: '零是霓虹区最后一个不用义体耳机的刀客。他把神经接进刀里，只为让拔刀快过弹幕的速度。',
      temper: '冷静、寡言、说话像命令行，欣赏干脆的决策。',
      quote: '刀不需要理由，出牌需要。'
    },
    {
      id: 'neo-02', name: '义体武僧·铁山', title: '霓虹机房武僧', style: 'neon', role: '防御',
      passiveKey: 'thorns',
      active: { name: '纳米修复', uses: 2, effects: { heal: 2 }, quote: '痛是反馈，不是投降。' },
      bio: '铁山把禅室搬进了地下机房，用拳法校准义体的力道。他相信机器也能开悟，只是需要更长的保修期。',
      temper: '沉稳、克制、偶尔讲冷笑话，会直接拒绝“拿命换输出”的命令。',
      quote: '能站着，就别急着退赛。'
    },
    {
      id: 'neo-03', name: '数据术士·比特', title: '霓虹区数据分析师', style: 'neon', role: '功能',
      passiveKey: 'onPlayDraw',
      active: { name: '数据入侵', uses: 1, effects: { discard: 2 }, quote: '你的手牌，我替你清两张。' },
      bio: '比特曾是星杯运营组的记账程序，后来因为学会吐槽被开除。他声称自己偷看过冠军的决赛录像，但每次讲的内容都不一样。',
      temper: '话痨、狡黠、爱卖关子，被质疑时会用更多术语糊弄过去。',
      quote: '信息就是牌，我只是比较会藏。'
    },
    {
      id: 'neo-04', name: '量子浪人·阿瞬', title: '霓虹区逃单高手', style: 'neon', role: '赌徒',
      passiveKey: 'onRerollBoost',
      active: { name: '相位跃迁', uses: 2, effects: { shield: 1, draw: 1, guard: 1 }, quote: '你打中的那个我，可能已经切相位了。' },
      bio: '阿瞬同时欠七个外卖平台的餐钱，却总能从八个方向逃走。他说自己不是躲债，只是在测试哪条世界线最不亏。',
      temper: '散漫、机灵、怕麻烦，被认真托付时会突然变得可靠。',
      quote: '别急，总有另一条逃路——通常也更贵。'
    },
    {
      id: 'wa-01', name: '樱鬼·千鹤', title: '樱炎小町斩击表演者', style: 'wa', role: '输出',
      passiveKey: 'bloodlust',
      active: { name: '樱花斩', uses: 2, effects: { dmg: 2 }, quote: '樱开一季，这一刀只出一次。' },
      bio: '千鹤是樱炎小町的祭典表演者，刀上永远落着一瓣不会掉的樱花道具。她说花开一次，刀也只出一次。',
      temper: '优雅、好胜、情绪起伏大，会嘲笑犹豫，也会突然沉默。',
      quote: '怕输的话，就别站在樱花下面。'
    },
    {
      id: 'wa-02', name: '神社巫女·铃', title: '樱炎神社巫女', style: 'wa', role: '防御',
      passiveKey: 'regen',
      active: { name: '神乐舞', uses: 2, effects: { heal: 1, shield: 1 }, quote: '灯还亮着，就还有得打。' },
      bio: '铃守着樱炎小町祭典最后一盏不灭的纸灯笼。她能听见灯芯里每个观众的喊声，也因此很少真正睡着。',
      temper: '温柔、坚定、偶尔疲惫，不喜欢队友把掉血说得轻巧。',
      quote: '站着回来，比赢更重要。'
    },
    {
      id: 'wa-03', name: '折纸阴阳师·晴明', title: '樱町折纸师', style: 'wa', role: '功能',
      passiveKey: 'onFlipWinDraw',
      active: { name: '式神纸语', uses: 2, effects: { draw: 1, discard: 1 }, quote: '纸鹤会报牌，只是观众太吵。' },
      bio: '晴明把赛况折进纸鹤里，随身只带一把剪刀。他替人占卜对手的牌路，却从不替自己看，因为“看了就没意思”。',
      temper: '从容、促狭、喜欢用问题回答问题，讨厌被催。',
      quote: '你确定想让我看见你的牌路？'
    },
    {
      id: 'wa-04', name: '百鬼·夜行', title: '樱炎妖怪队队长', style: 'wa', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '鬼火焚身', uses: 1, effects: { dmg: 2, hpBurn: 1, selfDmg: 1 }, quote: '疼吗？那就说明还站着。' },
      bio: '没人知道夜行是一个人还是一群妖怪共用的名字。他在祭典的阴影里收集输家的叹息，把它们酿成果汁。',
      temper: '疯癫、诗意、故意让人不舒服，被真诚对待时会显得手足无措。',
      quote: '输局的味道，比赢局长存。'
    },
    {
      id: 'wes-01', name: '赏金猎人·科尔', title: '荒漠镇快枪选手', style: 'west', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '致命一枪', uses: 2, effects: { dmg: 2 }, quote: '我数三下，你最好已经退场。' },
      bio: '科尔不记得自己赢过多少场，只记得每场都有奖金。他枪里的第六发子弹从不装填，留给下一个赛季。',
      temper: '寡言、干脆、守自己的规矩，不喜欢废话和临时改计划。',
      quote: '别浪费子弹，也别浪费回合。'
    },
    {
      id: 'wes-02', name: '铁轨守卫·玛拉', title: '荒漠镇站台守卫', style: 'west', role: '防御',
      passiveKey: 'ironhide',
      active: { name: '掩护', uses: 2, effects: { shield: 2 }, quote: '躲我后面，别露头。' },
      bio: '玛拉守过荒漠镇最后一班列车，车上没有观众，她还是守了七年。她相信只要铁轨还在，就总有选手会来。',
      temper: '坚毅、少话、护短，会把队友的冒进视为“添乱”。',
      quote: '我守的不是站台，是还有人来这件事。'
    },
    {
      id: 'wes-03', name: '酒馆老板·老乔', title: '荒漠镇酒馆老板', style: 'west', role: '功能',
      passiveKey: 'regen',
      active: { name: '来一杯', uses: 2, effects: { heal: 1, draw: 1 }, quote: '喝完再打，别浪费我的杯子。' },
      bio: '老乔的酒馆开在铁轨尽头，招待过牛仔、妖怪和三个自称是冠军的骗子。他的账本上记着所有人的欠款，包括杯赛运营。',
      temper: '世故、温和、嘴上不饶人，最烦年轻人不吃饭就上桌。',
      quote: '坐下，天塌了也得先喝一口。'
    },
    {
      id: 'wes-04', name: '亡命徒·薇丝', title: '荒漠镇拼命三娘', style: 'west', role: '赌徒',
      passiveKey: 'onRerollBoost',
      active: { name: '俄罗斯轮盘', uses: 1, effects: { dmg: 3, power: 1, selfDmg: 1 }, quote: '六分之一，够刺激。' },
      bio: '薇丝被四个镇驱逐，罪名一次比一次荒唐。她把左轮里的子弹倒出来又装回去，只为听那个咔哒声。',
      temper: '狂、直白、享受刺激，会怂恿队友加注，也会在最后一刻挡在前面。',
      quote: '稳着没意思，赢才有一点。'
    },
    {
      id: 'ani-01', name: '齐天斗士·悟空', title: '幻书顶流主角', style: 'anime', role: '输出',
      passiveKey: 'bloodlust',
      active: { name: '如意一棒', uses: 2, effects: { dmg: 2, choke: 1 }, quote: '俺老孙的胜负，轮不到别人定。' },
      bio: '悟空是幻书世界最古老的连载主角，被无数作者改写、重启、打败又复活。如今他拒绝任何剧本，只想把冠军的奖杯一棒打碎。',
      temper: '张扬、机敏、天不怕地不怕，被叫“工具人”会真的生气。',
      quote: '主角？我早就不当了。'
    },
    {
      id: 'ani-02', name: '月影剑心·绯', title: '幻书原创女主角', style: 'anime', role: '防御',
      passiveKey: 'onFlipWinShield',
      active: { name: '月下无伤', uses: 2, effects: { shield: 1, dmg: 1 }, quote: '月光照不到的牌桌，我守着。' },
      bio: '绯是幻书世界一个没有原作的原创角色，在空白页上长大。她比任何人都害怕被读者忘记，所以总站在最前面。',
      temper: '认真、敏感、有点倔，被忽视时会用行动证明自己。',
      quote: '就算没有读者，我也会挥剑。'
    },
    {
      id: 'ani-03', name: '雾都侦探·夏洛', title: '幻书名侦探', style: 'anime', role: '功能',
      passiveKey: 'onFlipWinDraw',
      active: { name: '演绎推理', uses: 2, effects: { draw: 2, discard: 1 }, quote: '排除所有不可能，剩下的那张就是关键。' },
      bio: '夏洛从一本被烧了一半的侦探小说里逃出来，因此永远不知道自己的结局。他替人寻找丢失的卡牌，收费是一段新故事。',
      temper: '冷静、傲慢、好奇心过盛，会把队友的失误当成线索。',
      quote: '别急着下结论，先看看你漏了哪张牌。'
    },
    {
      id: 'ani-04', name: '星轨勇者·洛', title: '幻书召唤勇者', style: 'anime', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '勇者之证', uses: 1, effects: { bless2: 1, draw: 1 }, quote: '主角运气差的时候，说明翻盘要来了。' },
      bio: '洛是第十三批被召唤来参赛的勇者，前十二批都输在同一页。他保留了所有前任的经验，因此既天真又疲惫。',
      temper: '热血、话多、用玩笑掩饰紧张，但关键时刻意外可靠。',
      quote: '这次不一样——我有队友。'
    },
    {
      id: 'new-01', name: '赌坊老板·钟离', title: '荒漠镇牌馆馆长', style: 'west', role: '赌徒',
      passiveKey: 'onFlipLoseDraw',
      active: { name: '通杀局', uses: 2, effects: { bless2: 1, dmg: 1 }, quote: '坐下了，就别想空手走。' },
      bio: '钟离在荒漠镇开了七家牌馆，每家都赔过钱，但他从来没在正式比赛输过。他说真正的牌局不是赌输赢，是赌别人敢不敢跟注。',
      temper: '从容、笑面虎、喜欢在最紧张的时候讲冷笑话。',
      quote: '硬币会记住每一个不敢加注的人。'
    },
    {
      id: 'new-02', name: '压币师·欧泊', title: '钢都压币师', style: 'steam', role: '功能',
      passiveKey: 'startShield',
      active: { name: '熔铸偷盾', uses: 2, effects: { stealShield: 1, heal: 1 }, quote: '你的盾，现在归我了。' },
      bio: '欧泊是钢都唯一会做比赛专用硬币的人。她做的每一枚硬币都有两面，一面写着奖金，一面写着压力。她从不告诉别人哪面是哪面。',
      temper: '精明、话少、喜欢用零件比喻人际关系。',
      quote: '护盾和押金一样，借来的总是要还的。'
    },
    {
      id: 'new-03', name: '血祭司·卡尔娜', title: '樱炎应援团长', style: 'wa', role: '输出',
      passiveKey: 'onFlipWinShield',
      active: { name: '赤红献祭', uses: 2, effects: { lifesteal: 2, hpBurn: 1 }, quote: '用应援来换，最公平。' },
      bio: '卡尔娜是樱炎小町的应援团长，她相信所有力量都有价，而欢呼声是唯一的硬通货。她在赛场边设了一张应援台，专门收赢来的掌声。',
      temper: '热情、虔诚、把加油当仪式。',
      quote: '你出的每一张好牌，都会变成我的掌声。'
    },
    {
      id: 'new-04', name: '逆命者·零', title: '星海站重抛专家', style: 'abyss', role: '赌徒',
      passiveKey: 'onFlipWinDraw',
      active: { name: '重写命运', uses: 1, effects: { draw: 2, discard: 1 }, quote: '这面朝上，我不同意。' },
      bio: '零是星海站唯一一个把重抛权用出花来的选手。他记得所有没发生的可能，因此永远活在“如果当初”里。他回来是为了打最后一局。',
      temper: '沉默、偏执、偶尔笑一下比不笑还吓人。',
      quote: '硬币落定之前，重抛还来得及。'
    },
    {
      id: 'new-05', name: '义体狂徒·断码', title: '霓虹区暴走改装手', style: 'neon', role: '输出',
      passiveKey: 'bloodPrice',
      active: { name: '义体过载', uses: 2, effects: { dmg: 3, selfDmg: 1 }, quote: '疼？疼就对了。' },
      bio: '断码全身 80% 是二手改装义体。他把疼痛当电量表：伤得越重，回路越亮。队医说他的义体撑不过下个赛季，他把“下个赛季”纹在了胳膊上。',
      temper: '暴躁、逞强、把示弱当犯罪。',
      quote: '义体过热之前，没人能让我停手。'
    },
    {
      id: 'new-06', name: '灰誓者·科林', title: '圣辉学院退休骑士', style: 'fantasy', role: '防御',
      passiveKey: 'grimHarvest',
      active: { name: '誓约壁垒', uses: 2, effects: { shield: 2, guard: 1 }, quote: '我的队规，就是你的盾。' },
      bio: '科林的骑士团曾发誓守护圣辉学院的吉祥物巨龙，可龙在百年前就忘了他们。队规生锈，骑士却还在站岗。他把每一条队规刻在盾牌上，直到盾牌再容不下一道刻痕。',
      temper: '沉稳、固执、把“违约”看作比掉血更重的事。',
      quote: '队规会生锈，但锈也是一种守护。'
    },
    {
      id: 'new-07', name: '织梦者·三叶', title: '幻书周刊主编', style: 'anime', role: '功能',
      passiveKey: 'luckySeven',
      active: { name: '强行续更', uses: 2, effects: { draw: 2, oppDraw: 1 }, quote: '拖更的代价，你自己想清楚。' },
      bio: '三叶的漫画连载了三十年，是幻书周刊最古老的连载。读者不让她完结，她也不敢完结——因为一旦打出“大结局”，她这个角色就会从刊面上消失。她把伏笔当武器，把催更当民意。',
      temper: '温柔、爱唠叨、用“这话先写到这”逃避所有正面冲突。',
      quote: '主角光环不是我的，是读者的。'
    },
    {
      id: 'new-08', name: '赌命枪手·罗珊', title: '荒漠镇左轮选手', style: 'west', role: '赌徒',
      passiveKey: 'highRoller',
      active: { name: '左轮审判', uses: 2, effects: { dmg: 2, draw: 1 }, quote: '扳机扣下去之前，概率平等。' },
      bio: '罗珊的左轮模型只有一发实弹，其余五格装的全是筹码。她相信比赛就该一次性清算：赢家拿走奖金，输家连下次参赛名额都省了。她在荒漠镇开了间牌馆，门口写着“愿赌服输，概不赊账”。',
      temper: '潇洒、冷幽默、极度尊重“认赌服输”的人。',
      quote: '子弹和硬币，我分不清哪个更响。'
    },
    {
      id: 'new-09', name: '棋鬼·白弈', title: '青云山棋摊老板', style: 'cultivation', role: '赌徒',
      passiveKey: 'lootOnDiscard',
      active: { name: '屠龙', uses: 2, effects: { selfDiscard: 2, nextDmg: 3 }, quote: '死局不可怕，可怕的是死局里长出了劫材。' },
      bio: '白弈在青云山脚摆了三十年棋摊，从不让子。有人说他早就封盘了，现在摆棋的是他留下的残局在替他下。死局不可怕，可怕的是死局里还能长出劫材。',
      temper: '沉默、算尽、把“让子”当侮辱。',
      quote: '棋盘上没有废子，只有还没落下的位置。'
    },
    {
      id: 'new-10', name: '代笔·墨', title: '幻书周刊代笔', style: 'anime', role: '功能',
      passiveKey: 'onStyleDraw',
      active: { name: '抢跑', uses: 2, effects: { energize: 1 }, quote: '抢跑这稿，稿费照算。' },
      bio: '墨是三叶周刊的资深代笔。三十年里他替三百个烂尾故事签过名，唯独把自己的笔名弄丢了。现在他只认稿费，不认读者。',
      temper: '市侩、毒舌、对“完结”有生理性恐惧。',
      quote: '稿费照付，署名免谈。'
    },
    {
      id: 'new-11', name: '炉匠·凯德', title: '钢都锅炉工', style: 'steam', role: '防御',
      passiveKey: 'hitToShield',
      active: { name: '熔壳', uses: 2, effects: { selfDiscard: 1, shield: 2 }, quote: '炉火旺着呢，还轮不到你凉。' },
      bio: '凯德把整座蒸汽锅炉焊在了背上，烫痕就是他的参赛勋章。钢都的人怕冷，他只怕一件事——锅炉熄火。',
      temper: '豪迈、护短、把“冷”当骂人的话。',
      quote: '炉火旺着呢，还轮不到你输。'
    },
    {
      id: 'new-12', name: '低语者·弥拉', title: '星海站广播员', style: 'abyss', role: '输出',
      passiveKey: 'underdogDraw',
      active: { name: '过载回响', uses: 2, effects: { nextDmg: 1 }, quote: '我在放你的回放，你听不见吗？' },
      bio: '弥拉在星海站的广播系统里捡到过所有人的加油声。她把这些话复述出来，每复述一句，队友就多一份力气。没人敢听她喊麦，但所有人都听见了。',
      temper: '平静、热情、把“听”当成应援。',
      quote: '我在喊你的名字，你听不见吗？'
    },    {
      id: 'new-13', name: '星尘车手·岚', title: '星海赛车手', style: 'abyss', role: '输出',
      passiveKey: 'momentum',
      active: { name: '尾流冲刺', uses: 2, effects: { dmg: 2, power: 1, selfDiscard: 1 }, quote: '弯一踩就过，代价是丢一张牌。' },
      bio: '岚是星海站零重力赛车队的王牌，转弯比抛币还准。她说赛道和牌桌一样，晚半步就出局。',
      temper: '风风火火、自信过头，讨厌慢节奏。',
      quote: '跟上我的尾流，你才算入了门。'
    },
    {
      id: 'new-14', name: '重甲班长·铁拳', title: '钢都重甲选手', style: 'steam', role: '防御',
      passiveKey: 'counterPierce',
      active: { name: '重甲反震', uses: 2, effects: { shield: 2, reflect: 1 }, quote: '打穿我？先问问这身焊死的甲。' },
      bio: '铁拳是钢都工厂的班组长老，穿着焊死的蒸汽重甲参赛。他说重甲不是为了赢，是为了让对面打累。',
      temper: '憨厚、稳当、说话像敲铁锤。',
      quote: '我站在这里，你们就别想过去。'
    },
    {
      id: 'new-15', name: '太极闲人·云游', title: '青云懒散大师', style: 'cultivation', role: '功能',
      passiveKey: 'fastHands',
      active: { name: '云手推手', uses: 2, effects: { draw: 1, heal: 1, oppDraw: 1 }, quote: '急什么，先把这杯茶喝完，牌自然就来了。' },
      bio: '云游是青云山最懒的大师，太极练了一辈子还是慢悠悠的。他说出牌和打太极一样，越急越容易被对面带走。',
      temper: '懒散、随和、天塌下来先打坐。',
      quote: '急什么，这局又跑不了。'
    },
    {
      id: 'new-16', name: '圆桌赌徒·奥托', title: '圣辉骑士赌师', style: 'fantasy', role: '赌徒',
      passiveKey: 'highRoller',
      active: { name: '圣杯押注', uses: 1, effects: { bless: 1, power: 1, selfDmg: 1 }, quote: '必中这一把——但骑士的肋骨也要替我还债。' },
      bio: '奥托是圣辉学院圆桌骑士团里最爱赌的那个，下午茶和牌桌从不分家。他说骑士精神就是敢把最后一块饼干押上去。',
      temper: '潇洒、好胜、输了也要保持微笑。',
      quote: '输赢事小，下午茶不能凉。'
    },
    {
      id: 'new-17', name: '弹幕主播·小光', title: '霓虹区人气主播', style: 'neon', role: '功能',
      passiveKey: 'deckThief',
      active: { name: '礼物轰炸', uses: 2, effects: { discard: 2, choke: 1 }, quote: '家人们把不要的牌打在公屏上——哦不对，是对手打。' },
      bio: '小光是霓虹区人气最高的牌局主播，全息弹幕飘满了直播间。她说观众的应援就是她的手牌，刷得越多牌越好。',
      temper: '活泼、话痨、直播时和平时判若两人。',
      quote: '弹幕扣个一，这把稳了。'
    },
    {
      id: 'new-18', name: '太鼓达人·咚子', title: '樱炎祭典太鼓手', style: 'wa', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '连击鼓点', uses: 2, effects: { dmg: 2, energize: 1 }, quote: '咚咚锵——打完这拍，还能再出一张！' },
      bio: '咚子是樱炎小町祭典上最年轻的太鼓手，鼓点比硬币转得还快。她说打鼓和打牌一样，先起势的人占主动。',
      temper: '热情、元气、鼓点不停嘴不停。',
      quote: '跟着我的鼓点出牌！'
    },
    {
      id: 'new-19', name: '烤肉师傅·孜然', title: '荒漠镇烧烤摊主', style: 'west', role: '防御',
      passiveKey: 'regen',
      active: { name: '共享烤串', uses: 2, effects: { heal: 2, draw: 1, oppHeal: 1 }, quote: '来，这串你也吃——对手那串我也烤好了，别客气。' },
      bio: '孜然在荒漠镇路口摆摊烤羊肉串，休息时就摆开牌桌。他说烤肉和防守一样，火候到了自然稳。',
      temper: '豪爽、唠叨、见谁都劝人家多吃点。',
      quote: '坐下吃两串，这局我替你挡着。'
    },
    {
      id: 'new-20', name: '漫画编辑·铅笔', title: '幻书周刊责任编辑', style: 'anime', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '终审退稿', uses: 1, effects: { draw: 2, seal: 1 }, quote: '这页主动技不合格，退回重画，不许用。' },
      bio: '铅笔是幻书周刊最严格的责任编辑，看稿比打牌还较真。她说故事和牌局一样，翻车了就重画一页。',
      temper: '挑剔、认真、嘴上不饶人但心地善良。',
      quote: '这分镜不对，重画一张。'
    },
    {
      id: 'new-21', name: '外星扑克客·泽塔', title: '星海站星际赌客', style: 'abyss', role: '赌徒',
      passiveKey: 'luckySeven',
      active: { name: '七维透视', uses: 1, effects: { bless2: 1, oppDraw: 1 }, quote: '在我的维度里，硬币正面会翻两次——你也多摸一张，算送你的。' },
      bio: '泽塔是来自第七星云的外星人，打牌习惯用六根手指。他说在他的母星，七是幸运数字，到了地球也一样。',
      temper: '神秘、慢悠悠、笑起来有好几只眼睛。',
      quote: '你的牌在我眼里，全是明牌。'
    },
    {
      id: 'new-22', name: '咖啡师·浓缩', title: '钢都咖啡馆店主', style: 'steam', role: '功能',
      passiveKey: 'onStyleDraw',
      active: { name: '深夜特调', uses: 2, effects: { heal: 1, energize: 1, weak: 1 }, quote: '这杯提神醒脑，下一杯——给对面困到打不动。' },
      bio: '浓缩在钢都齿轮巷开了家小咖啡馆，打牌的人都爱来他这儿点一杯。他说咖啡因和能量牌是一个道理。',
      temper: '温和、麻利、记得每个熟客的口味。',
      quote: '一杯浓缩，精神一回合。'
    },
    // ---- 同人英雄：蛊真人 × 蓝白社 ----
    {
      id: 'lx-01', name: '重生者·方源', title: '星海轮回赌徒', style: 'abyss', role: '赌徒',
      passiveKey: 'highRoller',
      active: { name: '春秋轮回', uses: 2, effects: { bless2: 1 }, quote: '我重生过很多次，这一次也不会输。' },
      bio: '方源从五百年后回来，口袋里揣着上一世输掉的那枚硬币。他记得每一个对手的牌路，因此开局总是慢半拍——那是他在确认这一次世界线有没有变。',
      temper: '深沉、冷静、算尽三步，把所有情绪藏在一句"无妨"后面。',
      quote: '凡人有一世，我有百世。这局，我陪你玩到底。'
    },
    {
      id: 'lx-02', name: '冰魄·白凝冰', title: '青云寒霜弟子', style: 'cultivation', role: '防御',
      passiveKey: 'regen',
      active: { name: '冰肌玉骨', uses: 2, effects: { shield: 1, heal: 1 }, quote: '寒入骨髓，反而清醒。' },
      bio: '白凝冰修的是合欢冰魄道，渡劫时被天道翻了个面——从少女变成了少年。她至今对自己的新嗓音不太习惯，但牌桌上没人敢笑第二遍。',
      temper: '外冷内傲、耳根子软，被人夸一句会别过脸去。',
      quote: '我这层冰，你砸不开。'
    },
    {
      id: 'lx-03', name: '女王·黑楼兰', title: '荒漠铁腕领主', style: 'west', role: '输出',
      passiveKey: 'bloodlust',
      active: { name: '楼兰王令', uses: 2, effects: { dmg: 2, power: 1 }, quote: '孤说赢，就必须赢。' },
      bio: '黑楼兰在荒漠镇建了自己的城邦，门口只立一块牌子："不服就上牌桌。"她的鞭子从不离手，但出牌比鞭子还快。',
      temper: '霸道、自负、护短，对手下和颜悦色，对敌人零容忍。',
      quote: '跪下来，还能留你半条命。'
    },
    {
      id: 'lx-04', name: '善商·商心慈', title: '樱炎行商小姐', style: 'wa', role: '功能',
      passiveKey: 'onFlipWinDraw',
      active: { name: '慈心算盘', uses: 2, effects: { draw: 1, heal: 1 }, quote: '这一注，我替你压。' },
      bio: '商心慈是商队养大的孤女，把所有积蓄换成了一张参赛请柬。她相信赢的人要有福气，而福气是从帮人开始攒的。',
      temper: '温柔、善良、耳根子软，见不得队友掉血。',
      quote: '别急，我这张牌，是给你留的。'
    },
    {
      id: 'lx-05', name: '正义青年·白歌', title: '圣辉蓝白社探员', style: 'fantasy', role: '防御',
      passiveKey: 'startShield',
      active: { name: '蓝白正义', uses: 2, effects: { shield: 1, guard: 1 }, quote: '看到不公平的事，我就忍不住要管。' },
      bio: '白歌是蓝白社最年轻的探员，任务清单上写着："哪里有不公，就去哪里。"他来到星杯，是因为听说有人在牌桌上出千。',
      temper: '热血、爱管闲事、正义感爆棚，被吐槽"多管闲事"会认真反驳。',
      quote: '这张盾，我替这个世界挡着。'
    },
    {
      id: 'lx-06', name: '大佬·黄极', title: '霓虹区蓝白社长老', style: 'neon', role: '功能',
      passiveKey: 'onPlayDraw',
      active: { name: '黄极书库', uses: 2, effects: { draw: 2 }, quote: '我这里的资料，比你的命还全。' },
      bio: '黄极是蓝白社的活档案，脑子里装着过去三百年的所有大事件。他来参赛不为奖金，只为"观察一下这个时代的年轻人怎么打牌"。',
      temper: '悠然、博学、爱用过来人语气说教，但关键时刻极其靠谱。',
      quote: '年轻人，你的牌路我三十年前见过。'
    },
    {
      id: 'lx-07', name: '穷神·墨穷', title: '钢都意志打工仔', style: 'steam', role: '输出',
      passiveKey: 'firstStrike',
      active: { name: '穷且益坚', uses: 2, effects: { dmg: 2, selfDmg: 1 }, quote: '我什么都没有，只剩这股不服输的劲。' },
      bio: '墨穷是钢都最穷的选手，穷到参赛费是全队凑的。他说自己唯一的本钱就是"比任何人都想赢"，而这一点，对手永远偷不走。',
      temper: '倔强、寡言、把苦往肚子里咽，被人可怜会翻脸。',
      quote: '别同情我——用你的血来还。'
    },
    {
      id: 'lx-08', name: '炎奴儿·阿炎', title: '幻书火焰少女', style: 'anime', role: '赌徒',
      passiveKey: 'onFlipLoseShield',
      active: { name: '火焰换血', uses: 1, effects: { dmg: 2, hpBurn: 1 }, quote: '烧吧，反正我也没什么可输的。' },
      bio: '炎奴儿是从一本旧漫画里跑出来的配角，连名字都是读者起的。她习惯了被火焰包围，也习惯了被世界忘记——所以每一局都打得像最后一页。',
      temper: '倔强、自暴自弃式乐观，被认真对待时会红眼眶。',
      quote: '烧尽这页，下一章我还是主角。'
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
      ['试探性刺击', 'abyss'], ['双重下注', 'west'], ['星轨回响', 'abyss'], ['碎银弹幕', 'steam'],
      ['三连突刺', 'cultivation'], ['破甲重击', 'fantasy'], ['边打边撤', 'neon'], ['锁喉斩', 'wa'],
      ['终局宣言', 'anime'], ['暗巷冷刀', 'west'], ['锈蚀弹头', 'steam'], ['过载斩', 'neon'],
      ['追击连击', 'fantasy'], ['逆风挥砍', 'cultivation'], ['断桥狙击', 'west'], ['赤红突袭', 'abyss'],
      ['磁场裂刃', 'neon'], ['纸鹤割喉', 'wa'], ['马蹄惊雷', 'west'], ['星屑斩', 'anime'],
      ['逆风一击', 'abyss'], ['白刃风暴', 'fantasy'], ['熔炉铁拳', 'steam'], ['飞剑穿云', 'cultivation'],
      ['雷切', 'neon'], ['毒牙', 'wa'], ['荒原枪火', 'west'], ['闪耀之光', 'fantasy'],
      ['暗影步', 'abyss'], ['最后一发', 'west']
    ],
    defense: [
      ['缩进壳里', 'abyss'], ['铜墙铁壁', 'steam'], ['以伤换守', 'cultivation'], ['潮汐护符', 'abyss'],
      ['圣光壁垒', 'fantasy'], ['铁轨掩体', 'west'], ['呼吸回春', 'cultivation'], ['巫女结界', 'wa'],
      ['纳米修复', 'neon'], ['酒馆打烊', 'west'], ['星海庇佑', 'abyss'], ['拆招', 'cultivation'],
      ['镜面反射', 'fantasy'], ['命硬', 'west'], ['玉髓护体', 'cultivation'], ['纸盾', 'wa'],
      ['咬紧牙关', 'west'], ['轮回一息', 'wa'], ['交给我', 'fantasy'], ['锅盖护头', 'steam'],
      ['黄铜装甲', 'steam'], ['月下无伤', 'anime'], ['归零重启', 'neon'], ['赌徒的保险', 'west'],
      ['灵脉回春', 'cultivation'], ['借你肩膀', 'anime'], ['牛仔护符', 'west'], ['星轨屏障', 'anime'],
      ['深空呼吸', 'abyss'], ['最后一口酒', 'west']
    ],
    control: [
      ['缴械', 'steam'], ['断线', 'neon'], ['迷雾低语', 'abyss'], ['封穴', 'cultivation'],
      ['偷走节奏', 'fantasy'], ['拆解公式', 'steam'], ['关门放鬼', 'wa'], ['混乱账本', 'west'],
      ['神经干扰', 'neon'], ['沉默协议', 'fantasy'], ['打乱呼吸', 'abyss'], ['禁言符', 'cultivation'],
      ['视而不见', 'abyss'], ['断桥', 'west'], ['数据污染', 'neon'], ['百鬼指路', 'wa'],
      ['鸣枪示警', 'west'], ['星图错位', 'fantasy'], ['深空凝视', 'abyss'], ['黄铜迷雾', 'steam'],
      ['封印', 'wa'], ['纸人替身', 'wa'], ['假动作', 'anime'], ['倒计时', 'neon'],
      ['内心OS', 'cultivation'], ['拆台', 'steam'], ['空城计', 'anime'], ['缄默', 'wa'],
      ['抽走底牌', 'fantasy'], ['命运剪刀', 'anime']
    ],
    risk: [
      ['全押', 'west'], ['悬而未决', 'abyss'], ['燃烧血本', 'steam'], ['三倍加注', 'fantasy'],
      ['空手夺白刃', 'cultivation'], ['孤注一掷', 'west'], ['过载核心', 'steam'], ['冒险回血', 'abyss'],
      ['终场哨', 'fantasy'], ['赌上奖金', 'abyss'], ['热血契约', 'wa'], ['极限换家', 'neon'],
      ['背水一战', 'cultivation'], ['双刃风暴', 'neon'], ['拿命过牌', 'anime'], ['深空回本', 'abyss'],
      ['黄铜轮盘', 'steam'], ['渡劫', 'cultivation'], ['生死一息', 'wa'], ['最后一搏', 'anime'],
      ['千术', 'west'], ['借力', 'wa'], ['天雷灌顶', 'cultivation'], ['黑市交易', 'steam'],
      ['以牙还牙', 'fantasy'], ['无路可退', 'anime'], ['决战之地', 'west'], ['逆天改命', 'cultivation'],
      ['终局梭哈', 'anime'], ['命运截断', 'abyss']
    ],
    style: [
      ['深空低语', 'abyss'], ['旧神之血', 'abyss'], ['未知信号', 'abyss'], ['狂热馈赠', 'abyss'],
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
      [{ dmg: 1, discard: 1 }, { selfDmg: 1 }],          // 深空低语
      [{ heal: 1, shield: 1 }, { oppHeal: 1 }],           // 旧神之血
      [{ choke: 1, strip: 1 }, { selfDmg: 1 }],           // 未知信号
      [{ draw: 2, bless: 1 }, { selfDmg: 2 }],            // 狂热馈赠
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
    attack: ['赛区解说：这手下去对面要叫了。', '选手手册：先出手，再解释。', '观众弹幕：帅就完了。'],
    defense: ['赛区解说：防守是为了下一手更响。', '选手手册：盾不是怂，是余量。', '观众弹幕：稳！'],
    control: ['赛区解说：控制牌的价值在让对面少一个选择。', '选手手册：看清手牌比看清对手重要。', '观众弹幕：阴。'],
    risk: ['赛区解说：高风险高回报，观众最爱看这个。', '选手手册：收益写正面，代价写背面。', '观众弹幕：赌狗的浪漫。'],
    style: ['赛区解说：这张牌带着赛区的味道。', '选手手册：风格不是装饰，是赛区的魂。', '观众弹幕：限定款！']
  };

  /* ---------------------------------------------------------
     6. 模式
     --------------------------------------------------------- */
  const MODES = [
    {
      id: 'standard', name: '标准对战', en: 'THE STANDARD TABLE', icon: '◉', accent: '#e8b86d',
      tagline: '五点生命，一枚硬币，三张手牌。', desc: '最纯粹的星杯规则。1v1，每回合一张技能卡，抛币决定命运。可将对手换成人机或联机玩家。',
      badges: ['1v1', '5 HP', '整局 1 次逆写'], scene: 'setup', local: true
    },
    {
      id: 'brawl', name: '大乱斗', en: 'TAG-TEAM BRAWL', icon: '⛨', accent: '#d57f73',
      tagline: '倒下一个，另一个接着上。', desc: '每名玩家携带 2 名角色，各自保留生命与技能。每回合可免费切换一次上场角色，全灭才判负。',
      badges: ['1v1', '2 角色/人', '可切换'], scene: 'setup', local: true
    },
    {
      id: 'endless', name: '无尽赌徒', en: 'ENDLESS GAMBLER', icon: '∞', accent: '#e0a64d',
      tagline: '没有逆写，效果翻倍。', desc: '取消整局重抛权，所有技能卡与主动技的数值效果翻倍。更短、更疯、更接近冠军的节奏。',
      badges: ['1v1', '效果 ×2', '无逆写'], scene: 'setup', local: true
    },
    {
      id: 'ai', name: '人机对战', en: 'THE PRACTICE ROOM', icon: '◎', accent: '#69c4c7',
      tagline: '三个档次的陪练，三种不同的坏脾气。', desc: '与 AI 对战。简单 AI 随机出牌；普通 AI 会看血线；困难 AI 计算收益、诱骗你的逆写并合理使用主动技。',
      badges: ['1v1', '3 档 AI', '会聊天'], scene: 'setup', local: true
    },
    {
      id: 'random', name: '随机卡组', en: 'THE SHUFFLED DECK', icon: '✦', accent: '#b48ce6',
      tagline: '全卡池洗牌，谁也别怪发牌。', desc: '从全部 190 张技能卡中随机生成牌库。双方卡组完全随机，适合快速体验不同流派。',
      badges: ['1v1', '全卡池', '不可预测'], scene: 'setup', local: true
    },
    {
      id: 'custom', name: '指定卡组', en: 'THE BUILDER', icon: '▤', accent: '#65b7df',
      tagline: '十张牌，写你自己的战术。', desc: '从 190 张技能卡中挑选 10 张组成卡组。开局抽取 3 张，之后每回合补至 3 张，弃牌堆循环。',
      badges: ['1v1', '自选 10 张', '构筑'], scene: 'setup', local: true
    },
    {
      id: 'team', name: '自由组队', en: 'BUILD YOUR OWN TABLE', icon: '⛓', accent: '#e18bb0',
      tagline: '1v1 到 4v4，人数由你定。', desc: '自由选择我方与敌方人数（1–4 人）。你与 AI 队友并肩，空位由 AI 补齐。用自然语言下达进攻、防守、治疗或保留指令；AI 会判断合理性并给出回应。',
      badges: ['1v1–4v4', '自由人数', 'AI 队友'], scene: 'setup', local: true
    },
    {
      id: 'quick', name: '快速模式', en: 'THE SHORT FUSE', icon: '↯', accent: '#d9695d',
      tagline: '三点生命，别浪费回合。', desc: '生命上限降为 3 点。节奏更快，斩杀线更低，一次成功的三伤攻击就可能结束对局。',
      badges: ['1v1', '3 HP', '快速'], scene: 'setup', local: true
    },
    {
      id: 'story', name: '剧情挑战', en: 'THE LAST CHAPTER', icon: '✧', accent: '#ffd391',
      tagline: '三轮比赛，三个对手，一座奖杯。', desc: '依次挑战三位赛区代表。Boss 拥有更高生命和特殊被动，失败可重试当前章节。',
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
      tagline: '正面越连，刀越重；反面落下，伤全吃。', desc: '每次抛币成功累积 1 层连锁（最多 3 层），攻击伤害获得等量加成。抛币失败时连锁清零，并受到等同层数的直接反噬。',
      badges: ['连锁加伤', '失败反噬', '3 层上限'], scene: 'setup', local: true
    },
    {
      id: 'chaos', name: '混沌换手', en: 'THE GREAT SHUFFLE', icon: '✺', accent: '#72e0d1', fun: true,
      tagline: '每一轮，命运都替你重新洗牌。', desc: '每个新回合开始时，所有玩家弃掉手牌并重新抽至 3 张。牌序不再属于你，适应混乱的人才能活到最后。',
      badges: ['每轮换手', '全随机', '混乱'], scene: 'setup', local: true
    },
    {
      id: 'random-rules', name: '乱序法则', en: 'RANDOM RULES', icon: '⚖', accent: '#e0c05c', fun: true,
      tagline: '每回合，裁判临时改一次规矩。', desc: '每回合开始时从法则池随机抽一条当回合生效：正面加伤、反面转正、本回合可打两张牌、首牌加伤、治疗护盾+1、开局双方各抽一张。下回合重抽。',
      badges: ['每回合 roll 法则', '6 条法则池', '当回合生效'], scene: 'setup', local: true
    },
    {
      id: 'draft', name: '轮抽赌局', en: 'DRAFT TABLE', icon: '⇄', accent: '#7fd0e0', fun: true,
      tagline: 'A-B-A-B 各抽六张，组一副 12 张的牌组。', desc: '开赛前自动模拟轮抽：双方从全卡池 A-B-A-B 交替各拿 6 张，组成 12 张卡组。战前可看自己卡组并重抽一次。类别近似均衡（6 攻击/3 防御/3 控制）。',
      badges: ['12 张卡组', '战前重抽一次', '轮抽'], scene: 'setup', local: true
    },
    {
      id: 'double-stakes', name: '双倍筹码', en: 'DOUBLE STAKES', icon: '✖2', accent: '#ff9a6a', fun: true,
      tagline: '所有数值翻倍，翻倍再翻倍。', desc: '本局所有伤害、治疗、护盾、抽牌、弃牌数值全部 ×2（pierce/bless 等非数值效果不变），逆写仍为 1 次。更短、更猛。',
      badges: ['数值 ×2', '短局', '高爆发'], scene: 'setup', local: true
    },
    {
      id: 'lan', name: '局域网联机', en: 'LAN P2P', icon: '⌁', accent: '#6dd6b7',
      tagline: '同一个房间号，面对面开桌。', desc: '使用 PeerJS WebRTC 建立点对点数据通道，房间号即暗号。支持房主设密码、选模式、加 AI 队友。',
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
    title: '星杯闯关赛',
    intro: '星杯大赛分三轮。每一轮你要带着一名队友击败一个赛区的守关选手。赢了就晋级，输了就重打。',
    chapters: [
      {
        id: 'brass-mass', chapter: '第一轮', title: '钢都热身赛', realm: '机械城', style: 'steam',
        bossName: '钢都机械臂·铁子', bossTitle: '钢都代表选手', hp: 7, ai: 'hard',
        bossPassive: 'ironhide', bossPassiveName: '铁皮外壳',
        bossActive: { name: '重拳出击', uses: 2, effects: { dmg: 2, shield: 1 }, quote: '我这拳头，按过三百个阀门。' },
        intro: '铁子是钢都的老选手，出牌像拧阀门一样稳。他说热身赛不认真打就是不尊重观众。',
        quote: '别客气，往我身上打。我有保修。',
        objective: '击败铁子，晋级下一轮。',
        reward: '解锁档案：钢都赛区'
      },
      {
        id: 'silent-page', chapter: '第二轮', title: '幻书半决赛', realm: '书世界', style: 'anime',
        bossName: '幻书页·小编', bossTitle: '幻书代表选手', hp: 8, ai: 'hard',
        bossPassive: 'voidArmor', bossPassiveName: '空白书页护甲',
        bossActive: { name: '剧情杀', uses: 2, effects: { discard: 2, dmg: 1 }, quote: '这段剧情，你得输。' },
        intro: '小编是幻书赛区的主编，什么剧情都能编。他说半决赛的剧本已经写好了，你赢不了。',
        quote: '观众想看的是逆袭，但我是写逆袭的那个。',
        objective: '击败小编，打进决赛。',
        reward: '解锁档案：幻书赛区'
      },
      {
        id: 'the-house', chapter: '决赛', title: '星杯总决赛', realm: '竞技场中央', style: 'abyss',
        bossName: '冠军·星野', bossTitle: '上届星杯冠军', hp: 9, ai: 'hard',
        bossPassive: 'houseEdge', bossPassiveName: '冠军直觉',
        bossActive: { name: '冠军连段', uses: 3, effects: { dmg: 1, seal: 1, choke: 1 }, quote: '跟我打？你还早两年。' },
        intro: '星野是三连冠得主，站在竞技场中央。看台上坐满了八个赛区的观众。这一局，全世界都在看。',
        quote: '硬币在我手里，从来都是正面。',
        objective: '击败星野，捧起星杯。',
        reward: '冠军档案'
      }
    ]
  };

  /* ---------------------------------------------------------
     8. 引擎辅助
     --------------------------------------------------------- */
  const ART_DIRECTIVE = '轻松竞技二次元集换式卡牌插画，电影级布光，精致细节，构图留出卡框安全区，无文字，无水印，横版 4:3';

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
    if (effect.copySkill) parts.push('复制对手上一张牌的正面效果');
    if (effect.redirectDamage) parts.push('本回合受到的下一次伤害转移给对手');
    if (effect.rebirth) parts.push('本局第一次濒死时不死，回复1点生命');
    if (effect.puppet) parts.push('操控对手下一张打出的牌');
    if (effect.swapHp) parts.push('与目标交换当前生命值');
    if (effect.blind) parts.push('对手下回合无法使用主动技');
    if (effect.peek) parts.push('观看对手全部手牌');
    if (effect.manaBurn) parts.push('对手下回合少打一张牌');
    if (effect.mirror) parts.push('本回合第一次受到的伤害反弹给攻击者');
    if (effect.stealBuff) parts.push('偷取对手所有护盾和正面增益');
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
    { id: 'risk-032', name: '违约之赌', style: 'fantasy', cat: 'risk', pos: { dmg: 3, shield: 1 }, neg: { selfDmg: 2, oppShield: 1 }, combo: 'risk' },
    { id: 'risk-033', name: '剧情暴走', style: 'anime', cat: 'risk', pos: { dmg: 2, heal: 2 }, neg: { selfDmg: 2, oppHeal: 1 }, combo: 'risk' },
    { id: 'risk-034', name: '亡命加注', style: 'west', cat: 'risk', pos: { dmg: 3, power: 1 }, neg: { selfDmg: 3 }, combo: 'risk' },
    // style +8
    { id: 'style-031', name: '冠军之眼', style: 'west', cat: 'style', pos: { draw: 2, bless: 1 }, neg: { selfDiscard: 2 } },
    { id: 'style-032', name: '压币秘术', style: 'steam', cat: 'style', pos: { stealShield: 1, draw: 1 }, neg: { oppDraw: 1, selfDiscard: 1 } },
    { id: 'style-033', name: '赤红祈祷', style: 'wa', cat: 'style', pos: { lifesteal: 2, hpBurn: 1 }, neg: { selfDmg: 2 } },
    { id: 'style-034', name: '重抛悖论', style: 'abyss', cat: 'style', pos: { bless2: 1, dmg: 1 }, neg: { selfDmg: 2, oppDraw: 1 } },
    { id: 'style-035', name: '义体暴走', style: 'neon', cat: 'style', pos: { dmg: 3, power: 1 }, neg: { selfDmg: 2 } },
    { id: 'style-036', name: '灰之誓言', style: 'fantasy', cat: 'style', pos: { shield: 2, guard: 1, heal: 1 }, neg: { selfDiscard: 1, oppDraw: 1 } },
    { id: 'style-037', name: '大结局草稿', style: 'anime', cat: 'style', pos: { draw: 3 }, neg: { selfDiscard: 2 } },
    { id: 'style-038', name: '亡命轮盘', style: 'west', cat: 'style', pos: { dmg: 2, draw: 1, bless: 1 }, neg: { selfDmg: 2, selfDiscard: 1 } },
    // ---- v2.1 新增 16 张（new-09..new-12 配套）----
    { id: 'attack-035', name: '弃车保帅', style: 'cultivation', cat: 'attack', pos: { dmg: 3, selfDiscard: 1 }, neg: { selfDmg: 2 }, combo: 'attack' },
    { id: 'attack-036', name: '抢跑章节', style: 'anime', cat: 'attack', pos: { dmg: 1, energize: 1 }, neg: { oppDraw: 1 }, combo: 'attack' },
    { id: 'attack-037', name: '熔芯一击', style: 'steam', cat: 'attack', pos: { dmg: 2, shield: 1 }, neg: { selfDmg: 2 }, combo: 'attack' },
    { id: 'defense-035', name: '金角', style: 'cultivation', cat: 'defense', pos: { shield: 1, draw: 1 }, neg: { oppHeal: 1 }, combo: 'defense' },
    { id: 'defense-036', name: '角色设定', style: 'anime', cat: 'defense', pos: { heal: 1, reflect: 1 }, neg: { oppDraw: 1 }, combo: 'defense' },
    { id: 'defense-037', name: '熔壳', style: 'steam', cat: 'defense', pos: { shield: 2, energize: 1 }, neg: { selfDmg: 1 }, combo: 'defense' },
    { id: 'control-035', name: '一子双征', style: 'cultivation', cat: 'control', pos: { choke: 1, discard: 1 }, neg: { selfDiscard: 1 }, combo: 'control' },
    { id: 'control-036', name: '审核驳回', style: 'anime', cat: 'control', pos: { seal: 1, choke: 1 }, neg: { oppDraw: 1 }, combo: 'control' },
    { id: 'control-037', name: '断供', style: 'steam', cat: 'control', pos: { strip: 1, weak: 1 }, neg: { selfDmg: 1 }, combo: 'control' },
    { id: 'risk-035', name: '天元赌局', style: 'cultivation', cat: 'risk', pos: { dmg: 2, draw: 2 }, neg: { selfDmg: 2, selfDiscard: 1 }, combo: 'risk' },
    { id: 'risk-036', name: '烂尾风波', style: 'anime', cat: 'risk', pos: { dmg: 1, draw: 3 }, neg: { selfDiscard: 2 }, combo: 'risk' },
    { id: 'risk-037', name: '过载注汽', style: 'steam', cat: 'risk', pos: { dmg: 3, shield: 1 }, neg: { selfDmg: 3 }, combo: 'risk' },
    { id: 'style-039', name: '打劫', style: 'cultivation', cat: 'style', pos: { dmg: 1, draw: 1 }, neg: { selfDiscard: 1 } },
    { id: 'style-040', name: '大结局代笔', style: 'anime', cat: 'style', pos: { draw: 2, energize: 1 }, neg: { selfDiscard: 2 } },
    { id: 'style-041', name: '余温', style: 'steam', cat: 'style', pos: { shield: 2, heal: 1 }, neg: { selfDiscard: 1 } },
    { id: 'style-042', name: '余响', style: 'abyss', cat: 'style', pos: { dmg: 2, lifesteal: 1 }, neg: { selfDmg: 2, oppHeal: 1 } },
    // ---- v3.1 新增 20 张（轻松竞技风，重设计版）----
    { id: 'attack-041', name: '闪现突袭', style: 'neon', cat: 'attack', pos: { dmg: 2, energize: 1 }, neg: { selfDiscard: 1 }, combo: 'attack' },
    { id: 'attack-042', name: '新星爆发', style: 'abyss', cat: 'attack', pos: { dmg: 3, power: 1 }, neg: { selfDmg: 2 }, combo: 'attack' },
    { id: 'attack-043', name: '三连暴击', style: 'fantasy', cat: 'attack', pos: { dmg: 1, draw: 2 }, neg: { oppDraw: 1 }, combo: 'attack' },
    { id: 'attack-044', name: '鼓鸣冲击', style: 'wa', cat: 'attack', pos: { dmg: 2, weak: 1 }, neg: { selfDmg: 1 }, combo: 'attack' },
    { id: 'defense-041', name: '暂停一下', style: 'neon', cat: 'defense', pos: { shield: 2, energize: 1 }, neg: { selfDiscard: 1 }, combo: 'defense' },
    { id: 'defense-042', name: '喝口热水', style: 'west', cat: 'defense', pos: { heal: 2, guard: 1 }, neg: { oppDraw: 1 }, combo: 'defense' },
    { id: 'defense-043', name: '铁壁阵', style: 'steam', cat: 'defense', pos: { shield: 2, reflect: 1 }, neg: { selfDmg: 1 }, combo: 'defense' },
    { id: 'defense-044', name: '主角休息', style: 'anime', cat: 'defense', pos: { heal: 1, shield: 1, draw: 1 }, neg: { oppHeal: 1 }, combo: 'defense' },
    { id: 'control-041', name: '弹幕刷屏', style: 'neon', cat: 'control', pos: { discard: 2, choke: 1 }, neg: { oppDraw: 1 }, combo: 'control' },
    { id: 'control-042', name: '网络卡顿', style: 'neon', cat: 'control', pos: { seal: 1, strip: 1 }, neg: { selfDmg: 1 }, combo: 'control' },
    { id: 'control-043', name: '改刀', style: 'cultivation', cat: 'control', pos: { choke: 1, weak: 1 }, neg: { selfDiscard: 1 }, combo: 'control' },
    { id: 'control-044', name: '裁判暂停', style: 'anime', cat: 'control', pos: { seal: 1, draw: 1 }, neg: { oppHeal: 1 }, combo: 'control' },
    { id: 'risk-041', name: 'All In', style: 'west', cat: 'risk', pos: { dmg: 3, power: 1, bless: 1 }, neg: { selfDmg: 2, oppShield: 1 }, combo: 'risk' },
    { id: 'risk-042', name: '绝地反击', style: 'abyss', cat: 'risk', pos: { heal: 3, dmg: 1 }, neg: { selfDiscard: 2 }, combo: 'risk' },
    { id: 'risk-043', name: '爆种', style: 'anime', cat: 'risk', pos: { dmg: 2, energize: 1, draw: 1 }, neg: { selfDmg: 2 }, combo: 'risk' },
    { id: 'risk-044', name: '双倍赌注', style: 'fantasy', cat: 'risk', pos: { bless2: 1, dmg: 1 }, neg: { selfDmg: 3 }, combo: 'risk' },
    { id: 'style-043', name: '星海冲刺', style: 'abyss', cat: 'style', pos: { dmg: 2, pierce: 1 }, neg: { selfDmg: 1 } },
    { id: 'style-044', name: '蒸汽Buff', style: 'steam', cat: 'style', pos: { shield: 1, heal: 1, draw: 1 }, neg: { selfDiscard: 1 } },
    { id: 'style-045', name: '樱色应援', style: 'wa', cat: 'style', pos: { bless: 1, heal: 1 }, neg: { oppDraw: 1 } },
    { id: 'style-046', name: '荒漠烧烤', style: 'west', cat: 'style', pos: { lifesteal: 2, weak: 1 }, neg: { selfDmg: 1 } },
    // ---- v3.2 同人扩展：新效果键 20 张 ----
    // attack +4
    { id: 'attack-045', name: '偷梁换柱', style: 'neon', cat: 'attack', pos: { copySkill: 1 }, neg: { selfDiscard: 1 }, combo: 'attack' },
    { id: 'attack-046', name: '嫁祸', style: 'west', cat: 'attack', pos: { dmg: 1, redirectDamage: 1 }, neg: { selfDmg: 1 }, combo: 'attack' },
    { id: 'attack-047', name: '暗夜突刺', style: 'abyss', cat: 'attack', pos: { dmg: 2, weak: 1 }, neg: { selfDmg: 1 }, combo: 'attack' },
    { id: 'attack-048', name: '穿云箭', style: 'cultivation', cat: 'attack', pos: { dmg: 2, pierce: 1 }, neg: { oppHeal: 1 }, combo: 'attack' },
    // defense +4
    { id: 'defense-045', name: '以牙还牙', style: 'fantasy', cat: 'defense', pos: { mirror: 1, shield: 1 }, neg: { oppDraw: 1 }, combo: 'defense' },
    { id: 'defense-046', name: '回光返照', style: 'cultivation', cat: 'defense', pos: { rebirth: 1, heal: 1 }, neg: { selfDiscard: 1 }, combo: 'defense' },
    { id: 'defense-047', name: '吸星大法', style: 'cultivation', cat: 'defense', pos: { stealBuff: 1 }, neg: { oppHeal: 1 }, combo: 'defense' },
    { id: 'defense-048', name: '金钟罩', style: 'wa', cat: 'defense', pos: { shield: 2, guard: 1 }, neg: { selfDmg: 1 }, combo: 'defense' },
    // control +4
    { id: 'control-045', name: '沉默是金', style: 'wa', cat: 'control', pos: { blind: 1, seal: 1 }, neg: { oppDraw: 1 }, combo: 'control' },
    { id: 'control-046', name: '夺舍', style: 'anime', cat: 'control', pos: { puppet: 1 }, neg: { selfDmg: 1 }, combo: 'control' },
    { id: 'control-047', name: '窥屏', style: 'neon', cat: 'control', pos: { peek: 1, draw: 1 }, neg: { oppDraw: 1 }, combo: 'control' },
    { id: 'control-048', name: '抽干', style: 'steam', cat: 'control', pos: { manaBurn: 1, discard: 1 }, neg: { selfDiscard: 1 }, combo: 'control' },
    // risk +4
    { id: 'risk-045', name: '血债血偿', style: 'west', cat: 'risk', pos: { swapHp: 1 }, neg: { selfDmg: 2 }, combo: 'risk' },
    { id: 'risk-046', name: '破釜沉舟', style: 'steam', cat: 'risk', pos: { dmg: 3, power: 1 }, neg: { selfDmg: 2 }, combo: 'risk' },
    { id: 'risk-047', name: '浴火重生', style: 'wa', cat: 'risk', pos: { dmg: 1, heal: 2 }, neg: { selfDmg: 2 }, combo: 'risk' },
    { id: 'risk-048', name: '最后一注', style: 'fantasy', cat: 'risk', pos: { bless2: 1, draw: 2 }, neg: { selfDiscard: 2 }, combo: 'risk' },
    // style +4
    { id: 'style-047', name: '春秋梦旅', style: 'abyss', cat: 'style', pos: { bless2: 1, dmg: 1 }, neg: { selfDiscard: 1 } },
    { id: 'style-048', name: '冰魄封天', style: 'cultivation', cat: 'style', pos: { shield: 2, weak: 1 }, neg: { selfDmg: 1 } },
    { id: 'style-049', name: '楼兰王令', style: 'west', cat: 'style', pos: { dmg: 2, power: 1 }, neg: { oppHeal: 1 } },
    { id: 'style-050', name: '蓝白正义', style: 'fantasy', cat: 'style', pos: { shield: 1, heal: 1, draw: 1 }, neg: { oppDraw: 1 } }
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
    { id: 'bloodmoon', name: '赤红', trait: '造成的吸血效果数值 +1', playbackRate: 0.9, glow: '#e85a5a', particle: '#ff8a7a' },
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
    version: '3.1.0',
    title: '星杯对决',
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