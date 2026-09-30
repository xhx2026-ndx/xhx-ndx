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
    set: function (k, v) { try { localStorage.setItem('umt.' + k, JSON.stringify(v)); } catch (e) {} }
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
  function parseWhen(s) {
    if (!s) return null;
    if (/^\d{14}$/.test(s)) {           // 20260924161448
      return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8),
                      +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14));
    }
    var t = String(s).replace(' ', 'T');
    var d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }
  function freshness(timeStr, opts) {
    opts = opts || {};
    if (opts.manual) return { s: 'manual', name: '人工核校', when: opts.manual };
    var t = parseWhen(timeStr);
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

  /* 下次美股开盘（美东 09:30 ≈ UTC 13:30 夏令 / 14:30 冬令） */
  function nextOpen() {
    var now = new Date(), c = [];
    for (var d = 0; d < 8; d++) {
      var b = new Date(now.getTime() + d * 86400000);
      [13, 14].forEach(function (h) {
        var t = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), h, 30, 0));
        var wd = t.getUTCDay();
        if (wd >= 1 && wd <= 5 && t > now) c.push(t);
      });
    }
    c.sort(function (a, b2) { return a - b2; });
    return c[0] || null;
  }
  function countDown(target) {
    if (!target) return '—';
    var ms = target.getTime() - Date.now();
    if (ms <= 0) return '已开盘';
    var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    if (h >= 24) return Math.floor(h / 24) + ' 天 ' + (h % 24) + ' 小时';
    return (h ? h + ' 小时 ' : '') + m + ' 分';
  }
  /* 市场状态：休市 / 盘前 / 盘中 / 盘后（按美东时间近似） */
  function marketState() {
    var st = sessionLabel();
    var isWeekend = /休市/.test(st);
    if (isWeekend) return { dot: 'closed', text: '休市', note: '周末休市' };
    // 用最近成交时间判断
    var t = parseWhen((M.indices && M.indices[0]) ? M.indices[0].time : '');
    if (!t) return { dot: 'closed', text: '休市', note: '无成交时间' };
    var hh = t.getHours();
    if (hh >= 21 || hh < 4) return { dot: 'live', text: '盘中', note: '美东交易时段' };
    if (hh >= 4 && hh < 21) return { dot: 'delayed', text: '盘后', note: '非活跃时段，价差大' };
    return { dot: 'closed', text: '休市', note: '' };
  }

  /* 下一个待发生事件（从关注清单里找日期最靠前的未来事件） */
  function nextEvent() {
    var y = new Date().getFullYear();
    var best = null;
    (WATCH_LIST || []).forEach(function (w) {
      var m = String(w.date || '').match(/(\d{1,2})月(\d{1,2})日/);
      if (!m) return;
      var d = new Date(y, +m[1] - 1, +m[2]);
      if (d.getTime() > Date.now() - 86400000 && (!best || d < best.d)) best = { d: d, w: w };
    });
    return best;
  }

  /* ============================================================
     首屏「今日快照」仪表盘
     ============================================================ */
  function snapCard(lbl, dot, val, sub, det) {
    return '<div class="snap-card" onclick="this.classList.toggle(\'open\')">'
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

    var fQuote = freshness(ix.time);
    var fVix = freshness((vix.date || '') + ' ' + (vix.time || ''));
    var fDxy = freshness((dxy && dxy.date) ? dxy.date + ' ' + (dxy.time || '') : '');

    /* 大盘状态：三个指数涨跌方向 */
    var ups = (M.indices || []).filter(function (x) { return (x.pct || 0) > 0; }).length;
    var allUp = ups === (M.indices || []).length && (M.indices || []).length > 0;
    var allDown = ups === 0;
    var dirDot = allUp ? 'up' : allDown ? 'down' : 'warn';

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

    var vixDot = vix.value == null ? 'closed' : vix.value < 15 ? 'live' : vix.value < 20 ? 'delayed' : 'stale';
    c += snapCard('VIX 恐慌指数', vixDot, vix.value == null ? '—' : fmt(vix.value),
      '<span class="' + cls(vix.pct) + '">' + pct(vix.pct) + '</span>　低于15安心 / 20以上紧张',
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
      + '<b style="color:var(--down)">' + ups + '</b> 涨 / '
      + '<b style="color:var(--up)">' + ((M.indices || []).length - ups) + '</b> 跌</span>'
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
      t: '油价跌了，长期利率却创19年新高——油价到利率这条链第一次断了',
      a: '9月29日出现四个压油价的消息：卡塔尔称调解仍在进行（特朗普9月28日证实美伊正举行间接谈判）、沙特东西输油管道恢复至约350万桶/日、IEA与美国宣布再释4000万桶战略储备、特朗普据报酝酿放宽对俄制裁。结果 WTI 11月合约收 89.38 美元（跌逾3%，跌破90关口），布伦特11月合约结算约 102.6 美元（前一日 105.28）。但同一天，30年期美债收益率反而涨 2.04 个基点至 5.567%，盘中一度升破 5.6%（2002年6月以来最高）；10年期盘中触及 5.293%（2007年6月以来最高）；30年房贷利率涨 8 个基点至 7.58%（2023年11月以来最高）。三大指数连跌两天：道指 -0.26%、标普500 -0.17%、纳指综指 -0.09%，能源板块反而以 -0.89% 领跌。',
      b: '这是本页最重要的一次判断修正。过去一周的完整链条是「海峡开不了 → 油价涨 → 通胀预期抬 → 收益率上 → 股票跌」，9月29日上游（油价）转向了，下游（长端利率、股票）却没跟。说明压估值的力量已经不完全来自油价，而来自期限溢价和财政担忧——克利夫兰联储主席哈马克已经点名「对政府债务的担忧」。直接含义是：<b>海峡复航不等于成长股会自动修复</b>，这个推论这次不成立。短端确实松了（2年期跌 5.82 个基点），但跟房贷、跟长期估值挂钩的是长端。',
      c: '①今晚 20:30（北京时间）8月核心 PCE，预期环比 +0.3%、同比 3.3%；②卡塔尔把伊朗方案修订版转交美国后，美方是否给出正式回应——伊朗外长阿拉格齐说「我们正在等待美国通过调解方作出正式回应」；③反向风险：伊朗议会议长 Ghalibaf 9月29日重申「在我们无法卖油的地区，没有人能卖油」，且 Kpler 数据显示海峡单日通航量仅 105.91 万桶，只有战前基准 171.33 万桶的约 62%；④30年期美债能否回到 5.45% 下方，这是新的观察门槛。',
      v: '三个可证伪的数：<b>30 年期美债能否日线收在 5.45% 下方</b>（9月29日 5.567%）、<b>布伦特原油能否跌回 100 美元下方</b>（9月29日约 102.6，还差 2.6 美元）、<b>2 年期美债能否跌破 4.80%</b>（9月29日 4.872%）。注意区分：只满足第三条不叫缓和，那只是加息预期被打掉；必须前两条里至少满足一条，压制才算真正解除。'
    },
    {
      t: '威廉姆斯一句话把10月加息概率从70%打到约50%，但美联储当天公开分裂',
      a: '9月29日纽约联储主席威廉姆斯（FOMC 三号人物、每次会议都有投票权）在布法罗大学演讲：「9月议息会议已采取的政策行动，目前没有急迫性，我们有时间收集更多信息。」他同时说今年晚些时候再上调一次可能是合适的，并讲了一句关键的话：<b>货币政策无法让船只在霍尔木兹恢复航行、也无法重开输油管线和炼油厂，但可以降低供给冲击扩散成更广泛、更持久通胀的风险</b>。同日美联储理事巴尔在底特律经济俱乐部放鹰：基准情形仍需进一步加息，理由是过去 20 个月里只有 2 个月的核心 PCE 读数与 2% 目标一致。芝加哥联储主席古尔斯比说让通胀在目标上方停留 5 年半是「玩火」。结果 CME FedWatch 的10月加息概率从周一约 70.9% 降至盘中约 60%，威廉姆斯讲话后进一步降至 51.5%（路透）/ 49.3%（巴伦周刊）。',
      b: '关键不是「美联储转鸽」，而是会议日历变了。今年只剩 10月27-28日 和 12月两次会议，而在 10 月会议前能拿到的经济数据相当有限——威廉姆斯讲的「趋势」一词被部分经济学家解读为美联储要看的不只是单月数据。所以 10 月这一次从「大概率」变成了抛硬币，真正的分水岭挪到了 12 月。对持仓的含义是：波动会集中在数据日（今晚 PCE、周五非农），而不是会议日。另外别忽略巴尔那个数字——20个月里只有2个月达标，这是鹰派的硬论据。',
      c: '①今晚 20:30 的 8月核心 PCE（预期环比 +0.3%，7月为 +0.2%）；②10月2日 9月非农（预期 +10 万人，前值 +16.2 万；失业率预期 4.2%，前值 4.1%）——这是 FOMC 前唯一的劳动力市场报告；③10月中旬 CPI；④美联储主席凯文·沃什本月早些时候称很难把当前金融环境描述为「紧缩」，暗示加息尚未产生足够限制性效果，注意他后续表态。',
      v: '盯 <b>CME FedWatch 的10月加息概率</b>，阈值从 85% 改成 50% 这条中线：跌破 40% = 10月基本跳过，短端继续下行；重新站上 70% = 巴尔/库克路线占上风，短端补涨。第二个确认信号是 <b>2 年期美债收益率是否跌破 4.80%</b>（9月29日 4.872%）。不要只看官员表态，看期货定价——表态可以一天三变，期货是真金白银。'
    },
    {
      t: 'AI 叙事第一次出现内部裂缝，昨天被当成独立线索的中概股也跟着跌了',
      a: '路透9月29日报道了泄露的 Anthropic IPO 招股书草案：这家 AI 开发商寻求最高 2 万亿美元估值，招股书同时明确警告先进 AI 系统可能对人类构成生存风险并呼吁加强监管；草案也显示公司收入大幅增长但亏损扩大。同日 OpenAI 因内部评估发现安全问题，搁置了最新前沿模型发布；健康科技公司 Oura 以「市场不确定性」为由突然中止 IPO。中概股方面：9月29日纳斯达克中国金龙指数收跌 1.55%（蔚来 -5.29%、小鹏 -4.82%、理想 -4.10%），而纳指综指仅跌 0.09%，跑输 1.46 个百分点。',
      b: '两件事指向同一个结论：昨天那两个「独立于主线」的信号，今天都失效了。中概的部分尤其值得记录——9月28日金龙指数逆势涨 1.12% 时我设的检验是「美股继续跌而金龙仍能跑赢 = 降税在被真实定价」，9月29日答案是否定的：中美降税目前没有被市场当作独立配置线索，中概依然跟着「油价—利率」这条主线走。AI 的部分更结构性：AI 是当前唯一撑住指数的力量（标普500 中位数成分股较52周高点跌16%），而裂缝恰好出现在长端收益率创19年新高、估值最需要它撑住的时候。',
      c: '①Anthropic IPO 是否按期推进、最终定价是否接近 2 万亿美元——这将成为华尔街给 AI 龙头定价的锚；②OpenAI 搁置的模型后续是否发布；③一级市场是否出现第二家因市场原因中止 IPO（Oura 是第一个）；④硬件端能否持续与应用端叙事脱钩——9月29日费半涨 1.32%、应用材料涨超5%，是完全脱钩的，看能不能持续；⑤中概的下一轮检验要等「同步实施降税」正式落地之后。',
      v: '两个检验：<b>费城半导体指数在未来3个交易日相对标普500 的超额收益</b>——继续跑赢 = 市场成功区分了算力需求和模型公司估值，AI 支撑还在；转为跑输 = 叙事整体退潮，那就要认真对待「唯一支撑失效」这个情形。中概的检验换成更硬的数：<b>等同步实施降税正式落地后，看金龙指数在落地后 5 个交易日内相对纳指综指的超额收益</b>，仍跑输就说明市场对中美缓和的定价意愿确实很低。'
    }
  ];

  var TRADE_LOGIC = {
    focus: [
      '主线还是那条，但今天断了一截：<b>油价 → 通胀 → 美联储 → 美债收益率 → 美股估值</b>。9月29日上游转向了（WTI 跌逾3%至89.38美元），短端也跟着松了（2年期 -5.82个基点），但长端没跟——30年期反而涨到5.567%、盘中破5.6%创2002年6月以来最高。结果是三大指数连跌两天。',
      '油价不再是唯一开关：布伦特约102.6美元 / WTI 89.38 美元（9月29日结算）。四个压价因素（卡塔尔调解、沙特管道350万桶/日、SPR再释4000万桶、对俄制裁或放宽）都是真的，但股价没跟着走，说明市场现在更在意利率而不是油价。',
      '利率的重心从短端挪到了长端：10年期 5.232%（盘中5.293%，19年新高）、30年期 5.567%（盘中5.6206%，2002年6月来最高）、2年期 4.872%（当日跌5.82个基点）。2Y–10Y 利差从30.34个基点扩大到约36个基点——<b>曲线从逼近倒挂反转为重新陡峭</b>。含义是近期加息预期被打掉，但长期担忧没变。',
      '盈利是底气，但只有极少数公司有：9月29日纳指100 涨0.21% 而纳指综指跌0.09%，连两个纳指之间都打架，撑住指数的已经缩到「半导体设备+光通信」这一小撮（费半 +1.32%）。'
    ],
    flow: [
      '<b>9月29日板块：</b>标普500 十一大板块七跌四涨。能源 -0.89%、材料 -0.55% 领跌；公用事业 +1.14%、通信服务 +0.40% 领涨——注意能源是跟着油价跌的，这是当天最反直觉的一件事（油价跌，能源股也跌）。',
      '<b>芯片与光通信逆势独强：</b>费城半导体指数涨 1.32%（前一日还跌1.61%），应用材料涨超5%、迈威尔科技涨超4%、Lumentum涨超5%、康宁涨超4%、美光涨超1%。AT&T 与康宁宣布超30亿美元多年期合作。',
      '<b>大型科技股严重分化：</b>Meta 涨 3.24%、奈飞涨 1.55%、亚马逊涨 0.21%；苹果跌 2.66%、特斯拉跌 1.29%、英伟达跌 0.72%、谷歌跌 0.53%。特斯拉当日披露签署融资安排：200亿美元三年期延迟提款定期贷款 + 80亿美元五年期循环信贷 + 20亿美元364天循环信贷。',
      '<b>中概独立行情证伪：</b>纳斯达克中国金龙指数跌 1.55%，跑输纳指综指 1.46 个百分点。昨天设的验证点给出否定答案。'
    ],
    tips: [
      '别把「指数涨」当成「普涨」，现在还要多防一层：指数之间都可能反着走（9月29日纳指100 涨0.21%、纳指综指跌0.09%）。查一下自己的持仓在不在那「被留下的少数」里。',
      '利率上行期，长端比短端更要命。贴现率里挂的是长期利率，所以威廉姆斯一句话打掉短端，并不能让远期盈利变得更值钱。',
      '验证点被证伪是好消息，不是坏消息。中概这条如果昨晚按「独立线索」加仓，今天就吃 1.46 个百分点的相对亏损——设可证伪的检验，就是为了在亏之前知道。',
      '地缘消息会让人想立刻动手。这类消息一天能反转三次（9月29日布伦特盘中先涨1.4%到106.72，再跌到约102.6），用条件单和分批代替一次性梭哈。'
    ]
  };

  var WATCH_LIST = [
    { date: '9月30日（周三）20:30', tag: '经济数据', hi: 'hi', t: '8月核心 PCE · Q2 GDP 第三次估计 · 芝加哥PMI',
      w: '核心 PCE 是美联储最看重的通胀指标（7月环比 +0.2%、同比 3.3%，目标 2%）。这是10月 FOMC 前最关键的通胀读数，也是威廉姆斯讲完「不急」之后的第一份硬数据。',
      a: '核心 PCE 环比 ≥0.3% → 巴尔那句「20个月只有2个月达标」被强化 → 10月概率重回70%以上 → 短端补涨 → 成长股杀估值；明显低于 0.3% → 12月那一次也会被质疑。<b>应对：</b>数据公布前后 30 分钟波动最大，重仓者提前把仓位降到能睡着的水平。',
      priced: '环比 +0.3% / 同比 3.3% 已是共识，真正的变量是环比而不是同比。注意各调查口径有差异（路透与道琼斯 3.3%、CMC 3.4%、环球邮报 3.2%），说明共识本身并不十分牢固',
      asym: '上行风险仍更大，但比昨天小了：威廉姆斯已经把概率打到约50%，所以低于预期的修复空间（概率可跌破40%）和高于预期的杀伤空间（概率回到70%以上）现在大致对称'
    },

    { date: '9月30日（周三）盘后', tag: '公司财报', hi: 'hi', t: '美光科技（MU）财报',
      w: '存储芯片是本轮 AI 硬件周期的核心环节。分析师预期 FY26 Q4 EPS 31.45 美元（去年同期 3.03 美元）、营收 508 亿美元（去年同期 113 亿美元）、毛利率 85.9%（去年同期 45.7%）。这是「AI 叙事裂缝」出现后的第一份重量级硬件财报。',
      a: '指引超预期 → 费半走强带动纳指，AI 叙事裂缝被硬件端补上；不及预期 → 半导体是纳指权重最大的子板块之一，且它现在是唯一撑指数的方向，杀伤会被放大。<b>应对：</b>持有半导体仓位者，财报前把单票占比压到 10% 以内。期权市场隐含股价波动约 9%。',
      priced: '存储涨价已被大幅反映——预期 EPS 同比涨十倍，容错空间很小',
      asym: '指引不及预期的杀伤大于超预期的提振：预期已经打得很满（call gamma 集中在 1200 美元附近，put gamma 支撑在 800 美元附近），且当前它是唯一强势方向，一旦失守没有替补'
    },

    { date: '10月1日（周四）', tag: '经济数据', hi: 'md', t: 'ISM 制造业 PMI · 初请失业金',
      w: '9月标普全球综合 PMI 已达 58.4（五年多最高），经济韧性是美联储敢鹰的底气。初请失业金预期 20.0 万人（前一周增加 3 千人）。',
      a: '继续走强 → 强化「经济不差、不用降息」叙事。<b>应对：</b>对周期股是利好，对成长股是中性偏空。',
      priced: '9 月综合 PMI 58.4 的强势已被消化',
      asym: '方向取决于持仓：对周期股偏多、对成长股中性偏空'
    },

    { date: '10月2日（周五）', tag: '经济数据', hi: 'hi', t: '9月非农就业与失业率（预期 +10 万 / 4.2%）',
      w: '这是 FOMC 前唯一的劳动力市场报告（8月为 +16.2 万、失业率 4.1%）。预期已明显低于前值，且今天公布的 JOLTS 已显示 8 月职位空缺降至约 708 万（弱于预期 722.8 万）。',
      a: '新增就业显著超预期 → 经济过热未解 → 加息概率上升 → 收益率上行压制科技股估值。<b>应对：</b>与 PCE 同理，数据日不做重仓方向性押注。同时要盯 8 月数据的修正方向。',
      priced: '预期已下调到 +10 万 / 4.2%，意味着弱数据已被部分定价',
      asym: '因为预期已经降下来了，超预期的意外空间反而更大：太强 → 加息预期上冲；太弱 → 衰退担忧。最好的结果是刚好符合预期'
    },

    { date: '10月上旬（持续）', tag: '地缘谈判', hi: 'hi', t: '美伊间接谈判：等美方对伊朗方案修订版的正式回应',
      w: '卡塔尔外交部发言人称调解方仍在美伊之间传递信息，伊朗外长阿拉格齐说「我们正在等待美国通过调解方作出正式回应」。但伊朗官员私下对 11 月中期选举前达成协议持怀疑态度，特朗普也公开否认媒体报道的「已向伊朗提供制裁减免」。',
      a: '美方给出实质性书面回应 → 布伦特可能跌破 100 美元；谈判继续拖 → 风险溢价回补。<b>应对：</b>这类消息一天能反转三次，用条件单而不是手动追。',
      priced: '油价已从 105.28 回落到约 102.6，缓和预期被部分定价；但海峡通航量只有战前基准的约 62%，说明市场并没有按「复航」定价',
      asym: '坏消息的杀伤仍大于好消息的提振：向下有供给恢复托底（中东出口接近1300万桶/日，为开战以来最高），向上要靠真正的意外；且长端收益率现在已经没有多少下行空间来缓冲坏消息'
    },

    { date: '10月10日起', tag: '财报季', hi: 'md', t: '美股 Q3 财报季开启',
      w: '远期市盈率已从 22 倍压到 19 倍（十年均值），接下来股价只能靠盈利说话，财报的分量比过去两年更重。今年多了一个变数：AI 叙事出现裂缝，资本开支的延续性会被逐家追问。',
      a: '关注 AI 资本开支的延续性与利润率。<b>应对：</b>财报季是「个股风险」而不是「指数风险」，重仓单票者必须提前减。',
      priced: 'Q3 预期已随 AI 资本开支上调过一轮',
      asym: '个股风险远大于指数风险，重仓单票的下行空间是不对称的'
    },

    { date: '10月13日（周二）', tag: '公司财报', hi: 'md', t: '摩根大通（JPM）等大型银行打头阵',
      w: '净息差是否随加息上调、信用损失准备金的计提指引，反映银行对实体经济的真实看法。注意30年房贷利率已升至 7.58%，信用端压力在累积。',
      a: '银行股是这轮利率上行的受益方，财报若确认净息差扩张，价值风格会进一步跑赢成长。<b>应对：</b>可作为风格切换的确认信号。',
      priced: '净息差扩张已被部分定价，但威廉姆斯的「不急」给后续加息路径增加了不确定性',
      asym: '确认信号强于意外：若净息差指引不及预期，风格切换叙事会被质疑'
    },

    { date: '10月14日（周三）', tag: '经济数据', hi: 'hi', t: '9月 CPI',
      w: '通胀黏性是美联储9月加息的理由之一，这份数据决定 10 月会议是不是真的会加。注意 9 月油价冲击（布伦特一度冲到 106 上方）尚未完全计入。',
      a: '核心 CPI 月增 >0.25% → 10月加息基本锁定 → 收益率上行。<b>应对：</b>与 PCE、非农构成「三连击」，任一超预期都该降低成长股暴露。',
      priced: '9月油价高位运行的传导尚未完全体现在 CPI 里，这是本轮最难预判的一份数据',
      asym: '非对称性很强：超预期 → 加息锁定 + 长端收益率上冲，杀伤大；低于预期 → 只是一次情绪修复，因为长端的驱动已经不只是通胀'
    },

    { date: '10月中旬（待定）', tag: '公司事件', hi: 'md', t: 'Anthropic IPO 定价（目标估值 2 万亿美元）',
      w: '泄露的招股书草案显示公司寻求最高 2 万亿美元估值，同时警告先进 AI 可能对人类构成生存风险、亏损扩大。这将成为华尔街给 AI 龙头定价的新锚。同日 OpenAI 因安全问题搁置前沿模型发布、Oura 已中止 IPO。',
      a: '定价接近或超过目标 → 给整个 AI 板块重新定锚，硬件端受益；定价大幅缩水或延期 → AI 叙事裂缝扩大，而 AI 是当前唯一撑住指数的力量。<b>应对：</b>这是「叙事风险」而非「业绩风险」，重仓 AI 链条者应提前设定减仓线。',
      priced: '2万亿美元是招股书目标而非市场定价，尚未被二级市场消化',
      asym: '下行杀伤大于上行提振：Oura 中止 IPO 已说明长端收益率高企正在堵住融资窗口，若连头部 AI 公司都定价不顺，整个叙事会被重估'
    },

    { date: '10月21日（周三）', tag: '公司财报', hi: 'md', t: '特斯拉（TSLA）财报',
      w: '当前 PE 约 327 倍，是估值风险最集中的权重股之一，也是散户情绪的温度计。公司日前披露签署 200 亿美元三年期延迟提款定期贷款 + 80 亿美元五年期循环信贷 + 20 亿美元364天循环信贷的融资安排。',
      a: '不及预期 → 高估值成长股集体承压。<b>应对：</b>持有者提前设定止损位，不要用「信仰」代替纪律。',
      priced: 'PE 327 倍意味着预期已经打满，容错空间接近零',
      asym: '下行空间远大于上行——不及预期会拖累整个高估值成长板块'
    },

    { date: '10月27-28日（周二-周三）', tag: '政策会议', hi: 'hi', t: 'FOMC 利率决议',
      w: '9月加息 25bp 后的首场会议。今年只剩这次和 12 月两次会议——若 10 月跳过，12 月就是年底前最后一个干净窗口。18名提交预测的官员中 16 人预计年内至少再加一次。',
      a: '鹰派且暗示后续仍有空间 → 高收益率收紧流动性 → 杀估值。<b>应对：</b>会议前一周把仓位调到「无论结果如何都能接受」的水平，这是本清单最优先管理的一天。',
      priced: '10月加息概率已从约 70% 腰斩到约 50%，接近抛硬币。注意：会议前能拿到的经济数据相当有限，这也是概率变得模糊的原因之一',
      asym: '不确定性不在「加不加」而在「后续还有没有」：12月的点阵图与声明措辞比本次决议本身更重要'
    },

    { date: '11月3日（周二）', tag: '政治事件', hi: 'md', t: '美国中期选举（距今约34天）',
      w: '能源政策（SPR 释放、柴油出口禁令传闻）、对华关税执行节奏、财政走向都可能被选举周期工具化。目前30年房贷利率 7.58%、汽油均价约 4.48 美元/加仑（一年前 3.13 美元）、消费者信心跌至2014年以来最低——三重生活成本压力是选举季核心议题。',
      a: '政策可预测性下降 → 波动率易升难降。<b>应对：</b>选举前控制单一事件的敞口，比押方向更重要。',
      priced: '政策摇摆尚未被市场定价；伊朗官员已私下表示选前难达成协议，所以「选前无协议」反而是当前主流预期',
      asym: '任一党取得压倒性多数都会被解读为「政策可预测性上升」，反而是利好；反之若选前出现极端政策表态，控制单一事件敞口比押方向更重要'
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
        + '<div class="rng" style="margin-top:8px">' + freshTag(freshness(x.time)) + '</div>'
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
      vixScale(vix.value));

    var nlab = hvLabel(nd.percentile);
    s += gaugeCard('纳指恐慌度（NDX 已实现波动率 HV20）', nd.hv20, null,
      '用纳斯达克100近20个交易日的实际波动算出的年化波动率。VXN 无免费实时源，这里用同口径的已实现波动率代替，可与中证红利直接比较。',
      nlab, nd.percentile == null ? 50 : nd.percentile,
      '东方财富/新浪日K计算，截至 ' + esc(nd.asOf || '') + '，分位样本 ' + (nd.sample || '—') + ' 日');

    var clab = hvLabel(cd.percentile);
    s += gaugeCard('中证红利恐慌度（000922 已实现波动率 HV20）', cd.hv20, null,
      '中证红利指数近20个交易日的年化已实现波动率。红利资产本身波动就低，看它的分位比看绝对值更有意义。',
      clab, cd.percentile == null ? 50 : cd.percentile,
      '腾讯日K计算，截至 ' + esc(cd.asOf || '') + '，分位样本 ' + (cd.sample || '—') + ' 日');

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

  function gaugeCard(title, val, chg, desc, label, barPct, src, extra) {
    var col = 'var(--accent)';
    if (typeof val === 'number') col = val >= 25 ? 'var(--up)' : (val >= 15 ? 'var(--warn)' : 'var(--down)');
    return '<div class="card hoverable">'
      + '<div class="gauge">'
      + '<div><div class="val" style="color:' + col + '">' + (val == null ? '—' : fmt(val)) + '</div>'
      + '<div class="lbl">' + esc(title) + '</div></div>'
      + '<div style="margin-left:auto;text-align:right">'
      + '<span class="pill ' + (val >= 25 ? 'up' : val >= 15 ? 'warn' : 'down') + '">' + esc(label) + '</span>'
      + (chg != null ? '<div class="lbl" style="margin-top:4px">日变动 ' + pct(chg) + '</div>' : '')
      + '</div></div>'
      + (extra || '<div class="bar"><i style="width:' + Math.max(3, Math.min(100, barPct)) + '%;background:' + col + '"></i></div>')
      + '<div style="font-size:12.5px;color:var(--text-2);margin-top:9px">' + esc(desc) + '</div>'
      + '<div class="src">来源：' + esc(src) + '</div>'
      + '</div>';
  }

  /* VIX 专用：0-30 刻度条（<15 绿 / 15-20 黄 / >20 红） */
  function vixScale(v) {
    var p = Math.max(0, Math.min(100, (v == null ? 0 : v) / 30 * 100));
    return '<div class="scalebar"><div class="track">'
      + '<div class="knob" style="left:' + p.toFixed(1) + '%"></div></div>'
      + '<div class="ticks"><span>0</span><span>15</span><span>20</span><span>30+</span></div></div>';
  }

  function sessionLabel() {
    var t = M.indices && M.indices[0] ? M.indices[0].time : '';
    if (!t) return '市场状态 —';
    var d = new Date(t.replace(' ', 'T'));
    var day = d.getDay();
    if (day === 0 || day === 6) return '美股休市（周末）· 最近收盘 ' + t.slice(0, 10);
    return '最近成交 ' + t;
  }

  /* ---------------- 仓位建议引擎 ---------------- */
  function scoreMarket() {
    var vol = M.vol || {}, sc = 0, reasons = [];
    var vix = (vol.vix || {}).value;
    if (vix != null) {
      if (vix < 15) { sc += 2; reasons.push('VIX ' + fmt(vix) + '（&lt;15，市场情绪偏乐观）→ +2'); }
      else if (vix < 20) { reasons.push('VIX ' + fmt(vix) + '（15–20，中性）→ 0'); }
      else if (vix < 25) { sc -= 1; reasons.push('VIX ' + fmt(vix) + '（20–25，谨慎）→ −1'); }
      else { sc -= 2; reasons.push('VIX ' + fmt(vix) + '（&gt;25，恐慌）→ −2'); }
    }
    var nd = vol.ndx || {};
    if (nd.percentile != null) {
      if (nd.percentile < 30) { sc += 1; reasons.push('纳指波动分位 ' + nd.percentile + '%（低波动）→ +1'); }
      else if (nd.percentile > 70) { sc -= 1; reasons.push('纳指波动分位 ' + nd.percentile + '%（高波动）→ −1'); }
      else reasons.push('纳指波动分位 ' + nd.percentile + '%（中性）→ 0');
    }
    var ix = (M.indices || [])[0];
    if (ix && ix.high52 && ix.value) {
      var dist = (ix.high52 - ix.value) / ix.high52 * 100;
      if (dist < 2) { sc += 1; reasons.push('纳指距52周高点仅 ' + dist.toFixed(1) + '%（趋势强）→ +1'); }
      else if (dist > 5) { sc -= 1; reasons.push('纳指距52周高点 ' + dist.toFixed(1) + '%（趋势转弱）→ −1'); }
      else reasons.push('纳指距52周高点 ' + dist.toFixed(1) + '% → 0');
    }
    // 宏观项（来自人工核校的 macro.js）
    var ust = findMacro('ust10'), prob = findMacro('hike_prob');
    if (ust && parseFloat(ust.value) >= 5) { sc -= 1; reasons.push('10年期美债 ' + ust.value + '（≥5%，压制估值）→ −1'); }
    else if (ust && parseFloat(ust.value) < 4.5) { sc += 1; reasons.push('10年期美债 ' + ust.value + '（&lt;4.5%）→ +1'); }
    if (prob && parseFloat(prob.value) >= 60) { sc -= 1; reasons.push('10月加息概率 ' + prob.value + '（鹰派预期）→ −1'); }
    var oil = (M.commodities || []).filter(function (c) { return c.key === 'hf_OIL'; })[0];
    if (oil && oil.value >= 100) { sc -= 1; reasons.push('布伦特原油 ' + fmt(oil.value) + ' 美元（≥100，通胀压力）→ −1'); }
    else if (oil) { reasons.push('布伦特原油 ' + fmt(oil.value) + ' 美元 → 0'); }
    return { score: sc, reasons: reasons };
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
    if (gap == null) act = '尚未录入持仓。填入「总资产」与持仓后，这里会给出相对当前仓位的加减仓判断。';
    else if (gap > 5) act = '<b>建议加仓</b>：目标仓位 ' + pos.toFixed(0) + '%，当前约 ' + curPos.toFixed(0) + '%，缺口约 ' + gap.toFixed(0) + ' 个百分点。分 2–3 批执行，每批间隔至少一个交易日，不要一次性打满。';
    else if (gap < -5) act = '<b>建议减仓</b>：目标仓位 ' + pos.toFixed(0) + '%，当前约 ' + curPos.toFixed(0) + '%，需降低约 ' + Math.abs(gap).toFixed(0) + ' 个百分点。优先减「利率敏感 + 估值高 + 趋势转弱」的标的。';
    else act = '<b>维持现有仓位</b>：目标 ' + pos.toFixed(0) + '% 与当前约 ' + curPos.toFixed(0) + '% 接近，无需大动作，把精力放在个股筛选上。';

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
      + '<div class="fld"><label>风险偏好</label><select id="d-risk" onchange="App.setRisk(this.value)">'
      + ['conservative:保守型（控回撤优先）', 'balanced:平衡型', 'aggressive:进取型（能承受大波动）'].map(function (o) {
        var p = o.split(':'); return '<option value="' + p[0] + '"' + (risk === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
      }).join('') + '</select></div>'
      + '<div class="fld"><label>总资产（美元，用于算仓位）</label><input id="d-cap" type="number" value="' + esc(capital) + '" placeholder="如 100000" onchange="App.setCapital(this.value)"></div>'
      + '<div class="fld"><label>止损幅度（%）</label><input id="d-sl" type="number" value="' + LS.get('stopLoss', 12) + '" onchange="App.setNum(\'stopLoss\',this.value)"></div>'
      + '<div class="fld"><label>止盈幅度（%）</label><input id="d-tp" type="number" value="' + LS.get('takeProfit', 25) + '" onchange="App.setNum(\'takeProfit\',this.value)"></div>'
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

    /* 地球：懒加载（进入视口才初始化），不阻塞首屏；THREE 未就绪时轮询等待 */
    if (!globeInitPending && !globe) {
      globeInitPending = true;
      var secW = $('world');
      function startGlobe() {
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
        if (typeof window.THREE !== 'undefined') { build(); return; }
        $('globe-note') && ($('globe-note').textContent = '地球组件加载中…');
        var tries = 0;
        var iv = setInterval(function () {
          tries++;
          if (typeof window.THREE !== 'undefined') { clearInterval(iv); build(); }
          else if (tries > 20) { clearInterval(iv); build(); } /* 超时 → 降级 2D */
        }, 250);
      }
      if (window.IntersectionObserver) {
        var io = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); startGlobe(); }
        }, { rootMargin: '300px 0px' });
        io.observe(secW);
      } else { startGlobe(); }
    }

    /* 默认展示第一条高影响事件详情 */
    if (!$('evt-detail').innerHTML) {
      var first = items.slice().sort(function (a, b) { return b.level - a.level; })[0];
      if (first) showEvent(first.id);
    }
  }

  function showEvent(id) {
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
    if ($('evt-detail').scrollIntoView) {
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
    btn.onclick = function () {
      var c = body.classList.toggle('collapsed');
      btn.textContent = c ? '展开' : '收起';
    };
    hd.appendChild(btn);
  }

  /* ---------------- 导航高亮 ---------------- */
  function navSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-in a'));
    var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var i = secs.indexOf(en.target);
          if (i >= 0) {
            links.forEach(function (a) { a.classList.remove('on'); });
            links[i].classList.add('on');
          }
        });
      }, { rootMargin: '-60px 0px -70% 0px', threshold: 0 });
      secs.forEach(function (s) { if (s) io.observe(s); });
    }
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    if (!M.asOf) {
      document.querySelector('.wrap').insertAdjacentHTML('afterbegin',
        '<div class="callout risk">未读到行情数据。请在项目目录运行 <code>python3 refresh.py</code> 生成 data/market.js。</div>');
    }
    initTheme();
    initView();
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
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
