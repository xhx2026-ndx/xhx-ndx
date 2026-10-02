/* ============================================================
   美股投资跟踪台 — 主逻辑
   ------------------------------------------------------------
   模块：市场总览 / 三件大事 / 交易逻辑 / 自选股 / 关注清单
        / 宏观画像 / 决策中心 / 世界局势地球
   全部建议均为「条件式」表达，不承诺收益。
   ============================================================ */
(function () {
  'use strict';

  var M = window.MARKET_DATA || {};
  var MAC = window.MACRO_DATA || {};
  var EV = window.WORLD_EVENTS || { items: [] };

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('umt.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('umt.' + k, JSON.stringify(v)); } catch (e) {} },
    /* 隐私模式下 set会静默失败，用户在自选/关注/持仓里做的修改刷新后全丢，
       却没有任何提示——用户会以为是自己操作错了。这里做一次写入探测。 */
    probe: function () {
      try {
        localStorage.setItem('umt.__probe', '1');
        localStorage.removeItem('umt.__probe');
        return true;
      } catch (e) { return false; }
    }
  };

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(v, d) {
    if (v == null || isNaN(v)) return '—';
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
  }
  function pct(v, digits) { return v == null || isNaN(v) ? '—' : (v > 0 ? '+' : '') + Number(v).toFixed(digits == null ? 2 : digits) + '%'; }
  function cls(v) { return v > 0 ? 'up' : (v < 0 ? 'down' : 'flat'); }
  function sign(v, d) { return v == null ? '—' : (v > 0 ? '+' : '') + fmt(v, d == null ? 2 : d); }
  function yi(v) { // 亿美元 -> 万亿/亿
    if (v == null) return '—';
    if (v >= 10000) return (v / 10000).toFixed(2) + ' 万亿美元';
    return fmt(v, 0) + ' 亿美元';
  }
  function $(id) { return document.getElementById(id); }
  function svgSpark(data, up) {
    if (!data || data.length < 2) return '';
    var vals = data.map(function (d) { return d.c != null ? d.c : d; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx === mn) mx = mn + 1;
    var w = 100, h = 26, pts = vals.map(function (v, i) {
      return (i / (vals.length - 1) * w).toFixed(1) + ',' + (h - (v - mn) / (mx - mn) * h).toFixed(1);
    }).join(' ');
    var col = up ? '#D9525F' : '#2E9A70';
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:26px">'
      + '<polyline fill="none" stroke="' + col + '" stroke-width="1.6" points="' + pts + '"/></svg>';
  }

  /* ============================================================
     主题切换（暗色默认 / 浅色 = 性冷淡 + 马卡龙）
     ============================================================ */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var b = document.getElementById('theme-btn');
    if (b) b.textContent = t === 'dark' ? '☀ 浅色模式' : '☾ 深色模式';
  }
  function initTheme() { applyTheme(LS.get('theme', 'light')); }

  /* ============================================================
     版式切换（手机版 / 电脑版）
     · 默认按 UA 自动识别：手机 → 手机版，其余 → 电脑版
     · 也可在页头手动切换，选择存 localStorage（umt.view）
     · 「电脑版」= 给 html 加 .force-desktop，恢复多列网格
     ============================================================ */
  function isMobileUA() {
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent || '');
  }
  function applyView(v) {
    document.documentElement.classList.toggle('force-desktop', v === 'desktop');
    var btns = document.querySelectorAll('#view-toggle .vt');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('on', btns[i].getAttribute('data-view') === v);
    }
    LS.set('view', v);
  }
  function initView() {
    var v = LS.get('view', null);
    if (v !== 'desktop' && v !== 'mobile') v = isMobileUA() ? 'mobile' : 'desktop';
    applyView(v);
    var t = document.getElementById('view-toggle');
    if (t) t.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('.vt') : null;
      if (b) applyView(b.getAttribute('data-view'));
    });
  }

  /* ============================================================
     数据时效状态机（五态：LIVE / DELAYED / CLOSED / STALE / MANUAL）
     铁律：宁可显示「数据缺失 / 已过时」，也不静默展示过期数字。
     ============================================================ */
  /* parseWhen(s, tz) —— 把数据里的墙钟时间解析成真实时刻。
     tz 缺省时按「已是本地时间」处理（旧数据兼容）。
     为什么要 tz：腾讯美股快照的 time 是**美东墙钟**（如 10:20:20），
     而 vix/dxy/commodities 的是**北京墙钟**（如 22:20:29），asOf 也是北京。
     若一律按浏览器本地时区解析，北京用户会把刚生成的行情（真实 22:20）
     读成 10:20 → 误判「已过时 12 小时」，且开盘时段恒显示「盘后」。 */
  function tzOffsetMs(tz, utcMs) {
    try {
      // 取该时区在目标时刻的 UTC 偏移（分钟）：把 UTC 时刻格式化成目标时区墙钟再与 UTC 比较
      var dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      var p = {};
      dtf.formatToParts(new Date(utcMs)).forEach(function (x) { p[x.type] = x.value; });
      var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day,
        +p.hour % 24, +p.minute, +p.second);
      return asUtc - utcMs;   // 目标时区墙钟 - UTC
    } catch (e) { return 0; }
  }
  function parseWhen(s, tz) {
    if (!s) return null;
    if (/^\d{14}$/.test(s)) {           // 20260924161448（东财口径，本身是北京时间）
      return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8),
                      +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14));
    }
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    /* 纯日期（无时分）：按当天 00:00 本地时间处理。
       macro.js 里有「2026-10-02」这类只有日期的人工核校时间，
       原先的正则把 HH:MM 设为必需组，导致这类输入一律解析失败。 */
    if (m[4] == null) {
      var dOnly = new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
      return isNaN(dOnly.getTime()) ? null : dOnly;
    }
    if (!tz) {                            // 无 tz：按本地墙钟解析（旧数据兼容）
      var d0 = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
      return isNaN(d0.getTime()) ? null : d0;
    }
    // 有 tz：先按 UTC 猜一个时刻，再用该时区偏移校正（标准做法，两次收敛）
    var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    var off = tzOffsetMs(tz, guess);
    var real = guess - off;
    // 夏令时切换附近用修正后的偏移再算一次，保证收敛
    var off2 = tzOffsetMs(tz, real);
    if (off2 !== off) real = guess - off2;
    var d = new Date(real);
    return isNaN(d.getTime()) ? null : d;
  }
  /* 数据项的墙钟时间统一入口：自动带上 tz */
  function itemTime(o) { return o ? parseWhen(o.time, o.tz) : null; }

  /* freshness(o, opts) —— o 可以是数据项（含 time + tz）或时间字符串 */
  function freshness(o, opts) {
    opts = opts || {};
    if (opts.manual) return { s: 'manual', name: '人工核校', when: opts.manual };
    var t = (o && typeof o === 'object') ? itemTime(o) : parseWhen(o);
    if (!t) return { s: 'stale', name: '时间未知', when: '—' };
    var mins = (Date.now() - t.getTime()) / 60000;
    var s = mins < 20 ? 'live' : (mins < 720 ? 'delayed' : 'stale');
    var name = { live: '实时', delayed: '延迟', stale: '已过时' }[s];
    var when = mins < 60 ? Math.round(mins) + ' 分钟前'
      : mins < 1440 ? (mins / 60).toFixed(1) + ' 小时前'
      : Math.floor(mins / 1440) + ' 天前';
    return { s: s, name: name, when: when };
  }
  function freshTag(f) {
    return '<span class="fresh ' + f.s + '"><i class="dot-st ' + f.s + '"></i>'
      + '<b>' + f.name + '</b> ' + esc(f.when) + '</span>';
  }

  /* 下次美股开盘（美东 09:30）。EDT=UTC-4 → 13:30Z；EST=UTC-5 → 14:30Z。
     原实现把 13:30 和 14:30 一起塞进候选再排序，冬令时会选中 13:30Z（＝08:30 美东），
     整整早一小时；且只过滤周末、不跳过假日。这里按夏令时精确取，并跳过休市日。 */
  function nextOpen() {
    var now = new Date();
    for (var i = 0; i < 12; i++) {
      var probe = new Date(now.getTime() + i * 86400000);
      var p = nyParts(probe);
      if (!p) break;
      if (p.wd === 0 || p.wd === 6) continue;
      if (nyHoliday(p.y, p.m, p.d)) continue;
      // 该日美东 09:30 对应的 UTC 时刻
      var guess = Date.UTC(p.y, p.m - 1, p.d, 9, 30, 0);
      var off = tzOffsetMs('America/New_York', guess);
      var openUtc = guess - off;
      var off2 = tzOffsetMs('America/New_York', openUtc);
      if (off2 !== off) openUtc = guess - off2;
      var t = new Date(openUtc);
      if (t > now) return t;
    }
    return null;
  }

  function countDown(target) {
    if (!target) return '—';
    var ms = target.getTime() - Date.now();
    if (ms <= 0) return '已开盘';
    var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    if (h >= 24) return Math.floor(h / 24) + ' 天 ' + (h % 24) + ' 小时';
    return (h ? h + ' 小时 ' : '') + m + ' 分';
  }
  /* 市场状态：休市 / 盘前 / 盘中 / 盘后
     原则：用「当前时刻 + 美东日历」判断，而不是用「最近成交时间」倒推
     ——数据停更（接口挂了/定时任务没跑）不等于市场休市，两者必须分开。
     交易时段（美东）：09:30–16:00；盘前 04:00–09:30；盘后 16:00–20:00。 */
  function nyParts(date) {
    // 取目标时刻在美东时区的墙钟字段
    try {
      var dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hour12: false,
        weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      var p = {};
      dtf.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
      var wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return {
        wd: wdMap[p.weekday],
        y: +p.year, m: +p.month, d: +p.day,
        hh: +p.hour % 24, mm: +p.minute
      };
    } catch (e) { return null; }
  }
  /* 美股法定休市日。NYSE 规则：
     - 固定日：元旦 1/1、独立日 7/4、圣诞 12/25
     - 浮动日：MLK（1月第3个周一）、总统日（2月第3个周一）、
       阵亡将士纪念日（5月最后1个周一）、劳动节（9月第1个周一）、
       感恩节（11月第4个周四）
     - 复活节相关：耶稣受难日（复活节前两天，需算法）
     - 观察日：独立日/元旦落在周末时前后顺延
     漏判的后果是「假日显示盘中」，与「宁可少判不要错判」的取舍相反，故尽量补全。 */
  function nyHoliday(y, m, d) {
    var dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();   // 0=周日
    var day = new Date(Date.UTC(y, m - 1, d));
    function nthWeekday(targetM, targetDow, n) {
      // 返回当月第 n 个星期 targetDow 的日期
      var first = new Date(Date.UTC(y, targetM - 1, 1));
      var offset = (targetDow - first.getUTCDay() + 7) % 7;
      return 1 + offset + (n - 1) * 7;
    }
    if (m === 1) {
      if (d === 1) return '元旦';
      if (d === nthWeekday(1, 1, 3)) return '马丁路德金日';
      if (dow === 1 && d >= 15 && d <= 21) return 'MLK日(顺延)';
    }
    if (m === 2 && d === nthWeekday(2, 1, 3)) return '总统日';
    // 耶稣受难日 = 复活节前两天。复活节必在 3/22–4/25，
    // 故只有两种跨月情形：受难日落在 3 月（复活节 4/1）或 4 月（复活节 3/31 极少见）。
    var e = easter(y);
    if (e.m === 4) {
      if (m === 4 && d === e.d - 2) return '耶稣受难日';
      if (m === 3 && d === 31 && e.d === 1) return '耶稣受难日';
    } else if (e.m === 3) {
      if (m === 3 && d === e.d - 2) return '耶稣受难日';
      if (m === 4 && d === 1 && e.d === 31) return '耶稣受难日';
    }

    if (m === 5 && d === lastWeekdayMonday(y, 5)) return '阵亡将士纪念日';
    if (m === 6) {
      if (d === 19) return '六月节';
      // 6/19 落在周六 → 6/18(周五) 休市；落在周日 → 6/20(周一) 休市
      if (d === 18 && dow === 5) return '六月节(观察日)';
      if (d === 20 && dow === 1) return '六月节(观察日)';
    }
    if (m === 7) {
      if (d === 4) return '独立日';
      if (d === 3 && dow === 5) return '独立日(观察日)';   // 7/4 落在周六 → 7/3 休市
      if (d === 5 && dow === 1) return '独立日(观察日)';   // 落在周日 → 7/5 休市
    }
    if (m === 9 && d === nthWeekday(9, 1, 1)) return '劳动节';
    if (m === 11 && d === nthWeekday(11, 4, 4)) return '感恩节';
    if (m === 12) {
      if (d === 25) return '圣诞';
      if (d === 24 && dow === 5) return '圣诞(观察日)';   // 12/25 落在周六 → 12/24 休市
      if (d === 26 && dow === 1) return '圣诞(观察日)';
    }
    return null;
    function lastWeekdayMonday(yy, mm) {
      var last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();   // 当月最后一天
      var wd = new Date(Date.UTC(yy, mm - 1, last)).getUTCDay();
      return last - ((wd + 6) % 7);   // 回退到周一
    }
  }
  /* 复活节日期（Meeus 算法）—— 返回 {m, d}，用于推算耶稣受难日 */
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var dd = Math.floor(b / 4), ee = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - dd - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * ee + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return { m: month, d: day };
  }


  function marketState() {
    var now = new Date();
    var p = nyParts(now);
    if (!p) {
      // Intl 不可用（极老环境）：退回「按最后成交时间」的旧逻辑，并标明是降级结果
      var t = itemTime((M.indices || [])[0]);
      if (!t) return { dot: 'closed', text: '休市', note: '无成交时间' };
      var hh = t.getHours();
      return (hh >= 21 || hh < 4)
        ? { dot: 'live', text: '盘中', note: '按成交时间推断（时区能力受限）' }
        : { dot: 'delayed', text: '盘后', note: '按成交时间推断（时区能力受限）' };
    }
    if (p.wd === 0 || p.wd === 6) return { dot: 'closed', text: '休市', note: '周末休市' };
    var hol = nyHoliday(p.y, p.m, p.d);
    if (hol) return { dot: 'closed', text: '休市', note: hol + '休市' };
    var mins = p.hh * 60 + p.mm;
    if (mins >= 570 && mins < 960) {          // 09:30–16:00 盘中
      return { dot: 'live', text: '盘中', note: '美东交易时段（09:30–16:00）' };
    }
    if (mins >= 240 && mins < 570) {          // 04:00–09:30 盘前
      return { dot: 'delayed', text: '盘前', note: '盘前交易时段，价差较大' };
    }
    if (mins >= 960 && mins < 1200) {         // 16:00–20:00 盘后
      return { dot: 'delayed', text: '盘后', note: '盘后交易时段，流动性下降' };
    }
    return { dot: 'closed', text: '已收盘', note: '非交易时段，展示的是最近收盘数据' };
  }


  /* 下一个待发生事件（从关注清单里找日期最靠前的未来事件）
     原实现用 new Date().getFullYear() + 无年份的「10月2日」字符串，跨年后会把
     所有事件推到次年同月同日（页面会一本正经说「下次事件：10月2日」，实际是 9 个月后）。
     修正：只接受带年份的条目；无年份/无法解析的不参与选取（仍在关注清单正常展示）。
     「收盘」类事件按 21:30 而非 00:00 计入，否则提前一整天被当成「下次事件」。 */
  function nextEvent() {
    var y = new Date().getFullYear();
    var best = null;
    (WATCH_LIST || []).forEach(function (w) {
      var s = String(w.date || '');
      var m = s.match(/(\d{4})[年-](\d{1,2})月(\d{1,2})[日]?/);
      if (!m) return;                                  // 无明确年月日 → 不参与
      if (+m[1] !== y) return;                          // 非本年 → 不参与
      var d = new Date(+m[1], +m[2] - 1, +m[3], 9, 30, 0);
      if (/收盘/.test(s)) d.setHours(21, 30, 0, 0);      // 收盘类按北京时间 21:30
      if (d.getTime() > Date.now() && (!best || d < best.d)) best = { d: d, w: w };
    });
    return best;
  }

  /* ============================================================
     首屏「今日快照」仪表盘
     ============================================================ */
  /* 快照卡：键盘可达 + 有 aria-expanded（原来只有 div+onclick，
     tabIndex=-1、无 role，读屏与键盘用户永远看不到展开的说明） */
  function snapCard(lbl, dot, val, sub, det) {
    return '<div class="snap-card" role="button" tabindex="0" aria-expanded="false"'
      + ' onclick="this.classList.toggle(\'open\');this.setAttribute(\'aria-expanded\',this.classList.contains(\'open\')?\'true\':\'false\')"'
      + ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click();}">'
      + '<div class="lbl"><i class="dot-st ' + dot + '"></i>' + esc(lbl) + '</div>'
      + '<div class="val">' + val + '</div>'
      + '<div class="sub">' + sub + '</div>'
      + '<div class="det">' + det + '</div></div>';
  }

  function snapshotSection() {
    var ix = (M.indices || [])[0] || {};
    var nd = (M.vol || {}).ndx || {};
    var vix = (M.vol || {}).vix || {};
    var ust = findMacro('ust10');
    var dxy = M.dxy;
    var st = marketState();
    var nxt = nextOpen();
    var ev = nextEvent();

    var fQuote = freshness(ix);
    var fVix = freshness(vix.date ? { time: (vix.date || '') + ' ' + (vix.time || '') } : null);
    var fDxy = freshness(dxy && dxy.date ? { time: dxy.date + ' ' + (dxy.time || '') } : null);

    /* 大盘状态：三个指数涨跌方向 */
    var ups = (M.indices || []).filter(function (x) { return (x.pct || 0) > 0; }).length;
    /* 原 allUp/allDown/dirDot 算完从不使用，且 dirDot 依赖不存在的
       .dot-st.up/.down/.warn 类，是死代码——真要启用会显示成无背景圆点。故移除。 */

    var c = '';
    c += snapCard('大盘状态', st.dot, st.text,
      esc(st.note) + ' · 下次开盘倒计时 <b>' + countDown(nxt) + '</b>',
      '美股开盘为美东 09:30（北京时间 21:30 或 22:30，随夏令时切换）。'
      + '休市时页面展示的是最近一次收盘数据，不要拿它当实时价下单。'
      + '<br>' + freshTag(fQuote));

    c += snapCard('纳指', (ix.pct || 0) > 0 ? 'up' : (ix.pct || 0) < 0 ? 'down' : 'closed',
      fmt(ix.value, 0), '<span class="' + cls(ix.pct) + '">' + pct(ix.pct) + '</span>　' + esc(ix.name || ''),
      '纳指是三大指数里成长股占比最高的，因此对利率最敏感——贴现率一升，它跌得最快。'
      + '这也是本页面把它放在第一位的原因。<br>' + freshTag(fQuote));

    var vixMissing = vix.value == null || isNaN(vix.value);
    var vixDot = vixMissing ? 'closed' : vix.value < 15 ? 'live' : vix.value < 20 ? 'delayed' : 'stale';
    c += snapCard('VIX 恐慌指数', vixDot, vixMissing ? '—' : fmt(vix.value),
      vixMissing ? '<span style="color:var(--text-3)">数据缺失</span>'
        : '<span class="' + cls(vix.pct) + '">' + pct(vix.pct) + '</span>　低于15安心 / 20以上紧张',
      'VIX 衡量的是「买保险的人有没有变多」。它低说明市场不慌，但也意味着保险便宜——一旦出事，波动率从低位跳得更快。<br>' + freshTag(fVix));

    c += snapCard('10Y 美债', 'manual',
      ust ? esc(ust.value) : '—', ust ? esc(ust.prev || '') : '',
      ust ? esc(ust.meaning) + '<br><b>对市场：</b>' + esc(ust.impact)
          + '<br>' + freshTag(freshness(null, { manual: ust.time })) : '宏观数据缺失');

    c += snapCard('美元 DXY', (dxy && dxy.pct > 0) ? 'up' : (dxy && dxy.pct < 0) ? 'down' : 'closed',
      dxy ? fmt(dxy.value, 2) : '—',
      dxy ? '<span class="' + cls(dxy.pct) + '">' + pct(dxy.pct) + '</span>' : '',
      '美元强 = 全球的钱往美国跑，通常伴随美债收益率上行。对美股是双刃剑：'
      + '资金回流利好流动性，但会压低跨国企业海外收入的折算值。<br>' + freshTag(fDxy));

    c += snapCard('下次事件', 'delayed',
      ev ? String(ev.w.date).replace(/（.*?）/g, '').slice(0, 6) : '—',
      ev ? esc(ev.w.t) : '暂无',
      ev ? '<b>为什么重要：</b>' + esc(ev.w.w) + '<br><b>应对：</b>' + esc(ev.w.a)
          + (ev.w.priced ? '<br><b>已定价程度：</b>' + esc(ev.w.priced) : '') : '');

    $('snap').innerHTML = '<div class="snap"><div class="snap-hd">'
      + '<h3>今日快照</h3>'
      + '<span class="ts">点任意卡片展开说明 · 数据时间 ' + esc(M.asOf || '') + '</span>'
      + '<span class="ts" style="margin-left:auto">'
      + '<b style="color:var(--up)">' + ups + '</b> 涨 / '
      + '<b style="color:var(--down)">' + ((M.indices || []).length - ups) + '</b> 跌</span>'
      + '</div><div class="snap-grid">' + c + '</div></div>';
  }

  /* Hero 金句 + 今日操作摘要三行 */
  function heroSection() {
    var ix = (M.indices || [])[0] || {};
    var vix = (M.vol || {}).vix || {};
    var ust = findMacro('ust10');
    var oil = (M.commodities || []).filter(function (x) { return x.key === 'hf_OIL'; })[0];
    var adv = scoreMarket();
    var risk = LS.get('risk', 'balanced');
    var pos = Math.max(20, Math.min(85, 50 + adv.score * 6 + (risk === 'conservative' ? -10 : risk === 'aggressive' ? 8 : 0)));

    $('hero').innerHTML = '<div class="hero">'
      + '<div class="kicker">一句话核心矛盾</div>'
      + '<div class="lead">油价（霍尔木兹海峡）决定通胀，通胀决定美联储，美联储决定美债收益率，'
      + '收益率决定美股估值——现在整条链都绷在「美伊谈不谈得成」这一个开关上。</div>'
      + '<div class="sub">盈利在往上走（AI 资本开支拉动，标普500 远期PE 反而降到 19 倍以下），'
      + '但定价的锚——10年期美债 ' + (ust ? esc(ust.value) : '—') + '——正处在十几年高位。'
      + '盈利向上、估值向下，两者对冲的结果是「指数横着走、个股剧烈分化」：'
      + '<b>现在选股比择时重要，仓位管理比押方向重要。</b></div></div>';

    var dont = '不要在油价或地缘消息出来的第一时间梭哈。这类消息一天能反转三次——'
      + '本周油价单日振幅超过 10 美元就是例子。用条件单和分批代替一次性重仓。';
    var doIt = pos >= 58
      ? '维持或小幅加仓，但优先加「现在就在赚钱」的标的（金融、工业、已兑现利润的 AI 龙头），'
        + '少碰纯靠远期故事撑估值的公司。'
      : '以防守为主：把久期最长（最依赖远期利润）的仓位降下来，'
        + '等 10 年期美债收回 5% 下方再谈加仓。';
    var watch2 = '盯住两个数字：<b>10 年期美债能否收回 5% 下方</b>、'
      + '<b>布伦特原油能否跌破 100 美元</b>。两个同时发生 = 缓和被证实；'
      + '油价重回 107 以上 = 谈判破裂，先减久期长的仓位。';

    $('act3').innerHTML =
      '<div class="a do"><div class="k">今天最该做的一件事</div><p>' + doIt + '</p></div>'
      + '<div class="a dont"><div class="k">今天最不该做的一件事</div><p>' + dont + '</p></div>'
      + '<div class="a watch"><div class="k">盯住的两个数字</div><p>' + watch2 + '</p></div>';
  }

  /* ============================================================
     ① 市场总览
     ============================================================ */
  var TODAY_TOP3 = [
    {
      t: '非农只有2.9万人，美联储三位票委集体按暂停键——美债全线下行，纳指100创52周新高',
      a: '两件事叠在一起。先是10月1日（周四）：三位拥有 FOMC 永久投票权的官员整齐地按了暂停键——纽约联储主席威廉姆斯（本周二，称目前没有迫切采取行动的必要）、副主席杰斐逊（10月1日在弗吉尼亚大学演讲，原话是未来的政策调整要根据数据趋势仔细决定、我和同事们需要做出自己的判断而这可能需要更多时间）、监管副主席鲍曼（同一天称目前不认为进一步加息有迫切性）。Evercore ISI 称这个联合信号具有权威性；SGH Macro 的 Tim Duy 说威廉姆斯之所以要讲得异常清晰，是因为市场的加息定价正在跑离美联储。CME FedWatch 的10月加息25bp 概率从一周前的 68.6% 降到10月1日的 24.9%（元大口径 26%）。美债当天<b>全线下行</b>：2年期 -9.56 至 -10.6 个基点报 4.791%~4.802%、10年期 -4.42 至 -5.4 个基点报 5.2407%（盘中一度高见 5.3402%，为2002年以来最高）、30年期 -1.84 个基点报 5.6126%。然后是今晚20:30（北京时间）的9月非农：<b>新增就业 +2.9 万人</b>（预期 +8.4万至9万，前值 +16.2万），7月与8月合计净下修 6万人；失业率 4.2%（预期 4.1%，前值 4.1%）；平均每小时工资同比 +3.0%（预期 3.2%，前值 3.10%）。数据后收益率加速下行：10年期 -5.8 个基点至 5.184%、30年期 -5 个基点至 5.570%、2年期 -7.1 个基点至 4.731%（道琼斯，美东09:39）。10月维持不变的概率升至 71.8%（CME 每经口径）到 83%（华尔街日报口径）。截至北京时间21:52（美东09:52），纳指100 +1.34% 报 30911.31 点、盘中最高 30935.08 <b>创52周新高</b>；标普500 +0.99%、道指 +0.76%；VIX 15.75（-3.85%）。',
      b: '这是本页记录到的<b>第三次链条变化，方向与前两次相反</b>。9月29日、9月30日都是「好消息换不来好行情」，我据此把结论写成「长端对好数据已经免疫」。今天要修正，而且修正方式本身很重要：<b>压低长端的不是数据，是美联储自己的口。</b>同样一份好数据（8月核心PCE同比3.0%、环比+0.2%），9月30日收益率全线上涨；这次数据很弱（非农2.9万），收益率全线下跌。差别在于中间多了一个变量——三位永久票委在主席沃什几乎不给前瞻指引的情况下集体表态。所以对框架的含义是：长端并没有免疫，它只是在等美联储改口，而不是等数据。但必须同时写下反面：<b>这次是短端跌得比长端多</b>（2年 -7.1bp 对 30年 -5bp），2Y–10Y 利差从 39.8 个基点扩大到约 45 个基点，曲线更陡了。成长股的估值锚是长端，而长端 5.184% 仍在2002年以来的高位区间——所以纳指创新高这件事里，情绪修复的成分大于贴现率的实质改善。',
      c: '①今晚收盘时纳指100 能否收在 30900 上方——52周新高当日能不能站稳，这是最硬的确认；②30年期今天收盘能否在 5.60% 下方（今天只算第一天），以及下周一（10月5日）能否连续第二日；③12月加息概率（CME 口径 60.4%）会不会因这份非农继续下滑；④美元指数大跌（101.79，-0.25%）会否演变成资金回流新兴市场；⑤下一个硬关口是10月14日的9月CPI，中间没有重磅数据。',
      v: '昨天设的三个验证点，今天<b>两个明确达成、一个推进到第一天</b>。①<b>2年期跌破4.80%</b>：9月30日 4.889% → 10月1日收盘 4.791%（新华财经）/ 4.785%（元大）/ 4.802%（新华财经另一口径）→ 非农后 4.731%，<b>达成</b>；②<b>布伦特跌回100美元下方</b>：10月1日收 102.31（12月合约）→ 非农后约 99.50、盘中最低 98.72，<b>达成</b>；③<b>30年期连续两个交易日收在5.60%下方</b>：10月1日收 5.6126% 没达标，今天盘中 5.570% 若收在下方<b>只算第一天，需看下周一</b>。同时正式作废昨天「长端对好数据免疫」的判断——它只在美联储不开口的条件下成立。反向警戒保留：30年期重新站上 5.70% = 期限溢价这一轮没走完。'
    },
    {
      t: '美光10月1日收涨3.03%——我昨天判的「利好出尽」被证伪，这个错误要明着记下来',
      a: '10月1日（周四）美股收盘，美光（MU）<b>+3.03%</b>，而不是我昨天早上看到的开盘 -1.8%。整条存储与半导体链同步走强：SK海力士 +5.08%、安森美半导体 +4.18%、应用材料 +3.5%、闪迪 +2.75%、希捷科技 +2.52%、西部数据 +1.78%、台积电 +0.66%；下跌的是高通 -1.06%、博通 -2.15%。同期三大指数只涨了 0.04% 至 0.19%（道指 +0.04%、标普 +0.19%、纳指综指 +0.04%）——<b>存储链是当天唯一明显跑赢的方向</b>。今天（10月2日）盘前安森美再涨 7.4%，但那是修订与 Synaptics 交易的消息驱动，不代表行业景气，别混为一谈。',
      b: '我昨天的判断是「AI 最硬的基本面第一次出现利好出尽」，依据是美光开盘 -1.8%。这个依据被同一天的收盘价推翻了，而且错误方式值得写下来：<b>我拿一个开盘不到20分钟的盘中报价（北京时间21:48，美东09:48）当成了财报后第一天的计分</b>，这是对「三个交易日累计涨跌」这条规则的偷工减料。修正后的读法有三层：①美光的超预期溢价<b>没有被抽走</b>，至少第一天没有；②但它涨的背景是10月1日2年期美债收益率跌了约10个基点，所以这波涨幅里有相当部分是<b>利率下行给的估值修复</b>，不全是基本面；③真正的计分标准是三个交易日累计，今天是第二天，以收盘为准。',
      c: '①今晚收盘时美光的三个交易日累计涨跌（9月30日盘后 +0.35%、10月1日 +3.03%、10月2日待定）；②费城半导体指数相对纳指综指的强弱，10月1日这个检验第一次通过；③存储涨价能否延续到四季度；④10月10日起的 Q3 财报季，看指引而不看已实现数字；⑤10月14日 CPI 会不会把今天涨的这部分重新拿走。',
      v: '两个门槛写死：①<b>美光财报后三个交易日的累计涨跌</b>（9月30日盘后、10月1日、10月2日）——累计为正 = 「利好出尽」被证伪，累计为负 = 判断成立；②<b>费城半导体指数相对纳指综指</b>——10月1日存储链涨幅 1.78% 至 5.08% 对三大指数 0.04% 至 0.19%，检验第一次通过，若10月2日也跑赢，则「硬件端重新脱钩上行」成立。另外提醒自己：以后计分一律用收盘价，不用盘中快照。'
    },
    {
      t: '美军第三艘航母与近万兵力11月底到位，油价却跌回100下方——这两个方向不是一回事',
      a: '军事侧全面升级：①特朗普在《时代》周刊10月1日刊发的采访中被问到是否计划在中期选举后加大对伊朗的轰炸，回答「有可能」；他同时说拒绝了伊朗重开霍尔木兹海峡的提议，原话是「他们提议开放霍尔木兹海峡……但是还不够好」。②据美媒援引美国官员，五角大楼正向中东派遣<b>第三支航母打击群</b>及多艘海军陆战队舰船，向该地区增派近万名兵力，舰艇战机与人员预计11月底前陆续抵达。③英国海上贸易行动办公室10月1日通报，一艘油轮通过霍尔木兹海峡时遭不明飞行物击中并引发火灾，本周至少有三艘油轮在穿峡时遇袭。④胡塞武装称沙特10月1日晚空袭也门首都萨那（9月3日局势升级以来首次）。⑤迪拜航空9月30日一架客机机长遇袭，特朗普10月1日称若伊朗牵涉其中会遭到猛烈重击。外交侧没死但很窄：伊朗总统佩泽希齐扬10月1日称伊朗从未回避对话、事实是美方并未寻求对话，正权衡美方回应；日本外相茂木敏充与阿拉格齐通话（第10次）呼吁伊朗展现最大灵活性；联合国称外交接触处于相对沉寂期。油价却先涨后跌：10月1日 WTI 11月合约 92.87 美元（+2.71%）、布伦特12月合约 102.31 美元（+4.37%）；非农后布伦特12月合约跌 2.7% 至约 99.50 美元，盘中最低 98.72。',
      b: '不能简单读成「局势紧张所以油价涨」。要分两层看。第一层是<b>原油基本恢复了，成品油没有</b>：摩根大通9月29日报告，中东石油出口总量10日均值回升至 2050 万桶/日（战前的89%），其中原油 1750 万桶/日（战前的98%），而成品油出口仅 300 万桶/日（战前的<b>58%</b>）。这既解释了为什么运量恢复而油价跌不动，也解释了为什么美国的痛点是柴油而不是原油——美国柴油零售价约 6.40 美元/加仑，仍在高位。第二层是<b>今天油价的下跌不是地缘缓和给的，是需求与美元给的</b>：非农2.9万人打压了需求预期，美元指数大跌推高了以美元计价的商品。所以别把布伦特回到99.5读成中东风险解除——<b>增兵是11月底到位，那才是真正的风险窗口，而市场今天在为一个弱就业数据定价。</b>',
      c: '①11月底美军增兵到位前后，海峡会不会出现新的实质中断——这是本轮最硬的时间锚；②中东成品油出口占战前的比例能否从58%继续修复，这比原油运量更能预测柴油价格与美国通胀；③美国对法国德国的威胁（要求动用应急柴油储备，否则可能实施柴油出口禁令）是否落地；④伊朗内部对七点方案的态度，伊朗媒体 Donya-ye Eqhtesad 警告外交窗口可能在数周内关闭；⑤OPEC+ 11月产量配额会议。',
      v: '三条：①<b>布伦特12月合约能否连续两日收在100美元下方</b>——10月1日收 102.31，今天盘中约99.5至99.8，只算第一天（注意合约已从11月换到12月，纵向比较要先对齐合约）；②<b>中东成品油出口占战前的比例</b>——现在58%，若四周内升到75%以上，柴油这条通胀线才算缓解；③<b>穿峡油轮遇袭次数</b>——本周已至少3艘，若下周归零而增兵照常，说明「军事集结但不阻断航运」是双方当前的默契边界，油价风险溢价会继续被压缩。'
    }
  ];

  var TRADE_LOGIC = {
    focus: [
      '主线还是那条，但今天第一次朝好的方向接通了：<b>美联储口径 → 加息概率 → 美债收益率 → 美股估值</b>。注意入口变了——不是数据，是美联储的口。三位永久票委（威廉姆斯、杰斐逊、鲍曼）集体按暂停键后，10月加息概率从一周前的 68.6% 掉到 24.9%，美债<b>全线下行</b>（2年期 -9.6bp、10年期 -4.4bp、30年期 -1.8bp）。',
      '9月非农 +2.9 万人（预期 +8.4万至9万，前值 +16.2万）、失业率 4.2%、时薪同比 +3.0%（低于预期3.2%），收益率下行加速：10年期 5.184%、30年期 5.570%、2年期 4.731%。<b>这是「数据弱 + 美联储松口」第一次同时成立。</b>',
      '但别把反弹读成全面修复：<b>短端跌得比长端多</b>（2年 -7.1bp 对 30年 -5bp），2Y–10Y 从 39.8 个基点扩大到约 45 个基点，曲线更陡。成长股的估值锚是长端，而 5.184% 仍在2002年以来的高位区间。',
      '昨天两个最重要的判断被推翻：①「长端对好数据免疫」作废——它只在美联储不开口时成立；②美光「利好出尽」被证伪——它10月1日收涨 3.03%。'
    ],
    flow: [
      '<b>10月1日板块：</b>标普500 十一大板块六跌五涨，比9月30日的九跌二涨改善。能源 +1.92%、工业 +1.00% 领涨；医疗 -1.30%、通信服务 -1.19% 领跌。',
      '<b>存储链是唯一明显跑赢的方向：</b>SK海力士 +5.08%、安森美 +4.18%、应用材料 +3.5%、美光 +3.03%、闪迪 +2.75%、希捷 +2.52%、西部数据 +1.78%；而三大指数只涨 0.04% 至 0.19%。',
      '<b>权重科技反而分化：</b>谷歌A -1.7%、苹果 -0.81%、亚马逊 -0.37%、特斯拉 -0.2%、微软 -0.02%，英伟达 +1.09%、Meta +0.1%。撑盘力量从七姐妹换成了半导体。',
      '<b>10月2日盘中（截至美东09:52）：</b>纳指100 +1.34% 创52周新高，特斯拉 +4.44%、英伟达 +2.74%、博通 +2.68%、谷歌A +1.54%、亚马逊 +1.51%；VIX 15.75（-3.85%）；布伦特 99.81（-2.45%）、WTI 89.64（-3.47%）；COMEX 黄金 4225.18（+0.54%）。'
    ],
    tips: [
      '今天最重要的一句话：<b>压低长端的不是数据，是美联储的口。</b>同样一份好数据（8月核心PCE同比3.0%），9月30日收益率全线上涨；这次数据很弱（非农2.9万），收益率全线下跌。中间多出来的变量是三位永久票委的集体表态。',
      '计分一律用收盘价，不用盘中快照。我昨天用美光开盘 -1.8% 判「利好出尽」，当天收盘是 +3.03%——盘中第一反应不是结论。这条写进规则。',
      '油价下跌不等于地缘缓和。今天布伦特跌回99.5，是弱非农压了需求预期、美元大跌抬了商品，而美军第三艘航母和近万兵力是11月底才到位。别把两件事读成一件事。',
      '验证点被证伪时要显眼地写、正式地作废判断。这次「长端对好数据免疫」和「美光利好出尽」两条同时被推翻，属于框架级修正，不是节奏问题。'
    ]
  };

