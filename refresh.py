#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
美股投资跟踪台 - 数据刷新脚本
================================
抓取行情 / 波动率 / 宏观指标 / 个股技术面，产出 data/market.js（可被 <script src> 直接引入，
因此在 file:// 双击打开 index.html 时也能读到最新数据，不受 CORS 限制）。

用法：
    python3 refresh.py            # 抓取并写入 data/market.js
    python3 refresh.py --dry      # 只打印不写文件

可挂定时任务（美股收盘后 + 盘前各一次）：
    30 16 * * 1-5  python3 /abs/path/refresh.py
    30 20 * * 1-5  python3 /abs/path/refresh.py

数据源与口径（全部免费、无需 API key）：
  1. 腾讯 qt.gtimg.cn      指数/个股/商品快照（GBK 编码）
  2. 新浪 hq.sinajs.cn     VIX 恐慌指数（腾讯的 usVIX 长期不更新，已弃用）
  3. 东方财富 push2his     日K（美股 secid=105.XXX / 106.XXX，指数 100.NDX，A股 1.000922）
  4. 东方财富 push2        美元指数 100.UDI

关于「纳指恐慌指数」与「中证红利恐慌指数」：
  VXN（CBOE 纳指100波动率指数）与中证红利对应的隐含波动率指数均无免费实时源
  （CBOE 官方 CSV 被 Cloudflare 拦截、Yahoo/Stlooq 已失效、新浪无对应代码）。
  本脚本改用**同一套可复现口径**计算两个市场的恐慌度：
      HV20 = 近20个交易日日收益标准差 × sqrt(252) × 100（年化已实现波动率）
      HV60 = 近60个交易日
      分位 = 当前 HV20 在过去 250 个交易日 HV20 序列中的百分位
  纳指用 NDX（纳指100，与 VXN 标的对应），中证红利用 000922.SH。
  两个数因此可以直接横向比较，不掺杂第三方加工。
