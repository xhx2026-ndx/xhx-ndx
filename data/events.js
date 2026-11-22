window.WORLD_EVENTS = {
  asOf: "2026-11-23",
  note: "特朗普改口要永久协议、伊朗称两天方案可缩时；加息概率两个口径打架；AI抛售扩散日韩；中方批美FCC打压电信企业。(11-23)",

  items: [
  {
    id: "hormuz",
    title: "11-21美伊都要谈，但海峡三天内12艘船触雷",
    type: "conflict",
    region: "中东 · 霍尔木兹海峡",
    lat: 26.57,
    lon: 56.25,
    level: 5,
    date: "起 2026-09-24 ｜ 更新 11-23",
    updated: "2026-11-23",
    summary: "11-21特朗普说要与伊朗达成“永久协议”、不考虑政权更迭；伊朗外长称“两天方案”仍有效、可缩至一天或两小时。过去三天至少12艘船在霍尔木兹触雷。(新华社/财联社11-22)",
    why: "双方都在放谈判话，海上袭击没停；布油周跌3.4%至92.57，过剩压过地缘。",
    watch: "1斡旋方卡塔尔、巴基斯坦有无时间表；2遇袭油轮数；3海峡通航量。",
    chain: [
      {
        step: "双方释放谈判信号(11-21)",
        text: "特朗普称要永久协议；伊朗称两天方案可缩至两小时。"
      },
      {
        step: "海上袭击继续(11-19~21)",
        text: "三天至少12艘船触雷；革命卫队打巴林两处美军基地雷达。"
      }
    ],
    reverse: "特朗普此前称伊朗不接受的条件谈不成；美以被指考虑短期再袭，谈判不是定局。",
    assets: [
      { name: "布伦特原油", dir: "flat", note: "91.86（11-23早，-0.77%）" },
      { name: "WTI原油", dir: "flat", note: "82.91（-0.6%）" },
      { name: "COMEX黄金", dir: "up", note: "3578（周末+1.79%）" }
    ],
    verify: "布油站95说明溢价回来；跌回90下方则过剩确认。",
    sources: [
      { name: "新华社/云南网（11-22）：双方表态愿谈判", url: "https://news.yunnan.cn/system/2026/11/22/034200248.shtml", time: "2026-11-22" },
      { name: "腾讯/财联社（11-22）：特朗普寻求永久协议", url: "https://news.qq.com/rain/a/20261122A04KE300", time: "2026-11-22" },
      { name: "每经（11-22）：霍尔木兹油轮遭袭", url: "http://mp.weixin.qq.com/s?__biz=Mzg3NTA5MjkyNQ==&mid=2248615193&idx=1&sn=a1c5a0f5ff11e906c9b039734546972d", time: "2026-11-22" },
      { name: "澳门日报（11-22）：伊朗外长专访", url: "https://www.macaodaily.com/content/202611/22/c518350.html", time: "2026-11-22" }
    ]
  },
  {
    id: "fed",
    title: "CME两个口径：12月加25bp概率88.6%或95.7%",
    type: "macro",
    region: "美国 · 货币政策",
    lat: 38.9,
    lon: -77.04,
    level: 4,
    date: "起 2026-09-24 ｜ 更新 11-23",
    updated: "2026-11-23",
    summary: "11-22查询CME：财联社报12月加25bp88.6%，界面报95.7%、加50bp4.3%；前一日本站记96~97%。保尔森称通胀过高、还要加息。(财联社/界面11-22)",
    why: "两个口径都指向加息基本确定，差别在幅度而不是方向。",
    watch: "1 11月CPI；2 12-09 FOMC；3加50bp概率破10%。",
    chain: [
      {
        step: "CME两个读数(11-22)",
        text: "财联社88.6%、界面95.7%，采样时间不同，未合并。"
      },
      {
        step: "官员与政治压力",
        text: "保尔森称要再加；特朗普威胁海外数据中心征税。"
      }
    ],
    reverse: "财联社同文称多家机构认为只是牛市回调，1983年来15次回调有5次转熊。",
    assets: [
      { name: "10年期美债", dir: "down", note: "4.944%（11-20收）" },
      { name: "COMEX黄金", dir: "flat", note: "3578（周末反弹）" },
      { name: "美元指数", dir: "flat", note: "103.85" }
    ],
    verify: "核心CPI环比回0.2%则减压；12月加50bp落地属超预期。",
    sources: [
      { name: "财联社/新浪（11-22）：CME查88.6%", url: "https://finance.sina.com.cn/jjxw/2026-11-22/doc-inizputs3090325.shtml", time: "2026-11-22" },
      { name: "界面新闻（11-22）：CME报95.7%", url: "https://www.jiemian.com/article/15359217.html", time: "2026-11-22" },
      { name: "网易/财联社（11-22）：机构称或只是回调", url: "https://www.163.com/dy/article/LCBD8JNM05568W0A.html", time: "2026-11-22" }
    ]
  },
  {
    id: "bonds",
    title: "11-20美债收益率全线下行，10Y跌破5%",
    type: "macro",
    region: "美国 · 债券市场",
    lat: 40.71,
    lon: -74.0,
    level: 4,
    date: "起 2026-09-24 ｜ 更新 11-23",
    updated: "2026-11-23",
    summary: "11-20美债收盘：10Y4.944%(-10.23bp)、30Y5.331%(-7.38bp)、2Y4.647%(-11.92bp)，连涨第五日。周末休市无新收盘价。(每经11-21)",
    why: "避险买盘压过加息定价，给成长股一点缓冲；估值约束未真解除。",
    watch: "1 10Y守4.8%；2 2-10利差；3 11月CPI。",
    chain: [
      {
        step: "股市暴跌(11-20)",
        text: "标普-3.7%、纳指100-5.61%，资金涌入国债避险。"
      },
      {
        step: "收益率全线下行",
        text: "10Y跌破5%至4.944%，2Y周跌18bp。"
      }
    ],
    reverse: "前一日10Y还是5.046%；下行来自避险买盘，不是加息预期退潮。",
    assets: [
      { name: "10年期美债", dir: "down", note: "4.944%(-10.23bp)" },
      { name: "30年期美债", dir: "down", note: "5.331%(-7.38bp)" },
      { name: "2年期美债", dir: "down", note: "4.647%(-11.92bp)" }
    ],
    verify: "10Y收破4.8%则减压；重上5.1%则成长股压力再起。",
    sources: [
      { name: "每日经济新闻（11-21）：美债收益率集体下跌", url: "https://www.nbd.com.cn/articles/2026-11-21/4654657.html", time: "2026-11-21" },
      { name: "陆家嘴财经早餐（11-21）：收益率全线下行", url: "https://news.qq.com/rain/a/20261121A03BS000", time: "2026-11-21" },
      { name: "中国基金报（11-21）：美债延续大涨", url: "https://www.chnfund.com/article/13141954-0e00-53f4-6481-3a250bf57e2f", time: "2026-11-21" }
    ]
  },
  {
    id: "ainarrative",
    title: "AI抛售扩散到日韩，纳指100进熊市、英伟达跌14%",
    type: "macro",
    region: "全球 · 半导体/AI",
    lat: 37.39,
    lon: -122.08,
    level: 5,
    date: "起 2026-10-08 ｜ 更新 11-23",
    updated: "2026-11-23",
    summary: "11-20纳指100-5.61%进熊市、标普-3.7%、道指-1.93%，VIX盘中40.03；11-21日经225与KOSPI各跌约5%，Anthropic第二天-9%。(财联社11-22/新华社11-20)",
    why: "最强财报和最大IPO都没托住；市场担心数据中心放缓、举债重。",
    watch: "1英伟达止跌；2 SOXX守122.2；3 VIX回落18下。",
    chain: [
      {
        step: "黑色星期五(11-20)",
        text: "纳指100进熊市、标普道指进回调，三大指数4月来最低。"
      },
      {
        step: "抛售扩散(11-21)",
        text: "日韩股市各跌约5%；Anthropic次日-9%吐掉首日涨幅大半。"
      }
    ],
    reverse: "E*Trade称1983年来15次回调仅5次转熊；德银称已严重超卖。",
    assets: [
      { name: "英伟达", dir: "down", note: "125.53(-14.01%)" },
      { name: "超威半导体AMD", dir: "down", note: "424.39(-13.25%)" },
      { name: "费城半导体ETF", dir: "down", note: "123.4(-10.55%)" }
    ],
    verify: "NDX收站28800且VIX回18下才确认；破24910续跌。",
    sources: [
      { name: "财联社/新浪（11-22）：恐慌性抛售与机构观点", url: "https://finance.sina.com.cn/jjxw/2026-11-22/doc-inizputs3090325.shtml", time: "2026-11-22" },
      { name: "新华社/中证网（11-21）：科技股暴跌拖累美股", url: "https://www.cs.com.cn/hw2020/2026/11/21/detail_2026112110053781.html", time: "2026-11-21" },
      { name: "中国青年网（11-21）：纳指抹去年内涨幅", url: "https://news.youth.cn/jsxw/202611/t20261121_16977467.htm", time: "2026-11-21" }
    ]
  },
  {
    id: "xitrump",
    title: "川习会未签新协议，美方同日收紧芯片管制",
    type: "talk",
    region: "北美/亚太 · 经贸",
    lat: 38.9,
    lon: -77.04,
    level: 4,
    date: "起 2026-09-24 ｜ 更新 11-23",
    updated: "2026-11-23",
    summary: "11-19川习会未签新贸易协议、未延长关税暂缓；11-22商务部批美FCC打压中国电信企业。贸易理事会11-13首次开会，农业工作组将召开。(新华财经11-22)",
    why: "“300亿对300亿”降税9月谈妥未落地；芯片与电信管制继续收紧。",
    watch: "1 12月14~15日G20；2降税清单；3农业工作组会期。",
    chain: [
      {
        step: "川习会(11-19)",
        text: "同意制定稳定关系行动计划，无新协议、关税暂缓未延。"
      },
      {
        step: "管制与反制(11-19~22)",
        text: "美收紧AI芯片远程使用；中方批FCC恶意打压电信企业。"
      }
    ],
    reverse: "双方经贸团队各层级保持沟通；农业工作组即将开会，接触未断。",
    assets: [
      { name: "人民币", dir: "flat", note: "中间价6.7131" },
      { name: "纳斯达克中国金龙", dir: "flat", note: "跟随大盘回落" },
      { name: "301关税豁免", dir: "flat", note: "延至2027-01-10" }
    ],
    verify: "G20敲定延期或降税落地则悬崖解除；芯片电信加码则善意落空。",
    sources: [
      { name: "新华财经周报（11-22）：经贸与芯片管制", url: "https://finance.eastmoney.com/a/202611223936919672.html", time: "2026-11-22" },
      { name: "新华社（11-19）：APEC讲话", url: "https://www.news.cn/world/20261119/8c7c4b3b857343b68ec69445a62c8d93/c.html", time: "2026-11-19" },
      { name: "优分析（11-21）：川习会未签新协议", url: "https://uanalyze.com.tw/articles/9786460724", time: "2026-11-21" }
    ]
  }
  ]
};
