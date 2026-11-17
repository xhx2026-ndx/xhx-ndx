window.WORLD_EVENTS = {
  asOf: '2026-11-18',
  note: 'NDX 27001仍低于28800；11-17 NVDA财报超预期盘后涨4%；四艘油轮触雷、美三航母压阵；CME 12月加25bp 95.7%。',

  items: [
  {
      id: 'hormuz',
      title: '11-17霍尔木兹第四艘油轮触雷，美军三航母压阵',
      type: 'conflict',
      region: '中东 · 霍尔木兹海峡',
      lat: 26.57, lon: 56.25, level: 5,
      date: '起 2026-09-24 ｜ 更新 11-18',
      updated: '2026-11-18',
      summary: '11-17伊朗称一天内第四艘油轮在霍尔木兹以东触雷起火，革命卫队称海峡关闭、南部航道是火力雷区；美军第三艘航母抵中东，并打击格什姆岛导弹场。布伦特收93.14(+0.76%)。',
      why: '美伊军事升级但油价没跟涨：OPEC+10月产量回战前97%，IEA估四季度日过剩170万桶，供应过剩压过地缘。',
      watch: '1两日开放方案是否落地；2海峡通行量能否回升；3布伦特能否守91.26。',
      chain: [
        {
          step: '第四艘油轮触雷(11-17)',
          text: '一天内四艘，关闭导航系统，海峡以东限制区域。'
        },
        {
          step: '美军三航母+打击格什姆岛',
          text: '第三艘航母抵中东；美称自卫打击，回应伊朗袭巴林雷达。'
        }
      ],
      reverse: '伊朗外长与阿曼外长会谈、重提两日开放；OPEC+称10月产量已回战前约97%。',
      assets: [
        { name: '布伦特原油', dir: 'down', note: '93.14（11-17收+0.76%）' },
        { name: 'WTI原油', dir: 'up', note: '86.01（+0.34%）' },
        { name: '黄金', dir: 'down', note: '3856（-0.21%）' }
      ],
      verify: '布伦特站回95.41(11-13)则过剩叙事松动；破91.26(11-18低)则过剩确认。',
      sources: [
        { name: '财联社·网易（11-17）：美第三艘航母抵中东', url: 'https://www.163.com/dy/article/LBUV3KAD05198CJN.html', time: '2026-11-17' },
        { name: '腾讯新闻·央视（11-18）：第四艘油轮触雷', url: 'https://news.qq.com/rain/a/20261118A046VG00', time: '2026-11-18' },
        { name: '中新经纬（11-18）：美股与油价收盘', url: 'https://www.163.com/dy/article/LC0DETC40519C6T9.html', time: '2026-11-18' },
        { name: '证券时报（11-17）：美军打击格什姆岛', url: 'https://www.stcn.com/article/detail/4340968.html', time: '2026-11-17' }
      ]
    },
  {
      id: 'fed',
      title: 'CME维持12月加25bp 95.7%，官员分歧转向加几次',
      type: 'macro',
      region: '美国 · 货币政策',
      lat: 38.9, lon: -77.04, level: 4,
      date: '起 2026-09-24 ｜ 更新 11-18',
      updated: '2026-11-18',
      summary: '汇通11-17：12月加25bp 95.7%、加50bp 4.3%(上周加50bp为11.5%)；1月累计加50bp 69.4%。哈马克11-16重申缓慢稳步加息，柯林斯主张渐进。',
      why: '10月CPI、PPI连续超预期，加息从加不加变成加几次；这是压成长股估值的硬约束。',
      watch: '1 11-19美联储10月纪要；2 11月CPI；3 12-08/09 FOMC。',
      chain: [
        {
          step: '通胀数据连续超预期(11-10/13)',
          text: 'CPI核心环比0.3%连三月、PPI同比6.5%。'
        },
        {
          step: '官员密集放鹰(11-16)',
          text: '哈马克称稳步加息；沃勒此前提50bp可能。'
        }
      ],
      reverse: '柯林斯强调渐进、对幅度开放；加50bp概率已从11.5%降到4.3%。',
      assets: [
        { name: '两年期美债', dir: 'down', note: '4.802%(-2.53bp)' },
        { name: '10年期美债', dir: 'down', note: '5.109%(-2.23bp)' },
        { name: '黄金', dir: 'down', note: '3856（一周跌逾4%）' }
      ],
      verify: '11月核心CPI环比回0.2%下则减压；12月概率跌破80%则预期松动。',
      sources: [
        { name: '汇通网（11-17）：CME加息定价', url: 'https://www.fx678.com/C/20261117/202611170831449117.html', time: '2026-11-17' },
        { name: '新华财经（11-17）：美债与加息预期', url: 'https://m.cnfin.com/zs-lb//zixun/20261117/4496460_1.html', time: '2026-11-17' },
        { name: '凤凰网·财联社（11-17）：哈马克放鹰', url: 'https://na.ifeng.com/c/8y6ZzYkMeQ7', time: '2026-11-17' },
        { name: '汇通网（11-17）：明年1月加息路径', url: 'https://gold.fx678.com/content/202611170528522465.shtml', time: '2026-11-17' }
      ]
    },
  {
      id: 'bonds',
      title: '11-17美债收益率集体下行，10年期回5.109%仍破5%',
      type: 'macro',
      region: '美国 · 债券市场',
      lat: 40.71, lon: -74.0, level: 4,
      date: '起 2026-09-24 ｜ 更新 11-18',
      updated: '2026-11-18',
      summary: '11-17收盘10年期5.109%(-2.23bp)、30年期5.460%(-1.73bp)、2年期4.802%(-2.53bp)，三种期限同步回落。',
      why: '短端降幅更大：加息定价已较充分；但10年期仍在5%上，成长股估值约束没解除。',
      watch: '1 10Y能否收破5%；2 11月CPI强弱；3 2-10利差变化。',
      chain: [
        {
          step: 'CPI/PPI超预期推高收益率',
          text: '10Y一度站上5.13%、30Y到5.475%。'
        },
        {
          step: '11-17避险买盘回流',
          text: '2Y降2.53bp、10Y降2.23bp、30Y降1.73bp。'
        }
      ],
      reverse: '高盛预计2027年底10Y降到4.6%；富国称10Y升破5.25%才对股市构成风险。',
      assets: [
        { name: '10年期美债', dir: 'down', note: '5.109%(-2.23bp)' },
        { name: '30年期美债', dir: 'down', note: '5.460%(-1.73bp)' },
        { name: '2Y–10Y利差', dir: 'flat', note: '约+31bp' }
      ],
      verify: '10Y收破4.8%则恐慌缓和；重上5.25%则成长股压力再起。',
      sources: [
        { name: '每日经济新闻（11-18）：11-17美债收盘', url: 'https://www.nbd.com.cn/articles/2026-11-18/4650839.html', time: '2026-11-18' },
        { name: '东方财富（11-18）：收益率集体下跌', url: 'https://finance.eastmoney.com/a/202611183933340341.html', time: '2026-11-18' },
        { name: '国际金融要情（11-18）：收益率全景', url: 'https://finance.eastmoney.com/a/202611183933350142.html', time: '2026-11-18' }
      ]
    },
  {
      id: 'ainarrative',
      title: 'NVDA财报超预期盘后涨4%，AI硬验证过关',
      type: 'macro',
      region: '全球 · 半导体/AI',
      lat: 37.39, lon: -122.08, level: 5,
      date: '起 2026-10-08 ｜ 更新 11-18',
      updated: '2026-11-18',
      summary: '11-17盘后NVDA公布黄仁勋辞CEO后首份财报：Q3营收1158.4亿美元(+103%)、数据中心1076亿(+110%)，Q4指引1300亿均超预期；盘后涨超4%，带动纳指期货+1.52%。',
      why: '连续17季超预期、云订单积压2.5万亿美元，证明算力需求没崩；但董事会明确不请黄仁勋回归。',
      watch: '1 11-18开盘能否兑现；2 费半能否延续尾盘翻红；3 SOXX守130.75。',
      chain: [
        {
          step: '11-17芯片尾盘翻红',
          text: '费半盘中跌超3%收涨0.34%，ARM+4%、博通+2.46%。'
        },
        {
          step: '盘后财报超预期',
          text: '营收1158亿、Q4指引1300亿；AI硬件盘后普涨。'
        }
      ],
      reverse: 'NVDA本月跌24%、周线六连跌；机构称主要矛盾转向资本开支与回报能否匹配。',
      assets: [
        { name: '英伟达', dir: 'up', note: '155.46收盘(-0.44%)，盘后+4%' },
        { name: '费城半导体ETF', dir: 'up', note: '141.46（+0.17%）' },
        { name: '博通', dir: 'up', note: '341.60（+2.46%）' }
      ],
      verify: '11-18高开低走则利好出尽；NDX收站28800才算情绪确认。',
      sources: [
        { name: '券商中国·新浪财经（11-18 07:15）：财报', url: 'https://finance.sina.com.cn/stock/marketresearch/2026-11-18/doc-inizcexp7062303.shtml', time: '2026-11-18' },
        { name: '中国证券报（11-18 07:12）：Q3与Q4指引', url: 'https://finance.sina.com.cn/stock/marketresearch/2026-11-18/doc-inizayrr1811311.shtml', time: '2026-11-18' },
        { name: '财联社·腾讯（11-18）：董事会不复职', url: 'https://news.qq.com/rain/a/20261118A0437F00', time: '2026-11-18' },
        { name: '中新经纬（11-18）：11-17美股收盘', url: 'https://www.163.com/dy/article/LC0DETC40519C6T9.html', time: '2026-11-18' }
      ]
    },
  {
      id: 'xitrump',
      title: '贸易理事会首会谈降税，APEC深圳11-18开幕',
      type: 'talk',
      region: '北美 · 华盛顿',
      lat: 38.9, lon: -77.04, level: 4,
      date: '起 2026-09-24 ｜ 更新 11-18',
      updated: '2026-11-18',
      summary: '11-13中美贸易理事会首次会议视频举行，谈关税、300亿对300亿对等降税、农产品；11-17/18工商峰会、11-18/19领导人会议在深圳。',
      why: '定向红利非全面和解；芯片被排除，关税暂停窗口只剩两个月。',
      watch: '1 APEC成果与三方会晤；2 降税清单是否扩大；3 美方新限制。',
      chain: [
        {
          step: '关税善意落地(11-09/10)',
          text: '中方续停24%关税2月；美方延301豁免至2027-01-09。'
        },
        {
          step: '贸易理事会首会(11-13)',
          text: '谈对等降税与农产品；芯片不在议程。'
        }
      ],
      reverse: '美方依232条款拟限制机器人与工业机械进口；芯片出口管制不谈。',
      assets: [
        { name: '纳斯达克中国金龙指数', dir: 'down', note: '-1.89%（11-17）' },
        { name: '人民币', dir: 'flat', note: '中间价6.7141' },
        { name: '航运与港口费', dir: 'flat', note: 'USTR延至2027-01-09' }
      ],
      verify: '降税生效且清单扩大则悬崖解除；新限制加码则善意落空。',
      sources: [
        { name: '商务部（11-17更新）：贸易理事会首次会议', url: 'https://www.mofcom.gov.cn/', time: '2026-11-17' },
        { name: '腾讯新闻（11-17）：300亿对300亿降税细节', url: 'https://news.qq.com/rain/a/20261117A08F7P00', time: '2026-11-17' },
        { name: '经贸早班车（11-17）：关税与美方限制', url: 'http://mp.weixin.qq.com/s?__biz=MzA3NjkxNDk2Mg==&mid=2649975019&idx=1&sn=aef77073f07a54a057ace54252b43cb7', time: '2026-11-17' },
        { name: '中新经纬（11-18）：金龙指数', url: 'https://www.jwview.com/jingwei/html/11-18/697439.shtml', time: '2026-11-18' }
      ]
    }
  ]
};
