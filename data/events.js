window.WORLD_EVENTS = {
  asOf: "2026-11-24",
  note: "黄仁勋复职引爆纳指100单日+6.86%；三艘油轮触雷但布油创三月新低；CME加息回到95.1%；中美芯片分层。(11-24)",

  items: [
  {
    id: "hormuz",
    title: "三艘油轮在霍尔木兹触雷，伊朗称七项条件前收紧海峡",
    type: "conflict",
    region: "中东 · 霍尔木兹海峡",
    date: "起 2026-09-24 ｜ 更新 11-24",
    updated: "2026-11-24",
    summary: "11-24凌晨革命卫队称3艘油轮触雷起火，事发时美军护航；伊朗陆军称七项条件不落实就进一步收紧海峡。卡塔尔首相赴华盛顿促谈。(腾讯/财联社11-24)",
    why: "海峡没开、袭船没停，但油价反跌破90，过剩压过地缘。",
    watch: "1遇袭船数与通航量；2卡塔尔斡旋时间表；3特朗普是否新年后再打。",
    reverse: "伊朗外长称若美方履行承诺，通航可最短时间恢复；特朗普也未立即动手。",
    verify: "布油站95说明溢价回来；跌破85确认过剩。",
    lat: 26.57, lon: 56.25, level: 5,
    chain: [
      {
        step: "三船触雷(11-24)",
        text: "革命卫队称美军护航期间3艘油轮爆炸起火。"
      },
      {
        step: "伊朗收紧条件(11-23~24)",
        text: "七项条件前不开放海峡，且进一步收紧。"
      }
    ],
    assets: [
      { name: "布伦特原油", dir: "flat", note: "89.37（11-23收-3.46%）" },
      { name: "WTI原油", dir: "flat", note: "80.17（-3.88%）" },
      { name: "COMEX黄金", dir: "up", note: "3634.4（11-23收+3.39%）" }
    ],
    sources: [
      { name: "腾讯新闻（11-24）：3艘油轮触雷", url: "https://news.qq.com/rain/a/20261124A04KWC00", time: "2026-11-24" },
      { name: "财联社/腾讯（11-24）：伊朗收紧海峡、卡塔尔促谈", url: "https://news.qq.com/rain/a/20261124A0DWZV00", time: "2026-11-24" },
      { name: "新浪财经（11-24）：议长称重开条件", url: "https://finance.sina.cn/2026-11-24/detail-inizvuzi4786727.d.html", time: "2026-11-24" },
      { name: "FX168/腾讯（11-24）：海峡通航条件", url: "https://new.qq.com/rain/a/20261124A05Z6X00", time: "2026-11-24" }
    ]
  },
  {
    id: "fed",
    title: "CME加息概率回到95.1%，财长警告过度紧缩",
    type: "macro",
    region: "美国 · 货币政策",
    date: "起 2026-09-24 ｜ 更新 11-24",
    updated: "2026-11-24",
    summary: "11-23 CME：12月加25bp早间91.4%、盘后95.1%，维持不变4.8%，1月累计加50bp57.7%。威廉姆斯称通胀仍过高；贝森特反对过度收紧。(财联社/澎湃11-23)",
    why: "方向确定、幅度仍有分歧；短端已把加息计入价格。",
    watch: "1 11-25 PCE核心环比；2 12-09 FOMC；3加50bp概率破10%。",
    reverse: "高盛认为关税、能源与AI通胀消退后，2027年可转向降息。",
    verify: "核心PCE环比回0.2%减压；12月加50bp属超预期。",
    lat: 38.9, lon: -77.04, level: 4,
    chain: [
      {
        step: "CME读数抬升(11-23)",
        text: "91.4%升至95.1%，反弹后加息押注不降反升。"
      },
      {
        step: "官员与财长分歧",
        text: "威廉姆斯偏鹰；贝森特警告政策错误，高盛看2027年末降息。"
      }
    ],
    assets: [
      { name: "10年期美债", dir: "flat", note: "4.942%（11-23收）" },
      { name: "2年期美债", dir: "up", note: "4.685%（+4.48bp）" },
      { name: "COMEX黄金", dir: "up", note: "3634.4（+3.39%）" }
    ],
    sources: [
      { name: "中国基金报（11-23）：CME报91.4%", url: "https://www.chnfund.com/article/22cc415b-bcc6-7279-53fd-3a2517766f7c", time: "2026-11-23" },
      { name: "澎湃（11-23）：CME升至95.1%、威廉姆斯讲话", url: "https://m.thepaper.cn/newsDetail_forward_34544868", time: "2026-11-23" },
      { name: "证券时报/网易（11-23）：贝森特警告、高盛预测", url: "https://www.163.com/dy/article/LCEN7B5R053469RG.html", time: "2026-11-23" }
    ]
  },
  {
    id: "bonds",
    title: "美债短端升长端降，10年期收在4.942%",
    type: "macro",
    region: "美国 · 债券市场",
    date: "起 2026-09-24 ｜ 更新 11-24",
    updated: "2026-11-24",
    summary: "11-23收盘：2Y4.685%(+4.48bp)、10Y4.942%(-0.21bp)、30Y5.305%(-2.5bp)。短端定价加息，长端在4.9%~5.3%区间横住。(新华财经11-24)",
    why: "曲线变陡：加息预期压前端，避险与绝对收益率托住长端。",
    watch: "1 10Y守4.8%；2 2-10利差约+26bp；3 11-25 PCE。",
    reverse: "摩根大通预计12月、2027年1月和3月连加三次；长端上行压力仍在。",
    verify: "10Y重上5.1%则成长股压力再起；跌破4.8%减压。",
    lat: 40.71, lon: -74.0, level: 4,
    chain: [
      {
        step: "短端上行(11-23)",
        text: "2Y升4.48bp，加息预期重新加价。"
      },
      {
        step: "长端微降",
        text: "10Y、30Y小幅走低，避险资金承接。"
      }
    ],
    assets: [
      { name: "2年期美债", dir: "up", note: "4.685%（+4.48bp）" },
      { name: "10年期美债", dir: "down", note: "4.942%（-0.21bp）" },
      { name: "30年期美债", dir: "down", note: "5.305%（-2.5bp）" }
    ],
    sources: [
      { name: "新华财经（11-24）：美债收益率分化", url: "https://www.cnfin.com/zs-lb/detail/20261124/4499347_1.html", time: "2026-11-24" },
      { name: "国际金融报（11-24）：11-23收盘收益率", url: "https://www.ifnews.com/news.html?aid=888773&cid=49", time: "2026-11-24" }
    ]
  },
  {
    id: "ainarrative",
    title: "黄仁勋复职，纳指100单日涨6.86%",
    type: "macro",
    region: "全球 · 半导体/AI",
    date: "起 2026-10-08 ｜ 更新 11-24",
    updated: "2026-11-24",
    summary: "11-23英伟达董事会恢复黄仁勋CEO职务；英伟达收165.05美元涨31.48%、市值单日增9520亿美元。NDX收26746.10(+6.86%)、标普+4.73%、VIX收26.62(-25.8%)。(中新经纬/澎湃11-24)",
    why: "上周纳指跌10%后龙头回归触发逼空；NDX仍低于28800差7.7%。",
    watch: "1反弹能否连续3天；2 SOXX守136.98；3 12-03听证会。",
    reverse: "空头单日亏约122亿美元，涨幅含逼空成分；SPY仍在200日线下。",
    verify: "NDX收站28800且VIX回18下才确认；破25028则反弹失败。",
    lat: 37.39, lon: -122.08, level: 5,
    chain: [
      {
        step: "黄仁勋复职(11-23)",
        text: "董事会一致投票；特朗普称决定正确。"
      },
      {
        step: "AI链全线反弹",
        text: "费半+14.03%、美光+19.04%、英特尔+16.34%。"
      }
    ],
    assets: [
      { name: "英伟达", dir: "up", note: "165.05（+31.48%）" },
      { name: "SOXX", dir: "up", note: "140.22（+13.63%）" },
      { name: "纳斯达克100", dir: "up", note: "26746.10（+6.86%）" }
    ],
    sources: [
      { name: "中新经纬（11-24）：美股收盘与英伟达公告", url: "https://www.jwview.com/jingwei/html/11-24/698178.shtml", time: "2026-11-24" },
      { name: "澎湃（11-24）：黄仁勋回归引爆反弹", url: "https://m.thepaper.cn/newsDetail_forward_34544386", time: "2026-11-24" },
      { name: "金融界/网易（11-24）：空头亏损与个股涨幅", url: "https://www.163.com/dy/article/LCGOMLAA0519QIKK.html", time: "2026-11-24" },
      { name: "Dean Financials（11-23）：VIX收26.62", url: "https://deanfi.com/insights/marketpulse/2026-11-23", time: "2026-11-23" }
    ]
  },
  {
    id: "xitrump",
    title: "特朗普称只卖较旧芯片，中方重申出口管制立场",
    type: "talk",
    region: "北美/亚太 · 经贸",
    date: "起 2026-09-24 ｜ 更新 11-24",
    updated: "2026-11-24",
    summary: "11-23外交部回应特朗普「只向中国出售相对落后芯片」说法，称立场已表明。11-19川习会未签新协议、关税暂缓未延；路透核查称大豆承诺按期，其他农产品只交付一小部分。",
    why: "芯片议题从卖不卖变成卖哪一档；降税清单仍未落地。",
    watch: "1 12月G20；2降税清单；3农业工作组会期。",
    reverse: "双方经贸团队保持沟通，农业工作组即将开会。",
    verify: "G20敲定延期或降税落地则悬崖解除；芯片加码则善意落空。",
    lat: 38.9, lon: -77.04, level: 4,
    chain: [
      {
        step: "芯片分层表态(11-23)",
        text: "美方称只卖旧款，中方未确认采购安排。"
      },
      {
        step: "履约分化(11-21)",
        text: "大豆按计划，其他农产品交付慢。"
      }
    ],
    assets: [
      { name: "纳斯达克中国金龙", dir: "up", note: "+2.44%（11-23）" },
      { name: "301关税豁免", dir: "flat", note: "延至2027-01-10" },
      { name: "美芯片出口新规", dir: "flat", note: "11-19生效" }
    ],
    sources: [
      { name: "澎湃（11-23）：外交部回应芯片表态", url: "https://www.thepaper.cn/newsDetail_forward_34539513", time: "2026-11-23" },
      { name: "腾讯/长安街知事（11-23）：外交部例行记者会", url: "https://news.qq.com/rain/a/20261124A04KKC00", time: "2026-11-23" },
      { name: "搜狐/路透（11-21）：农产品履约核查", url: "https://www.sohu.com/a/1105162180_122986144", time: "2026-11-21" },
      { name: "新华财经（11-22）：经贸与芯片管制周报", url: "https://finance.eastmoney.com/a/202611223936919672.html", time: "2026-11-22" }
    ]
  }
  ]
};
