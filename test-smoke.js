const {JSDOM}=require("jsdom"),fs=require("fs");
const dom=new JSDOM(fs.readFileSync("index.html","utf8"),{runScripts:"outside-only",pretendToBeVisual:true,url:"https://x.github.io/"});
const w=dom.window;
["data/geo.js","data/market.js","data/macro.js","data/events.js"].forEach(f=>{
  try{w.eval(fs.readFileSync(f,"utf8"));}catch(e){console.log("  加载失败 "+f+": "+e.message);}
});
w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
w.IntersectionObserver=class{constructor(){}observe(){}disconnect(){}};
w.requestAnimationFrame=function(f){ return setTimeout(f,0); };
w.eval(fs.readFileSync("assets/app.js","utf8"));
// jsdom 的 readyState 是 loading，需手动派发 DOMContentLoaded 才会跑 boot()
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));

setTimeout(function(){
  const ids=["snap","hero","act3","m-indices","m-senti","m-cross","m-advice","t3","lg","hot","sk","wl","vtrack","mc","dc","evt-list","evt-detail"];
  let bad=0;
  ids.forEach(function(id){
    const el=w.document.getElementById(id);
    const len = el ? el.innerHTML.length : -1;
    if(len<10){ console.log("  x #"+id+" 为空("+len+")"); bad++; }
    else console.log("  v #"+id+" ("+len+")");
  });
  console.log(bad ? ("\nx "+bad+" 个模块为空") : ("\nv 全部 "+ids.length+" 个模块渲染正常"));

  const body=w.document.body.innerHTML;
  const advice=w.document.getElementById("m-advice").innerHTML;
  const snap=w.document.getElementById("snap").innerHTML;
  console.log("\n=== 关键断言 ===");
  console.log("[红涨绿跌] 「涨」数字用红色: "+(/color:var\(--up\)">\d+<\/b> 涨/.test(snap)?"v 通过":"x 失败"));
  const scope=w.document.createElement("div"); scope.innerHTML=w.document.querySelector(".wrap").innerHTML.replace(/<script[\s\S]*?<\/script>/g,"");
  console.log("[铁律] 可见区域无 undefined/NaN 泄漏: "+((/undefined|NaN/.test(scope.textContent))?"x 发现泄漏":"v 通过"));
  console.log("[可解释] 仓位建议含温度分明细: "+(advice.indexOf("市场温度分")>=0?"v 通过":"x 失败"));
  console.log("[时效] 显示数据时间: "+((/数据时间/.test(body))?"v 通过":"x 失败"));
  console.log("[市场状态] 盘前/盘中/盘后之一: "+((/盘中|盘前|盘后|已收盘|休市/.test(body))?"v 通过":"x 失败"));
  process.exit(bad?1:0);
},800);