var WATCH_LIST = [
    { date: '2026年10月2日（周五）收盘', tag: '市场确认', hi: 'hi', t: '纳指100 的52周新高能否守住（盘中最高 30935.08）',
      w: '截至北京时间21:52（美东09:52）纳指100 报 30911.31（+1.34%），52周最高就是今天盘中的 30935.08。这是9月下旬以来首次触及52周新高——此前纳指100 从9月的低点 27763 一路反弹，但直到今天才真正回到前高之上。',
      a: '创新高当日能否收在上方，是判断这轮反弹是「情绪修复」还是「趋势重启」的第一道关。<b>应对：</b>不追高，收盘确认后再说；如果收盘回落到 30500 下方，说明今天只是消息驱动的冲高回落。',
      priced: '非农2.9万这个弱数据已被即时定价（期指在数据后直接跳涨1%以上）；但「弱数据 = 经济转差」这个负面含义还没有被定价',
      asym: '向上需要基本面配合（财报季），向下只需要一份数据反转。当前位置追高的风险收益比不好'
    },

    { date: '2026年10月5日（周一）', tag: '美债', hi: 'hi', t: '30年期美债能否连续第二日收在 5.60% 下方',
      w: '门槛是「连续两个交易日」。10月1日收 5.6126%（没达标）；10月2日盘中在非农后跌到 5.570%，若收盘仍在 5.60% 下方则只算第一天。所以下周一（10月5日）是决定「长端见顶」这个判定成不成立的日子。同时看2年期能否守在 4.80% 下方（非农后 4.731%）。',
      a: '连续两日达标 = 压制成长股估值的那条线开始松动，可以考虑恢复对长久期资产的配置；只达标一天就回落 = 按噪音处理。<b>应对：</b>这是本页目前最硬的一条判定规则，不要因为行情好就提前宣布胜利。',
      priced: '非农后的收益率下行已被即时定价；但「长端见顶」这件事本身市场还没有形成共识',
      asym: '门槛设计成连续两日就是为了过滤噪音。若下周一站上 5.70%，则反向警戒触发，说明期限溢价这一轮没走完'
    },

    { date: '2026年10月2日起 3 个交易日', tag: '公司事件', hi: 'hi', t: '美光财报后的股价计分（昨天判「利好出尽」，今天被证伪）',
      w: '美光 FY26Q4 营收 542.29 亿美元（同比 +379%，预期 510.7 亿）、调整后 EPS 33.42（预期 31.61）；FY27Q1 指引营收 615 亿 ±15 亿（预期 570.2 亿）、毛利率 86.25%。9月30日盘后 +0.35%、<b>10月1日收盘 +3.03%</b>、10月2日待定。同期存储链全线走强：SK海力士 +5.08%、安森美 +4.18%、应用材料 +3.5%。',
      a: '这是「超预期还有没有用」的正式计分，规则是三个交易日累计。<b>应对：</b>累计为正则「利好出尽」判断作废；但要注意这波涨幅里有相当部分是10月1日2年期美债跌约10bp 给的估值修复，不完全是基本面。',
      priced: '预期本来就打得很满（今年涨273%、营收同比+379%）；10月1日的上涨说明还有边际买盘，但幅度受利率下行影响，含金量要打折',
      asym: '若三个交易日累计为负，说明超预期溢价确实被抽走，杀伤大；累计为正也只是回到「符合最乐观预期」，上行空间有限'
    },

    { date: '2026年10月10日起', tag: '财报季', hi: 'md', t: '美股 Q3 财报季开启',
      w: '远期市盈率已从 22 倍压到约 19 倍（十年均值），股价只能靠盈利说话。今年多了一个变数：美光演示了「超预期还是有用的」（10月1日 +3.03%），但它的涨幅里有一部分是利率下行给的。所以财报季的分量仍在<b>指引</b>而不是<b>已实现的数字</b>。',
      a: '关注 AI 资本开支的延续性与利润率。<b>应对：</b>财报季是个股风险而不是指数风险，重仓单票者必须提前减。',
      priced: 'Q3 预期已随 AI 资本开支上调过一轮；美光证明上调后的预期仍能被超出，但股价反应需要利率配合',
      asym: '个股风险远大于指数风险，重仓单票的下行空间是不对称的'
    },

    { date: '2026年10月13日（周二）', tag: '公司财报', hi: 'md', t: '摩根大通（JPM）等大型银行打头阵',
      w: '净息差是否随加息上调、信用损失准备金的计提指引。注意金融是9月标普500 表现最差的板块（跌超6%，四个月来首次月度下跌、2023年3月以来最差单月），黑石9月 -21%、贝莱德 -8%——<b>利率上行并不必然利好金融</b>，这一点要先证伪自己的直觉。10月1日银行股仍然涨跌不一：摩根大通 +0.76%、富国 +0.28%，高盛 -0.42%、美银 -1.31%、花旗 -1.92%。',
      a: '若净息差确认扩张、信用指引平稳，价值风格会进一步跑赢成长。<b>应对：</b>可作为风格切换的确认信号。',
      priced: '净息差扩张已被部分定价，但「10月不加」给后续加息路径增加了不确定性',
      asym: '确认信号强于意外：若信用损失指引明显恶化，「加息利好银行」的叙事会被质疑'
    },

    { date: '2026年10月14日（周三）', tag: '经济数据', hi: 'hi', t: '9月 CPI',
      w: '9月油价高位运行（布伦特一度冲到106上方、10月1日收102.31）与柴油零售价创历史新高（约6.40美元/加仑），其传导尚未完全计入 CPI。注意核心 PCE 已经明显转好（8月同比3.0%），但 CPI 与 PCE 口径不同，别混用。注意 TradeStation 的戴维·拉塞尔提醒：8月PCE 相对滞后，没反映9月柴油涨价。',
      a: '核心 CPI 月增 >0.25% → 12月加息基本锁定 → 收益率上行，今天涨的这部分会被拿走。<b>应对：</b>这是非农之后下一个硬关口，中间没有重磅数据，市场可能提前一周开始定价。',
      priced: '9月能源高位运行的传导尚未完全体现，这是本轮最难预判的一份数据',
      asym: '非对称性仍然很强：超预期 → 加息锁定 + 长端上冲；低于预期 → 只是情绪修复，因为长端对数据的反应已被证明要看美联储脸色'
    },

    { date: '2026年10月中旬（待定）', tag: '公司事件', hi: 'md', t: 'Anthropic IPO 定价（目标估值 2 万亿美元）',
      w: '泄露的招股书草案显示公司寻求最高 2 万亿美元估值，同时警告先进 AI 可能对人类构成生存风险、亏损扩大。同日 OpenAI 搁置前沿模型发布、Oura 已中止 IPO。这将成为华尔街给 AI 龙头定价的新锚。',
      a: '定价接近或超过目标 → 给整个 AI 板块重新定锚；定价大幅缩水或延期 → AI 叙事裂缝扩大。<b>应对：</b>这是叙事风险而非业绩风险，重仓 AI 链条者应提前设定减仓线。',
      priced: '2万亿美元是招股书目标而非市场定价；美光10月1日的表现说明二级市场对 AI 利好仍愿意出价，但前提是利率别再上',
      asym: '下行杀伤大于上行提振：长端收益率虽已回落但仍在高位，融资窗口只是打开了一半'
    },

    { date: '2026年10月21日（周三）', tag: '公司财报', hi: 'md', t: '特斯拉（TSLA）财报',
      w: '当前 PE 约 342 倍，是估值风险最集中的权重股之一，也是散户情绪的温度计。公司此前披露签署 200 亿美元三年期延迟提款定期贷款 + 80 亿美元五年期循环信贷 + 20 亿美元364天循环信贷。10月2日盘中 +4.44%，是今天涨幅最大的权重股。',
      a: '不及预期 → 高估值成长股集体承压。<b>应对：</b>持有者提前设定止损位，不要用「信仰」代替纪律。',
      priced: 'PE 342 倍意味着预期已经打满，容错空间接近零',
      asym: '下行空间远大于上行——不及预期会拖累整个高估值成长板块'
    },

    { date: '2026年10月27-28日（周二-周三）', tag: '政策会议', hi: 'hi', t: 'FOMC 利率决议（年内两次之一，另一次为12月8-9日）',
      w: '9月加息 25bp 后的首场会议，当前利率区间 3.75%~4.00%。10月维持不变的概率已达 71.8%（CME 每经口径）至 83%（华尔街日报口径），所以这次会议的看点不在决议本身，在点阵图与声明措辞。鹰派未退场：达拉斯联储主席洛根10月1日称9月加息只是重要第一步、目标区间还需再上调 50 个基点或更多；卡什卡利对10月是否行动没有强烈倾向，但称若经济持续强韧，终端利率可能高于其预期。',
      a: '鹰派且暗示后续仍有空间 → 高收益率收紧流动性 → 杀估值。<b>应对：</b>会议前一周把仓位调到「无论结果如何都能接受」的水平。',
      priced: '10月不加已被大部分定价；12月累计加息25bp 的概率仍有 60.4%（CME 口径），所以「被推迟不等于被取消」这句话依然成立',
      asym: '不确定性已完全从「10月加不加」转移到「12月还有没有」：本次决议的重要性下降，点阵图与措辞的重要性上升'
    },

    { date: '2026年11月3日（周二）', tag: '政治事件', hi: 'md', t: '美国中期选举（距今约32天）',
      w: '能源政策（SPR 释放、柴油出口禁令）、对华关税执行节奏、财政走向都可能被选举周期工具化。当前压力：30年房贷利率 7.58%（2023年11月以来最高）、柴油零售价约6.40美元/加仑、9月消费者信心 81.9（2014年4月以来最低）。<b>新变量：特朗普在《时代》采访中称有可能在中期选举后加大对伊朗的打击力度</b>——这意味着选前反而可能是地缘的平静期，风险被推到选后。联邦拨款方面，特朗普9月2日已签署 H.R. 6500（公法119-103），政府资金维持到 <b>12月11日</b>。',
      a: '政策可预测性下降 → 波动率易升难降。<b>应对：</b>选举前控制单一事件的敞口，比押方向更重要。',
      priced: '政策摇摆尚未被市场定价；伊朗官员已私下表示选前难达成协议，而特朗普称选后可能加大打击——「选前无协议、选后有风险」是当前主流预期',
      asym: '任一党取得压倒性多数都会被解读为「政策可预测性上升」，反而是利好；反之若选前出现极端政策表态，控制单一事件敞口比押方向更重要'
    },

    { date: '2026年11月底（时间锚）', tag: '地缘军事', hi: 'hi', t: '美军第三支航母打击群与近万兵力到位中东',
      w: '据美媒援引美国官员，五角大楼正向中东派遣第三支航母打击群及多艘海军陆战队舰船，增派近万名兵力，舰艇战机与人员预计11月底前陆续抵达。同期特朗普称若无法达成可接受协议可能升级对伊朗的打击、《时代》采访中称选后加大轰炸「有可能」。当前海峡状态：本周至少三艘油轮在穿峡时遇袭，10月1日一艘油轮遭不明飞行物击中起火。',
      a: '这是本轮地缘风险<b>唯一有时间锚的事件</b>——不像谈判那样一天反转三次。若届时同时出现海峡实质中断，油价与长端会同步上冲。<b>应对：</b>不必现在就减仓，但要在10月底前把「11月底」这个日期纳入仓位计划。',
      priced: '尚未被定价：今天油价跌回99.5是弱非农与弱美元给的，不是地缘缓和给的。市场在为一个就业数据定价，而不是为一支航母编队定价',
      asym: '明显不对称：到位后若只是「集结但不阻断航运」，风险溢价继续被压缩；若出现实质中断，向上空间远大于当前定价所隐含的'
    },

    { date: '时间未定', tag: '中美经贸', hi: 'md', t: '中美 600 亿美元对等降税：中方称已达成，美方称暂无落实时间表',
      w: '第八轮经贸磋商（9月20-23日，纽约/华盛顿）达成十项成果，核心是「300亿对300亿」对等降税（超90%产品降至最惠国税率）、设立贸易与投资理事会、农业工作组、AI 对话、暂停相互加征关税延期至2027年1月10日。<b>但10月2日美国贸易代表格里尔表示，这份合计600亿美元的降税协议现时并无落实时间表</b>，理由是需要遵守法律程序（包括公众意见征询），且美中贸易理事会的建议可能才被纳入未来关税措施；他称相关程序降低了美国消费者在年底假日季前享受降税的可能性。同日美国商务部对上海阿鲁梅塔的铝复合板启动反规避调查（10月2日生效）。',
      a: '这是典型的「中方宣布成果、美方给降温」的口径差。<b>应对：</b>不要把降税当成已实现的盈利改善；真正的检验点是双方履行国内程序后「同步实施降税」的正式文件，以及金龙指数在落地后5个交易日相对纳指综指的超额收益是否达到 +2pct 以上。',
      priced: '市场已按「有进展但没落地」定价：10月1日纳斯达克中国金龙指数 -1.03%，老虎证券跌近7%、霸王茶姬与小马智行与万国数据跌超4%。降税利好尚未进入价格',
      asym: '上行空间大于下行：利好尚未定价，一旦美方程序走完并正式生效，日用消费品进口商与部分中概会直接受益；但延期本身已被格里尔明说，所以「继续拖」不算意外'
    },

    { date: '2026年12月11日（周五）', tag: '财政风险', hi: 'md', t: '联邦拨款临时法案到期（下一个财政僵局点）',
      w: '现行临时拨款（H.R. 6500 / 公法119-103，9月2日签署）把政府资金维持到12月11日，把真正的 1.8 万亿美元支出之争推到了中期选举之后。上次（2025年）的停摆持续43天，CBO 估计持续成本 70 亿美元以上、约 67 万人被迫无薪休假。当前全球长端的参照：英国30年期国债收益率已升至 6.01%（1998年3月以来最高），法德10年期利差升至2011年11月以来最高。',
      a: '财政僵局重演 → 期限溢价再上行 → 长端收益率再冲高，这恰恰是现在最压估值的那条线。<b>应对：</b>把它当作「长端收益率的已知上行风险」提前计入，不要等到12月才反应。',
      priced: '尚未被定价——当前长端收益率的解释里，财政与期限溢价已被反复点名，但12月这个具体日期还没进入市场视线',
      asym: '上行风险不对称：即使只是「僵局预期」升温，也足以推高期限溢价；而顺利通过的利好很小，因为那是本该发生的事'
    }
  ];

