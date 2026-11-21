window.WORLD_EVENTS = {
  asOf: '2026-11-22',
  note: '周末美伊互袭升级、油价没动；美债收益率全线下行但加息已定价；川习会无新协议、美收紧芯片管制。',

  items: [
  {
      id: 'hormuz',
      title: '11-21美伊互袭再升级：油轮触雷、伊朗打巴林美军基地',
      type: 'conflict',
      region: '中东 · 霍尔木兹海峡',
      lat: 26.57, lon: 56.25, level: 5,
      date: '起 2026-09-24 ｜ 更新 11-22',
      updated: '2026-11-22',
      summary: '11-21伊朗称多艘油轮在霍尔木兹触雷、击落第19架美军MQ-1无人机，并打击巴林两处美军基地爱国者雷达；美军否认F-16被击伤。伊朗外长称仍想外交解决。(央视/证券时报11-21~22)',
      why: '斡旋继续、互袭也继续，仍是"不战不和"。布油周跌3.41%，过剩压过地缘。',
      watch: '1"两天方案"能否落地；2卡塔尔斡旋；3胡塞袭沙特是否扩大。',
      chain: [
        {
          step: '多艘油轮触雷(11-21)',
          text: '伊朗称油轮在海塞卜港、盖奈姆岛附近触雷，美军被指掩护非法通行。'
        },
        {
          step: '伊朗打巴林基地(11-21)',
          text: '革命卫队称打击两处美军基地爱国者雷达，美军否认F-16被击伤。'
        }
      ],
      reverse: '伊朗外长称"两天方案"仍有效；特朗普称协议不可接受、斡旋方仍在传话。',
      assets: [
        { name: '布伦特原油', dir: 'flat', note: '92.59（11-21早盘）' },
        { name: 'WTI原油', dir: 'flat', note: '83.66（+1.48%）' },
        { name: '现货黄金', dir: 'down', note: '3537（周跌约9%）' }
      ],
      verify: '布油站95则溢价回来；回90下则过剩确认。',
      sources: [
        { name: '央视新闻（11-22）：伊美博弈加剧', url: 'https://finance.sina.com.cn/world/gjcj/2026-11-22/doc-inizqfin2932158.shtml', time: '2026-11-22' },
        { name: '证券时报（11-21）：霍尔木兹海峡大消息', url: 'https://www.stcn.com/article/detail/4347179.html', time: '2026-11-21' },
        { name: '新华社/每经（11-21）：伊朗仍期待外交手段', url: 'http://mp.weixin.qq.com/s?__biz=Mzg3NTA5MjkyNQ==&mid=2248615169&idx=1&sn=ca0bc70018786b5bef12a09a264dc7ec', time: '2026-11-21' },
        { name: '腾讯（11-21）：伊朗称美军掩护油轮', url: 'https://news.qq.com/rain/a/20261121A0CGQB00', time: '2026-11-21' }
      ]
    },
  {
      id: 'fed',
      title: 'CME：12月加息25bp概率96~97%，保尔森愿连续加息',
      type: 'macro',
      region: '美国 · 货币政策',
      lat: 38.9, lon: -77.04, level: 4,
      date: '起 2026-09-24 ｜ 更新 11-22',
      updated: '2026-11-22',
      summary: 'CME 11-20：12月加25bp96~97%、1月累计加50bp67.5%。保尔森称利率需更高、愿连续加息但主张审慎渐进；特朗普重申应拥有全球最低利率。(腾讯/网易11-21)',
      why: '争论从"加几次"移到"加到几月"；法巴、摩根大通都预测12月+1月+3月三次。',
      watch: '1 11月CPI；2 12-09 FOMC；3加50bp概率破10%。',
      chain: [
        {
          step: '官员表态分化(11-20~21)',
          text: '保尔森称利率需更高；古尔斯比、哈马克强调不给死前瞻指引。'
        },
        {
          step: '特朗普施压',
          text: '称美联储政治化、应有全球最低利率；市场仍按加息定价。'
        }
      ],
      reverse: '保尔森同时主张审慎渐进、不承诺节奏；加50bp仍属少数。',
      assets: [
        { name: '10年期美债', dir: 'down', note: '4.944%（11-20收）' },
        { name: '现货黄金', dir: 'down', note: '3537（周跌约9%）' },
        { name: '美元指数', dir: 'flat', note: '103.84' }
      ],
      verify: '核心CPI回0.2%下则减压；12月加50bp破10%则超预期。',
      sources: [
        { name: '腾讯新闻（11-21）：华尔街押注12月必加息', url: 'https://news.qq.com/rain/a/20261121A030U600', time: '2026-11-21' },
        { name: '网易/财通社（11-21）：保尔森发声', url: 'https://www.163.com/dy/article/LC93PGAU0552LIRB.html', time: '2026-11-21' },
        { name: '新浪财经（11-21）：沃什希望少讲话', url: 'https://finance.sina.cn/usstock/mggd/2026-11-21/detail-inizmfez0178117.d.html', time: '2026-11-21' },
        { name: '新浪财经（11-20）：法巴三次加息概率', url: 'https://cj.sina.com.cn/articles/view/9117970245/21f792f4507201tt4g', time: '2026-11-20' }
      ]
    },
  {
      id: 'bonds',
      title: '11-20美债收益率全线下行，10Y跌破5%',
      type: 'macro',
      region: '美国 · 债券市场',
      lat: 40.71, lon: -74.0, level: 4,
      date: '起 2026-09-24 ｜ 更新 11-22',
      updated: '2026-11-22',
      summary: '11-20美债收盘：10Y4.944%(-10.23bp)、30Y5.331%(-7.38bp)、2Y4.647%(-11.92bp)，连涨第五日、逼近五个月最长连涨。(陆家嘴/中国基金报11-21)',
      why: '避险买盘压过加息定价，给成长股一点缓冲；但加息已定价，估值约束未真解除。',
      watch: '1 10Y守4.8%；2 2-10利差；3 11月CPI。',
      chain: [
        {
          step: '股市暴跌(11-20)',
          text: '标普-3.7%、纳指-5.28%，资金涌入国债避险。'
        },
        {
          step: '收益率全线下行',
          text: '10Y跌破5%至4.944%，2Y周跌18bp。'
        }
      ],
      reverse: '前一日10Y还是5.046%；下行来自避险买盘，不是加息预期退潮。',
      assets: [
        { name: '10年期美债', dir: 'down', note: '4.944%(-10.23bp)' },
        { name: '30年期美债', dir: 'down', note: '5.331%(-7.38bp)' },
        { name: '2年期美债', dir: 'down', note: '4.647%(-11.92bp)' }
      ],
      verify: '10Y收破4.8%则减压；重上5.1%则成长股压力再起。',
      sources: [
        { name: '陆家嘴财经早餐（11-21）：美债收益率集体下跌', url: 'https://news.qq.com/rain/a/20261121A03BS000', time: '2026-11-21' },
        { name: '华尔街见闻早餐（11-21）：美债10Y4.95%', url: 'https://news.qq.com/rain/a/20261121A03GU500', time: '2026-11-21' },
        { name: '中国基金报（11-21）：美债延续大涨', url: 'https://www.chnfund.com/article/13141954-0e00-53f4-6481-3a250bf57e2f', time: '2026-11-21' }
      ]
    },
  {
      id: 'ainarrative',
      title: '黑色星期五：纳指100进熊市，英伟达跌14%',
      type: 'macro',
      region: '全球 · 半导体/AI',
      lat: 37.39, lon: -122.08, level: 5,
      date: '起 2026-10-08 ｜ 更新 11-22',
      updated: '2026-11-22',
      summary: '11-20纳指100跌5.61%进技术性熊市、抹去年内涨幅；标普-3.7%破7000、道指-1.93%，VIX盘中40.03。英伟达-14.01%遭SEC会计调查。(财联社11-21)',
      why: '最强财报和最大IPO都没托住，市场给AI重新定价：投入大、回款慢、举债重。',
      watch: '1英伟达止跌；2 SOXX守122.2；3 VIX回落。',
      chain: [
        {
          step: '黑色星期五(11-20)',
          text: '纳指100进熊市、标普道指进回调，三大指数创4月来最低收盘。'
        },
        {
          step: '芯片链崩塌',
          text: '英伟达-14%遭SEC查账；AMD-13.25%、美光-13.89%、博通-12.19%。'
        }
      ],
      reverse: 'E*Trade称1983年来15次回调只5次变熊市；部分机构仍长期看好AI。',
      assets: [
        { name: '英伟达', dir: 'down', note: '125.53(-14.01%)' },
        { name: '超威半导体AMD', dir: 'down', note: '424.39(-13.25%)' },
        { name: '费城半导体ETF', dir: 'down', note: '123.4(-10.55%)' }
      ],
      verify: 'NDX收站28800且VIX回18下才确认；破24910续跌。',
      sources: [
        { name: '环球市场播报/新浪（11-21）：纳指狂泻千点', url: 'https://finance.sina.com.cn/stock/usstock/c/2026-11-21/doc-inizmruv0035217.shtml', time: '2026-11-21' },
        { name: '腾讯（11-21）：美股全线溃败', url: 'https://news.qq.com/rain/a/20261121A057GZ00', time: '2026-11-21' },
        { name: '财联社/网易（11-21）：欧美股指集体走低', url: 'https://www.163.com/dy/article/LC899DVP05198CJN.html', time: '2026-11-21' },
        { name: '新浪（11-20）：AI估值担忧', url: 'https://finance.sina.com.cn/stock/usstock/c/2026-11-20/doc-iniziaft5982551.shtml', time: '2026-11-20' }
      ]
    },
  {
      id: 'xitrump',
      title: '川习会未签新协议，美方同日收紧AI芯片管制',
      type: 'talk',
      region: '北美/亚太 · 经贸',
      lat: 38.9, lon: -77.04, level: 4,
      date: '起 2026-09-24 ｜ 更新 11-22',
      updated: '2026-11-22',
      summary: '11-19深圳川习会同意制定稳定关系行动计划，但未宣布新贸易协议、未延长关税暂缓；同日美AI芯片出口新规生效，限制中企经海外数据中心用受管制芯片。(优分析/南方财经11-21)',
      why: '"300亿对300亿"降税9月谈妥却未落地；芯片管制反收紧，属有期限休战。',
      watch: '1 12月G20；2降税清单落地；3芯片限制是否加码。',
      chain: [
        {
          step: '川习会(11-19)',
          text: '同意制定行动计划稳定双边关系，但未签新协议、未延长关税暂缓。'
        },
        {
          step: '芯片管制收紧(11-19)',
          text: '美限制中企经海外数据中心用受管制芯片、收紧代工封测许可。'
        }
      ],
      reverse: '中方对美方近期经贸限制强烈关注；芯片不在降税清单。',
      assets: [
        { name: '人民币', dir: 'flat', note: '中间价6.7131' },
        { name: '纳斯达克中国金龙', dir: 'flat', note: '跟随大盘回落' },
        { name: '301关税豁免', dir: 'flat', note: '延至2027-01-10' }
      ],
      verify: 'G20敲定延期或降税落地则悬崖解除；芯片加码则善意落空。',
      sources: [
        { name: '优分析（11-21）：川习会未签新协议', url: 'https://uanalyze.com.tw/articles/9786460724', time: '2026-11-21' },
        { name: '南方财经网（11-21）：中美产业合作广东', url: 'https://m.sfccn.com/2026/11-21/zNMDE0NzNfMjMxMzMzNg.html', time: '2026-11-21' },
        { name: '腾讯新闻（11-20）：美企扎堆来华', url: 'https://news.qq.com/rain/a/20261120A0G4VY00', time: '2026-11-20' }
      ]
    }
  ]
};