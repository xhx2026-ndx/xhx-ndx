window.WORLD_EVENTS = {
  asOf: '2026-11-20',
  note: 'NDX26517破27000距28800差8.6%；Anthropic IPO高开低走引爆齐跌超2%、VIX28.44；纪要放鹰加25bp92.7%；油轮触雷。',

  items: [
  {
      id: 'hormuz',
      title: '11-19两艘超级油轮在霍尔木兹触雷爆炸',
      type: 'conflict',
      region: '中东 · 霍尔木兹海峡',
      lat: 26.57, lon: 56.25, level: 5,
      date: '起 2026-09-24 ｜ 更新 11-20',
      updated: '2026-11-20',
      summary: '11-19伊朗革命卫队称两艘载超400万桶的超级油轮沿未授权航线触雷爆炸，在美军战机护航下试图偷渡禁航区，警告将坚决回击；同日沙特拦截胡塞射向利雅得的导弹，PIF大厦受损。',
      why: '地缘升级却压不住油价：19日布油收91.98(+0.03%)、WTI83.21(-0.06%)，小船分流与供应过剩压过风险。',
      watch: '1卡塔尔阿曼斡旋；2特朗普是否批准对伊新打击(未落地)；3布油91.26能否守。',
      chain: [
        {
          step: '两艘超级油轮触雷(11-19)',
          text: '伊朗称油轮载超400万桶，沿禁航航线航行时触雷爆炸。'
        },
        {
          step: '沙特首都遇袭(11-19)',
          text: '联军拦截胡塞导弹、PIF大厦受损；华盛顿号航母据称撤离中东。'
        }
      ],
      reverse: '伊朗此前多次称与阿曼谈「安全通道」；卡塔尔称磋商持续，升级与缓和并存。',
      assets: [
        { name: '布伦特原油', dir: 'flat', note: '91.98（11-19收+0.03%）' },
        { name: 'WTI原油', dir: 'flat', note: '83.21（-0.06%）' },
        { name: 'COMEX黄金', dir: 'down', note: '3627.71（-1.57%）' }
      ],
      verify: '布油站回95.41则过剩松动；破91.26(11-18低)则过剩确认。',
      sources: [
        { name: '央视新闻·新浪（11-19）：两艘超级油轮触雷', url: 'https://finance.sina.com.cn/jjxw/2026-11-19/doc-inizhmka7734284.shtml', time: '2026-11-19' },
        { name: '证券时报（11-19）：中东局势与原油拉升', url: 'https://www.stcn.com/article/detail/4344647.html', time: '2026-11-19' },
        { name: '腾讯新闻（11-19）：伊朗称油轮爆炸', url: 'https://news.qq.com/rain/a/20261119A0D7EY00', time: '2026-11-19' },
        { name: '汇通网（11-19）：特朗普评估对伊打击方案', url: 'https://www.fx678.com/C/20261119/202611191554489111.html', time: '2026-11-19' }
      ]
    },
  {
      id: 'fed',
      title: '美联储10月纪要放鹰，12月加息25bp概率92.7%',
      type: 'macro',
      region: '美国 · 货币政策',
      lat: 38.9, lon: -77.04, level: 4,
      date: '起 2026-09-24 ｜ 更新 11-20',
      updated: '2026-11-20',
      summary: '10月纪要：多数官员认为通胀有上行风险，一些人称12月加息超25bp合理，AI需求列为通胀来源。10-2票维持3.75%-4.00%。CME加25bp92.7%、加50bp7.3%，1月累计加50bp68%。',
      why: '沃勒称不暗示1月加息就该12月加50bp；威廉姆斯、穆萨莱姆、巴尔支持进一步加息。争论从加不加变加几次。',
      watch: '1 11月CPI强弱；2 12-09 FOMC；3加50bp概率是否破20%。',
      chain: [
        {
          step: '10月纪要放鹰(11-18)',
          text: '多数官员认为通胀上行，AI需求成风险来源。'
        },
        {
          step: '官员密集喊话',
          text: '沃勒主张更激进；巴尔称通胀过高、支持进一步加息。'
        }
      ],
      reverse: '加50bp概率仅7.3%仍属少数；几位官员强调渐进，未形成加息幅度共识。',
      assets: [
        { name: '10年期美债', dir: 'down', note: '5.046%（-2.22bp）' },
        { name: '2年期美债', dir: 'down', note: '4.768%（-3.6bp）' },
        { name: 'COMEX黄金', dir: 'down', note: '3627.71（续跌）' }
      ],
      verify: '11月核心CPI环比回0.2%下则减压；12月加50bp概率破20%则鹰派超预期。',
      sources: [
        { name: '汇通网（11-19）：CME加息概率', url: 'https://www.fx678.com/C/20261119/202611190923429067.html', time: '2026-11-19' },
        { name: '腾讯·21世纪（11-19）：纪要内容', url: 'https://news.qq.com/rain/a/20261119A0838P00', time: '2026-11-19' },
        { name: '中国金融信息网（11-19）：沃勒与巴尔表态', url: 'https://m.cnfin.com/dz-lb//zixun/20261119/4497465_1.html', time: '2026-11-19' },
        { name: '南方+（11-19）：黄金14月新低', url: 'https://www.nfnews.com/content/xovKEe5ZyJ.html', time: '2026-11-19' }
      ]
    },
  {
      id: 'bonds',
      title: '11-19美债收益率全线下行，10年期5.046%仍破5%',
      type: 'macro',
      region: '美国 · 债券市场',
      lat: 40.71, lon: -74.0, level: 4,
      date: '起 2026-09-24 ｜ 更新 11-20',
      updated: '2026-11-20',
      summary: '11-19纽约尾盘10年期5.0461%(-2.22bp)、30年期5.3982%(-1.27bp)、2年期4.7682%(-3.6bp)全线下行。加息预期抬短端、避险买盘压长端，10Y仍在5%上方。',
      why: '收益率回落给成长股一点缓冲，但10Y仍破5%、加息已定价，估值约束未真正解除。',
      watch: '1 10Y能否收破5%；2 2-10利差变化；3 11月CPI强弱。',
      chain: [
        {
          step: '纪要后避险买盘(11-19)',
          text: '10Y降2.22bp、30Y降1.27bp。'
        },
        {
          step: '短端同步下行',
          text: '2Y降3.6bp至4.768%，收益率曲线整体下移。'
        }
      ],
      reverse: '全线下行说明资金仍在避险；并非加息预期退潮，2Y仍在高位。',
      assets: [
        { name: '10年期美债', dir: 'down', note: '5.0461%（-2.22bp）' },
        { name: '30年期美债', dir: 'down', note: '5.3982%（-1.27bp）' },
        { name: '2年期美债', dir: 'down', note: '4.7682%（-3.6bp）' }
      ],
      verify: '10Y收破4.8%则恐慌缓和；重上5.25%则成长股压力再起。',
      sources: [
        { name: '每经·腾讯（11-20）：美债收盘', url: 'https://news.qq.com/rain/a/20261120A039SO00', time: '2026-11-20' },
        { name: '新浪·国际金融要情（11-20）：收益率全景', url: 'https://finance.sina.com.cn/roll/2026-11-20/doc-inizitcn7266376.shtml', time: '2026-11-20' },
        { name: '东方财富（11-20）：收益率数据', url: 'https://finance.eastmoney.com/a/202611203935480830.html', time: '2026-11-20' }
      ]
    },
  {
      id: 'ainarrative',
      title: 'Anthropic史上最大IPO高开低走，引爆美股齐跌超2%',
      type: 'macro',
      region: '全球 · 半导体/AI',
      lat: 37.39, lon: -122.08, level: 5,
      date: '起 2026-10-08 ｜ 更新 11-20',
      updated: '2026-11-20',
      summary: '11-19 Anthropic募资1073亿上市，盘中涨约39%后收17.07%、市值1.27万亿。兑现引发买预期卖事实，三大指数齐跌超2%、VIX飙28.44；AMD遭做空跌7.72%、NVDA连跌6日。',
      why: '连史上最大IPO都撑不住，说明市场担心AI巨量投入能否变利润；费半从涨近5%回落收跌2.41%。',
      watch: '1 NVDA能否止跌；2 SOXX守130.75；3 VIX是否回落。',
      chain: [
        {
          step: 'Anthropic IPO兑现(11-19)',
          text: '盘中涨39%后收17.07%，资金撤离引爆跳水。'
        },
        {
          step: '芯片再度失血',
          text: 'AMD遭Hunterbrook做空跌7.72%，NVDA-3.3%连跌6日。'
        }
      ],
      reverse: '英特尔+1.92%、高通+1.38%逆势；芯片内部并非全线转空。',
      assets: [
        { name: '英伟达', dir: 'down', note: '145.98（-3.3%，6连跌）' },
        { name: '超威半导体AMD', dir: 'down', note: '489.19（-7.72%）' },
        { name: '费城半导体ETF', dir: 'down', note: '137.95（-2.75%）' }
      ],
      verify: 'NDX收站28800才算情绪确认；续破26481(11-19盘中低)则抛售延续。',
      sources: [
        { name: '中新经纬（11-20）：三大股指全线收跌', url: 'https://www.jwview.com/jingwei/html/11-20/697746.shtml', time: '2026-11-20' },
        { name: '财联社（11-20）：高开低走重挫2%', url: 'https://www.cls.cn/detail/2539544', time: '2026-11-20' },
        { name: '新浪财经（11-20）：美股大跳水', url: 'https://finance.sina.com.cn/roll/2026-11-20/doc-inizinvp5807845.shtml', time: '2026-11-20' },
        { name: '证券时报（11-20）：三大指数跌超2%', url: 'https://www.stcn.com/article/detail/4344732.html', time: '2026-11-20' }
      ]
    },
  {
      id: 'xitrump',
      title: '习近平深圳会见特朗普，贸易理事会推进对等降税',
      type: 'talk',
      region: '北美/亚太 · 经贸',
      lat: 38.9, lon: -77.04, level: 4,
      date: '起 2026-09-24 ｜ 更新 11-20',
      updated: '2026-11-20',
      summary: '11-19下午习近平在深圳会见出席APEC的特朗普。特朗普称贸易理事会让经贸关系更平衡、双方已公平削减关税。商务部称11-13贸易理事会首次会议已视频举行，农业工作组近期开会。',
      why: '定向红利非全面和解；芯片仍被排除，关税暂停窗口只剩约两个月。',
      watch: '1 农业工作组会议；2 降税清单是否扩大；3 美方新限制。',
      chain: [
        {
          step: '关税善意落地(11-10)',
          text: '中方续停24%关税2月；美方延301豁免至2027-01-09。'
        },
        {
          step: '习特深圳会晤(11-19)',
          text: '双方重申关系，贸易理事会推进对等降税。'
        }
      ],
      reverse: '商务部称对美方近期涉华经贸限制强烈关注、坚决反对；芯片出口管制不谈。',
      assets: [
        { name: '纳斯达克中国金龙', dir: 'down', note: '-1.86%（11-19）' },
        { name: '人民币', dir: 'flat', note: '中间价暂无新读数' },
        { name: '航运与港口费', dir: 'flat', note: 'USTR延至2027-01-09' }
      ],
      verify: '降税生效且清单扩大则悬崖解除；新限制加码则善意落空。',
      sources: [
        { name: '商务部（11-19）：例行发布会', url: 'https://www.mofcom.gov.cn/xwfbzt/2026/swbzklxxwfbh2026n11y19r/index.html', time: '2026-11-19' },
        { name: '联合早报（11-19）：农业工作组会议', url: 'https://www.zaobao.com/news/china/story20261119-10024725', time: '2026-11-19' },
        { name: '澳门日报（11-20）：贸易理事会信号', url: 'https://www.macaodaily.com/content/202611/20/c517969.html', time: '2026-11-20' }
      ]
    }
  ]
};