function marketSection() {
    var idx = M.indices || [], csi = M.csiDividend, vol = M.vol || {};

    /* 「一句话核心矛盾」已上移为首屏 Hero（heroSection），此处不再重复 */
    var vix = vol.vix || {};
    var nd = vol.ndx || {}, cd = vol.csi922 || {};

    /* 指数卡片 */
    var html = '';
    idx.forEach(function (x) {
      var up = x.pct >= 0;
      var ser = (M.series || {})[x.key] || [];
      var pos52 = (x.high52 && x.low52 && x.high52 > x.low52)
        ? (x.value - x.low52) / (x.high52 - x.low52) * 100 : null;
      html += '<div class="card idx">'
        + '<div class="nm">' + esc(x.name) + '</div>'
        + '<div class="ds">' + esc(x.desc) + '</div>'
        + '<div class="px">' + fmt(x.value) + '</div>'
        + '<div class="chg ' + cls(x.pct) + '">' + sign(x.chg) + '　' + pct(x.pct) + '</div>'
        + svgSpark(ser, up)
        + (pos52 != null ? '<div class="range52">'
            + '<div class="rng">52 周区间位置 ' + pos52.toFixed(0) + '%</div>'
            + '<div class="track"><i class="fill" style="width:' + pos52.toFixed(0) + '%"></i>'
            + '<i class="knob" style="left:' + pos52.toFixed(0) + '%"></i></div>'
            + '<div class="ends"><span>' + fmt(x.low52, 0) + '</span><span>' + fmt(x.high52, 0) + '</span></div>'
            + '</div>' : '')
        + '<div class="rng" style="margin-top:8px">' + freshTag(freshness(x)) + '</div>'
        + '</div>';
    });
    $('m-indices').innerHTML = html;

    /* 情绪指标：VIX / 纳指恐慌(HV) / 中证红利恐慌(HV) */
    var s = '';
    s += gaugeCard('VIX 恐慌指数', vix.value, vix.pct,
      '标普500未来30天的隐含波动率。低于15=市场很安心，20以上=开始紧张，30以上=恐慌。',
      vix.value == null ? '—' : (vix.value < 15 ? '市场偏乐观' : vix.value < 20 ? '中性偏谨慎' : vix.value < 25 ? '谨慎' : '恐慌'),
      vix.value == null ? 50 : Math.min(100, vix.value / 40 * 100),
      '新浪财经 ' + esc(vix.date || '') + ' ' + esc(vix.time || ''),
      vix.value == null ? null : vixScale(vix.value), 'abs');

    var nlab = hvLabel(nd.percentile);
    s += gaugeCard('纳指恐慌度（NDX 已实现波动率 HV20）', nd.percentile, null,
      '用纳斯达克100近20个交易日的实际波动算出的年化波动率。VXN 无免费实时源，这里用同口径的已实现波动率代替，可与中证红利直接比较。绝对值 HV20=' + (nd.hv20 == null ? '—' : fmt(nd.hv20)) + '，此处按它在过去250日中的分位着色（与下方文案同源）。',
      nlab, nd.percentile == null ? 50 : nd.percentile,
      '东方财富/新浪日K计算，截至 ' + esc(nd.asOf || '') + '，分位样本 ' + (nd.sample || '—') + ' 日',
      null, 'pct');

    var clab = hvLabel(cd.percentile);
    s += gaugeCard('中证红利恐慌度（000922 已实现波动率 HV20）', cd.percentile, null,
      '中证红利指数近20个交易日的年化已实现波动率。绝对值 HV20=' + (cd.hv20 == null ? '—' : fmt(cd.hv20)) + '，此处按分位着色。红利资产本身波动就低，看它的分位比看绝对值更有意义。',
      clab, cd.percentile == null ? 50 : cd.percentile,
      '腾讯日K计算，截至 ' + esc(cd.asOf || '') + '，分位样本 ' + (cd.sample || '—') + ' 日',
      null, 'pct');

    if (csi) {
      s += '<div class="card"><div class="nm" style="font-size:13.5px;font-weight:600">' + esc(csi.name) + '</div>'
        + '<div class="ds" style="font-size:11.5px;color:var(--text-2)">' + esc(csi.desc) + '</div>'
        + '<div class="px" style="font-size:24px;font-weight:700;margin-top:6px">' + fmt(csi.value) + '</div>'
        + '<div class="chg ' + cls(csi.pct) + '" style="font-weight:600">' + sign(csi.chg) + '　' + pct(csi.pct) + '</div>'
        + svgSpark((M.series || {}).sh000922, csi.pct >= 0)
        + '<div class="rng">更新时间 ' + esc(csi.time) + '（A股与美股交易时段不同，注意时差）</div>'
        + '<div class="rng" style="margin-top:6px">在当前利率上行环境中，红利资产的相对吸引力上升——这也是把它和纳指放在一起看的原因：一个受利率压制，一个受利率支撑。</div>'
        + '</div>';
    }
    $('m-senti').innerHTML = s;

    /* 情绪指标的交叉解读：让指标互相印证，而不是各说各话 */
    $('m-cross').innerHTML = crossRead(vix.value, nd.percentile, cd.percentile);

    /* 加仓减仓建议 */
    $('m-advice').innerHTML = adviceBlock();

    /* header meta */
    $('m-asof').textContent = '数据时间 ' + (M.asOf || '—');
    $('m-session').textContent = sessionLabel();
  }

  /* 把 VIX（期权市场怎么看未来）和两个已实现波动率（实际发生了什么）放在一起读。
     单个指标只能告诉你一个侧面，两个背离或共振才有信息量。 */
  function crossRead(vix, ndxP, csiP) {
    var body = '', tone = 'warn';
    if (vix == null || ndxP == null) {
      body = '情绪指标数据不完整，跳过交叉解读。';
    } else if (vix < 15 && ndxP > 70) {
      tone = 'risk';
      body = '<b>背离：期权市场很安心，实际波动却在升。</b>VIX ' + fmt(vix)
        + ' 说明买保险的人没变多，但纳指实际波动已处在过去一年 ' + ndxP
        + '% 的高位。这种组合常出现在单边行情的末段——价格还在涨，底下的波动已经在放大。'
        + '别被低 VIX 麻痹，这时候 risk 是「不知道自己不知道」。';
    } else if (vix < 15 && ndxP < 30) {
      tone = 'warn';
      body = '<b>共振向下：情绪和实际波动都不高。</b>VIX ' + fmt(vix) + '（偏乐观），纳指波动分位 '
        + ndxP + '%（偏低）。市场处在平静期，这轮上涨不是情绪推动的极端行情，相对健康。'
        + '但要留个心眼：低波动本身会积累风险——压得越久，一旦有意外事件，波动率从低位跳得越快。';
    } else if (vix < 15) {
      body = '<b>方向一致，都不极端。</b>VIX ' + fmt(vix) + '（偏乐观），纳指波动分位 ' + ndxP
        + '%（中性）。情绪和实际波动互相印证，说明这轮走势有真实成交支撑，不是纯情绪脉冲。'
        + '但 VIX 在 15 下方属于「麻木区」——保险卖得太便宜，一旦出事，补涨会很快。';
    } else if (vix >= 25) {
      tone = 'risk';
      body = '<b>恐慌已被定价。</b>VIX ' + fmt(vix) + ' 在 25 以上，纳指波动分位 ' + ndxP
        + '%。历史上这个位置通常离阶段性底部不远，但「不远」不等于「到了」——'
        + '不要在恐慌最高点一次性满仓，分批是唯一能降低择时错误的办法。';
    } else {
      body = '<b>中性区间。</b>VIX ' + fmt(vix) + '，纳指波动分位 ' + ndxP + '%，两个都处在中间地带，'
        + '没有给出强信号。这种时候最合理的动作是保持现有仓位，把精力放在个股筛选上。';
    }

    if (ndxP != null && csiP != null) {
      var gap = ndxP - csiP;
      if (gap > 20) {
        body += '<br><br><b>另一个信号：成长 vs 防御。</b>纳指波动分位（' + ndxP
          + '%）明显高于中证红利（' + csiP + '%），说明资金正在给成长股要求更高的风险补偿——'
          + '这是转向防御的早期迹象，值得把一部分仓位挪到现金流确定的资产上。';
      } else if (gap < -20) {
        body += '<br><br><b>另一个信号：成长 vs 防御。</b>纳指波动分位（' + ndxP
          + '%）反而低于中证红利（' + csiP + '%），防御资产的波动比成长还大——'
          + '这通常出现在防御板块被集中抛售的时候，是机会也是陷阱，先看清楚是不看好还是流动性紧张。';
      } else {
        body += '<br><br><b>另一个信号：成长 vs 防御。</b>纳指（' + ndxP + '%）与中证红利（' + csiP
          + '%）的波动分位接近，说明风险偏好没有明显分化。'
          + '真正的转向信号是两者拉开 20 个百分点以上——现在还没到。';
      }
    }
    return '<div class="callout ' + tone + '" style="margin-top:14px">'
      + '<h3>情绪指标交叉解读</h3><p>' + body + '</p></div>';
  }

  function hvLabel(p) {
    if (p == null) return '—';
    if (p < 20) return '波动极低（偏自满）';
    if (p < 40) return '波动偏低';
    if (p < 60) return '波动中性';
    if (p < 80) return '波动偏高';
    return '波动极高（恐慌区）';
  }

  /* gaugeCard(title, val, chg, desc, label, barPct, src, extra, scaleKind)
     scaleKind: 'abs' = 按绝对值刻度着色（VIX 用）
                'pct' = 按分位着色（HV 类用，保证颜色与文案同源）
     铁律：val 缺失时不得给出任何带方向的信号色或指针位置——
     原实现 val=null 会落到 'down'（绿）且指针钉在 0%（最强看多），把缺失伪装成了利好。 */
  function gaugeCard(title, val, chg, desc, label, barPct, src, extra, scaleKind) {
    var missing = (val == null || isNaN(val));
    /* 颜色与 pill 必须来自同一个判定，否则会出现「黄色数字配极低波动文案」的自相矛盾 */
    var band = missing ? 'none'
      : scaleKind === 'pct'
        ? (val >= 70 ? 'high' : val >= 40 ? 'mid' : 'low')
        : (val >= 25 ? 'high' : val >= 15 ? 'mid' : 'low');
    var COL = { high: 'var(--danger)', mid: 'var(--warn)', low: 'var(--down)', none: 'var(--idle)' };
    var PILL = { high: 'up', mid: 'warn', low: 'down', none: 'grey' };
    var col = COL[band];
    var bar = missing ? '<div class="lbl" style="color:var(--text-3);margin-top:9px">数据缺失，本次不给出读数</div>'
      : (extra || '<div class="bar"><i style="width:' + Math.max(3, Math.min(100, barPct)) + '%;background:' + col + '"></i></div>');
    return '<div class="card hoverable">'
      + '<div class="gauge">'
      + '<div><div class="val" style="color:' + col + '">' + (missing ? '—' : fmt(val)) + '</div>'
      + '<div class="lbl">' + esc(title) + '</div></div>'
      + '<div style="margin-left:auto;text-align:right">'
      + '<span class="pill ' + PILL[band] + '">' + (missing ? '无数据' : esc(label)) + '</span>'
      + (chg != null ? '<div class="lbl" style="margin-top:4px">日变动 ' + pct(chg) + '</div>' : '')
      + '</div></div>'
      + bar
      + '<div style="font-size:12.5px;color:var(--text-2);margin-top:9px">' + esc(desc) + '</div>'
      + '<div class="src">来源：' + esc(src) + '</div>'
      + '</div>';
  }

  /* VIX 专用：0-30 刻度条（<15 绿 / 15-20 黄 / >20 红）
     铁律：缺失时不画指针。原实现 v=null 会算成 0%，把指针钉在最左端=「极度安心」，
     等于把数据缺失渲染成最强的看多信号。 */
  function vixScale(v) {
    if (v == null || isNaN(v)) {
      return '<div class="lbl" style="color:var(--text-3);font-size:11.5px">无读数，刻度不显示</div>';
    }
    var p = Math.max(0, Math.min(100, v / 30 * 100));
    return '<div class="scalebar"><div class="track">'
      + '<div class="knob" style="left:' + p.toFixed(1) + '%"></div></div>'
      + '<div class="ticks"><span>0</span><span>15</span><span>20</span><span>30+</span></div></div>';
  }

  function sessionLabel() {
    var ix = (M.indices || [])[0];
    var t = itemTime(ix);
    if (!t) return '市场状态 —';
    var p = nyParts(t);
    if (!p) return '最近成交 ' + (ix.time || '');
    var w = ['日', '一', '二', '三', '四', '五', '六'][p.wd];
    var hh = String(p.hh).padStart(2, '0'), mm = String(p.mm).padStart(2, '0');
    return '最近成交 ' + ix.time + '（美东 ' + p.m + '月' + p.d + '日 周' + w + ' ' + hh + ':' + mm + '）';
  }

  /* ---------------- 仓位建议引擎 ----------------
     铁律：信号缺失或解析失败时，必须在 reasons 里显式说明，不能静默当作 0 分。
     否则用户无法区分「信号恰好中性」和「信号坏了」——这两种情况的应对完全不同。 */
  function numOf(o) {
    /* 从展示文案里取数值：macro.js 的 value 是给人看的文本（可能含"约""非农后"等注记）。
       规则：允许"约/大约/超/低于"这类修饰前缀，但拒绝以年份开头（"2026年12月11日"
       里的年份是日期不是数值）。那种失真是静默的，所以宁可取不到也不取错。 */
    if (!o) return NaN;
    var s = String(o.value == null ? '' : o.value).trim();
    if (/^\d{4}\s*[年\/-]/.test(s)) return NaN;// 以年份开头 → 是日期不是信号值
    var m = s.match(/^(?:约|大约|大约是|超|超过|低于|近)?\s*(-?\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : NaN;
  }
  /* 人工核校项的时效：超过 days 天视为过期，不参与打分（并显式告知） */
  function macroStale(o, days) {
    if (!o || !o.time) return false;
    var t = parseWhen(String(o.time).slice(0, 10));
    if (!t) return false;
    return (Date.now() - t.getTime()) / 86400000 > (days || 7);
  }
  function scoreMarket() {
    var vol = M.vol || {}, sc = 0, reasons = [], missing = [];
    var vix = (vol.vix || {}).value;
    if (vix != null && !isNaN(vix)) {
      if (vix < 15) { sc += 2; reasons.push('VIX ' + fmt(vix) + '（&lt;15，市场情绪偏乐观）→ +2'); }
      else if (vix < 20) { reasons.push('VIX ' + fmt(vix) + '（15–20，中性）→ 0'); }
      else if (vix < 25) { sc -= 1; reasons.push('VIX ' + fmt(vix) + '（20–25，谨慎）→ −1'); }
      else { sc -= 2; reasons.push('VIX ' + fmt(vix) + '（&gt;25，恐慌）→ −2'); }
    } else { missing.push('VIX 恐慌指数'); }
    var nd = vol.ndx || {};
    if (nd.percentile != null && !isNaN(nd.percentile)) {
      if (nd.percentile < 30) { sc += 1; reasons.push('纳指波动分位 ' + nd.percentile + '%（低波动）→ +1'); }
      else if (nd.percentile > 70) { sc -= 1; reasons.push('纳指波动分位 ' + nd.percentile + '%（高波动）→ −1'); }
      else reasons.push('纳指波动分位 ' + nd.percentile + '%（中性）→ 0');
    } else { missing.push('纳指波动分位'); }
    var ix = (M.indices || [])[0];
    if (ix && ix.high52 && ix.value) {
      // 用「在 52 周区间中的位置」而非「距高点百分比」：
      // 后者的分母是高点，对高位指数恒趋近 0，只在「是否新高」一个点上跳变，区分度极低。
      var low = ix.low52, pos = (low != null && ix.high52 > low)
        ? (ix.value - low) / (ix.high52 - low) * 100 : null;
      if (pos != null) {
        if (pos >= 90) { sc += 1; reasons.push('纳指处于 52 周区间 ' + pos.toFixed(0) + '% 高位（趋势强）→ +1'); }
        else if (pos <= 30) { sc -= 1; reasons.push('纳指处于 52 周区间 ' + pos.toFixed(0) + '% 低位（趋势弱）→ −1'); }
        else reasons.push('纳指处于 52 周区间 ' + pos.toFixed(0) + '%（中性）→ 0');
      }
    } else { missing.push('纳指 52 周位置'); }

    var ust = findMacro('ust10'), prob = findMacro('hike_prob');
    var ustV = numOf(ust);
    if (!isNaN(ustV)) {
      if (macroStale(ust, 7)) {
        reasons.push('10年期美债 ' + ust.value + '（人工核校值已超过 7 天，仅记录不计入）→ 0');
      } else if (ustV >= 5) { sc -= 1; reasons.push('10年期美债 ' + ust.value + '（≥5%，压制估值）→ −1'); }
      else if (ustV < 4.5) { sc += 1; reasons.push('10年期美债 ' + ust.value + '（&lt;4.5%）→ +1'); }
      else reasons.push('10年期美债 ' + ust.value + '（4.5%–5.0% 中性区）→ 0');
    } else { missing.push('10年期美债（macro.js 数值无法解析）'); }

    var probV = numOf(prob);
    if (!isNaN(probV)) {
      if (macroStale(prob, 7)) {
        reasons.push('加息概率 ' + prob.value + '（人工核校值已超过 7 天，仅记录不计入）→ 0');
      } else if (probV >= 60) { sc -= 1; reasons.push('加息概率 ' + prob.value + '（≥60%，鹰派预期）→ −1'); }
      else if (probV <= 30) { sc += 1; reasons.push('加息概率 ' + prob.value + '（≤30%，鸽派预期）→ +1'); }
      else reasons.push('加息概率 ' + prob.value + '（30%–60% 中性）→ 0');
    } else { missing.push('加息概率（macro.js 数值无法解析）'); }

    var oil = (M.commodities || []).filter(function (c) { return c.key === 'hf_OIL'; })[0];
    if (oil && oil.value != null && !isNaN(oil.value)) {
      if (oil.value >= 100) { sc -= 1; reasons.push('布伦特原油 ' + fmt(oil.value) + ' 美元（≥100，通胀压力）→ −1'); }
      else reasons.push('布伦特原油 ' + fmt(oil.value) + ' 美元（&lt;100）→ 0');
    } else { missing.push('布伦特原油'); }

    /* 缺失信号必须显式列出——这是「不静默」的关键 */
    if (missing.length) {
      reasons = reasons.concat(missing.map(function (k) {
        return '<b style="color:var(--warn)">[' + k + ' 数据缺失，本次不计分]</b>';
      }));
    }
    return {
      score: sc, reasons: reasons, missing: missing,
      // 信号不完整时收窄建议区间，避免用残缺信号给出精确仓位
      partial: missing.length > 0,
      total: 6
    };
  }

  function findMacro(key) {
    var out = null;
    (MAC.groups || []).forEach(function (g) {
      g.items.forEach(function (it) { if (it.key === key) out = it; });
    });
    return out;
  }

  function adviceBlock() {
    var r = scoreMarket();
    var risk = LS.get('risk', 'balanced');
    var base = 50 + r.score * 6;
    var adj = risk === 'conservative' ? -10 : (risk === 'aggressive' ? 8 : 0);
    var pos = Math.max(20, Math.min(85, base + adj));

    var label = pos >= 70 ? '偏进攻' : pos >= 58 ? '中性偏多' : pos >= 45 ? '均衡' : pos >= 35 ? '偏防御' : '防守';
    var col = pos >= 58 ? 'ok' : pos >= 45 ? '' : 'risk';

    var holdings = LS.get('holdings', []);
    var total = parseFloat(LS.get('capital', 0)) || 0;
    var curPos = null, gap = null;
    if (total > 0 && holdings.length) {
      var mv = holdings.reduce(function (s, h) { return s + (parseFloat(h.shares) || 0) * (parseFloat(h.cost) || 0); }, 0);
      curPos = mv / total * 100;
      gap = pos - curPos;
    }

    var act;
    if (r.partial && r.score === 0) {
      act = '<b>本次不给出仓位建议</b>：' + r.missing.length + ' 项信号缺失（'
        + esc(r.missing.join('、')) + '）。宁可不给建议，也不要用残缺信号算出一个看起来精确的仓位。'
        + '请先确认 <code>refresh.py</code> 是否正常执行。';
    } else if (gap == null) act = '尚未录入持仓。填入「总资产」与持仓后，这里会给出相对当前仓位的加减仓判断。';
    else if (gap > 5) act = '<b>建议加仓</b>：目标仓位 ' + pos.toFixed(0) + '%，当前约 ' + curPos.toFixed(0) + '%，缺口约 ' + gap.toFixed(0) + ' 个百分点。分 2–3 批执行，每批间隔至少一个交易日，不要一次性打满。';
    else if (gap < -5) act = '<b>建议减仓</b>：目标仓位 ' + pos.toFixed(0) + '%，当前约 ' + curPos.toFixed(0) + '%，需降低约 ' + Math.abs(gap).toFixed(0) + ' 个百分点。优先减「利率敏感 + 估值高 + 趋势转弱」的标的。';
    else act = '<b>维持现有仓位</b>：目标 ' + pos.toFixed(0) + '% 与当前约 ' + curPos.toFixed(0) + '% 接近，无需大动作，把精力放在个股筛选上。';

    var partialNote = r.partial
      ? '<p style="font-size:12.5px;color:var(--warn);margin-top:8px">'
        + '<b>注意：本次有 ' + r.missing.length + ' / ' + r.total + ' 项信号缺失或已过期</b>，'
        + '仓位建议的可信度相应下降。若缺失项超过一半，请把上方「市场温度分」仅当作参考，不要直接照着调仓。</p>'
      : '';

    var riskNote = {
      conservative: '保守型：目标仓位已下调 10 个百分点，单票上限建议 10%。',
      balanced: '平衡型：单票上限建议 15%。',
      aggressive: '进取型：目标仓位已上调 8 个百分点，单票上限建议 20%，但请严格执行止损。'
    }[risk] || '平衡型：单票上限建议 15%。';

    return '<div class="advice">'
      + '<div class="top"><div class="big">' + pos.toFixed(0) + '%<small> 建议仓位</small></div>'
      + '<span class="pill info">' + label + '</span>'
      + '<span class="pill grey">市场温度分 ' + (r.score > 0 ? '+' : '') + r.score + '</span>'
      + (curPos != null ? '<span class="pill ' + (gap > 5 ? 'up' : gap < -5 ? 'down' : 'grey') + '">当前约 ' + curPos.toFixed(0) + '%</span>' : '')
      + '</div>'
      + '<div class="pos"><div class="pos-bar"><i style="width:' + pos + '%"></i></div>'
      + '<div class="scale"><span>20% 防守</span><span>50% 均衡</span><span>85% 进攻</span></div></div>'
      + '<div class="callout ' + col + '" style="margin:14px 0 0">' + act + '</div>'
      + partialNote
      + '<ul>' + r.reasons.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'
      + '<p style="font-size:12.5px;color:var(--text-2);margin-top:10px">' + riskNote
      + '　基准仓位 50%，每个信号 ±6 分对应 ±6 个百分点，上限 85%、下限 20%。规则透明，可自行核对。</p>'
      + '</div>';
  }

  /* ============================================================
     ② 三件大事
     ============================================================ */
  function top3() {
    $('t3').innerHTML = TODAY_TOP3.map(function (x, i) {
      return '<div class="thing">'
        + '<div class="hd"><span class="rk">' + (i + 1) + '</span><div class="tt">' + esc(x.t) + '</div></div>'
        + '<div class="bd">'
        + '<div class="row"><b>发生了什么</b><p>' + x.a + '</p></div>'
        + '<div class="row b"><b>为什么重要</b><p>' + x.b + '</p></div>'
        + '<div class="row c"><b>接下来关注</b><p>' + x.c + '</p></div>'
        + (x.v ? '<div class="row v"><b>可证伪验证点</b><p>' + x.v + '</p></div>' : '')
        + '</div></div>';
    }).join('');
  }

  /* ============================================================
     ③ 交易逻辑
     ============================================================ */
  function logic() {
    function block(title, arr, cls2) {
      return '<div class="card"><h3 style="margin:0 0 10px;font-size:15px">' + title + '</h3>'
        + '<ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--text-2)' + (cls2 || '') + '">'
        + arr.map(function (x) { return '<li style="margin-bottom:7px">' + x + '</li>'; }).join('')
        + '</ul></div>';
    }
    $('lg').innerHTML =
      block('当前市场的核心关注点', TRADE_LOGIC.focus) +
      block('资金流向（9月25日实测）', TRADE_LOGIC.flow) +
      '<div class="card">' + soWhat('板块涨跌和资金流是「已经发生的事」，它能告诉你钱去过哪里，'
        + '但不能告诉你钱明天会去哪里。所以它只适合用来验证你的判断，不适合用来当作买入理由。')
      + counterView('也可以这么反驳：市场宽度这么窄（纳指 53 只新高 / 238 只新低），'
        + '说明少数龙头在拉指数，板块层面的「资金流向」可能只是几个大票的成交额在说话，'
        + '并不代表真正的资金共识。') + '</div>' +
      '<div class="card" style="border-left:4px solid var(--warn)">'
      + '<h3 style="margin:0 0 10px;font-size:15px">新手提示</h3>'
      + '<ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--text-2)">'
      + TRADE_LOGIC.tips.map(function (x) { return '<li style="margin-bottom:7px">' + x + '</li>'; }).join('')
      + '</ul></div>';
  }

  /* ============================================================
     通用小组件：影响链条流程图 / 风险温度计 / 所以呢 / 反着看
     ============================================================ */
  function chainFlow(chain) {
    if (!chain || !chain.length) return '';
    return '<div class="chainflow">' + chain.map(function (c, i) {
      return (i ? '<div class="arw">→</div>' : '')
        + '<div class="nd"><b>' + esc(c.step) + '</b><span>' + esc(c.text) + '</span></div>';
    }).join('') + '</div>';
  }

  function riskBar() {
    var items = EV.items || [];
    if (!items.length) return '';
    var avg = items.reduce(function (s, e) { return s + (e.level || 3); }, 0) / items.length;
    var p = (avg - 1) / 4 * 100;
    var lab = avg >= 4.5 ? '高' : avg >= 3.5 ? '中高' : avg >= 2.5 ? '中' : '低';
    return '<div class="riskbar"><div class="track"><div class="knob" style="left:'
      + p.toFixed(1) + '%"></div></div>'
      + '<div class="lab"><span>低</span><span>当前全球风险：<b>' + lab
      + '</b>（加权 ' + avg.toFixed(1) + '/5，共 ' + items.length + ' 个事件）</span><span>高</span></div></div>';
  }

  function soWhat(t) {
    return '<div class="soname"><b>所以呢：</b>' + t + '</div>';
  }
  function unknown(t) {
    return '<div class="unknown"><b>我不知道：</b>' + t + '</div>';
  }
  function counterView(t) {
    return '<div class="counter"><b>反着看：</b>' + t + '</div>';
  }

  /* ============================================================
     ⑤ 附：验证点追踪表（可勾选三态，localStorage 持久化）
     ============================================================ */
  function verifyTrackSection() {
    var marks = LS.get('vmark', {});
    var rows = [];
    (TODAY_TOP3 || []).forEach(function (x, i) {
      if (x.v) rows.push({ id: 't3-' + i, src: '三件大事', title: x.t, v: x.v });
    });
    (EV.items || []).forEach(function (e) {
      if (e.verify) rows.push({ id: 'ev-' + e.id, src: '世界局势 · ' + e.region, title: e.title, v: e.verify });
    });
    if (!rows.length) { $('vtrack').innerHTML = ''; return; }

    var done = rows.filter(function (r) { return marks[r.id]; }).length;
    var h = '<div class="card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px">'
      + '<h3 style="margin:0;font-size:15px;font-weight:650">验证点追踪表</h3>'
      + '<span class="pill grey">已标记 ' + done + ' / ' + rows.length + '</span>'
      + '<span style="font-size:12px;color:var(--text-3)">'
      + '判断写出来就必须能被证伪——三个月后回看这张表，比任何观点都值钱</span></div>'
      + '<div class="tbl-scroll"><table class="tbl vtbl">'
      + '<thead><tr><th style="width:84px">状态</th><th style="width:110px">来源</th><th>验证点（达到什么数字算对 / 算错）</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var m = marks[r.id] || '';
      var badge = m === 'ok' ? '<span class="pill down">已验证</span>'
        : m === 'no' ? '<span class="pill up">被证伪</span>'
        : '<span class="pill grey">未验证</span>';
      h += '<tr><td class="st">' + badge
        + '<select style="margin-top:6px;width:100%" onchange="App.markVerify(\'' + esc(r.id) + '\',this.value)">'
        + '<option value=""' + (m === '' ? ' selected' : '') + '>未验证</option>'
        + '<option value="ok"' + (m === 'ok' ? ' selected' : '') + '>已验证</option>'
        + '<option value="no"' + (m === 'no' ? ' selected' : '') + '>被证伪</option>'
        + '</select></td>'
        + '<td class="src-td" style="font-size:12px;color:var(--text-3)">' + esc(r.src) + '</td>'
        + '<td><b style="font-size:13px">' + esc(r.title) + '</b>'
        + '<div style="font-size:12.5px;color:var(--text-2);margin-top:4px">' + r.v + '</div></td></tr>';
    });
    h += '</tbody></table></div>'
      + '<div style="font-size:11.5px;color:var(--text-3);margin-top:10px">'
      + '标记保存在本机浏览器，刷新不丢。建议每周围坐一次，把「被证伪」的那几条单独复盘——'
      + '错在哪里比对了什么更重要。</div></div>';
    $('vtrack').innerHTML = h;
  }

  /* ============================================================
     ③ 附：资金关注度榜
     ============================================================ */
  function hotSection() {
    var list = M.hot || [];
    if (!list.length) {
      $('hot').innerHTML = '<div class="card"><div class="empty">'
        + '<b>热度榜暂无数据</b>运行 <code>python3 refresh.py</code> 重新抓取后即可显示。'
        + '<br><span style="font-size:12px">该接口偶发失败，脚本已内置重试与 curl 兜底。</span></div></div>';
      return;
    }
    var mine = getStocks().map(function (s) { return s.ticker; });

    var upN = list.filter(function (x) { return (x.pct || 0) > 0; }).length;
    var mover = list.slice().sort(function (a, b) {
      return Math.abs(b.pct || 0) - Math.abs(a.pct || 0);
    })[0];

    var h = '<div class="card">'
      + '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px">'
      + '<h3 style="margin:0;font-size:15px;font-weight:650">资金关注度榜 · 成交额 TOP10</h3>'
      + '<span class="pill grey">' + (M.asOf || '').slice(0, 10) + '</span>'
      + '<span style="font-size:12px;color:var(--text-3)">剔除 ETF · 排名范围为 60 只主流美股与中概股池</span>'
      + '</div><ul class="hot">';

    list.forEach(function (x, i) {
      var isMine = mine.indexOf(x.ticker) >= 0;
      h += '<li>'
        + '<span class="rk">' + (i + 1) + '</span>'
        + '<span class="tk">' + esc(x.ticker) + '</span>'
        + '<span class="nm">' + esc(x.name) + (isMine ? '　<span class="pill info">自选</span>' : '') + '</span>'
        + '<span class="amt">' + (x.amount / 1e8).toFixed(0) + ' 亿美元</span>'
        + '<span class="px"><b>' + fmt(x.price) + '</b>'
        + '<span class="' + cls(x.pct) + '">' + pct(x.pct) + '</span></span>'
        + (isMine ? '' : '<button class="mini ghost" onclick="App.addStockTk(\'' + esc(x.ticker) + '\')">+</button>')
        + '</li>';
    });
    h += '</ul>';

    var note = '<b>怎么看这个榜：</b>成交额是真金白银堆出来的注意力，比「搜索热度」更难造假。'
      + '钱先动、新闻后到，所以这个榜往往比新闻更早告诉你资金在关注什么。'
      + '本榜共 ' + list.length + ' 只，其中 ' + upN + ' 只上涨、' + (list.length - upN) + ' 只下跌。';
    if (mover && Math.abs(mover.pct || 0) >= 2) {
      note += '<br><br><b>当日最剧烈：</b>' + esc(mover.ticker) + '（' + esc(mover.name) + '）'
        + pct(mover.pct) + '，同时成交额排在榜上——'
        + (mover.pct > 0 ? '放量上涨，说明分歧在向上解决。' : '放量下跌，说明分歧在向下解决，别急着抄。');
    }
    note += '<br><br><b>注意口径：</b>这是主流股池内的排名，不是全市场扫描。'
      + '小盘妖股不在此列——这恰恰是保护，不是缺陷。';

    h += '<div class="callout" style="margin:14px 0 0"><p>' + note + '</p></div></div>';
    $('hot').innerHTML = h;
  }

  /* ============================================================
     ④ 自选股
     ============================================================ */
  /* 个股基本面：靠什么赚钱 + 利率敏感度
     利率敏感度 = 这家公司的价值里，有多少要等很久才能兑现。
     等得越久（久期越长），利率一升就被折掉得越多。 */
  var STOCK_BASIS = {
    AAPL: {
      rate: '中低',
      basis: '硬件 + 服务双引擎。服务业务（App Store 抽成、订阅、搜索广告分成）毛利率远高于卖硬件，是真正的利润奶牛。AI 走的是「塞进存量设备」的慢路线：不造基础模型，把功能装进几十亿台现成设备。好处是现金流现在就到手，不用等很久；坏处是主题最热的时候，资金先去找弹性大的标的。'
    },
    NVDA: {
      rate: '高',
      basis: '最硬的护城河是数据中心订单的能见度——客户先下单、再排队等产能。风险不在估值贵（PE 约 28 倍），而在预期密度：高增长的指引已经打进价格，财报必须持续超预期才算及格。近期 CDS（给债务买保险的成本）交易活跃，说明有人在对冲它的信用风险，这是需要盯的新变量。'
    },
    MSFT: {
      rate: '中低',
      basis: 'Azure 与 AI 收入是真金白银在兑现，利润质量在巨头里属第一档。但它一边卖 AI 赚钱、一边花大钱买算力，内存涨价对它是双刃剑——收入受益，成本也上升，净效果要看 Azure 毛利率顶不顶得住。9月25日因新版 Copilot 功能大涨 3.66%，说明它的 AI 故事有产品落地撑着，不是纯预期。'
    },
    GOOGL: {
      rate: '中',
      basis: '搜索广告是现金牛，Gemini 的商业化兑现节奏慢于预期，而 AI 资本开支（买芯片、建机房）已经大幅前置。它是七巨头里 PE 最低的一只（约 17 倍）——便宜的原因就是市场在给「AI 投入什么时候收回来」这件事打折。'
    },
    AMZN: {
      rate: '高',
      basis: 'AWS + 广告双引擎，零售利润率在修复。算力扩张靠资本开支堆出来，而且这一轮扩张主要靠发债而不是自有现金——所以利率一跳，融资成本跟着跳。关键不是花了多少，是每花 1 美元能不能换回 1 美元以上的云收入。'
    },
    META: {
      rate: '中',
      basis: '广告收入是现金牛，现金流强劲。AI 应用层有实质进展：Muse AI 助手获市场正面评价，本周股价累计涨约 13%；但 9月25日单日回吐 3.33%，说明获利盘在兑现。它的资本开支同样是利率敏感项。'
    },
    TSLA: {
      rate: '最高',
      basis: '卖车主业毛利率承压、价格战未停，所以估值主要靠自动驾驶和机器人两张远期支票撑着（PE 约 345 倍）。这种估值方法本质是「把很远的钱折算到现在」，中间隔的时间最长——所以利率一动，它折回来的价值变化最大。这是它弹性最大的根源，也是它最危险的地方。'
    },
    AVGO: {
      rate: '高',
      basis: '定制 ASIC 芯片与网络互连是增长引擎，受益于各大云厂商自研 AI 芯片的浪潮；VMware 提供软件端的稳定现金流。客户高度集中是它的结构性风险——单一大客户的订单节奏会直接放大波动。'
    }
  };
  var RATE_NOTE = {
    '最高': '久期最长，利率每升一点它折价最狠——加息预期升温期要最先减',
    '高': '价值里有很大一块要等未来兑现，对利率上行敏感',
    '中': '一半靠现在赚的钱、一半靠未来预期，利率影响中等',
    '中低': '主要靠已经到手的现金流，利率上行时相对抗跌',
    '低': '现金流现在就兑现，受利率影响最小'
  };

  function stockAdvice(s) {
    var t = s.tech || {}, out = [];
    var pe = s.pe, rsi = t.rsi14;

    if (t.trend === '多头排列') {
      if (rsi != null && rsi > 75) out.push('趋势向上但 RSI ' + rsi + ' 已过热，<b>不宜追高</b>，等回踩 MA20（' + fmt(t.ma20) + '）附近再考虑。');
      else out.push('均线多头排列且未过热，<b>持有为主</b>；若回调至 MA20（' + fmt(t.ma20) + '）附近且不破，可分批加。');
    } else if (t.trend === '空头排列') {
      out.push('均线空头排列，<b>反弹至 MA20（' + fmt(t.ma20) + '）附近是减仓机会</b>；跌破前低 ' + fmt(t.low20) + ' 应执行止损。');
    } else if (t.trend) {
      out.push('均线' + t.trend + '，方向未明，<b>等突破再动</b>：站上 ' + fmt(t.high20) + ' 转多，跌破 ' + fmt(t.low20) + ' 转空。');
    } else {
      out.push('技术指标数据不足（日K缺失），先在券商端核对趋势后再决定，<b>不要凭价格单点下单</b>。');
    }

    if (pe != null) {
      if (pe > 60) out.push('PE ' + fmt(pe) + ' 倍，属高估值区间，对利率上行极其敏感——10年期美债 5.18% 的环境下，这类标的杀估值风险最大，<b>仓位不宜过重</b>。');
      else if (pe > 30) out.push('PE ' + fmt(pe) + ' 倍，估值偏高但不极端，需靠盈利增长消化，<b>财报是关键验证点</b>。');
      else if (pe > 0) out.push('PE ' + fmt(pe) + ' 倍，估值相对合理，在当前利率环境下抗压性更好。');
      else out.push('PE 为负（当前亏损），估值无法用市盈率衡量，<b>只适合小仓位博弈</b>。');
    }
    if (t.volRatio5v20 != null) {
      if (t.volRatio5v20 > 1.3) out.push('近5日成交量为20日均量的 ' + t.volRatio5v20 + ' 倍，<b>放量明显</b>，说明分歧加大，注意波动。');
      else if (t.volRatio5v20 < 0.7) out.push('近5日成交量仅为20日均量的 ' + t.volRatio5v20 + ' 倍，<b>缩量</b>，观望情绪浓。');
    }
    if (t.pos52 != null) {
      if (t.pos52 > 90) out.push('处于52周区间 ' + t.pos52 + '% 的高位，追高的安全边际不足。');
      else if (t.pos52 < 20) out.push('处于52周区间 ' + t.pos52 + '% 的低位，若基本面未恶化，是逆向布局的观察区（但不是买入理由，需等趋势确认）。');
    }
    return out;
  }

  function defaultStocks() {
    return (M.stocks || []).map(function (s) { return { ticker: s.ticker, name: s.name }; });
  }
  /* 统一的自选池读取入口：必须默认回落到「脚本里抓到的池」，
     否则用户第一次点删除时 localStorage 里还没存过，会被写成空数组，默认池直接消失。 */
  function getStocks() {
    var v = LS.get('stocks', null);
    return (Array.isArray(v) ? v : defaultStocks());
  }

  function stocksSection() {
    var list = getStocks();
    var pool = M.stocks || [];
    var html = '';
    var found = 0;

    list.forEach(function (it) {
      var s = pool.filter(function (x) { return x.ticker === it.ticker; })[0];
      var card = '<div class="card">';
      if (!s) {
        card += '<div class="stk-hd"><span class="tk">' + esc(it.ticker) + '</span>'
          + '<span class="nm">' + esc(it.name || '') + '</span>'
          + '<button class="mini del" style="margin-left:auto" onclick="App.removeStock(\'' + esc(it.ticker) + '\')">删除</button></div>'
          + '<div style="font-size:13px;color:var(--text-2);margin-top:10px">'
          + '暂无实时数据。运行 <code>python3 refresh.py</code> 并把它加入脚本里的 DEFAULT_WATCH 即可自动抓取。</div></div>';
        html += card;
        return;
      }
      found++;
      var t = s.tech || {};
      var up = s.pct >= 0;
      card += '<div class="stk-hd">'
        + '<span class="tk">' + esc(s.ticker) + '</span>'
        + '<span class="nm">' + esc(s.name) + '</span>'
        + '<span class="px ' + cls(s.pct) + '">' + fmt(s.value) + '</span>'
        + '<span class="chg ' + cls(s.pct) + '" style="font-weight:600;margin-left:8px">' + pct(s.pct) + '</span>'
        + '<button class="mini del" style="margin-left:8px" onclick="App.removeStock(\'' + esc(s.ticker) + '\')">删除</button>'
        + '</div>';

      card += '<div class="kv">'
        + '<div><div class="k">最新动态</div><div class="v">' + sign(s.chg) + ' / ' + pct(s.pct) + '</div>'
        + '<div style="font-size:11.5px;color:var(--text-2)">成交额 ' + (s.amount ? (s.amount / 1e8).toFixed(1) + ' 亿美元' : '—') + '</div></div>'
        + '<div><div class="k">技术走势</div><div class="v">' + esc(t.trend || '—') + '</div>'
        + '<div style="font-size:11.5px;color:var(--text-2)">RSI ' + (t.rsi14 == null ? '—' : t.rsi14) + '　MA20 ' + fmt(t.ma20) + '</div></div>'
        + '<div><div class="k">资金面</div><div class="v">' + (t.volRatio5v20 == null ? '—' : t.volRatio5v20 + '×') + '</div>'
        + '<div style="font-size:11.5px;color:var(--text-2)">5日量 / 20日量</div></div>'
        + '<div><div class="k">估值</div><div class="v">PE ' + (s.pe == null ? '—' : fmt(s.pe)) + '</div>'
        + '<div style="font-size:11.5px;color:var(--text-2)">市值 ' + yi(s.mktcap) + '</div></div>'
        + '</div>';

      card += '<div class="kv" style="margin-top:10px">'
        + '<div><div class="k">MA5 / MA10</div><div class="v" style="font-size:13px">' + fmt(t.ma5) + ' / ' + fmt(t.ma10) + '</div></div>'
        + '<div><div class="k">MA20 / MA60</div><div class="v" style="font-size:13px">' + fmt(t.ma20) + ' / ' + fmt(t.ma60) + '</div></div>'
        + '<div><div class="k">20日支撑 / 压力</div><div class="v" style="font-size:13px">' + fmt(t.low20) + ' / ' + fmt(t.high20) + '</div></div>'
        + '<div><div class="k">52周区间位置</div><div class="v" style="font-size:13px">' + (t.pos52 == null ? '—' : t.pos52 + '%') + '</div></div>'
        + '</div>';

      var bs = STOCK_BASIS[s.ticker];
      if (bs) {
        var rc = (bs.rate === '最高' || bs.rate === '高') ? 'up' : (bs.rate === '中' ? 'warn' : 'down');
        card += '<div class="stk-basis"><b>基本面 · 这家公司靠什么赚钱</b>'
          + '<p>' + esc(bs.basis) + '</p>'
          + '<div style="margin-top:7px">利率敏感度：<span class="pill ' + rc + '">' + esc(bs.rate) + '</span>'
          + '<span style="font-size:12px;color:var(--text-2);margin-left:8px">'
          + esc(RATE_NOTE[bs.rate] || '') + '</span></div></div>';
      }

      card += '<div class="stk-act"><b>操作建议（条件式）</b><ul style="margin:6px 0 0;padding-left:18px">'
        + stockAdvice(s).map(function (x) { return '<li style="margin-bottom:4px">' + x + '</li>'; }).join('')
        + '</ul></div>';
      card += '<div class="src">行情时间 ' + esc(s.time) + ' · 技术指标由日K本地计算（MA/RSI/支撑压力），'
        + '美股无「主力资金流」公开数据，此处用成交量的相对热度作为代理指标。</div>';
      card += '</div>';
      html += card;
    });

    if (!list.length) html = '<div class="card">自选池为空，添加代码后运行 refresh.py 即可抓取。</div>';
    $('sk').innerHTML = html;
    if (found === 0 && list.length) {
      $('sk').insertAdjacentHTML('afterbegin',
        '<div class="callout warn">当前自选池里的代码都不在 <code>refresh.py</code> 的 DEFAULT_WATCH 中，'
        + '所以没有实时数据。把它加进脚本后重跑即可。</div>');
    }
  }

  /* ============================================================
     ⑤ 关注清单
     ============================================================ */
  function watchSection() {
    $('wl').innerHTML = '<div class="card">' + WATCH_LIST.map(function (x) {
      return '<div class="wl ' + (x.hi === 'hi' ? 'hi' : x.hi === 'md' ? 'md' : '') + '">'
        + '<div class="dt">' + esc(x.date) + '　·　' + esc(x.tag) + '</div>'
        + '<div class="tt">' + esc(x.t) + '</div>'
        + '<div class="bd"><b>为什么重要：</b>' + x.w + '</div>'
        + '<div class="ac"><b>影响与应对：</b>' + x.a + '</div>'
        + (x.priced ? '<div class="ac pr"><b>已定价程度：</b>' + esc(x.priced) + '</div>' : '')
        + (x.asym ? '<div class="ac as"><b>非对称性：</b>' + esc(x.asym) + '</div>' : '')
        + '</div>';
    }).join('') + '</div>';
  }

  /* ============================================================
     ⑥ 宏观画像
     ============================================================ */
  function macroSection() {
    var h = '<div class="callout"><h3>' + esc(MAC.headline || '') + '</h3><p>' + esc(MAC.summary || '') + '</p></div>';

    /* 实时读数条：宏观指标是人工核校的（可能滞后一天），这一栏补上当下的真实报价 */
    var cm = M.commodities || [], cr = M.crypto || [];
    if (cm.length || cr.length || M.dxy) {
      h += '<div class="card"><h3 style="margin:0 0 4px;font-size:15px">实时读数</h3>'
        + '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:12px">'
        + '下面的人工核校指标可能滞后一天，这一栏是脚本刚抓到的当下报价，两者结合着看。</div><div class="grid g4">';
      function cell(name, val, sub, pctv) {
        return '<div class="mac"><div class="hd"><span class="nm">' + esc(name) + '</span>'
          + '<span class="vl">' + esc(val) + '</span></div>'
          + '<div class="pv">' + (pctv == null ? '' : '<span class="' + cls(pctv) + '">' + pct(pctv) + '</span>　')
          + esc(sub || '') + '</div></div>';
      }
      if (M.dxy) h += cell('美元指数', fmt(M.dxy.value, 2), '新浪 DINIW 实时', M.dxy.pct);
      cm.forEach(function (c) {
        var unit = c.unit ? ' ' + c.unit : '';
        h += cell(c.name, fmt(c.value) + unit, esc(c.date || ''), c.pct);
      });
      cr.forEach(function (c) {
        h += cell(c.name, '$' + fmt(c.value, 0), esc(c.date || '') + '　' + esc(c.note || ''), null);
      });
      h += '</div></div>';
    }
    (MAC.groups || []).forEach(function (g) {
      h += '<div class="card"><h3 style="margin:0 0 12px;font-size:15px">' + esc(g.name) + '</h3><div class="grid g2">';
      g.items.forEach(function (it) {
        var sig = { restrictive: ['up', '压制'], supportive: ['down', '支撑'], neutral: ['grey', '中性'], risk: ['warn', '风险'] }[it.signal] || ['grey', ''];
        h += '<div class="mac">'
          + '<div class="hd"><span class="nm">' + esc(it.name) + '</span>'
          + '<span class="pill ' + sig[0] + '">' + sig[1] + '</span>'
          + '<span class="vl">' + esc(it.value) + '</span></div>'
          + '<div class="pv">前值/对比：' + esc(it.prev || '—') + '　·　' + esc(it.time || '') + '</div>'
          + '<div class="mn"><b>是什么意思：</b>' + esc(it.meaning) + '</div>'
          + '<div class="im"><b>对市场的影响：</b>' + esc(it.impact) + '</div>'
          + '<div class="ft">来源：' + esc(it.source) + '（' + esc(it.sourceTime) + '）</div>'
          + '</div>';
      });
      h += '</div></div>';
    });
    h += '<div class="card"><h3 style="margin:0 0 4px;font-size:15px">三句话串起来看</h3>'
      + '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:12px">'
      + '上面 17 个指标单独看都是数字，串起来才是一个判断。</div>'
      + (MAC.conclusion || []).map(function (x) {
        if (typeof x === 'string') return '<div class="wl"><div class="bd">' + esc(x) + '</div></div>';
        return '<div class="wl"><div class="dt">' + esc(x.group) + '</div>'
          + '<div class="bd" style="margin-top:4px">' + esc(x.text) + '</div></div>';
      }).join('')
      + '<div class="src" style="margin-top:12px">宏观数据更新频率低于行情，由人工核校后写入 data/macro.js，逐条标注来源与时间；'
      + '未标注来源的内容一律不收录。</div></div>';
    h += '<div class="card">' + soWhat('宏观指标单独看都是数字，串起来才是一个判断。'
      + '它们本身不构成操作建议，但会改变你对「该拿什么、该减什么」的判断权重——'
      + '利率在高位时，久期长的资产天然吃亏。')
      + unknown('本页宏观数据来自公开报道的转引，不是一手接口（FRED / BLS / BEA 均需境外直连），'
        + '因此存在两点不确定：①人工核校可能滞后一天；②不同来源的口径与时点可能不一致。'
        + '涉及下单决策时，请以官方发布为准。'
        + '另外「铜金比」为自算值（COMEX 铜 ÷ 黄金），没有官方发布口径。')
      + counterView('最强反驳：这一轮收益率上行到底是「通胀黏性」还是「财政期限溢价」，市场并没有定论。'
        + '如果是后者，那么 CPI 走低也不一定能把长端收益率打下来——'
        + '这正是 10 年期站在 5% 以上、而美联储仍在加息的别扭之处。') + '</div>';

    $('mc').innerHTML = h;
  }

  /* ============================================================
     ⑦ 决策中心
     ============================================================ */
  function decisionSection() {
    var risk = LS.get('risk', 'balanced');
    var capital = LS.get('capital', '');
    var holdings = LS.get('holdings', []);

    var h = '<div class="card"><h3 style="margin:0 0 12px;font-size:15px">风险偏好与资金</h3><div class="form">'
      + '<div class="fld"><label for="d-risk">风险偏好</label><select id="d-risk" onchange="App.setRisk(this.value)">'
      + ['conservative:保守型（控回撤优先）', 'balanced:平衡型', 'aggressive:进取型（能承受大波动）'].map(function (o) {
        var p = o.split(':'); return '<option value="' + p[0] + '"' + (risk === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
      }).join('') + '</select></div>'
      + '<div class="fld"><label for="d-cap">总资产（美元，用于算仓位）</label><input id="d-cap" type="number" value="' + esc(capital) + '" placeholder="如 100000" onchange="App.setCapital(this.value)"></div>'
      + '<div class="fld"><label for="d-sl">止损幅度（%）</label><input id="d-sl" type="number" value="' + LS.get('stopLoss', 12) + '" onchange="App.setNum(\'stopLoss\',this.value)"></div>'
      + '<div class="fld"><label for="d-tp">止盈幅度（%）</label><input id="d-tp" type="number" value="' + LS.get('takeProfit', 25) + '" onchange="App.setNum(\'takeProfit\',this.value)"></div>'
      + '</div>'
      + '<div style="font-size:12.5px;color:var(--text-2);margin-top:10px">'
      + '默认止损 12% / 止盈 25% 是中性设置。保守型建议止损 8–10%，进取型可放宽到 15–18%——但放宽止损必须同步降低仓位，否则单笔亏损会失控。</div></div>';

    /* 持仓表 */
    h += '<div class="card"><h3 style="margin:0 0 4px;font-size:15px">持仓管理</h3>'
      + '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px">成本价用于计算止损止盈；有现价的自选股会自动算浮盈。</div>';

    if (holdings.length) {
      h += '<div class="pos-row" style="font-size:12px;color:var(--text-2);border-bottom:1px solid var(--border)">'
        + '<div>代码</div><div>成本</div><div>股数</div><div class="hide">现价</div><div class="hide">浮动盈亏</div><div></div></div>';
      holdings.forEach(function (p, i) {
        var live = (M.stocks || []).filter(function (x) { return x.ticker === p.ticker; })[0];
        var px = live ? live.value : null;
        var cost = parseFloat(p.cost) || 0, sh = parseFloat(p.shares) || 0;
        var pl = px != null ? (px - cost) * sh : null;
        var plp = px != null && cost ? (px - cost) / cost * 100 : null;
        h += '<div class="pos-row">'
          + '<div><b>' + esc(p.ticker) + '</b></div>'
          + '<div>' + fmt(cost) + '</div>'
          + '<div>' + fmt(sh, 0) + '</div>'
          + '<div class="hide">' + (px == null ? '—' : fmt(px)) + '</div>'
          + '<div class="hide ' + (pl == null ? '' : cls(pl)) + '">' + (pl == null ? '—' : sign(pl, 0) + '（' + pct(plp) + '）') + '</div>'
          + '<div class="right"><button class="mini del" onclick="App.removeHolding(' + i + ')">删除</button></div>'
          + '</div>';
      });
    } else {
      h += '<div style="font-size:13px;color:var(--text-2);padding:10px 0">还没有持仓记录。</div>';
    }
    h += '<div class="addstk" style="margin-top:12px">'
      + '<input id="h-tk" placeholder="代码 如 AAPL" style="width:130px">'
      + '<input id="h-cost" placeholder="成本价" type="number" step="0.01" style="width:110px">'
      + '<input id="h-sh" placeholder="股数" type="number" step="1" style="width:100px">'
      + '<button onclick="App.addHolding()">添加持仓</button></div>';

    /* 止盈止损 */
    if (holdings.length) {
      var sl = parseFloat(LS.get('stopLoss', 12)) || 12;
      var tp = parseFloat(LS.get('takeProfit', 25)) || 25;
      h += '<h4 style="margin:16px 0 8px;font-size:14px">止盈止损价位</h4><div class="tbl-scroll"><table class="tbl">'
        + '<tr><th>代码</th><th>成本</th><th>硬止损价</th><th>止盈价</th><th>移动止盈触发</th><th>说明</th></tr>';
      holdings.forEach(function (p) {
        var live = (M.stocks || []).filter(function (x) { return x.ticker === p.ticker; })[0];
        var px = live ? live.value : null;
        var cost = parseFloat(p.cost) || 0;
        var slp = cost * (1 - sl / 100), tpp = cost * (1 + tp / 100);
        var note;
        if (px == null) note = '无实时价，按成本价倒算';
        else if (px <= slp) note = '<span class="up">已跌破止损位，需立即复核是否执行</span>';
        else if (px >= tpp) note = '<span class="down">已达止盈位，可考虑分批兑现</span>';
        else if (px > cost * 1.15) note = '浮盈较厚，建议把止损上移到成本价（保本）';
        else note = '正常区间';
        h += '<tr><td><b>' + esc(p.ticker) + '</b></td><td class="num">' + fmt(cost) + '</td>'
          + '<td class="num up">' + fmt(slp) + '</td><td class="num down">' + fmt(tpp) + '</td>'
          + '<td class="num">' + fmt(cost * 1.15) + '（浮盈 15% 后上移止损）</td><td style="font-size:12.5px">' + note + '</td></tr>';
      });
      h += '</table></div>'
        + '<div style="font-size:12.5px;color:var(--text-2);margin-top:8px">'
        + '硬止损 = 成本 × (1 − 止损幅度)。移动止盈规则：浮盈超过 15% 后把止损线上移到成本价（保本），'
        + '再涨 10% 则上移到新成本的 92%——目的是锁定约六成浮盈，而不是卖在最高点。</div>';
    }
    h += '</div>';

    /* 个性化调仓 */
    h += '<div class="card"><h3 style="margin:0 0 12px;font-size:15px">个性化调仓建议</h3>' + adviceBlock() + '</div>';

    /* 事件应对 */
    var hi = (EV.items || []).filter(function (e) { return (e.level || 0) >= 4; });
    h += '<div class="card"><h3 style="margin:0 0 10px;font-size:15px">高影响事件应对策略</h3>'
      + '<div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px">'
      + '以下来自「世界局势」模块中影响等级 ≥4 的事件，已自动同步到这里。</div>';
    h += hi.map(function (e) {
      return '<div class="wl ' + (e.level >= 5 ? 'hi' : 'md') + '">'
        + '<div class="dt">' + esc(e.region) + '　·　影响等级 ' + e.level + '/5</div>'
        + '<div class="tt">' + esc(e.title) + '</div>'
        + '<div class="bd">' + esc(e.why) + '</div>'
        + '<div class="ac"><b>应对：</b>' + esc(e.watch) + '</div>'
        + (e.verify ? '<div class="ac pr"><b>验证点：</b>' + esc(e.verify) + '</div>' : '')
        + '</div>';
    }).join('');
    if (!hi.length) h += '<div style="font-size:13px;color:var(--text-2)">暂无高影响事件。</div>';
    h += '</div>';

    h += '<div class="card">' + soWhat('仓位建议是规则算出来的，不是观点。'
      + '它的价值在于「每次都用同一把尺子」——这样三个月后你才能判断是尺子有问题，还是某次判断有问题。'
      + '如果它算出减仓而你觉得该加，请写下理由，下次对照。')
      + unknown('这套规则有三个已知缺陷：①只用 6 个信号，未覆盖信用利差、流动性等维度；'
        + '②宏观项（10Y 收益率、加息概率）是人工核校值，不是实时计算；'
        + '③「建议仓位」默认你的持仓与大盘同涨同跌，若集中在少数个股，误差会被放大。') + '</div>';

    $('dc').innerHTML = h;
  }

  /* ============================================================
     ⑧ 世界局势 + 地球
     ============================================================ */
  var followOnly = false;
  var globe = null;
  var globeInitPending = false;

  /* 动态注入 three.js（约167KB gzip）。原实现用 async 放在首屏，
     虽不阻塞解析，但仍与 data/*.js 争抢同一段带宽，把①的渲染推迟。
     改为地球真正进入视口时才加载 —— 那是用户滚到第8屏之后的事。 */
  var THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
  function loadThree(cb) {
    if (typeof window.THREE !== 'undefined') return cb(true);
    var settled = false;
    function finish(ok) { if (!settled) { settled = true; cb(ok); } }
    function inject(src, onErr) {
      var s = document.createElement('script');
      s.async = true;
      s.onload = function () { finish(typeof window.THREE !== 'undefined'); };
      /* 注意：本地脚本加载失败时不能立刻 finish —— 否则下面 8 秒的
         CDN 兜底分支永远走不到。先标记失败，等兜底。 */
      s.onerror = function () { if (onErr) onErr(); };
      s.src = src;
      document.head.appendChild(s);
      return s;
    }
    // 先试本地（离线可用）
    inject('assets/vendor/three.min.js', function () { /* 失败则交给下面的定时兜底 */ });
    setTimeout(function () {
      if (settled) return;
      if (typeof window.THREE !== 'undefined') return finish(true);
      // 本地超时/失败 → 换 CDN 再给一次机会
      inject(THREE_CDN, function () { finish(false); });
      setTimeout(function () { finish(typeof window.THREE !== 'undefined'); }, 8000);
    }, 8000);
  }

  var TYPE_LABEL = { conflict: '冲突', talk: '会谈', policy: '政策', macro: '宏观' };
  var TYPE_HEX = { conflict: '#E08A8A', talk: '#8FB4D8', policy: '#BBA9D4', macro: '#DCA96B' };

  function worldSection() {
    var items = EV.items || [];
    var follow = LS.get('follow', {});

    /* 事件列表 */
    var list = followOnly ? items.filter(function (e) { return follow[e.id]; }) : items;
    if (!$('world').querySelector('.riskbar')) {
      $('world').insertAdjacentHTML('afterbegin',
        '<div class="card tight">' + riskBar() + '</div>');
    }
    $('evt-count').textContent = '共 ' + items.length + ' 条 · 关注 ' + Object.keys(follow).length + ' 条';
    $('evt-list').innerHTML = list.length ? list.map(function (e) {
      return '<div class="evt" data-id="' + esc(e.id) + '">'
        + '<div class="t"><span class="dot" style="background:' + TYPE_HEX[e.type] + '"></span>'
        + '<span>' + esc(e.title) + '</span></div>'
        + '<div class="m"><span class="pill grey">' + TYPE_LABEL[e.type] + '</span>'
        + '<span>' + esc(e.region) + '</span><span>影响 ' + e.level + '/5</span>'
        + '<span>更新 ' + esc(e.updated) + '</span>'
        + '<span class="star" onclick="event.stopPropagation();App.toggleFollow(\'' + esc(e.id) + '\')">'
        + (follow[e.id] ? '★ 已关注' : '☆ 关注') + '</span></div></div>';
    }).join('') : '<div style="font-size:13px;color:var(--text-2);padding:12px 0">没有匹配的事件。点「只看我关注的」可切回全部。</div>';

    Array.prototype.forEach.call($('evt-list').querySelectorAll('.evt'), function (el) {
      el.addEventListener('click', function () { showEvent(el.getAttribute('data-id')); });
    });

    /* 地球：进入视口才加载 three.js 并初始化，不阻塞首屏 */
    if (!globeInitPending && !globe) {
      globeInitPending = true;
      var secW = $('world');
      function startGlobe() {
        loadThree(function (ok) {
          function build() {
            globe = new window.Globe($('globe-box'), { onPick: function (id) { showEvent(id); } });
            var mode = globe.init(items, follow);
            $('globe-note').innerHTML = mode === true
              ? '3D 地球已加载：拖拽旋转、滚轮或双指缩放、点击发光标记查看事件。点击右侧列表也可定位。'
              : (mode === '2d'
                ? '当前环境未启用 WebGL，已自动降级为 2D 平面地图，点击标记同样可查看事件。'
                : '当前环境不支持画布渲染，地球无法显示；请通过右侧事件列表查看全部事件与影响分析。');
            $('globe-tip').textContent = '点击发光标记查看事件';
          }
          if (ok && typeof window.THREE !== 'undefined') { build(); return; }
          // three 加载失败：globe.js 自带 2D 降级路径，直接尝试
          $('globe-note') && ($('globe-note').textContent = '3D 组件加载中…');
          build();
        });
      }
      if (window.IntersectionObserver) {
        var io = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); startGlobe(); }
        }, { rootMargin: '300px 0px' });
        io.observe(secW);
      } else { startGlobe(); }
    }

    /* 默认展示第一条高影响事件详情，但不滚动（首屏必须留在 ①市场总览） */
    if (!$('evt-detail').innerHTML) {
      var first = items.slice().sort(function (a, b) { return b.level - a.level; })[0];
      if (first) showEvent(first.id, { scroll: false });
    }
  }

  /* opts.scroll: 仅在「用户主动点击/地球拾取」时滚动到详情。
     首屏默认展示第一条高影响事件的详情，但绝不滚动——否则页面一打开
     就被拽到最底部的「⑧世界局势」，用户根本看不到 ①市场总览，
     与「首屏优先渲染①」的设计承诺相反。 */
  function showEvent(id, opts) {
    opts = opts || {};
    var e = (EV.items || []).filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    if (globe && globe.focus) globe.focus(e.lat, e.lon);
    Array.prototype.forEach.call(document.querySelectorAll('#evt-list .evt'), function (el) {
      el.classList.toggle('on', el.getAttribute('data-id') === id);
    });

    var follow = LS.get('follow', {});
    var h = '<div class="card">'
      + '<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">'
      + '<span class="pill" style="background:' + TYPE_HEX[e.type] + '1a;color:' + TYPE_HEX[e.type] + '">' + TYPE_LABEL[e.type] + '</span>'
      + '<span class="pill grey">' + esc(e.region) + '</span>'
      + '<span class="pill ' + (e.level >= 5 ? 'up' : e.level >= 4 ? 'warn' : 'grey') + '">影响等级 ' + e.level + '/5</span>'
      + '<span class="pill grey">更新 ' + esc(e.updated) + '</span>'
      + '<button class="mini ' + (follow[e.id] ? '' : 'ghost') + '" style="margin-left:auto" onclick="App.toggleFollow(\'' + esc(e.id) + '\')">'
      + (follow[e.id] ? '★ 取消关注' : '☆ 关注此事件') + '</button></div>'
      + '<h3 style="margin:12px 0 4px;font-size:17px">' + esc(e.title) + '</h3>'
      + '<div style="font-size:12px;color:var(--text-2)">' + esc(e.date) + '</div>';

    h += '<h4 style="margin:16px 0 6px;font-size:13.5px;color:var(--accent)">发生了什么</h4><p>' + esc(e.summary) + '</p>';
    h += '<h4 style="margin:16px 0 6px;font-size:13.5px;color:var(--accent)">为什么重要</h4><p>' + esc(e.why) + '</p>';

    h += '<h4>对美股的影响链条（用大白话讲）</h4>' + chainFlow(e.chain);

    if (e.reverse) h += '<div class="callout ok" style="margin-top:12px"><h3>反向情形</h3><p>' + esc(e.reverse) + '</p></div>';

    h += '<h4 style="margin:16px 0 6px;font-size:13.5px;color:var(--accent)">受影响资产</h4><div class="assets">'
      + (e.assets || []).map(function (a) {
        return '<div class="a ' + a.dir + '"><b>' + esc(a.name) + '</b>'
          + (a.dir === 'up' ? ' ↑ 偏多' : a.dir === 'down' ? ' ↓ 偏空' : ' → 中性')
          + '<span>' + esc(a.note) + '</span></div>';
      }).join('') + '</div>';

    h += '<h4 style="margin:16px 0 6px;font-size:13.5px;color:var(--accent)">接下来关注什么</h4><p>' + esc(e.watch) + '</p>';

    if (e.verify) {
      h += '<div class="callout" style="margin-top:12px"><h3>可证伪的验证点</h3><p>' + esc(e.verify) + '</p></div>';
    }

    h += '<div class="src">来源：' + (e.sources || []).map(function (s) {
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>（' + esc(s.time) + '）';
    }).join('　·　') + '</div></div>';

    $('evt-detail').innerHTML = h;
    if (opts.scroll !== false && $('evt-detail').scrollIntoView) {
      try { $('evt-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }
  }

  /* ============================================================
     交互 API
     ============================================================ */
  var App = {
    addStock: function () {
      var c = ($('sk-code').value || '').trim().toUpperCase();
      if (!c) return;
      var n = ($('sk-name').value || '').trim();
      var list = getStocks();
      if (list.filter(function (x) { return x.ticker === c; }).length) { alert('已在自选中'); return; }
      list.push({ ticker: c, name: n || c });
      LS.set('stocks', list);
      $('sk-code').value = ''; $('sk-name').value = '';
      stocksSection();
    },
    removeStock: function (tk) {
      LS.set('stocks', getStocks().filter(function (x) { return x.ticker !== tk; }));
      stocksSection();
    },
    resetStocks: function () {
      LS.set('stocks', defaultStocks());
      stocksSection();
    },
    addStockTk: function (tk) {
      var list = getStocks();
      if (list.filter(function (x) { return x.ticker === tk; }).length) return;
      list.push({ ticker: tk, name: tk });
      LS.set('stocks', list);
      stocksSection();
      hotSection();
    },
    setRisk: function (v) { LS.set('risk', v); decisionSection(); },
    setCapital: function (v) { LS.set('capital', v); decisionSection(); },
    setNum: function (k, v) { LS.set(k, parseFloat(v) || 0); decisionSection(); },
    addHolding: function () {
      var tk = ($('h-tk').value || '').trim().toUpperCase();
      var c = parseFloat($('h-cost').value), s = parseFloat($('h-sh').value);
      if (!tk || !c || !s) { alert('请填写代码、成本价和股数'); return; }
      var hs = LS.get('holdings', []);
      hs.push({ ticker: tk, cost: c, shares: s });
      LS.set('holdings', hs); decisionSection();
    },
    removeHolding: function (i) {
      var hs = LS.get('holdings', []);
      hs.splice(i, 1); LS.set('holdings', hs); decisionSection();
    },
    toggleFollow: function (id) {
      var f = LS.get('follow', {});
      if (f[id]) delete f[id]; else f[id] = 1;
      LS.set('follow', f);
      worldSection();
      if ($('evt-detail').innerHTML) showEvent(id);
    },
    toggleFollowAll: function () {
      followOnly = !followOnly; worldSection();
    },
    closeModal: function () { $('modal').classList.remove('on'); },
    showEvent: showEvent,
    markVerify: function (id, val) {
      var m = LS.get('vmark', {});
      if (val) m[id] = val; else delete m[id];
      LS.set('vmark', m);
    },
    toggleTheme: function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      var nx = cur === 'dark' ? 'light' : 'dark';
      LS.set('theme', nx);
      applyTheme(nx);
    }
  };
  window.App = App;

  /* ============================================================
     页面外壳：迷你状态栏 / 导航滚动提示 / 模块折叠
     ============================================================ */
  function renderMinibar() {
    var el = $('minibar-in');
    if (!el) return;
    var st = marketState();
    var ev = nextEvent();
    var nxt = nextOpen();
    el.innerHTML = '<span class="mb-title"><i class="dot-st ' + st.dot + '"></i> ' + esc(st.text) + '</span>'
      + '<span class="mb-sep">·</span><span>下次开盘 <b>' + countDown(nxt) + '</b></span>'
      + '<span class="mb-sep mb-hide">·</span><span class="mb-hide">下次事件：'
      + esc(ev ? ev.w.t : '—') + '</span>'
      + '<span class="mb-sep mb-hide">·</span><span class="mb-hide">'
      + '<a href="#decision" style="color:var(--accent)">决策中心</a></span>';
  }

  function setupMinibar() {
    var bar = $('minibar');
    if (!bar) return;
    renderMinibar();
    var on = false;
    function upd() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var should = y > 240;
      if (should !== on) {
        on = should;
        bar.classList.toggle('on', on);
        document.documentElement.style.setProperty('--nav-top', on ? '40px' : '0px');
      }
    }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
    setInterval(function () { if (on) renderMinibar(); }, 60000);
  }

  function setupNavFade() {
    var nin = $('nav-in'), fade = $('nav-fade');
    if (!nin || !fade) return;
    function check() {
      var more = nin.scrollWidth - nin.clientWidth - nin.scrollLeft;
      fade.classList.toggle('on', more > 6);
    }
    nin.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    setTimeout(check, 300);
  }

  /* 自选股输入框的搜索联想（原生 datalist，零依赖） */
  function setupSugg() {
    var inp = $('sk-code');
    if (!inp || document.getElementById('tk-list')) return;
    var dl = document.createElement('datalist');
    dl.id = 'tk-list';
    var seen = {};
    (M.stocks || []).concat(M.hot || []).forEach(function (x) {
      if (!x.ticker || seen[x.ticker]) return;
      seen[x.ticker] = 1;
      var o = document.createElement('option');
      o.value = x.ticker;
      o.label = (x.name || '') + ' ' + x.ticker;
      dl.appendChild(o);
    });
    document.body.appendChild(dl);
    inp.setAttribute('list', 'tk-list');
    inp.setAttribute('placeholder', '代码或名称，如 AAPL');
  }

  /* 长模块可折叠：把 sec-hd 之外的内容动态包进 .sec-body */
  function makeCollapsible(id) {
    var sec = document.getElementById(id);
    if (!sec || sec.querySelector('.sec-body')) return;
    var body = document.createElement('div');
    body.className = 'sec-body';
    body.id = 'sec-body-' + id;
    Array.prototype.slice.call(sec.children).forEach(function (k) {
      if (k.classList && k.classList.contains('sec-hd')) return;
      body.appendChild(k);
    });
    sec.appendChild(body);
    var hd = sec.querySelector('.sec-hd');
    if (!hd) return;
    var btn = document.createElement('button');
    btn.className = 'sec-toggle';
    btn.textContent = '收起';
    /* aria-expanded/aria-controls：原来只改文字，读屏不知道它控制什么、当前是收还是展 */
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-controls', body.id);
    btn.onclick = function () {
      var c = body.classList.toggle('collapsed');
      btn.textContent = c ? '展开' : '收起';
      btn.setAttribute('aria-expanded', String(!c));
    };
    hd.appendChild(btn);
  }

  /* ---------------- 导航高亮 ---------------- */
  function navSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-in a'));
    var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    function activate(i) {
      if (i < 0) return;
      links.forEach(function (a, k) {
        a.classList.toggle('on', k === i);
        /* aria-current 让读屏知道「当前在哪个板块」 */
        if (k === i) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        /* 一帧内可能有多个 section 同时 intersecting。原实现按entries 顺序
           逐个 add('on')，最终高亮取决于回调顺序而非文档顺序，会错位。
           改为取「已进入视口且最靠上」的那个。 */
        var best = -1, bestTop = Infinity;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var i = secs.indexOf(en.target);
          if (i < 0) return;
          var top = en.boundingClientRect ? en.boundingClientRect.top : 0;
          if (top < bestTop) { bestTop = top; best = i; }
        });
        if (best >= 0) activate(best);
      }, { rootMargin: '-60px 0px -70% 0px', threshold: 0 });
      secs.forEach(function (s) { if (s) io.observe(s); });
    }
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    if (!M.asOf) {
      document.querySelector('.wrap').insertAdjacentHTML('afterbegin',
        '<div class="callout risk">未读到行情数据。请在项目目录运行 <code>python3 refresh.py</code> 生成 data/market.js。</div>');
      /* 铁律：没有行情数据就停在这里。原实现只插入提示却继续往下跑，
         于是 scoreMarket 返回全 0、adviceBlock 照样渲染「建议仓位 50% · 均衡」，
         等于在数据完全缺失时给出一个看起来精确的仓位。 */
      return;
    }
    initTheme();
    initView();
    /* 无痕/隐私模式检测：明确告知用户「改动不会被保存」，
       否则自选、持仓、验证点标记都会在刷新后静默消失 */
    if (!LS.probe()) {
      document.querySelector('.wrap').insertAdjacentHTML('afterbegin',
        '<div class="callout risk" style="margin:0 0 16px">'
        + '<b>当前浏览器无法保存数据（无痕模式或禁用了本地存储）。</b>'
        + '你仍可正常浏览全部内容，但自选股、持仓、验证点标记与主题偏好在刷新后不会保留。'
        + '如需长期使用，请在普通窗口打开。</div>');
    }
    /* 首屏优先渲染「市场总览」（①），让用户立刻有内容可读 */
    snapshotSection();
    heroSection();
    marketSection();
    /* 其余模块放到下一帧再渲染，保证首屏先把①画出来，避免一次性长阻塞 */
    (window.requestAnimationFrame || function (f) { setTimeout(f, 0); })(function () {
      top3();
      logic();
      hotSection();
      stocksSection();
      watchSection();
      verifyTrackSection();
      macroSection();
      decisionSection();
      worldSection();
      ['stocks', 'watch', 'macro', 'decision'].forEach(makeCollapsible);
      setupSugg();
      setupMinibar();
      setupNavFade();
      navSpy();
      $('modal').addEventListener('click', function (e) { if (e.target === this) App.closeModal(); });
      /* 页面切到后台时释放地球的 GPU 资源，回来再恢复。
         dispose 之后必须能重建，否则用户切一次标签页地球就永久静止了。 */
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          if (globe && globe.dispose) globe.dispose();
        } else {
          var box = $('globe-box');
          if (box && (!globe || !globe.ok)) {
            // 已被释放/降级 → 重新构建一次
            globe = null; globeInitPending = false;
            if (box.innerHTML) box.innerHTML = '';
            worldSection();
          }
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
