window.WORLD_EVENTS = {
  asOf: "2026-11-25",
  note: "反弹只撑一天：NDX跌1.99%、SOXX跌8.27%；三船触雷布油涨2.27%；加息25bp概率95.9%。(11-24)",

  items: [
    {
      id: "hormuz",
      title: "三艘油轮在霍尔木兹触雷，油价当天涨2.27%",
      type: "conflict",
      region: "中东 · 霍尔木兹海峡",
      date: "起 2026-09-24 ｜ 更新 11-25",
      updated: "2026-11-25",
      summary: "11-24凌晨革命卫队称3艘油轮在美军空中掩护下触雷起火；伊朗陆军称七项条件落空前进一步收紧海峡，卡塔尔赴美促谈。布油收91.40涨2.27%。(新华社/财联社11-24)",
      why: "袭船没停，油价收复前一日三个月新低；地缘溢价重新抬头但幅度有限。",
      watch: "1遇袭船数与通航量；2卡塔尔斡旋；3七项条件是否松口。",
      reverse: "伊朗外交部称若美方履约，通航可最短时间恢复；油价仍低于95。",
      verify: "布油站上95确认溢价回来；跌破85说明过剩再次占上风。",
      lat: 26.57,
      lon: 56.25,
      level: 5,
      chain: [
        {
          step: "三船触雷(11-24)",
          text: "革命卫队称美军护航期间3艘油轮爆炸起火。"
        },
        {
          step: "伊朗收紧(11-23~24)",
          text: "七项条件前不开放海峡，通行限制再加码。"
        }
      ],
      assets: [
        {
          name: "布伦特原油",
          dir: "up",
          note: "91.40（+2.27%）"
        },
        {
          name: "WTI原油",
          dir: "up",
          note: "82.05（+2.35%）"
        },
        {
          name: "COMEX黄金",
          dir: "down",
          note: "3561.90（-2.45%）"
        }
      ],
      sources: [
        {
          name: "新华社（11-24）：国际油价24日上涨",
          url: "https://my-h5news.app.xinhuanet.com/h5/article.html?articleId=202611253cec354c15d84bfc846a892430059d24",
          time: "2026-11-24"
        },
        {
          name: "财联社/腾讯（11-24）：伊朗收紧海峡、卡塔尔促谈",
          url: "https://news.qq.com/rain/a/20261124A0DWZV00",
          time: "2026-11-24"
        },
        {
          name: "证券时报（11-24）：三艘油轮触雷",
          url: "https://www.stcn.com/article/detail/4349347.html",
          time: "2026-11-24"
        },
        {
          name: "新浪财经（11-24）：议长称重开条件",
          url: "https://finance.sina.cn/2026-11-24/detail-inizvuzi4786727.d.html",
          time: "2026-11-24"
        }
      ]
    },
    {
      id: "fed",
      title: "12月加息25bp概率升到95.9%，威廉姆斯不排除连加",
      type: "macro",
      region: "美国 · 货币政策",
      date: "起 2026-09-24 ｜ 更新 11-25",
      updated: "2026-11-25",
      summary: "CME 11-24：12月加25bp95.9%、加50bp4.1%；1月累计加50bp64.2%。威廉姆斯称数据决定节奏、不排除连续加息；阿克曼反对12月加息。(中国基金报/财联社11-24)",
      why: "方向几乎定死，分歧只在幅度；1月加50bp概率比上期57.7%明显上升。",
      watch: "1 11-25 10月PCE；2 12-08/09 FOMC；3加50bp是否破10%。",
      reverse: "阿克曼称金融环境已紧，加息会犯错；高盛看2027年末降息。",
      verify: "核心PCE环比回0.2%则减压；12月加50bp属超预期。",
      lat: 38.9,
      lon: -77.04,
      level: 4,
      chain: [
        {
          step: "CME读数(11-24)",
          text: "12月加25bp95.9%、1月加50bp64.2%。"
        },
        {
          step: "官员表态(11-24)",
          text: "威廉姆斯不排除连续加息，阿克曼公开反对。"
        }
      ],
      assets: [
        {
          name: "10年期美债",
          dir: "down",
          note: "4.928%（-1.8bp）"
        },
        {
          name: "2年期美债",
          dir: "flat",
          note: "4.685%（-0.67bp）"
        },
        {
          name: "COMEX黄金",
          dir: "down",
          note: "3561.90（-2.45%）"
        }
      ],
      sources: [
        {
          name: "中国基金报（11-24）：CME 95.9%",
          url: "https://www.chnfund.com/article/a176138c-c0f2-8f70-3053-3a251c9fe2ae",
          time: "2026-11-24"
        },
        {
          name: "财联社/腾讯（11-24）：威廉姆斯与阿克曼",
          url: "https://news.qq.com/rain/a/20261124A0ABNR00",
          time: "2026-11-24"
        },
        {
          name: "南方+（11-24）：官员表态与黄金",
          url: "https://www.nfnews.com/content/0oXLVnMko9.html",
          time: "2026-11-24"
        },
        {
          name: "每日经济新闻（11-24）：CME概率",
          url: "https://www.nbd.com.cn/articles/2026-11-24/4656586.html",
          time: "2026-11-24"
        }
      ]
    },
    {
      id: "bonds",
      title: "10年期美债降到4.928%，30年期反升到5.319%",
      type: "macro",
      region: "美国 · 债券市场",
      date: "起 2026-09-24 ｜ 更新 11-25",
      updated: "2026-11-25",
      summary: "11-24收盘：2Y4.685%(-0.67bp)、10Y4.928%(-1.80bp)、30Y5.319%(+1.14bp)。油价回落的通胀利好压过早盘风险偏好回升。(每经/新华财经11-25)",
      why: "短中端受益油价回落，30年期不跟；长端压力来自赤字与供给。",
      watch: "1 10Y守4.8%；2 2-10利差约+24bp；3 11-25 PCE。",
      reverse: "另一口径10Y4.899%、30Y5.295%，方向一致但点位有差。(国际金融要情11-25)",
      verify: "10Y重上5.1%则成长股压力再起；跌破4.8%减压。",
      lat: 40.71,
      lon: -74.0,
      level: 4,
      chain: [
        {
          step: "油价主导(11-24)",
          text: "WTI日内一度跌约4.2%，通胀预期降温。"
        },
        {
          step: "长端不跟",
          text: "30年期逆势上行1.14bp至5.319%。"
        }
      ],
      assets: [
        {
          name: "2年期美债",
          dir: "down",
          note: "4.685%（-0.67bp）"
        },
        {
          name: "10年期美债",
          dir: "down",
          note: "4.928%（-1.80bp）"
        },
        {
          name: "30年期美债",
          dir: "up",
          note: "5.319%（+1.14bp）"
        }
      ],
      sources: [
        {
          name: "每日经济新闻（11-25）：11-24美债收盘",
          url: "https://m.nbd.com.cn/articles/2026-11-25/4657870.html",
          time: "2026-11-25"
        },
        {
          name: "新华财经/东财（11-25）：债市分化解读",
          url: "https://bond.eastmoney.com/a/202611253938902416.html",
          time: "2026-11-25"
        },
        {
          name: "国际金融报（11-25）：另一口径收益率",
          url: "https://finance.eastmoney.com/a/202611253938900984.html",
          time: "2026-11-25"
        }
      ]
    },
    {
      id: "ainarrative",
      title: "黄仁勋复职的反弹只撑一天，芯片股再度重挫",
      type: "macro",
      region: "全球 · 半导体/AI",
      date: "起 2026-10-08 ｜ 更新 11-25",
      updated: "2026-11-25",
      summary: "11-24 NDX收26214.17跌1.99%、标普跌0.50%、道指涨0.85%；SOXX跌8.27%、费半跌7.88%、英伟达跌5.86%、美光跌10.97%。Anthropic破发收81.91跌6.54%。(中新经纬11-25)",
      why: "前一日+6.86%的逼空被快速回吐；NDX距28800差9.9%。",
      watch: "1 NDX能否收复26746；2 SOXX守122.2；3 VIX是否回18下。",
      reverse: "道指涨0.85%，医药与零售走强；不是全市场崩盘。",
      verify: "NDX收站28800且VIX回18下才确认；破25028则反弹失败。",
      lat: 37.39,
      lon: -122.08,
      level: 5,
      chain: [
        {
          step: "反弹一日游(11-24)",
          text: "复职带来的+6.86%隔天回吐近三成。"
        },
        {
          step: "AI硬件再杀",
          text: "美光跌10.97%、AMD跌8.86%、闪迪跌11.13%。"
        }
      ],
      assets: [
        {
          name: "纳斯达克100",
          dir: "down",
          note: "26214.17（-1.99%）"
        },
        {
          name: "SOXX",
          dir: "down",
          note: "128.62（-8.27%）"
        },
        {
          name: "英伟达",
          dir: "down",
          note: "155.38（-5.86%）"
        }
      ],
      sources: [
        {
          name: "中新经纬（11-25）：美股收盘",
          url: "https://www.jwview.com/jingwei/html/11-25/698328.shtml",
          time: "2026-11-25"
        },
        {
          name: "Wind万得/网易（11-25）：反弹一日游",
          url: "https://www.163.com/dy/article/LCIGKBRJ05198RSU.html",
          time: "2026-11-25"
        },
        {
          name: "每日经济新闻（11-24）：隔夜市场",
          url: "https://www.mrjjxw.com/articles/2026-11-24/4657738.html",
          time: "2026-11-24"
        },
        {
          name: "腾讯新闻（11-25）：今晨财经必读",
          url: "https://news.qq.com/rain/a/20261125A03V8200",
          time: "2026-11-25"
        }
      ]
    },
    {
      id: "xitrump",
      title: "美国拟查海外工业补贴，关税与芯片管制仍在加压",
      type: "talk",
      region: "北美/亚太 · 经贸",
      date: "起 2026-09-24 ｜ 更新 11-25",
      updated: "2026-11-25",
      summary: "外媒11-24称美贸易代表格里尔最早本周公布海外工业补贴调查，欧盟日韩或面临更高关税；11-19 BIS远程算力新规生效；11-22商务部反对美FCC限制中国电信运营商。(Wind/商务部11-24~25)",
      why: "关税暂缓虽延到2027-01，AI管制与新调查仍在加码；降税未落地。",
      watch: "1补贴调查结果；2降税清单；3中方对等回应。",
      reverse: "中美经贸团队保持沟通，11-19川习会重申加强双边关系。",
      verify: "新关税落地则善意落空；降税清单公布则风险下降。",
      lat: 38.9,
      lon: -77.04,
      level: 4,
      chain: [
        {
          step: "补贴调查(11-24)",
          text: "外媒称本周或公布，欧盟日韩或加税。"
        },
        {
          step: "管制加码(11-19)",
          text: "BIS远程算力新规生效，境外数据中心纳入审查。"
        }
      ],
      assets: [
        {
          name: "301关税豁免",
          dir: "flat",
          note: "178项延至2027-01-09"
        },
        {
          name: "纳斯达克中国金龙",
          dir: "flat",
          note: "+0.12%（11-24）"
        },
        {
          name: "美芯片出口新规",
          dir: "flat",
          note: "11-19生效"
        }
      ],
      sources: [
        {
          name: "Wind万得/网易（11-25）：补贴调查",
          url: "https://www.163.com/dy/article/LCIGKBRJ05198RSU.html",
          time: "2026-11-25"
        },
        {
          name: "华泰睿思/新浪（11-24）：BIS新规",
          url: "https://finance.sina.com.cn/stock/marketresearch/2026-11-24/doc-inizutpk1934239.shtml",
          time: "2026-11-24"
        },
        {
          name: "外贸资讯（11-24）：商务部回应FCC",
          url: "http://mp.weixin.qq.com/s?__biz=MzU1MTk4MDA5NQ==&mid=2247483953&idx=1&sn=294807596bf6dfa93ca09092c046bb37",
          time: "2026-11-24"
        },
        {
          name: "人民日报（11-24）：中美经贸合作",
          url: "https://cpc.people.com.cn/n1/2026/1124/c64387-40839398.html",
          time: "2026-11-24"
        }
      ]
    }
  ]
};