"""

import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta

HERE = __file__.rsplit("/", 1)[0]
OUT = HERE + "/data/market.js"
DRY = "--dry" in sys.argv

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
CST = timezone(timedelta(hours=8))


def now_cst():
    return datetime.now(CST).strftime("%Y-%m-%d %H:%M:%S")


def _curl(url, referer, timeout=25):
    """curl 兜底：东财部分接口会拒绝 urllib 的 TLS 指纹（RemoteDisconnected），
    但同样的 URL 用 curl 正常。返回 bytes，失败返回 b''。"""
    import subprocess
    cmd = ["curl", "-s", "--max-time", str(timeout), "-A", UA]
    if referer:
        cmd += ["-e", referer]
    cmd += [url]
    try:
        p = subprocess.run(cmd, capture_output=True, timeout=timeout + 8)
        return p.stdout
    except Exception:
        return b""


def get(url, referer=None, decode="utf-8", timeout=25, retries=3):
    """东财对连续请求敏感（会直接断连），失败后退避重试；urllib 被拒时改用 curl。"""
    for i in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA, "Accept": "*/*",
                "Accept-Encoding": "identity", "Connection": "close",
            })
            if referer:
                req.add_header("Referer", referer)
            raw = urllib.request.urlopen(req, timeout=timeout).read()
            return raw.decode(decode, errors="ignore")
        except Exception as e:  # noqa
            raw = _curl(url, referer, timeout)
            if raw:
                return raw.decode(decode, errors="ignore")
            if i == retries:
                print(f"  [warn] fetch failed: {url[:80]} -> {e}")
                return ""
            time.sleep(1.5 * (i + 1))
    return ""


# --------------------------------------------------------------------------
# 1. 腾讯快照
# --------------------------------------------------------------------------
def tencent_quote(codes):
    """返回 {code: [fields...]}，字段按 ~ 分隔"""
    url = "https://qt.gtimg.cn/q=" + ",".join(codes)
    txt = get(url, decode="gbk")
    out = {}
    for m in re.finditer(r'v_([A-Za-z0-9_]+)="([^"]*)"', txt):
        code, body = m.group(1), m.group(2)
        if not body.strip():
            continue
        # 外盘期货/商品(hf_ 前缀)是逗号分隔，与股票/指数的 ~ 分隔不同
        out[code] = body.split(",") if code.startswith("hf_") else body.split("~")
    return out


def fnum(v, default=None):
    try:
        return float(v)
    except Exception:
        return default


# --------------------------------------------------------------------------
# 2. 新浪 VIX
# --------------------------------------------------------------------------
def sina_vix():
    txt = get("https://hq.sinajs.cn/list=znb_VIX", referer="https://finance.sina.com.cn", decode="gbk")
    m = re.search(r'hq_str_znb_VIX="([^"]*)"', txt)
    if not m or not m.group(1).strip():
        return None
    p = m.group(1).split(",")
    # VIX恐慌指数,现值,涨跌额,涨跌幅,,,日期,时间,昨收,今开,最高,最低,...
    return {
        "value": fnum(p[1]),
        "chg": fnum(p[2]),
        "pct": fnum(p[3]),
        "date": p[6] if len(p) > 6 else "",
        "time": p[7] if len(p) > 7 else "",
        "prev": fnum(p[8]) if len(p) > 8 else None,
        "high": fnum(p[10]) if len(p) > 10 else None,
        "low": fnum(p[11]) if len(p) > 11 else None,
    }


# --------------------------------------------------------------------------
# 3. 东财日K
# --------------------------------------------------------------------------
def sina_kline(symbol, days=320):
    """新浪美股日K（个股用 AAPL，指数用 .NDX / .IXIC / .DJI / .INX）。
    实测比东财 push2his 稳定得多——东财会随机断连。"""
    url = ("https://stock.finance.sina.com.cn/usstock/api/jsonp.php/x/"
           f"US_MinKService.getDailyK?symbol={urllib.parse.quote(symbol)}")
    txt = get(url, referer="https://finance.sina.com.cn/")
    m = re.search(r"x\((\[.*\])\);", txt, re.S)
    if not m:
        return []
    try:
        arr = json.loads(m.group(1))
    except Exception:
        return []
    rows = []
    for it in arr[-days:]:
        rows.append({
            "date": it.get("d"), "open": fnum(it.get("o")), "close": fnum(it.get("c")),
            "high": fnum(it.get("h")), "low": fnum(it.get("l")),
            "volume": fnum(it.get("v")), "amount": fnum(it.get("a")) or None,
        })
    return [r for r in rows if r["close"] is not None]


def tencent_kline(code, days=320):
    """A股指数/个股日K（腾讯 fqkline，前复权）"""
    url = f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,,,{days},qfq"
    txt = get(url)
    try:
        node = json.loads(txt)["data"][code]
        arr = node.get("qfqday") or node.get("day") or []
    except Exception:
        return []
    rows = []
    for it in arr:
        rows.append({
            "date": it[0], "open": fnum(it[1]), "close": fnum(it[2]),
            "high": fnum(it[3]), "low": fnum(it[4]),
            "volume": fnum(it[5]) if len(it) > 5 else None,
            "amount": fnum(it[6]) if len(it) > 6 else None,
        })
    return [r for r in rows if r["close"] is not None]


def em_kline(secid, days=260):
    """东财日K，作为备胎（偶发断连，已加重试）"""
    time.sleep(0.35)
    url = ("https://push2his.eastmoney.com/api/qt/stock/kline/get?"
           f"secid={secid}&klt=101&fqt=1&lmt={days}&end=20500101"
           "&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57")
    txt = get(url, referer="https://quote.eastmoney.com/")
    try:
        d = json.loads(txt)
        kl = (d.get("data") or {}).get("klines") or []
    except Exception:
        return []
    rows = []
    for line in kl:
        p = line.split(",")
        if len(p) < 5:
            continue
        rows.append({
            "date": p[0],
            "open": fnum(p[1]), "close": fnum(p[2]),
            "high": fnum(p[3]), "low": fnum(p[4]),
            "volume": fnum(p[5]) if len(p) > 5 else None,
            "amount": fnum(p[6]) if len(p) > 6 else None,
        })
    return rows


def kline(kind, key, days=320):
    """统一入口：('us', 'AAPL') / ('us', '.NDX') / ('cn', 'sh000922')"""
    if kind == "us":
        rows = sina_kline(key, days)
        if len(rows) >= 25:
            return rows
        return em_kline("105." + key if not key.startswith(".") else "100." + key[1:], days)
    rows = tencent_kline(key, days)
    if len(rows) >= 25:
        return rows
    return em_kline(("1." if key.startswith("sh") else "0.") + key[2:], days)


def sma(arr, n):
    if len(arr) < n:
        return None
    return sum(arr[-n:]) / n


def rsi(closes, n=14):
    if len(closes) < n + 1:
        return None
    gains, losses = [], []
    for i in range(1, len(closes)):
        d = closes[i] - closes[i - 1]
        gains.append(max(d, 0.0))
        losses.append(max(-d, 0.0))
    gains, losses = gains[-n:], losses[-n:]
    ag, al = sum(gains) / n, sum(losses) / n
    if al == 0:
        return 100.0
    rs = ag / al
    return 100 - 100 / (1 + rs)


def realized_vol(closes, n):
    """年化已实现波动率 %"""
    if len(closes) < n + 1:
        return None
    seg = closes[-(n + 1):]
    rets = [math.log(seg[i] / seg[i - 1]) for i in range(1, len(seg)) if seg[i - 1] > 0]
    if len(rets) < 2:
        return None
    mu = sum(rets) / len(rets)
    var = sum((r - mu) ** 2 for r in rets) / (len(rets) - 1)
    return round(math.sqrt(var) * math.sqrt(252) * 100, 2)


def hv_percentile(closes, win=20, lookback=250):
    """当前 HV20 在过去 lookback 日 HV20 序列中的分位（0-100）"""
    seq = []
    for end in range(len(closes) - win, max(len(closes) - lookback - win, win), -1):
        if end < win:
            break
        v = realized_vol(closes[:end + 1], win)
        if v is not None:
            seq.append(v)
    if len(seq) < 30:
        return None, len(seq)
    cur = seq[0]
    below = sum(1 for v in seq if v < cur)
    return round(below / len(seq) * 100, 1), len(seq)


def tech_from_kline(rows):
    """从日K计算技术面：均线 / RSI / 支撑压力 / 波动率 / 区间位置"""
    if len(rows) < 25:
        return None
    closes = [r["close"] for r in rows]
    last = closes[-1]
    ma5, ma10, ma20, ma60 = sma(closes, 5), sma(closes, 10), sma(closes, 20), sma(closes, 60)
    win20 = rows[-20:]
    hi20 = max(r["high"] for r in win20)
    lo20 = min(r["low"] for r in win20)
    hi52 = max(r["high"] for r in rows[-min(len(rows), 250):])
    lo52 = min(r["low"] for r in rows[-min(len(rows), 250):])
    pos52 = (last - lo52) / (hi52 - lo52) * 100 if hi52 > lo52 else None
    # 成交额/量能：近5日均量 vs 近20日均量
    v5 = [r["volume"] for r in rows[-5:] if r.get("volume")]
    v20 = [r["volume"] for r in rows[-20:] if r.get("volume")]
    vol_ratio = (sum(v5) / len(v5)) / (sum(v20) / len(v20)) if v5 and v20 and sum(v20) else None
    return {
        "date": rows[-1]["date"],
        "close": round(last, 4),
        "ma5": round(ma5, 2) if ma5 else None,
        "ma10": round(ma10, 2) if ma10 else None,
        "ma20": round(ma20, 2) if ma20 else None,
        "ma60": round(ma60, 2) if ma60 else None,
        "rsi14": round(rsi(closes), 1),
        "high20": round(hi20, 2),
        "low20": round(lo20, 2),
        "high52": round(hi52, 2),
        "low52": round(lo52, 2),
        "pos52": round(pos52, 1) if pos52 is not None else None,
        "hv20": realized_vol(closes, 20),
        "hv60": realized_vol(closes, 60),
        "volRatio5v20": round(vol_ratio, 2) if vol_ratio else None,
        "trend": trend_label(last, ma5, ma10, ma20, ma60),
    }


def trend_label(px, ma5, ma10, ma20, ma60):
    vals = [v for v in (ma5, ma10, ma20, ma60) if v]
    if len(vals) < 3:
        return "数据不足"
    above = sum(1 for v in vals if px > v)
    if above == len(vals) and ma5 and ma20 and ma5 > ma20:
        return "多头排列"
    if above == 0 and ma5 and ma20 and ma5 < ma20:
        return "空头排列"
    if above >= len(vals) - 1:
        return "偏强震荡"
    if above <= 1:
        return "偏弱震荡"
    return "均线纠缠"


# --------------------------------------------------------------------------
# 4. 主流程
# --------------------------------------------------------------------------
# 默认自选池：可自行在 index.html 里增删，也可改这里
DEFAULT_WATCH = [
    ("AAPL", "苹果", "105.AAPL"),
    ("NVDA", "英伟达", "105.NVDA"),
    ("MSFT", "微软", "105.MSFT"),
    ("GOOGL", "谷歌A", "105.GOOGL"),
    ("AMZN", "亚马逊", "105.AMZN"),
    ("META", "Meta", "105.META"),
    ("TSLA", "特斯拉", "105.TSLA"),
    ("AVGO", "博通", "105.AVGO"),
]

INDEX_DEFS = [
    ("usIXIC", "纳斯达克综合", "科技成长风向标，对利率最敏感"),
    ("usDJI", "道琼斯工业", "传统价值蓝筹，防御属性更强"),
    ("usINX", "标普500", "美股整体基准，机构业绩比较基准"),
]


# 资金关注度榜的候选池：主流美股 + 主要中概股。
# 说明：东财 clist 全市场排行虽好，但对连续请求极其敏感（常被断连），
# 因此这里改为「主流股池内按成交额排名」——腾讯一口气管 50+ 只，稳定且不漏主流标的。
HOT_POOL = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO",
    "AMD", "INTC", "MU", "QCOM", "TXN", "ARM", "SMCI", "SNDK",
    "ORCL", "CRM", "ADBE", "NOW", "IBM", "SNOW", "PLTR",
    "JPM", "BAC", "WFC", "GS", "MS", "C", "V", "MA",
    "UNH", "JNJ", "LLY", "PFE", "MRK", "ABBV",
    "XOM", "CVX", "COP", "SLB",
    "WMT", "COST", "HD", "MCD", "NKE", "SBUX", "DIS",
    "BA", "CAT", "GE", "HON",
    "NFLX", "COIN", "UBER", "ABNB",
    "BABA", "PDD", "JD", "BIDU", "NTES"
]


def hot_rank(limit=10):
    """资金关注度榜：主流股池内按成交额降序。
    成交额是真金白银堆出来的注意力，比「搜索热度」更难造假、更可验证。"""
    q = tencent_quote(["us" + t for t in HOT_POOL])
    rows = []
    for t in HOT_POOL:
        f = q.get("us" + t)
        if not f or len(f) < 40:
            continue
        amt = fnum(f[37])
        if not amt:
            continue
        rows.append({
            "ticker": t, "name": f[1], "price": fnum(f[3]),
            "pct": fnum(f[32]), "amount": amt,
        })
    rows.sort(key=lambda x: -(x["amount"] or 0))
    top = rows[:limit]
    if top:
        print("  TOP3: " + ", ".join("%s %.0f亿" % (o["ticker"], o["amount"] / 1e8) for o in top[:3]))
    return top


def build():
    print("→ 抓取指数快照 ...")
    idx_codes = [c for c, _, _ in INDEX_DEFS] + ["sh000922", "sh000300"]
    q = tencent_quote(idx_codes)

    indices = []
    for code, name, desc in INDEX_DEFS:
        f = q.get(code)
        if not f or len(f) < 35:
            continue
        indices.append({
            "key": code, "name": name, "desc": desc,
            "value": fnum(f[3]), "prev": fnum(f[4]), "open": fnum(f[5]),
            "chg": fnum(f[31]), "pct": fnum(f[32]),
            "high": fnum(f[33]), "low": fnum(f[34]),
            "high52": fnum(f[48]), "low52": fnum(f[49]),
            "time": f[30], "currency": f[35],
        })

    csi = q.get("sh000922")
    csi_div = None
    if csi and len(csi) > 35:
        csi_div = {
            "key": "000922", "name": "中证红利", "desc": "A股高股息资产，防御 / 红利风格代表",
            "value": fnum(csi[3]), "prev": fnum(csi[4]), "open": fnum(csi[5]),
            "chg": fnum(csi[31]), "pct": fnum(csi[32]),
            "high": fnum(csi[33]), "low": fnum(csi[34]),
            "time": csi[30],
        }
        h52, l52 = fnum(csi[48]) if len(csi) > 48 else None, fnum(csi[49]) if len(csi) > 49 else None
        if h52 and l52 and h52 > l52:  # A股指数快照的这两个位不是52周高低，需过滤
            csi_div["high52"], csi_div["low52"] = h52, l52

    print("→ 抓取 VIX ...")
    vix = sina_vix()

    print("→ 抓取商品与美元指数 ...")
    cm = tencent_quote(["hf_CL", "hf_OIL", "hf_GC", "hf_SI", "hf_CAD", "hf_HG"])
    def commodity(code, label, unit):
        f = cm.get(code)
        if not f:
            return None
        # 现价,涨跌幅%,买价,卖价,最高,最低,时间,昨收,今开,...,日期,名称
        return {
            "key": code, "name": label, "unit": unit,
            "value": fnum(f[0]), "pct": fnum(f[1]),
            "high": fnum(f[4]), "low": fnum(f[5]),
            "time": f[6], "date": f[12] if len(f) > 12 else "",
        }
    commodities = [x for x in [
        commodity("hf_OIL", "布伦特原油", "美元/桶"),
        commodity("hf_CL", "WTI原油", "美元/桶"),
        commodity("hf_GC", "COMEX黄金", "美元/盎司"),
        commodity("hf_SI", "COMEX白银", "美元/盎司"),
        commodity("hf_CAD", "LME铜", "美元/吨"),
        commodity("hf_HG", "COMEX铜", "美分/磅"),
    ] if x]

    # 加密资产（风险偏好温度计）：新浪 btc_ 系列，只有现价/日内高低，无 24h 基准价
    ctxt = get("https://hq.sinajs.cn/list=btc_btcbtcusd,btc_btcethusd",
               referer="https://finance.sina.com.cn", decode="gbk")
    crypto = []
    for key, label in [("btc_btcbtcusd", "比特币 BTC"), ("btc_btcethusd", "以太坊 ETH")]:
        m = re.search(r'hq_str_' + key + r'="([^"]*)"', ctxt)
        if not m or not m.group(1).strip():
            continue
        p = m.group(1).split(",")
        v = fnum(p[3])
        if v:
            crypto.append({"key": key, "name": label, "value": v,
                           "high": fnum(p[6]), "low": fnum(p[7]),
                           "date": p[11] if len(p) > 11 else "",
                           "note": "数据源未提供 24h 基准价，故不计算涨跌幅"})

    dxy = None
    # 主源新浪 DINIW（东财 push2 偶发断连，作为备胎）
    txt = get("https://hq.sinajs.cn/list=DINIW", referer="https://finance.sina.com.cn", decode="gbk")
    m = re.search(r'hq_str_DINIW="([^"]*)"', txt)
    if m and m.group(1).strip():
        p = m.group(1).split(",")
        try:
            v, prev = fnum(p[1]), fnum(p[3])
            dxy = {"name": "美元指数", "value": round(v, 2), "prev": prev,
                   "chg": round(v - prev, 2), "pct": round((v - prev) / prev * 100, 2),
                   "high": fnum(p[6]), "low": fnum(p[7]),
                   "time": p[0] if p[0] else "", "date": p[10] if len(p) > 10 else ""}
        except Exception:
            dxy = None
    if not dxy:
        txt = get("https://push2.eastmoney.com/api/qt/stock/get?secid=100.UDI&fields=f43,f58,f169,f170",
                  referer="https://quote.eastmoney.com/")
        try:
            d = json.loads(txt).get("data") or {}
            if d.get("f43"):
                dxy = {"name": "美元指数", "value": round(d["f43"] / 100, 2),
                       "chg": round((d.get("f169") or 0) / 100, 2),
                       "pct": round((d.get("f170") or 0) / 100, 2)}
        except Exception:
            pass

    print("→ 计算波动率（纳指100 / 中证红利）...")
    vol = {"vix": vix}
    for label, kind, key in [("ndx", "us", ".NDX"), ("csi922", "cn", "sh000922")]:
        rows = kline(kind, key, 300)
        if len(rows) < 30:
            print(f"  [warn] {label} 日K不足")
            continue
        closes = [r["close"] for r in rows]
        hv20 = realized_vol(closes, 20)
        hv60 = realized_vol(closes, 60)
        pct, n = hv_percentile(closes, 20, 250)
        vol[label] = {
            "hv20": hv20, "hv60": hv60,
            "percentile": pct, "sample": n,
            "asOf": rows[-1]["date"],
            "closes": [round(c, 2) for c in closes[-60:]],  # 供迷你走势图
        }
        print(f"  {label}: HV20={hv20} HV60={hv60} 分位={pct}% (样本{n})")

    print("→ 抓取自选股 ...")
    codes = ["us" + t for t, _, _ in DEFAULT_WATCH]
    sq = tencent_quote(codes)
    stocks = []
    for ticker, cn, secid in DEFAULT_WATCH:
        f = sq.get("us" + ticker)
        if not f or len(f) < 50:
            continue
        rows = kline("us", ticker, 300)
        base = {
            "ticker": ticker, "name": cn, "secid": secid,
            "value": fnum(f[3]), "prev": fnum(f[4]), "open": fnum(f[5]),
            "chg": fnum(f[31]), "pct": fnum(f[32]),
            "high": fnum(f[33]), "low": fnum(f[34]),
            "amount": fnum(f[37]),
            "pe": fnum(f[39]), "eps": fnum(f[47]),
            "high52": fnum(f[48]), "low52": fnum(f[49]),
            "mktcap": fnum(f[45]),  # 亿美元
            "time": f[30],
        }
        t = tech_from_kline(rows)
        if t:
            base["tech"] = t
        stocks.append(base)
        print(f"  {ticker}: {base['value']} ({base['pct']}%) PE={base['pe']} "
              f"趋势={t['trend'] if t else 'n/a'}")

    print("→ 抓取资金关注度榜（成交额排行）...")
    hot = hot_rank(10)

    print("→ 抓取指数日K（用于迷你走势图）...")
    series = {}
    for code, kind, key in [("usIXIC", "us", ".IXIC"), ("sh000922", "cn", "sh000922"),
                            ("usDJI", "us", ".DJI"), ("usINX", "us", ".INX")]:
        rows = kline(kind, key, 90)
        if rows:
            series[code] = [{"d": r["date"], "c": round(r["close"], 2)} for r in rows[-60:]]

    return {
        "asOf": now_cst(),
        "indices": indices,
        "csiDividend": csi_div,
        "vol": vol,
        "commodities": commodities,
        "crypto": crypto,
        "dxy": dxy,
        "stocks": stocks,
        "hot": hot,
        "series": series,
        "sources": [
            {"name": "腾讯财经行情（指数/个股/商品快照）", "url": "https://qt.gtimg.cn/"},
            {"name": "新浪财经（VIX 恐慌指数）", "url": "https://finance.sina.com.cn"},
            {"name": "东方财富（日K/美元指数）", "url": "https://quote.eastmoney.com/"},
        ],
    }


def main():
    print(f"=== 美股投资跟踪台 数据刷新 {now_cst()} ===")
    data = build()
    js = ("// 自动生成，请勿手改。运行 `python3 refresh.py` 重新抓取。\n"
          "window.MARKET_DATA = " +
          json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
    if DRY:
        print(js[:2000])
        print("...(dry run, 未写文件)")
        return
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(js)
    print(f"✓ 已写入 {OUT}  ({len(js) / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
