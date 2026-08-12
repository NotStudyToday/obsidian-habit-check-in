/*
 * Habit Check-in 习惯打卡插件
 * 纯 JavaScript 单文件，无构建
 */
'use strict';

const { Plugin, ItemView, Modal, Setting, PluginSettingTab, Notice } = require('obsidian');

const VIEW_TYPE = 'habit-checkin';
const TODAY_VIEW_TYPE = 'habit-checkin-today'; // 右侧栏今日打卡视图

const DEFAULT_DATA = {
  version: 1,
  habits: [],
  records: {},
  settings: {
    firstDayOfWeek: 1,   // 0=周日, 1=周一
    ribbonMain: true,    // 左侧栏：主视图图标
    ribbonMainIcon: 'calendar-check',
    ribbonToday: true,   // 左侧栏：今日打卡图标
    ribbonTodayIcon: 'check-square',
    showStatStreak: true,   // 主视图统计：🔥 当前连续
    showStatLongest: true,  // 主视图统计：🏆 最长连续
    showStatMonth: true,    // 主视图统计：📅 本月完成
    showStatTotal: true,    // 主视图统计：✅ 总打卡
    showLegend: true,       // 主视图：强度分级图例
    defaultRange: 'year',   // 主视图热力图默认范围：'year' / '3m' / 'month'
    language: null,         // 界面语言：'zh' / 'en' / null=跟随系统
  },
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/* =========================================================
 * 国际化（i18n）
 * 默认文案为中文（key 即中文字符串）；切换英文时查 EN_STRINGS 映射。
 * 语言来源：设置 language（'zh'/'en'），未设置则跟随 Obsidian/系统语言。
 * ========================================================= */
const EN_STRINGS = {
  // —— 通用 ——
  '保存': 'Save',
  '取消': 'Cancel',
  '开始': 'Start',
  '结束': 'Stop',
  '打卡': 'Check in',
  '✓ 已打卡': '✓ Checked',
  '今天': 'Today',
  '开始计时': 'Start timer',
  '长期': 'Ongoing',
  '名称': 'Name',
  '图标': 'Icon',
  '颜色': 'Color',
  '开始日期': 'Start date',
  '结束日期': 'End date',
  '每日目标': 'Daily goal',
  '打卡方式': 'Check-in mode',
  '计时类型': 'Timer type',
  '每次打卡量': 'Amount per check-in',
  '每周计划': 'Weekly plan',
  '强度分级': 'Intensity levels',
  '倒计时': 'Countdown',
  '正向计时': 'Stopwatch',
  '习惯名称': 'Habit name',
  '分钟': 'min',
  // —— 表单描述 / 下拉 ——
  '如：背单词、跑步': 'e.g. Memorize words, run',
  '可选 emoji，如 📖': 'Optional emoji, e.g. 📖',
  '日历/热力图中打卡的显示颜色': 'Color used for check-ins in calendar / heatmap',
  '勾选「长期」则没有结束日期': 'Check "Ongoing" to have no end date',
  '目标数量，与「每次打卡量」同单位；支持小数': 'Target amount, same unit as "Amount per check-in"; decimals allowed',
  '开启后按次数区间显示不同颜色，打卡变为次数叠加（点一次 +1）': 'Color by count ranges; check-in adds counts (+1 per tap)',
  '强度分级时，每日目标 = 最高等级上限（自动同步）': 'With levels, daily goal = highest level max (auto-synced)',
  '固定：点 +/− 加固定值；手动：先填数量再点 +/−；计时：分钟计时': 'Fixed: +/- adds a fixed amount; Manual: enter the amount first; Timer: count minutes',
  '正向：点开始/结束，用时计入；倒计时：预设分钟数，可提前结束': 'Stopwatch: start/stop counts elapsed time; Countdown: preset minutes, can stop early',
  '倒计时的默认预设分钟数': 'Default countdown minutes',
  '固定模式：点一次 +N；手动模式：打卡输入框的默认值': 'Fixed: each tap +N; Manual: default value in the check-in input',
  '全不选 = 每天': 'None selected = every day',
  '单位：ml/h/页…': 'Unit: ml/h/pages…',
  '固定每次打卡量': 'Fixed amount',
  '打卡时手动填写': 'Enter manually',
  '计时器（分钟）': 'Timer (minutes)',
  '周一': 'Monday',
  '周日': 'Sunday',
  '跟随系统': 'Follow system',
  // —— 预设配色 ——
  '渐变绿': 'Green gradient',
  '渐变红': 'Red gradient',
  '渐变蓝': 'Blue gradient',
  '渐变紫': 'Purple gradient',
  '渐变黄': 'Yellow gradient',
  '渐变霓虹': 'Neon gradient',
  // —— 弹窗 ——
  '编辑习惯': 'Edit habit',
  '新建习惯': 'New habit',
  '＋ 新建习惯': '+ New habit',
  '等级{n}': 'Level {n}',
  '＋ 添加强度': '+ Add level',
  '请输入习惯名称': 'Please enter a habit name',
  // —— 命令 / 视图标题 / 侧栏 ——
  '打开习惯打卡统计': 'Open Habit Check-in stats',
  '今日打卡（右侧栏）': 'Today check-in (right sidebar)',
  '习惯打卡': 'Habit Check-in',
  '今日打卡': 'Today check-in',
  // —— 主视图 ——
  '今日完成 {a}/{b}': 'Done today {a}/{b}',
  ' 或命令「今日打卡（右侧栏）」': ' or use the command "Today check-in (right sidebar)"',
  '还没有习惯，去「设置 → 习惯打卡」新建一个吧': 'No habits yet. Create one in Settings → Habit Check-in.',
  '🔥 连续 {n} 天': '🔥 {n}-day streak',
  '🏆 最长 {n} 天': '🏆 Longest {n}',
  '📅 本月 {a}/{b}': '📅 This month {a}/{b}',
  '✅ 总 {n}{u}': '✅ Total {n}{u}',
  '等级{n} ≤{v}{u}': 'Level {n} ≤ {v}{u}',
  '范围': 'Range',
  '全年': 'Year',
  '近三月': '3 months',
  '当月': 'Month',
  '已迁移历史打卡记录到按天分文件，数据完整保留': 'Migrated check-in records to per-day files; all data preserved',
  // —— 今日打卡视图 ——
  '还没有习惯，请先在「设置 → 习惯打卡」新建。': 'No habits yet. Create one in Settings → Habit Check-in.',
  '完成 {a}/{b} · {p}%': 'Done {a}/{b} · {p}%',
  '该日不计划': 'Not planned on this day',
  '当日 {c}/{g}': 'Today {c}/{g}',
  '当日 {c}/{g} · {m}': 'Today {c}/{g} · {m}',
  // —— 嵌入 ——
  '未找到习惯 ID：{id}': 'Habit ID not found: {id}',
  '⚠️ 热力图渲染失败：{msg}': '⚠️ Heatmap render failed: {msg}',
  // —— 设置页 ——
  '新建/管理习惯，主视图看热力图；点习惯行「复制」图标，可把该习惯的热力图嵌入任意笔记。': 'Create and manage habits, view heatmaps in the main view; click the copy icon on a habit row to embed its heatmap into any note.',
  '视图偏好': 'View preferences',
  '每周第一天': 'First day of week',
  '日历与热力图的起始列': 'Start column of the calendar / heatmap',
  '主视图默认范围': 'Default main view range',
  '主视图热力图默认显示范围，窄屏/手机自动优先近三月': 'Default heatmap range in the main view (narrow/mobile screens default to 3 months)',
  '功能图标（左侧栏）': 'Ribbon icons (left sidebar)',
  '主视图图标': 'Main view icon',
  '打开「习惯打卡统计」': 'Open "Habit Check-in stats"',
  '今日打卡图标': 'Today check-in icon',
  '右侧栏「今日打卡」列表': 'Right-sidebar "Today check-in" list',
  '主视图统计项': 'Main view statistics',
  '当前连续（🔥）': 'Current streak (🔥)',
  '连续打卡的天数': 'Consecutive check-in days',
  '最长连续（🏆）': 'Longest streak (🏆)',
  '历史最长连续天数': 'Longest streak in history',
  '本月完成（📅）': 'Month completion (📅)',
  '本月已完成 / 应完成': 'Completed / planned this month',
  '总打卡（✅）': 'Total check-ins (✅)',
  '累计打卡次数': 'Total check-in count',
  '强度图例': 'Intensity legend',
  '主视图中显示强度分级的颜色与数值图例': 'Show the intensity-level color/value legend in the main view',
  '习惯列表': 'Habit list',
  '拖拽行或上下箭头排序；点「复制」图标可把该习惯的热力图嵌入任意笔记。': 'Drag rows or use the arrows to sort; click the copy icon to embed a habit\'s heatmap into any note.',
  '暂无习惯，点击上方「新建习惯」创建。': 'No habits yet. Click "New habit" above to create one.',
  '强度分级 {n} 级': 'Intensity {n} levels',
  '目标 {v}{u}': 'Goal {v}{u}',
  ' · 每次 +{v}{u}': ' · +{v}{u} each',
  '拖拽排序': 'Drag to sort',
  '复制嵌入代码': 'Copy embed code',
  '编辑': 'Edit',
  '上移': 'Move up',
  '下移': 'Move down',
  '删除': 'Delete',
  '已复制「{name}」热力图嵌入代码，粘贴到笔记即可': 'Copied the embed code for "{name}". Paste it into any note.',
  '确定删除习惯「{name}」吗？相关打卡记录也会一并删除。': 'Delete habit "{name}"? Its check-in records will also be removed.',
  // —— 语言设置 ——
  '语言 / Language': 'Language',
  '切换插件界面语言': 'Switch the plugin UI language',
  // —— 计划文本 ——
  '{d} 起': 'From {d}',
  '{d} 起 · 每周 {w}': 'From {d} · every {w}',
};

let _lang = 'zh'; // 当前界面语言：'zh' | 'en'

function detectLang(setting) {
  if (setting === 'zh' || setting === 'en') return setting;
  let loc = '';
  try { loc = String(window.localStorage.getItem('language') || navigator.language || '').toLowerCase(); }
  catch (e) { loc = String(navigator.language || '').toLowerCase(); }
  return loc.startsWith('zh') ? 'zh' : 'en';
}

// 翻译：中文文案即 key；英文时查字典；支持 {name} 变量替换
function t(s, vars) {
  let out = (_lang === 'en' && EN_STRINGS[s]) ? EN_STRINGS[s] : s;
  if (vars) for (const k in vars) out = out.split('{' + k + '}').join(String(vars[k]));
  return out;
}

function wd(i) { return _lang === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i] : WEEKDAYS[i]; }
function monthLabel(m0) {
  if (_lang === 'en') return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m0];
  return (m0 + 1) + '月';
}
function dateLabel(d) {
  if (_lang === 'en') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`;
}
function timerUnit() { return _lang === 'en' ? 'min' : '分钟'; }
// 展示用单位：计时习惯显示当前语言下的计时单位，其余用用户输入
function unitOf(h) { return h && h.inputMode === 'timer' ? timerUnit() : (h.unit || ''); }

// 左侧栏功能图标可选列表（Obsidian/lucide 图标名）
const ICON_OPTIONS = ['calendar-check', 'check-square', 'calendar-days', 'calendar', 'list-checks', 'flame', 'target', 'trophy', 'book-open', 'clipboard-check', 'alarm-check', 'check-circle', 'heart', 'star', 'zap', 'sun'];

// 简单计数习惯的颜色混合档数（内部固定，不再暴露设置）
const HEATMAP_LEVELS = 5;

// 五级强度分级预设配色
const PRESET_PALETTES = [
  { name: '渐变绿', colors: ['#c6e48b', '#7bc96f', '#49af5d', '#2e8840', '#196127'] },
  { name: '渐变红', colors: ['#fff33b', '#fdc70c', '#f3903f', '#ed683c', '#e93e3a'] },
  { name: '渐变蓝', colors: ['#cbe3f0', '#9bc4e0', '#5a9fd4', '#2a7bbb', '#0d4a7a'] },
  { name: '渐变紫', colors: ['#f2e6f7', '#d4b8e0', '#b07fc4', '#8a4fa8', '#4a1a6b'] },
  { name: '渐变黄', colors: ['#fef3d6', '#fde49c', '#fcc859', '#f59f2a', '#b86b0a'] },
  { name: '渐变霓虹', colors: ['#f0e6ff', '#c084fc', '#8b5cf6', '#4f46e5', '#1e1b4b'] },
];

/* =========================================================
 * U: 工具函数
 * ========================================================= */
const U = (function () {
  function pad(n) { return String(n).padStart(2, '0'); }

  // 本地时区日期 key，禁止 toISOString（东八区会偏移一天）
  function dateKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // 从文件名/路径/字符串解析并校验 YYYY-MM-DD（自动取 basename、去扩展名），不合法返回 null
  function parseDateKey(name) {
    let n = String(name || '').trim();
    n = n.split(/[\\/]/).pop();          // 取 basename
    n = n.replace(/\.[^./\\]+$/, '');     // 去掉 .md 等扩展名
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(n);
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dateKey(dt);
  }
  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function diffDays(a, b) {
    const ta = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const tb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round((ta - tb) / 86400000);
  }
  function todayKey() { return dateKey(new Date()); }
  function uid() { return 'h' + Math.random().toString(36).slice(2, 10); }

  // 是否在计划的起止范围 + 周计划内
  function isInPlan(habit, key) {
    if (habit.startDate && key < habit.startDate) return false;
    if (habit.endDate && key > habit.endDate) return false;
    if (habit.weekly && habit.weekly.length > 0) {
      if (!habit.weekly.includes(parseKey(key).getDay())) return false;
    }
    return true;
  }

  // 是否为计数型习惯（打勾型 = target=1 且无单位、无自定义步长、无强度分级）
  function isCounting(h) {
    return Boolean((h.target !== 1) || h.unit || (h.step && h.step !== 1) || (h.levels && h.levels.length));
  }

  // 习惯的每日目标量：分级的最高上限；计数型为目标；打勾型为 1
  function goalOf(h) {
    if (h.levels && h.levels.length) return h.levels[h.levels.length - 1].max;
    return isCounting(h) ? h.target : 1;
  }
  // 习惯的每次打卡量：未自定义步长时默认 1
  function stepOf(h) {
    return h.step > 0 ? h.step : 1;
  }

  function countOf(habitId, key, records) {
    return (records[habitId] && records[habitId][key]) || 0;
  }

  function isCompleted(habit, key, records) {
    const c = countOf(habit.id, key, records);
    if (habit.levels && habit.levels.length) return c >= habit.levels[habit.levels.length - 1].max;
    return isCounting(habit) ? c >= habit.target : c >= 1;
  }

  // 颜色
  function hexToRgb(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 74, g: 222, b: 128 };
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    const to = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }
  function mixHex(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
  }
  // 返回 levels 个色阶（1..levels 由浅到深）
  function computeColorScale(habitHex, bgHex, levels) {
    const stops = [];
    for (let i = 1; i <= levels; i++) stops.push(mixHex(bgHex, habitHex, i / levels));
    return stops;
  }

  // streak
  function currentStreak(habit, records, today) {
    let d = today;
    if (!isCompleted(habit, d, records)) d = dateKey(addDays(parseKey(d), -1)); // 今日未打从昨天起算
    let streak = 0;
    while (isInPlan(habit, d) && isCompleted(habit, d, records)) {
      streak++;
      d = dateKey(addDays(parseKey(d), -1));
    }
    return streak;
  }
  function longestStreak(habit, records) {
    const keys = Object.keys(records[habit.id] || {})
      .filter(k => isInPlan(habit, k) && isCompleted(habit, k, records))
      .sort();
    let best = 0, cur = 0, prev = null;
    for (const k of keys) {
      if (prev && diffDays(parseKey(k), parseKey(prev)) === 1) cur++;
      else cur = 1;
      if (cur > best) best = cur;
      prev = k;
    }
    return best;
  }
  function monthCompletion(habit, records, year, month) {
    let done = 0, plan = 0;
    for (let d = new Date(year, month, 1); d.getMonth() === month; d = addDays(d, 1)) {
      const key = dateKey(d);
      if (isInPlan(habit, key)) {
        plan++;
        if (isCompleted(habit, key, records)) done++;
      }
    }
    return { done, plan };
  }
  function totalCheckins(habit, records) {
    let sum = 0;
    for (const k in (records[habit.id] || {})) sum += records[habit.id][k];
    return sum;
  }

  return {
    dateKey, parseDateKey, addDays, diffDays, todayKey, uid,
    isInPlan, isCounting, goalOf, stepOf, countOf, isCompleted,
    computeColorScale,
    currentStreak, longestStreak, monthCompletion, totalCheckins,
  };
})();

/* =========================================================
 * 通用辅助
 * ========================================================= */
function parseBlockParams(source) {
  const p = {};
  for (const line of String(source || '').split('\n')) {
    for (const tok of line.trim().split(/\s+/)) {
      if (!tok) continue;
      const i = tok.indexOf('=');
      if (i > 0) p[tok.slice(0, i).trim()] = tok.slice(i + 1).trim();
    }
  }
  return p;
}

function getBgColor() {
  const v = getComputedStyle(document.body).getPropertyValue('--background-primary').trim();
  return v || '#ffffff';
}
function getAccentColor() {
  const v = getComputedStyle(document.body).getPropertyValue('--interactive-accent').trim();
  return v || '#4ade80';
}

// 触屏/窄屏判定：真机（hover/pointer 媒体查询）或 dev:mobile 模拟/窄窗口均命中
function isTouchOrNarrow() {
  return window.matchMedia('(hover: none)').matches || window.matchMedia('(max-width: 520px)').matches;
}
function isCoarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 520px)').matches;
}

function planText(h) {
  if (h.endDate) return `${h.startDate} ~ ${h.endDate}`;
  if (h.weekly && h.weekly.length) return t('{d} 起 · 每周 {w}', { d: h.startDate, w: h.weekly.map(i => wd(i)).join('') });
  return t('{d} 起', { d: h.startDate });
}

/* =========================================================
 * 渲染器（日历 / 热力图）—— 纯函数，主视图与笔记内嵌共用
 * ========================================================= */

// 单个习惯在某天的强度等级：0=未打卡；>0 表示用 --habit-h{level} 着色
function countLevel(h, count, maxLevel) {
  if (h.levels && h.levels.length) {
    if (count <= 0) return 0;
    for (let i = 0; i < h.levels.length; i++) {
      if (count <= h.levels[i].max) return i + 1;
    }
    return h.levels.length;
  }
  if (!U.isCounting(h)) return count >= 1 ? maxLevel : 0;
  return count <= 0 ? 0 : Math.min(Math.ceil((count / h.target) * maxLevel), maxLevel);
}

// 计算某天在一组习惯下的强度等级（多习惯取最高）
// 返回 { level, parts, today }；level: null=补位, -1=计划外, 0..maxLevel
function dayLevel(habits, key, records, maxLevel) {
  if (!habits.length) return { level: 0, parts: [] };
  let best = 0;
  let anyInPlan = false;
  const parts = [];
  for (const h of habits) {
    if (!U.isInPlan(h, key)) continue;
    anyInPlan = true;
    const count = U.countOf(h.id, key, records);
    const lvl = countLevel(h, count, maxLevel);
    if (lvl > best) best = lvl;
    if (count > 0) parts.push({ habit: h, count });
  }
  // 所选习惯全部处于计划窗口外 / 周计划外 → -1（视为计划外）
  return { level: anyInPlan ? best : -1, parts };
}

function buildHeatmapCells(anchor, firstDay, habits, records, maxLevel, range) {
  const ay = anchor.getFullYear();
  const am = anchor.getMonth();
  let start, end, labelMonths;
  if (range === 'month') {
    // 当月
    start = new Date(ay, am, 1);
    end = new Date(ay, am + 1, 0);
    labelMonths = [new Date(ay, am, 1)];
  } else if (range === '3m') {
    // 近3个月：上月 / 本月 / 下月
    start = new Date(ay, am - 1, 1);
    end = new Date(ay, am + 2, 0);
    labelMonths = [-1, 0, 1].map(o => new Date(ay, am + o, 1));
  } else {
    // 全年：1月1日 ~ 12月31日
    start = new Date(ay, 0, 1);
    end = new Date(ay, 11, 31);
    labelMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(m => new Date(ay, m, 1));
  }
  const offset = (start.getDay() - firstDay + 7) % 7;
  const gridStart = U.addDays(start, -offset);
  const spanDays = U.diffDays(end, gridStart) + 1;
  const weekCount = Math.ceil(spanDays / 7);
  const today = U.todayKey();

  // 月份标签：各月份起始所在列
  const labels = [];
  for (const m of labelMonths) {
    const col = Math.floor(U.diffDays(m, gridStart) / 7);
    if (col >= 0 && col < weekCount) labels.push({ col, text: monthLabel(m.getMonth()) });
  }

  // 行主序生成：for row { for col }，配合默认 grid-auto-flow:row，
  // 得到「列=周、行=星期」的 GitHub 式矩阵（第 col 列 = 第 col 周，第 row 行 = 星期 row）
  const cells = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < weekCount; col++) {
      const d = U.addDays(gridStart, col * 7 + row);
      const key = U.dateKey(d);
      const inPeriod = d >= start && d <= end;
      let level = null, parts = [];
      if (inPeriod) {
        const r = dayLevel(habits, key, records, maxLevel);
        level = r.level;
        parts = r.parts;
      }
      let title = key;
      if (parts.length) {
        title = key + ' · ' + parts.map(p => {
          const isCount = U.isCounting(p.habit);
          const goal = U.goalOf(p.habit);
          const u = unitOf(p.habit);
          return `${p.habit.emoji || p.habit.name} ${p.count}${isCount ? u + '/' + goal + u : ''}`;
        }).join(_lang === 'en' ? ', ' : '，');
      }
      cells.push({ col, row, key, date: d, level, parts, title, isToday: key === today });
    }
  }
  return { cells, weekCount, gridStartKey: U.dateKey(gridStart), labels };
}

function styleCell(div, cell) {
  div.dataset.date = cell.key;
  if (cell.isToday) div.addClass('is-today');
  if (cell.level === null) { div.addClass('is-blank'); return; }
  if (cell.level < 0) { div.addClass('is-out-of-plan'); return; }
  if (cell.level > 0) {
    div.style.backgroundColor = `var(--habit-h${cell.level})`;
  } else {
    div.addClass('is-empty-cell');
  }
  if (cell.title) div.title = cell.title;
}

function setupScaleVars(container, habit, maxLevel) {
  const bg = getBgColor();
  // 强度分级模式：直接用每个等级的自定义颜色
  if (habit && habit.levels && habit.levels.length) {
    habit.levels.forEach((lv, i) => {
      if (lv && lv.color) container.style.setProperty(`--habit-h${i + 1}`, lv.color);
    });
    return;
  }
  const baseColor = habit ? habit.color : getAccentColor();
  const scale = U.computeColorScale(baseColor, bg, maxLevel);
  for (let i = 1; i <= maxLevel; i++) container.style.setProperty(`--habit-h${i}`, scale[i - 1]);
}

function resolveHabits(ctx) {
  const habits = ctx.habits || [];
  if (ctx.habitId === 'all' || !ctx.habitId) return habits;
  return habits.filter(h => h.id === ctx.habitId);
}

function renderHeatmap(container, ctx) {
  container.empty();
  const anchor = ctx.anchor || new Date();
  const firstDay = ctx.settings.firstDayOfWeek;
  const maxLevel = HEATMAP_LEVELS;
  const range = ctx.range === 'month' || ctx.range === '3m' ? ctx.range : 'year'; // year / 3m / month
  const habits = resolveHabits(ctx);
  const single = habits.length === 1 ? habits[0] : null;
  setupScaleVars(container, single, maxLevel);

  const data = buildHeatmapCells(anchor, firstDay, habits, ctx.records, maxLevel, range);

  // 顶部月份标签
  const head = container.createDiv({ cls: 'habit-heatmap-head' });
  head.style.setProperty('--habit-cols', data.weekCount);
  const labels = new Array(data.weekCount).fill('');
  for (const l of data.labels) if (l.col >= 0 && l.col < data.weekCount) labels[l.col] = l.text;
  for (let col = 0; col < data.weekCount; col++) head.createSpan({ cls: 'habit-month-label', text: labels[col] });

  const body = container.createDiv({ cls: 'habit-heatmap-body' });
  const dayCol = body.createDiv({ cls: 'habit-heatmap-days' });
  for (let row = 0; row < 7; row++) dayCol.createSpan({ cls: 'habit-day-label', text: wd((firstDay + row) % 7) });

  const grid = body.createDiv({ cls: 'habit-heatmap-grid' });
  grid.style.setProperty('--habit-cols', data.weekCount);
  for (const cell of data.cells) {
    const div = grid.createDiv({ cls: 'habit-cell' });
    styleCell(div, cell);
    // 触屏/窄屏没有 hover 提示，点格子看当天打卡详情
    if (cell.parts.length && isTouchOrNarrow()) {
      div.addEventListener('click', () => new Notice(cell.title));
    }
  }
}

/* =========================================================
 * 主插件类
 * ========================================================= */
class HabitCheckinPlugin extends Plugin {
  async onload() {
    this._listeners = new Set();
    this._timers = {}; // 运行时计时状态：habitId -> { start, preset }
    document.body.classList.add('habit-checkin-loaded'); // 作用域标记：CSS 打点上限规则仅在本插件加载时生效
    const raw = await this.loadData();
    this.data = Object.assign({}, DEFAULT_DATA, raw || {});
    this.data.settings = Object.assign({}, DEFAULT_DATA.settings, (raw && raw.settings) || {});
    // 清理旧版/失效设置字段：白名单（DEFAULT_DATA.settings）之外的键直接丢弃，避免历史残留
    for (const k of Object.keys(this.data.settings)) {
      if (!(k in DEFAULT_DATA.settings)) delete this.data.settings[k];
    }
    this.data.habits = Array.isArray(this.data.habits) ? this.data.habits : [];
    this.data.timers = this.data.timers || {};
    // 界面语言：优先用设置，否则跟随 Obsidian/系统（提前设置，迁移提示等可正确本地化）
    _lang = detectLang(this.data.settings.language);
    // —— 打卡记录按天分文件存储（records/YYYY-MM-DD.json），降低跨端文件同步冲突面 ——
    this._dirtyDays = new Set();      // 本会话待落盘的日期集合
    this._zeroed = new Set();         // 本会话清零的「习惯|日期」墓碑：合并时不复活对端旧值
    this._deletedHabits = new Set();  // 本会话删除的习惯：写盘/合并时清除其残留记录
    this._flushChain = Promise.resolve();
    this._baseSaveData = this.saveData.bind(this); // 原始 saveData，迁移/写盘用
    await this._initRecords(); // 迁移旧 data.json.records → 按天文件，再全部载入内存
    // 包装 saveData：data.json 不再保存 records（打卡记录只走按天文件）
    this.saveData = async (data) => {
      try { await this._flushRecords(); } catch (e) { console.error('habit-checkin: 写按天记录失败', e); }
      const persisted = Object.assign({}, data);
      delete persisted.records;
      return this._baseSaveData(persisted);
    };
    // 从持久化数据恢复上次未结束的计时器；离线期间到点的倒计时放入待结算列表
    const pending = this._restoreTimers();

    this.registerView(VIEW_TYPE, leaf => new HabitView(leaf, this));
    this.registerView(TODAY_VIEW_TYPE, leaf => {
      const v = new HabitTodayView(leaf, this);
      this._todayView = v;
      return v;
    });

    this._setupRibbonIcons();

    this.addCommand({
      id: 'open-main-view',
      name: t('打开习惯打卡统计'),
      callback: () => this.activateView(),
    });
    this.addCommand({
      id: 'open-today-view',
      name: t('今日打卡（右侧栏）'),
      callback: () => this.activateTodayView(),
    });

    this.registerMarkdownCodeBlockProcessor('habit-heatmap', (src, el, ctx) => this.renderEmbedded(src, el, ctx));

    // 与 Calendar 插件集成：点日期 → 打开日记 → file-open → 同步所选日期
    this.registerEvent(this.app.workspace.on('file-open', (file) => {
      if (!file) return;
      const key = U.parseDateKey(file.basename);
      if (key && this._todayView) this._todayView.setDate(key);
    }));

    // Calendar 插件的 sources 集成点：往日历里注入打卡圆点（日历打开时触发）
    this._calendarSource = {
      _isHabitSource: true, // 标记：重载插件时用于去重，避免打点叠加
      getDailyMetadata: (date) => {
        const key = date && date.format ? date.format('YYYY-MM-DD') : U.dateKey(new Date(date));
        const dots = [];
        for (const h of this.data.habits) {
          const count = U.countOf(h.id, key, this.data.records);
          if (count <= 0) continue; // 有打卡才打点
          let cls = `habit-dot habit-${h.id}`;
          if (h.levels && h.levels.length) {
            // 强度分级：按当天次数映射到对应等级的颜色
            cls += ` habit-lv-${h.id}-${countLevel(h, count, HEATMAP_LEVELS)}`;
          }
          dots.push({ className: cls, isFilled: true });
          if (dots.length >= 3) break; // 习惯最多 3 点
        }
        return { dots };
      },
      getWeeklyMetadata: () => ({ dots: [] }),
    };
    this.registerEvent(this.app.workspace.on('calendar:open', (sources) => {
      if (Array.isArray(sources)) this._replaceCalendarSource(sources);
    }));
    this._updateDotStyles();
    this._injectCalendarSource(); // 若日历已打开，尽力注入

    this.settingTab = new HabitCheckinSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.registerEvent(this.app.workspace.on('css-change', () => this.emitDataChange()));

    // 窗口重新聚焦时拉取对端同步下来的按天记录（Synology Drive 等文件级同步）
    this._onFocus = () => { this.refreshRecords(); };
    window.addEventListener('focus', this._onFocus);
    this.register(() => window.removeEventListener('focus', this._onFocus));

    // 补录离线期间到点的倒计时（如昨晚启动 25 分钟倒计时后关闭 Obsidian，下次打开时自动按完整预设记录）
    for (const p of pending) {
      try { await this.finishTimer(p.id, p.preset); } catch (e) { console.error('habit-checkin: 结算离线计时器失败', e); }
    }
  }

  onunload() {
    if (this._dotStyleEl) this._dotStyleEl.remove();
    if (this._listeners) this._listeners.clear();
    document.body.classList.remove('habit-checkin-loaded');
  }

  // ---- 按天分文件存储 ----
  get recordsDir() {
    return this.app.vault.configDir + '/plugins/' + this.manifest.id + '/records';
  }
  async _ensureRecordsDir() {
    const a = this.app.vault.adapter;
    if (!(await a.exists(this.recordsDir))) await a.mkdir(this.recordsDir);
  }
  // 初始化：把 data.json 里旧 records 迁移成按天文件，再全部载入内存（结构不变）
  async _initRecords() {
    const a = this.app.vault.adapter;
    const dir = this.recordsDir;
    const legacy = (this.data.records && typeof this.data.records === 'object') ? this.data.records : {};
    const byDay = {};
    let n = 0;
    for (const hid in legacy) {
      const m = legacy[hid];
      if (!m || typeof m !== 'object') continue;
      for (const key in m) {
        const c = Number(m[key]);
        if (c > 0) { n++; (byDay[key] = byDay[key] || {})[hid] = c; }
      }
    }
    // 迁移旧版 data.json.records → 按天文件。
    // 与已有按天文件【合并】而非覆盖（多设备过渡期对端可能已有更新记录）；
    // 全部写入成功才清空 data.json 旧 records，失败则保留、下次启动重试，绝不丢数据。
    let migrated = true;
    if (n > 0) {
      try {
        await this._ensureRecordsDir();
        for (const key in byDay) {
          const merged = Object.assign({}, byDay[key]);
          const fp = dir + '/' + key + '.json';
          let existing = {};
          try { existing = JSON.parse(await a.read(fp)) || {}; } catch (e) { existing = {}; }
          for (const hid in existing) {
            if (hid in merged) merged[hid] = Math.max(merged[hid], existing[hid]);
            else merged[hid] = existing[hid];
          }
          try { await a.write(fp, JSON.stringify(merged)); } catch (e) { migrated = false; console.error('habit-checkin: 写按天记录失败', key, e); }
        }
      } catch (e) { migrated = false; console.error('habit-checkin: 迁移旧打卡记录失败', e); }
    }
    const records = {};
    try {
      await this._ensureRecordsDir();
      const entries = await a.list(dir);
      await Promise.all((entries.files || []).map(async f => {
        const name = f.split('/').pop();
        if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) return;
        const key = name.slice(0, 10);
        let day = {};
        try { day = JSON.parse(await a.read(f)) || {}; } catch (e) { return; }
        for (const hid in day) {
          const c = Number(day[hid]);
          if (c > 0) (records[hid] = records[hid] || {})[key] = c;
        }
      }));
    } catch (e) { console.error('habit-checkin: 加载按天打卡记录失败', e); }
    this.data.records = records;
    if (n > 0 && migrated) {
      try {
        const clean = Object.assign({}, this.data);
        delete clean.records;
        await this._baseSaveData(clean);
      } catch (e) { console.error('habit-checkin: 清理旧 records 字段失败', e); }
      try { new Notice(t('已迁移历史打卡记录到按天分文件，数据完整保留')); } catch (e) {}
    } else if (n > 0) {
      console.warn('habit-checkin: 打卡记录迁移未完成，已保留 data.json 旧 records，下次启动将重试');
    }
  }
  // 把待落盘日期写为按天文件；串行化避免并发覆盖
  async _flushRecords() {
    const run = this._flushChain.then(() => this._doFlush());
    this._flushChain = run.catch(() => {});
    return run;
  }
  async _doFlush() {
    if (!this._dirtyDays || this._dirtyDays.size === 0) return;
    const a = this.app.vault.adapter;
    const dir = this.recordsDir;
    const records = this.data.records || {};
    const days = [...this._dirtyDays];
    this._dirtyDays.clear();
    await this._ensureRecordsDir();
    for (const key of days) {
      const local = {};
      for (const hid in records) {
        const c = records[hid] && records[hid][key];
        if (c && c > 0) local[hid] = c;
      }
      let disk = {};
      const fp = dir + '/' + key + '.json';
      try { disk = JSON.parse(await a.read(fp)) || {}; } catch (e) { disk = {}; }
      const merged = {};
      for (const hid in local) merged[hid] = local[hid]; // 本机编辑过：以本机为准
      for (const hid in disk) {
        if (this._deletedHabits.has(hid)) continue;       // 本会话明确删除的习惯不复活
        if (this._zeroed.has(hid + '|' + key)) continue;  // 本会话清零的不复活
        if (!(hid in merged)) merged[hid] = disk[hid];    // 采纳对端已同步下来的记录
      }
      if (!Object.keys(merged).length) {
        try { await a.remove(fp); } catch (e) {}
        continue;
      }
      await a.write(fp, JSON.stringify(merged));
    }
  }
  // 扫描按天目录，把对端同步下来的新记录并入内存（窗口聚焦 / 视图打开时调用）
  async refreshRecords() {
    const a = this.app.vault.adapter;
    const dir = this.recordsDir;
    const records = this.data.records || {};
    let changed = false;
    try {
      if (!(await a.exists(dir))) return false;
      const entries = await a.list(dir);
      for (const f of entries.files || []) {
        const name = f.split('/').pop();
        if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) continue;
        const key = name.slice(0, 10);
        let day = {};
        try { day = JSON.parse(await a.read(f)) || {}; } catch (e) { continue; }
        for (const hid in day) {
          if (this._deletedHabits.has(hid)) continue;
          if (this._zeroed.has(hid + '|' + key)) continue;
          const c = Number(day[hid]);
          if (!(c > 0)) continue;
          const cur = records[hid] && records[hid][key];
          if (cur === undefined || c > cur) {
            (records[hid] = records[hid] || {})[key] = c;
            changed = true;
          }
        }
      }
    } catch (e) { return false; }
    if (changed) this.emitDataChange();
    return changed;
  }

  // ---- 事件总线 ----
  onDataChange(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }
  emitDataChange() {
    for (const cb of [...this._listeners]) { try { cb(); } catch (e) { console.error(e); } }
    this._updateDotStyles();
    this._injectCalendarSource();
  }

  // ---- 语言切换：更新全局语言，刷新侧栏图标、视图与设置页 ----
  setLanguage() {
    _lang = detectLang(this.data.settings.language);
    this._setupRibbonIcons();
    this.emitDataChange();
    if (this.settingTab) this.settingTab.display();
  }

  // ---- Calendar 插件集成 ----
  _updateDotStyles() {
    if (!this._dotStyleEl) {
      this._dotStyleEl = document.createElement('style');
      this._dotStyleEl.id = 'habit-checkin-dot-colors';
      document.head.appendChild(this._dotStyleEl);
    }
    const rules = [];
    for (const h of this.data.habits) {
      if (h.levels && h.levels.length) {
        // 强度分级：按各等级颜色生成打点样式
        h.levels.forEach((lv, i) => {
          if (lv && lv.color) rules.push(`svg.habit-dot.habit-${h.id}.habit-lv-${h.id}-${i + 1}{fill:${lv.color}}`);
        });
      } else {
        rules.push(`svg.habit-dot.habit-${h.id}{fill:${h.color}}`);
      }
    }
    this._dotStyleEl.textContent = rules.join('\n');
  }

  // 替换日历数组中的打卡 source：先移除旧的（按标记）再添加新的，避免重载插件后打点叠加
  _replaceCalendarSource(arr) {
    const old = arr.findIndex(s => s && s._isHabitSource);
    if (old >= 0) arr.splice(old, 1);
    if (!arr.includes(this._calendarSource)) arr.push(this._calendarSource);
  }

  // 日历已打开时：通过 Svelte 内部 `$$` 注入 source 并触发重渲染（尽力而为，失败则下次打开日历生效）
  _injectCalendarSource() {
    try {
      const leaves = this.app.workspace.getLeavesOfType('calendar');
      for (const leaf of leaves) {
        const cal = leaf.view && leaf.view.calendar;
        if (!cal || !cal.$$ || !cal.$$.props) continue;
        const idx = cal.$$.props.sources;
        const arr = cal.$$.ctx && cal.$$.ctx[idx];
        if (Array.isArray(arr)) {
          this._replaceCalendarSource(arr);
          if (typeof cal.$set === 'function') {
            cal.$set({ sources: [...arr] }); // 新引用触发重渲染，圆点即时更新
          }
        }
      }
    } catch (e) { console.debug('habit-checkin: 注入日历圆点失败', e); }
  }

  // 从持久化数据恢复计时器：未到点的继续计时；离线期间已到点的倒计时标记为待结算
  _restoreTimers() {
    const pending = [];
    const saved = this.data.timers || {};
    this.data.timers = saved;
    const now = Date.now();
    for (const id in saved) {
      const t = saved[id];
      if (!t || !t.start) continue;
      if (t.preset && (now - t.start >= t.preset * 60000)) {
        pending.push({ id, preset: t.preset });
        delete saved[id];
      } else {
        this._timers[id] = { start: t.start, preset: t.preset || null };
      }
    }
    return pending;
  }

  // 根据设置重建左侧栏功能图标（支持显示/隐藏与自定义图标）
  _setupRibbonIcons() {
    for (const el of (this._ribbonEls || [])) { try { el.remove(); } catch (e) {} }
    this._ribbonEls = [];
    const s = this.data.settings;
    if (s.ribbonMain !== false) {
      this._ribbonEls.push(this.addRibbonIcon(s.ribbonMainIcon || 'calendar-check', t('习惯打卡'), () => this.activateView()));
    }
    if (s.ribbonToday !== false) {
      this._ribbonEls.push(this.addRibbonIcon(s.ribbonTodayIcon || 'check-square', t('今日打卡（右侧栏）'), () => this.activateTodayView()));
    }
  }

  // ---- 视图 ----
  async activateView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length) { await workspace.revealLeaf(existing[0]); return; }
    const leaf = workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await workspace.revealLeaf(leaf);
  }

  async activateTodayView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(TODAY_VIEW_TYPE);
    if (existing.length) { await workspace.revealLeaf(existing[0]); return; }
    // 优先分裂右侧栏：让「今日打卡」列表出现在 Calendar 插件下方
    let leaf = null;
    try { leaf = workspace.getRightLeaf(true); } catch (e) { leaf = null; }
    if (!leaf) { try { leaf = workspace.getRightLeaf(false); } catch (e) { leaf = null; } }
    if (!leaf) leaf = workspace.getLeaf('tab');
    await leaf.setViewState({ type: TODAY_VIEW_TYPE, active: true });
  }

  // ---- 数据写入口 ----
  async toggleCheckin(habitId, key, dec, amount) {
    const h = this.data.habits.find(x => x.id === habitId);
    if (!h) return;
    const cur = U.countOf(habitId, key, this.data.records);
    const isCount = U.isCounting(h);
    const step = (amount && amount > 0) ? amount : U.stepOf(h);
    let next;
    if (!isCount) next = cur >= 1 ? 0 : 1;
    else if (dec) next = Math.max(0, cur - step);
    else next = Math.min(999999, cur + step); // 高上限，避免误触撑爆记录

    if (!this.data.records[habitId]) this.data.records[habitId] = {};
    if (next > 0) {
      this.data.records[habitId][key] = next;
      if (this._zeroed) this._zeroed.delete(habitId + '|' + key); // 重新打卡：清除清零墓碑
    } else {
      delete this.data.records[habitId][key];
      if (this._zeroed) this._zeroed.add(habitId + '|' + key); // 清零墓碑：写盘合并时不复活对端旧值
    }
    if (this._dirtyDays) this._dirtyDays.add(key); // 标记该天待写盘（按天分文件）

    await this.saveData(this.data);
    this.emitDataChange();
  }

  // ---- 计时器 ----
  startTimer(habitId, preset) {
    const h = this.data.habits.find(x => x.id === habitId);
    if (!h || h.inputMode !== 'timer') return;
    if (this._timers[habitId] && this._timers[habitId].start) return; // 已在计时
    this._timers[habitId] = { start: Date.now(), preset: preset > 0 ? preset : null };
    if (!this.data.timers) this.data.timers = {};
    this.data.timers[habitId] = Object.assign({}, this._timers[habitId]); // 持久化，重启后可恢复
    this.saveData(this.data); // 异步落盘，崩溃/重启不丢计时状态
    this.emitDataChange();
  }

  // 结束计时：按实际用时（向下取整到分钟）计入统计；不足一分钟不计
  async stopTimer(habitId) {
    const t = this._timers[habitId];
    if (!t || !t.start) return;
    const minutes = Math.floor((Date.now() - t.start) / 60000);
    await this.finishTimer(habitId, minutes);
  }

  async finishTimer(habitId, minutes) {
    const hadTimer = !!(this._timers && this._timers[habitId]) || !!(this.data.timers && this.data.timers[habitId]);
    if (this._timers) delete this._timers[habitId];
    if (this.data.timers) delete this.data.timers[habitId];
    if (minutes > 0) {
      await this.toggleCheckin(habitId, U.todayKey(), false, minutes); // 内部会 saveData + emitDataChange
    } else if (hadTimer) {
      await this.saveData(this.data); // 清除了持久化计时器，需要落盘
      this.emitDataChange();
    } else {
      this.emitDataChange();
    }
  }

  // ---- 笔记内嵌 ----
  renderEmbedded(source, el, ctx) {
    const params = parseBlockParams(source);
    const range = params.range === 'month' || params.range === '3m' ? params.range : 'year'; // year / 3m / month
    const draw = () => {
      if (!el.isConnected) return;
      try {
        el.empty();
        el.addClass('habit-embed');
        // 全年默认撑满整行；3个月/当月用紧凑型（宽度随内容收缩）
        if (range !== 'year') el.addClass('habit-embed--compact');
        // 内联兜底：即使 styles.css 未加载也能看到嵌入盒子，避免"一片空白"无法诊断
        el.style.border = '1px solid var(--background-modifier-border)';
        el.style.borderRadius = '6px';
        el.style.padding = '8px';
        if (!this.data.habits.length) {
          el.createDiv({ cls: 'habit-embed-empty', text: t('还没有习惯，请先在「设置 → 习惯打卡」新建。') });
          return;
        }
        if (params.habitId && params.habitId !== 'all' && !this.data.habits.some(h => h.id === params.habitId)) {
          el.createDiv({ cls: 'habit-embed-empty', text: t('未找到习惯 ID：{id}', { id: params.habitId }) });
          return;
        }
        renderHeatmap(el, {
          habits: this.data.habits,
          records: this.data.records,
          settings: this.data.settings,
          habitId: params.habitId || 'all',
          range,
          anchor: new Date(),
        });
      } catch (e) {
        console.error('habit-checkin: 嵌入渲染失败', e);
        el.empty();
        el.createDiv({ cls: 'habit-embed-empty', text: t('⚠️ 热力图渲染失败：{msg}', { msg: e && e.message ? e.message : e }) });
      }
    };
    draw();
    const off = this.onDataChange(draw);
    this.register(() => off());
  }
}

/* =========================================================
 * 主视图
 * ========================================================= */
class HabitView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this._rangeTouched = false;                        // 用户是否手动切过范围
    this.range = this.plugin.data.settings.defaultRange || 'year'; // 主视图当前范围：'year'/'3m'/'month'
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return t('习惯打卡'); }
  getIcon() { return 'calendar-check'; }

  async onOpen() {
    this._unsub = this.plugin.onDataChange(() => this.rerender());
    // 窄屏/触屏默认折叠到近三月，便于一眼看完；用户手动切换后以用户为准
    if (!this._rangeTouched && isTouchOrNarrow() && this.range === 'year') {
      this.range = '3m';
    }
    this.rerender();
    this.plugin.refreshRecords().then(() => this.rerender()); // 拉取对端同步下来的新记录
  }

  onClose() {
    if (this._unsub) this._unsub();
  }

  // 主视图 = 顶部今日概览 + 范围切换 + 每个习惯一个区块（标题/统计 + 热力图，只读）
  rerender() {
    const { contentEl } = this;
    contentEl.empty();
    const habits = [...this.plugin.data.habits].sort((a, b) => a.sort - b.sort);
    const records = this.plugin.data.records;
    const settings = this.plugin.data.settings;
    const today = U.todayKey();
    const now = new Date();

    // 顶部今日概览
    const head = contentEl.createDiv({ cls: 'habit-dash-head' });
    head.createSpan({ cls: 'habit-dash-date', text: dateLabel(now) });
    const planToday = habits.filter(h => U.isInPlan(h, today));
    const doneToday = planToday.filter(h => U.isCompleted(h, today, records));
    head.createSpan({ cls: 'habit-dash-progress', text: t('今日完成 {a}/{b}', { a: doneToday.length, b: planToday.length }) });
    if (planToday.length) {
      const bar = contentEl.createDiv({ cls: 'habit-progress-bar' });
      bar.createDiv({ cls: 'habit-progress-fill', attr: { style: `width:${Math.round(doneToday.length / planToday.length * 100)}%` } });
    }
    const hint = contentEl.createDiv({ cls: 'habit-dash-hint' });
    hint.createEl('button', { cls: 'habit-btn habit-check-btn', text: t('今日打卡') })
      .addEventListener('click', () => this.plugin.activateTodayView());
    hint.createSpan({ text: t(' 或命令「今日打卡（右侧栏）」') });

    if (!habits.length) {
      contentEl.createDiv({ cls: 'habit-dash-empty', text: t('还没有习惯，去「设置 → 习惯打卡」新建一个吧') });
      return;
    }

    // 范围切换：全年 / 近三月 / 当月（全局生效，选择会记住）
    const rangeRow = contentEl.createDiv({ cls: 'habit-range-row' });
    rangeRow.createSpan({ cls: 'habit-range-label', text: t('范围') });
    for (const r of ['year', '3m', 'month']) {
      const btn = rangeRow.createEl('button', {
        cls: 'habit-btn habit-range-btn' + (this.range === r ? ' is-active' : ''),
        text: r === 'year' ? t('全年') : r === '3m' ? t('近三月') : t('当月'),
      });
      btn.addEventListener('click', () => {
        this._rangeTouched = true;
        this.range = r;
        if (this.plugin.data.settings.defaultRange !== r) {
          this.plugin.data.settings.defaultRange = r;
          this.plugin.saveData(this.plugin.data);
        }
        this.rerender();
      });
    }

    // 每个习惯一个区块：标题 + 统计 + 热力图
    for (const h of habits) {
      const block = contentEl.createDiv({ cls: 'habit-block' });
      const comp = U.monthCompletion(h, records, now.getFullYear(), now.getMonth());
      const s = settings;
      const title = block.createDiv({ cls: 'habit-block-head' });
      title.createSpan({ cls: 'habit-block-name', text: `${h.emoji || ''} ${h.name}` });
      if (s.showStatStreak !== false) title.createSpan({ cls: 'habit-stat-item', text: t('🔥 连续 {n} 天', { n: U.currentStreak(h, records, today) }) });
      if (s.showStatLongest !== false) title.createSpan({ cls: 'habit-stat-item', text: t('🏆 最长 {n} 天', { n: U.longestStreak(h, records) }) });
      if (s.showStatMonth !== false) title.createSpan({ cls: 'habit-stat-item', text: t('📅 本月 {a}/{b}', { a: comp.done, b: comp.plan }) });
      if (s.showStatTotal !== false) title.createSpan({ cls: 'habit-stat-item', text: t('✅ 总 {n}{u}', { n: U.totalCheckins(h, records), u: unitOf(h) }) });
      const body = block.createDiv({ cls: 'habit-block-body' });
      renderHeatmap(body, {
        habits: [h],
        records,
        settings,
        habitId: h.id,
        range: this.range,
        anchor: new Date(),
      });
      // 强度分级图例（可设置开关）
      if (h.levels && h.levels.length && settings.showLegend !== false) {
        const legend = block.createDiv({ cls: 'habit-legend' });
        h.levels.forEach((lv, i) => {
          const item = legend.createDiv({ cls: 'habit-legend-item' });
          item.createSpan({ cls: 'habit-legend-swatch', attr: { style: `background:${lv.color}` } });
          item.createSpan({ cls: 'habit-legend-text', text: t('等级{n} ≤{v}{u}', { n: i + 1, v: lv.max, u: unitOf(h) }) });
        });
      }
    }
  }
}

/* =========================================================
 * 今日打卡视图（右侧栏）：习惯列表 + 一键打卡
 * ========================================================= */
class HabitTodayView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.dateKey = U.todayKey(); // 当前查看的日期（默认今天；点日历日期后自动切换）
  }
  getViewType() { return TODAY_VIEW_TYPE; }
  getDisplayText() { return t('今日打卡'); }
  getIcon() { return 'calendar-check'; }

  setDate(key) {
    const k = U.parseDateKey(key);
    if (!k || k === this.dateKey) return;
    this.dateKey = k;
    this.rerender();
  }

  async onOpen() {
    this._unsub = this.plugin.onDataChange(() => this.rerender());
    this._startTicker();
    this.rerender();
    this.plugin.refreshRecords().then(() => this.rerender());
  }
  onClose() {
    this._stopTicker();
    if (this._unsub) this._unsub();
    if (this.plugin._todayView === this) this.plugin._todayView = null;
  }

  // ---- 计时器显示 ----
  fmtTimer(t) {
    const elapsedSec = Math.floor((Date.now() - t.start) / 1000);
    const totalSec = t.preset ? Math.max(0, t.preset * 60 - elapsedSec) : elapsedSec;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    return (h > 0 ? h + ':' : '') + pad(m) + ':' + pad(s);
  }
  _startTicker() {
    if (this._ticker) return;
    this._ticker = setInterval(() => this._tickTimer(), 1000);
  }
  _stopTicker() {
    if (this._ticker) { clearInterval(this._ticker); this._ticker = null; }
  }
  async _tickTimer() {
    const timers = this.plugin._timers || {};
    let auto = null;
    for (const id in timers) {
      const t = timers[id];
      if (t && t.start && t.preset && (Date.now() - t.start >= t.preset * 60000)) {
        auto = { id, preset: t.preset };
        break;
      }
    }
    // 就地更新运行中的时间显示（不整体重渲染，避免打断输入）
    if (this.contentEl) {
      this.contentEl.querySelectorAll('.habit-timer-elapsed').forEach(el => {
        const t = timers[el.dataset.habit];
        if (t && t.start) el.textContent = this.fmtTimer(t);
      });
    }
    if (auto) await this.plugin.finishTimer(auto.id, auto.preset); // 倒计时到点自动结束
  }

  rerender() {
    const { contentEl } = this;
    contentEl.empty();
    const habits = [...this.plugin.data.habits].sort((a, b) => a.sort - b.sort);
    const records = this.plugin.data.records;
    const today = U.todayKey();
    const key = this.dateKey;

    // 头部：日期选择（日期已由 input 展示，不再另显文字）
    const head = contentEl.createDiv({ cls: 'habit-today-head' });
    const dateRow = head.createDiv({ cls: 'habit-today-date-row' });
    const dateInput = dateRow.createEl('input', { attr: { type: 'date', value: key } });
    dateInput.addEventListener('change', () => { if (dateInput.value) this.setDate(dateInput.value); });
    if (key !== today) {
      dateRow.createEl('button', { cls: 'habit-btn habit-step-btn', text: t('今天') })
        .addEventListener('click', () => this.setDate(today));
    }

    // 完成度文本：与日期选择同一行，靠右对齐；进度条仍在下方
    const planHabits = habits.filter(h => U.isInPlan(h, key));
    const doneHabits = planHabits.filter(h => U.isCompleted(h, key, records));
    const pct = planHabits.length ? Math.round(doneHabits.length / planHabits.length * 100) : 0;
    dateRow.createDiv({ cls: 'habit-today-pct', text: t('完成 {a}/{b} · {p}%', { a: doneHabits.length, b: planHabits.length, p: pct }) });
    if (planHabits.length) {
      const bar = contentEl.createDiv({ cls: 'habit-progress-bar' });
      bar.createDiv({ cls: 'habit-progress-fill', attr: { style: `width:${pct}%` } });
    }

    if (!habits.length) {
      contentEl.createDiv({ cls: 'habit-today-empty', text: t('还没有习惯，请先在「设置 → 习惯打卡」新建。') });
      return;
    }

    // 习惯列表：每行 = 信息 + 打卡按钮（针对所选日期）
    const list = contentEl.createDiv({ cls: 'habit-today-list' });
    for (const h of habits) {
      const row = list.createDiv({ cls: 'habit-today-row' });
      const info = row.createDiv({ cls: 'habit-today-info' });
      info.createSpan({ cls: 'habit-today-name', text: `${h.emoji || ''} ${h.name}` });
      if (!U.isInPlan(h, key)) {
        row.addClass('is-off');
        info.createSpan({ cls: 'habit-today-desc', text: t('该日不计划') });
        continue;
      }
      const cur = U.countOf(h.id, key, records);
      const done = U.isCompleted(h, key, records);
      const isCount = U.isCounting(h);
      const goal = U.goalOf(h);
      const u = unitOf(h);
      const fmt = n => `${n}${u}`;
      const ctl = row.createDiv({ cls: 'habit-today-ctl' });
      if (!isCount) {
        const btn = ctl.createEl('button', { cls: 'habit-btn habit-check-btn' + (done ? ' is-done' : ''), text: done ? t('✓ 已打卡') : t('打卡') });
        btn.addEventListener('click', () => this.plugin.toggleCheckin(h.id, key, false)); // 再点一次可撤销
      } else if (h.inputMode === 'timer') {
        // 计时器：正向计时 / 倒计时（单位分钟）
        const tm = (this.plugin._timers && this.plugin._timers[h.id]) || null;
        const running = !!(tm && tm.start);
        const isCd = h.timerType === 'countdown';
        info.createSpan({ cls: 'habit-today-desc', text: t('当日 {c}/{g} · {m}', { c: fmt(cur), g: fmt(goal), m: isCd ? t('倒计时') : t('正向计时') }) });
        if (running) {
          const el = ctl.createSpan({ cls: 'habit-timer-elapsed', text: this.fmtTimer(tm) });
          el.dataset.habit = h.id;
          ctl.createEl('button', { cls: 'habit-btn habit-step-btn', text: t('结束') })
            .addEventListener('click', () => this.plugin.stopTimer(h.id));
        } else if (isCd) {
          const pi = ctl.createEl('input', { attr: { type: 'number', min: '1', value: String(h.step > 0 ? h.step : 25) } });
          pi.addClass('habit-amt-input');
          ctl.createEl('button', { cls: 'habit-btn habit-check-btn', text: t('开始') })
            .addEventListener('click', () => {
              const v = parseFloat(pi.value);
              this.plugin.startTimer(h.id, v > 0 ? v : (h.step > 0 ? h.step : 25));
            });
        } else {
          ctl.createEl('button', { cls: 'habit-btn habit-check-btn', text: t('开始计时') })
            .addEventListener('click', () => this.plugin.startTimer(h.id, null));
        }
      } else {
        info.createSpan({ cls: 'habit-today-desc', text: t('当日 {c}/{g}', { c: fmt(cur), g: fmt(goal) }) });
        let amtInput = null;
        if (h.inputMode === 'manual') {
          // 手动填写模式：中间是数量输入框，+/− 按输入值增减
          amtInput = ctl.createEl('input', { attr: { type: 'number', min: '0', step: 'any', value: String(U.stepOf(h)) } });
          amtInput.addClass('habit-amt-input');
        } else {
          ctl.createEl('button', { cls: 'habit-btn habit-step-btn is-count', text: `${fmt(cur)}` });
        }
        const getAmt = () => {
          if (amtInput) { const v = parseFloat(amtInput.value); if (v > 0) return v; }
          return U.stepOf(h);
        };
        ctl.createEl('button', { cls: 'habit-btn habit-step-btn', text: '−' })
          .addEventListener('click', () => this.plugin.toggleCheckin(h.id, key, true, getAmt()));
        ctl.createEl('button', { cls: 'habit-btn habit-step-btn', text: '+' })
          .addEventListener('click', () => this.plugin.toggleCheckin(h.id, key, false, getAmt()));
      }
    }
  }
}

/* =========================================================
 * 习惯表单弹窗
 * ========================================================= */
class HabitFormModal extends Modal {
  constructor(app, plugin, habit) {
    super(app);
    this.plugin = plugin;
    this.habit = habit ? Object.assign({}, habit) : null;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: this.habit ? t('编辑习惯') : t('新建习惯') });

    const form = {
      name: this.habit ? this.habit.name : '',
      emoji: this.habit ? this.habit.emoji : '',
      color: this.habit ? this.habit.color : '#4ade80',
      startDate: this.habit ? this.habit.startDate : U.todayKey(),
      endDate: this.habit ? this.habit.endDate : null,
      target: this.habit ? this.habit.target : 1,
      weekly: this.habit ? (this.habit.weekly || []) : [],
      useLevels: !!(this.habit && this.habit.levels && this.habit.levels.length),
      levels: this.habit && this.habit.levels && this.habit.levels.length
        ? this.habit.levels.map(l => ({ max: l.max, color: l.color }))
        : [{ max: 5, color: this.habit ? this.habit.color : '#4ade80' }],
      step: this.habit ? (this.habit.step || 1) : 1,
      unit: this.habit ? (this.habit.unit || '') : '',
      inputMode: this.habit ? (this.habit.inputMode || 'fixed') : 'fixed',
      timerType: this.habit ? (this.habit.timerType || 'stopwatch') : 'stopwatch',
    };

    new Setting(contentEl)
      .setName(t('名称'))
      .setDesc(t('如：背单词、跑步'))
      .addText(txt => {
        txt.setPlaceholder(t('习惯名称')).setValue(form.name).onChange(v => { form.name = v; });
        txt.inputEl.focus();
      });

    new Setting(contentEl)
      .setName(t('图标'))
      .setDesc(t('可选 emoji，如 📖'))
      .addText(txt => txt.setPlaceholder('📖').setValue(form.emoji).onChange(v => { form.emoji = v; }));

    new Setting(contentEl)
      .setName(t('颜色'))
      .setDesc(t('日历/热力图中打卡的显示颜色'))
      .addColorPicker(c => c.setValue(form.color).onChange(v => { form.color = v; }));

    // 开始日期
    const startSetting = new Setting(contentEl).setName(t('开始日期'));
    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.value = form.startDate;
    startInput.addEventListener('change', () => { form.startDate = startInput.value; });
    startSetting.controlEl.appendChild(startInput);

    // 结束日期 + 长期
    const endSetting = new Setting(contentEl).setName(t('结束日期')).setDesc(t('勾选「长期」则没有结束日期'));
    const longLabel = document.createElement('label');
    longLabel.className = 'habit-weekly-chip';
    const longCb = document.createElement('input');
    longCb.type = 'checkbox';
    longLabel.appendChild(longCb);
    longLabel.appendChild(document.createTextNode(t('长期')));
    const endInput = document.createElement('input');
    endInput.type = 'date';
    if (form.endDate) endInput.value = form.endDate;
    else { longCb.checked = true; endInput.disabled = true; }
    longCb.addEventListener('change', () => {
      endInput.disabled = longCb.checked;
      if (longCb.checked) { endInput.value = ''; form.endDate = null; }
    });
    endInput.addEventListener('change', () => { form.endDate = endInput.value || null; });
    endSetting.controlEl.appendChild(longLabel);
    endSetting.controlEl.appendChild(endInput);

    // 每日目标（非强度分级时使用）：与「每次打卡量」同单位，支持小数
    const targetSetting = new Setting(contentEl)
      .setName(t('每日目标'))
      .setDesc(t('目标数量，与「每次打卡量」同单位；支持小数'));
    const targetInput = document.createElement('input');
    targetInput.type = 'number';
    targetInput.min = '0.1';
    targetInput.step = 'any';
    targetInput.value = String(form.target);
    targetInput.style.width = '110px';
    targetInput.addEventListener('input', () => { form.target = parseFloat(targetInput.value) || 1; });
    targetSetting.controlEl.appendChild(targetInput);
    const targetUnitEl = document.createElement('span');
    targetUnitEl.className = 'habit-target-unit';
    targetUnitEl.textContent = form.unit || '';
    targetSetting.controlEl.appendChild(targetUnitEl);

    // 强度分级
    new Setting(contentEl)
      .setName(t('强度分级'))
      .setDesc(t('开启后按次数区间显示不同颜色，打卡变为次数叠加（点一次 +1）'))
      .addToggle(tgl => tgl.setValue(form.useLevels).onChange(v => {
        form.useLevels = v;
        presetRow.toggle(v);
        levelBox.toggle(v);
        syncTargetFromLevels();
      }));

    // 每日目标与强度分级联动：分级时目标=最高等级上限（只读），否则可编辑
    function syncTargetFromLevels() {
      if (form.useLevels && form.levels.length) {
        const lastMax = form.levels[form.levels.length - 1].max;
        form.target = lastMax;
        targetInput.value = String(lastMax);
        targetInput.disabled = true;
        targetSetting.setDesc(t('强度分级时，每日目标 = 最高等级上限（自动同步）'));
      } else {
        targetInput.disabled = false;
        targetSetting.setDesc(t('目标数量，与「每次打卡量」同单位；支持小数'));
      }
    }

    // 预设配色（强度分级时显示）：一键应用五级渐变，再填强度数值即可
    const presetRow = contentEl.createDiv({ cls: 'habit-preset-row' });
    presetRow.toggle(form.useLevels);
    function applyPreset(preset) {
      while (form.levels.length < 5) {
        const last = form.levels[form.levels.length - 1];
        form.levels.push({ max: (last ? last.max : 0) + 5, color: '#8a8a8a' });
      }
      form.levels.slice(0, 5).forEach((lv, i) => { lv.color = preset.colors[i]; });
      renderLevels();
    }
    for (const p of PRESET_PALETTES) {
      const chip = presetRow.createDiv({ cls: 'habit-preset-chip', attr: { title: t(p.name) } });
      for (const c of p.colors) chip.createSpan({ cls: 'habit-preset-dot', attr: { style: `background:${c}` } });
      chip.addEventListener('click', () => applyPreset(p));
    }

    // 强度等级编辑（useLevels 时显示）
    const levelBox = contentEl.createDiv({ cls: 'habit-level-box' });
    levelBox.toggle(form.useLevels);
    function renderLevels() {
      levelBox.empty();
      for (let i = 0; i < form.levels.length; i++) {
        const lv = form.levels[i];
        const row = levelBox.createDiv({ cls: 'habit-level-row' });
        row.createSpan({ cls: 'habit-level-tag', text: t('等级{n}', { n: i + 1 }) });
        row.createSpan({ cls: 'habit-level-cond', text: '≤' });
        const maxInput = row.createEl('input', { attr: { type: 'number', min: '0.1', step: 'any', value: String(lv.max) } });
        maxInput.addEventListener('input', () => { lv.max = Math.max(0.1, parseFloat(maxInput.value) || 1); syncTargetFromLevels(); });
        const colorInput = row.createEl('input', { attr: { type: 'color', value: lv.color } });
        colorInput.addEventListener('change', () => { lv.color = colorInput.value; });
        row.createEl('button', { cls: 'habit-btn', text: '✕' }).addEventListener('click', () => { form.levels.splice(i, 1); renderLevels(); });
      }
      levelBox.createEl('button', { cls: 'habit-btn', text: t('＋ 添加强度') }).addEventListener('click', () => {
        const last = form.levels[form.levels.length - 1];
        form.levels.push({ max: (last ? last.max : 0) + 5, color: last ? last.color : '#4ade80' });
        renderLevels();
      });
      syncTargetFromLevels();
    }
    renderLevels();

    // 打卡方式：固定每次打卡量 / 手动填写 / 计时器
    const modeSetting = new Setting(contentEl)
      .setName(t('打卡方式'))
      .setDesc(t('固定：点 +/− 加固定值；手动：先填数量再点 +/−；计时：分钟计时'))
      .addDropdown(d => d
        .addOption('fixed', t('固定每次打卡量'))
        .addOption('manual', t('打卡时手动填写'))
        .addOption('timer', t('计时器（分钟）'))
        .setValue(form.inputMode || 'fixed')
        .onChange(v => {
          form.inputMode = v;
          timerTypeSetting.settingEl.toggle(v === 'timer');
          if (v === 'timer') {
            const tu = timerUnit();
            form.unit = tu;
            unitInput.value = tu;
            targetUnitEl.textContent = tu;
            stepSetting.setDesc(t('倒计时的默认预设分钟数'));
          } else {
            stepSetting.setDesc(t('固定模式：点一次 +N；手动模式：打卡输入框的默认值'));
          }
        }));

    // 计时类型（打卡方式=计时器时显示）
    const timerTypeSetting = new Setting(contentEl)
      .setName(t('计时类型'))
      .setDesc(t('正向：点开始/结束，用时计入；倒计时：预设分钟数，可提前结束'))
      .addDropdown(d => d
        .addOption('stopwatch', t('正向计时'))
        .addOption('countdown', t('倒计时'))
        .setValue(form.timerType || 'stopwatch')
        .onChange(v => { form.timerType = v; }));
    timerTypeSetting.settingEl.toggle(form.inputMode === 'timer');

    // 每次打卡量 + 单位
    const stepSetting = new Setting(contentEl)
      .setName(t('每次打卡量'))
      .setDesc(form.inputMode === 'timer' ? t('倒计时的默认预设分钟数') : t('固定模式：点一次 +N；手动模式：打卡输入框的默认值'));
    const stepInput = document.createElement('input');
    stepInput.type = 'number';
    stepInput.min = '0.1';
    stepInput.step = 'any';
    stepInput.value = String(form.step);
    stepInput.style.width = '80px';
    stepInput.addEventListener('input', () => { form.step = parseFloat(stepInput.value) || 1; });
    stepSetting.controlEl.appendChild(stepInput);
    const unitInput = document.createElement('input');
    unitInput.type = 'text';
    unitInput.placeholder = t('单位：ml/h/页…');
    unitInput.value = form.unit;
    unitInput.style.width = '96px';
    unitInput.addEventListener('input', () => { form.unit = unitInput.value.trim(); targetUnitEl.textContent = form.unit; });
    stepSetting.controlEl.appendChild(unitInput);

    // 周计划
    const wk = new Setting(contentEl).setName(t('每周计划')).setDesc(t('全不选 = 每天'));
    const chips = wk.controlEl.createDiv({ cls: 'habit-weekly' });
    for (let i = 0; i < 7; i++) {
      const lab = document.createElement('label');
      lab.className = 'habit-weekly-chip';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = i;
      if (form.weekly.includes(i)) cb.checked = true;
      cb.addEventListener('change', () => {
        form.weekly = [...chips.querySelectorAll('input:checked')].map(x => Number(x.value));
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(wd(i)));
      chips.appendChild(lab);
    }

    new Setting(contentEl)
      .addButton(b => b.setButtonText(t('保存')).setCta().onClick(() => { this.save(form); }))
      .addButton(b => b.setButtonText(t('取消')).onClick(() => this.close()));
  }

  save(form) {
    if (!form.name.trim()) { new Notice(t('请输入习惯名称')); return; }
    const data = this.plugin.data;
    const levels = form.useLevels ? form.levels
      .map(l => ({ max: Math.max(0.1, parseFloat(l.max) || 1), color: /^#[0-9a-f]{3,8}$/i.test(l.color || '') ? l.color : '#4ade80' }))
      .sort((a, b) => a.max - b.max) : [];
    if (this.habit) {
      const h = data.habits.find(x => x.id === this.habit.id);
      if (h) {
        Object.assign(h, {
          name: form.name.trim(),
          emoji: form.emoji,
          color: form.color,
          startDate: form.startDate,
          endDate: form.endDate,
          target: levels.length ? levels[levels.length - 1].max : form.target,
          levels,
          step: Math.max(0.1, parseFloat(form.step) || 1),
          unit: form.inputMode === 'timer' ? timerUnit() : (form.unit || ''),
          inputMode: form.inputMode === 'manual' ? 'manual' : form.inputMode === 'timer' ? 'timer' : 'fixed',
          timerType: form.inputMode === 'timer' ? (form.timerType || 'stopwatch') : null,
          weekly: form.weekly,
        });
      }
    } else {
      data.habits.push({
        id: U.uid(),
        name: form.name.trim(),
        emoji: form.emoji,
        color: form.color,
        startDate: form.startDate,
        endDate: form.endDate,
        target: levels.length ? levels[levels.length - 1].max : form.target,
        levels,
        step: Math.max(0.1, parseFloat(form.step) || 1),
        unit: form.inputMode === 'timer' ? timerUnit() : (form.unit || ''),
        inputMode: form.inputMode === 'manual' ? 'manual' : form.inputMode === 'timer' ? 'timer' : 'fixed',
        timerType: form.inputMode === 'timer' ? (form.timerType || 'stopwatch') : null,
        weekly: form.weekly,
        sort: data.habits.length,
        createdAt: U.todayKey(),
      });
    }
    this.plugin.saveData(data).then(() => {
      this.plugin.emitDataChange();
      if (this.plugin.settingTab) this.plugin.settingTab.display(); // 新建/编辑后立即刷新设置页
    });
    this.close();
  }

  onClose() { this.contentEl.empty(); }
}

/* =========================================================
 * 设置页
 * ========================================================= */
class HabitCheckinSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: t('习惯打卡') });
    containerEl.createEl('p', { text: t('新建/管理习惯，主视图看热力图；点习惯行「复制」图标，可把该习惯的热力图嵌入任意笔记。'), cls: 'setting-item-description' });

    // 界面语言切换
    new Setting(containerEl)
      .setName(t('语言 / Language'))
      .setDesc(t('切换插件界面语言'))
      .addDropdown(d => d
        .addOption('auto', t('跟随系统'))
        .addOption('zh', '中文')
        .addOption('en', 'English')
        .setValue(this.plugin.data.settings.language || 'auto')
        .onChange(async v => {
          this.plugin.data.settings.language = v === 'auto' ? null : v;
          await this.plugin.saveData(this.plugin.data);
          this.plugin.setLanguage();
        }));

    new Setting(containerEl)
      .setName(t('新建习惯'))
      .addButton(b => b.setButtonText(t('＋ 新建习惯')).setCta().onClick(() => new HabitFormModal(this.app, this.plugin).open()));

    containerEl.createEl('h3', { text: t('视图偏好') });

    new Setting(containerEl)
      .setName(t('每周第一天'))
      .setDesc(t('日历与热力图的起始列'))
      .addDropdown(d => d
        .addOption('1', t('周一'))
        .addOption('0', t('周日'))
        .setValue(String(this.plugin.data.settings.firstDayOfWeek))
        .onChange(async v => {
          this.plugin.data.settings.firstDayOfWeek = Number(v);
          await this.plugin.saveData(this.plugin.data);
          this.plugin.emitDataChange();
        }));

    new Setting(containerEl)
      .setName(t('主视图默认范围'))
      .setDesc(t('主视图热力图默认显示范围，窄屏/手机自动优先近三月'))
      .addDropdown(d => d
        .addOption('year', t('全年'))
        .addOption('3m', t('近三月'))
        .addOption('month', t('当月'))
        .setValue(this.plugin.data.settings.defaultRange || 'year')
        .onChange(async v => {
          this.plugin.data.settings.defaultRange = v;
          await this.plugin.saveData(this.plugin.data);
          this.plugin.emitDataChange();
        }));

    containerEl.createEl('h3', { text: t('功能图标（左侧栏）') });
    const iconSetting = (name, desc, keyEnabled, keyIcon, defIcon) => {
      const st = new Setting(containerEl).setName(name).setDesc(desc);
      st.addToggle(t => t.setValue(this.plugin.data.settings[keyEnabled] !== false).onChange(async v => {
        this.plugin.data.settings[keyEnabled] = v;
        await this.plugin.saveData(this.plugin.data);
        this.plugin._setupRibbonIcons();
      }));
      st.addDropdown(d => {
        for (const ic of ICON_OPTIONS) d.addOption(ic, ic);
        d.setValue(this.plugin.data.settings[keyIcon] || defIcon).onChange(async v => {
          this.plugin.data.settings[keyIcon] = v;
          await this.plugin.saveData(this.plugin.data);
          this.plugin._setupRibbonIcons();
        });
      });
    };
    iconSetting(t('主视图图标'), t('打开「习惯打卡统计」'), 'ribbonMain', 'ribbonMainIcon', 'calendar-check');
    iconSetting(t('今日打卡图标'), t('右侧栏「今日打卡」列表'), 'ribbonToday', 'ribbonTodayIcon', 'check-square');

    containerEl.createEl('h3', { text: t('主视图统计项') });
    const statToggle = (label, desc, key) => new Setting(containerEl)
      .setName(label)
      .setDesc(desc)
      .addToggle(t => t.setValue(this.plugin.data.settings[key] !== false).onChange(async v => {
        this.plugin.data.settings[key] = v;
        await this.plugin.saveData(this.plugin.data);
        this.plugin.emitDataChange();
      }));
    statToggle(t('当前连续（🔥）'), t('连续打卡的天数'), 'showStatStreak');
    statToggle(t('最长连续（🏆）'), t('历史最长连续天数'), 'showStatLongest');
    statToggle(t('本月完成（📅）'), t('本月已完成 / 应完成'), 'showStatMonth');
    statToggle(t('总打卡（✅）'), t('累计打卡次数'), 'showStatTotal');
    statToggle(t('强度图例'), t('主视图中显示强度分级的颜色与数值图例'), 'showLegend');

    containerEl.createEl('h3', { text: t('习惯列表') });
    containerEl.createSpan({ cls: 'setting-item-description', text: t('拖拽行或上下箭头排序；点「复制」图标可把该习惯的热力图嵌入任意笔记。') });
    const habits = [...this.plugin.data.habits].sort((a, b) => a.sort - b.sort);
    if (!habits.length) {
      containerEl.createSpan({ text: t('暂无习惯，点击上方「新建习惯」创建。') });
      return;
    }
    for (let i = 0; i < habits.length; i++) {
      const h = habits[i];
      const unitS = unitOf(h);
      const isCount = U.isCounting(h);
      const goalS = h.levels && h.levels.length ? t('强度分级 {n} 级', { n: h.levels.length }) : t('目标 {v}{u}', { v: h.target, u: unitS });
      const stepS = isCount ? t(' · 每次 +{v}{u}', { v: h.step || 1, u: unitS }) : '';
      const desc = `${h.color} · ${goalS}${stepS} · ${planText(h)}`;
      const s = new Setting(containerEl)
        .setName(`${h.emoji || ''} ${h.name}`)
        .setDesc(desc)
        .addExtraButton(b => b.setIcon('grip-vertical').setTooltip(t('拖拽排序')))
        .addExtraButton(b => b.setIcon('copy').setTooltip(t('复制嵌入代码')).onClick(() => this.copyEmbed(h)))
        .addExtraButton(b => b.setIcon('pencil').setTooltip(t('编辑')).onClick(() => new HabitFormModal(this.app, this.plugin, h).open()))
        .addExtraButton(b => b.setIcon('up-chevron-glyph').setTooltip(t('上移')).onClick(() => this.move(h, -1)))
        .addExtraButton(b => b.setIcon('down-chevron-glyph').setTooltip(t('下移')).onClick(() => this.move(h, 1)))
        .addExtraButton(b => b.setIcon('trash').setTooltip(t('删除')).onClick(() => this.remove(h)));
      s.settingEl.style.borderBottom = 'none';
      // 整行可拖拽排序（触屏/窄屏用上下箭头，不启用 HTML5 拖拽）
      if (!isCoarsePointer()) s.settingEl.draggable = true;
      s.settingEl.addClass('habit-sort-row');
      s.settingEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', h.id);
        e.dataTransfer.effectAllowed = 'move';
        s.settingEl.addClass('is-dragging');
      });
      s.settingEl.addEventListener('dragend', () => s.settingEl.removeClass('is-dragging'));
      s.settingEl.addEventListener('dragover', (e) => { e.preventDefault(); s.settingEl.addClass('is-drop-target'); });
      s.settingEl.addEventListener('dragleave', () => s.settingEl.removeClass('is-drop-target'));
      s.settingEl.addEventListener('drop', (e) => {
        e.preventDefault();
        s.settingEl.removeClass('is-drop-target');
        const fromId = e.dataTransfer.getData('text/plain');
        if (fromId && fromId !== h.id) this.reorderDrag(fromId, h.id);
      });
    }
  }

  // 复制某个习惯的热力图嵌入代码（只读，打卡走右侧栏）
  copyEmbed(h) {
    const snippet = '```habit-heatmap\nhabitId=' + h.id + '\n```';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet).then(() => new Notice(t('已复制「{name}」热力图嵌入代码，粘贴到笔记即可', { name: h.name }))).catch(() => {});
      } else {
        const ta = document.createElement('textarea');
        ta.value = snippet;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        new Notice(t('已复制「{name}」热力图嵌入代码，粘贴到笔记即可', { name: h.name }));
      }
    } catch (e) { /* 忽略剪贴板错误 */ }
  }

  async move(h, dir) {
    const data = this.plugin.data;
    const sorted = [...data.habits].sort((a, b) => a.sort - b.sort);
    const i = sorted.findIndex(x => x.id === h.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const tmp = sorted[i].sort;
    sorted[i].sort = sorted[j].sort;
    sorted[j].sort = tmp;
    await this.plugin.saveData(data);
    this.plugin.emitDataChange();
    this.display();
  }

  async reorderDrag(fromId, toId) {
    const data = this.plugin.data;
    const sorted = [...data.habits].sort((a, b) => a.sort - b.sort);
    const from = sorted.findIndex(x => x.id === fromId);
    const to = sorted.findIndex(x => x.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = sorted.splice(from, 1);
    const insertAt = from < to ? to - 1 : to; // 向下拖时目标索引已前移一位，需修正
    sorted.splice(insertAt, 0, moved);
    sorted.forEach((x, i) => { x.sort = i; });
    await this.plugin.saveData(data);
    this.plugin.emitDataChange();
    this.display();
  }

  async remove(h) {
    if (!window.confirm(t('确定删除习惯「{name}」吗？相关打卡记录也会一并删除。', { name: h.name }))) return;
    const data = this.plugin.data;
    data.habits = data.habits.filter(x => x.id !== h.id);
    const affected = Object.keys((data.records && data.records[h.id]) || {});
    delete data.records[h.id];
    if (this.plugin._deletedHabits) this.plugin._deletedHabits.add(h.id); // 墓碑：写盘/合并时清除该习惯残留
    if (this.plugin._dirtyDays) affected.forEach(d => this.plugin._dirtyDays.add(d)); // 重写受影响日期，清除该习惯的按天文件残留
    [...data.habits].sort((a, b) => a.sort - b.sort).forEach((x, i) => { x.sort = i; });
    await this.plugin.saveData(data);
    this.plugin.emitDataChange();
    this.display();
  }
}

module.exports = HabitCheckinPlugin;

/* nosourcemap */
/* nosourcemap */