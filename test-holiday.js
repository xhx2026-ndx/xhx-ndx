var src=require("fs").readFileSync("assets/app.js","utf8");
function grab(n){var i=src.indexOf(n);var d=0,j=src.indexOf("{",i);
 for(var k=j;k<src.length;k++){if(src[k]==="{")d++;else if(src[k]==="}"){d--;if(!d)break;}}return src.slice(i,k+1);}
eval(grab("function nyHoliday"));eval(grab("function easter"));
// 权威 NYSE 休市日（2025/2026/2027）
var NYSE={
 2025:[["01-01","New Year's Day"],["01-20","MLK Day"],["02-17","Presidents Day"],["04-18","Good Friday"],
       ["05-26","Memorial Day"],["06-19","Juneteenth"],["07-04","Independence Day"],["09-01","Labor Day"],
       ["11-27","Thanksgiving"],["12-25","Christmas"]],
 2026:[["01-01","New Year's Day"],["01-19","MLK Day"],["02-16","Presidents Day"],["04-03","Good Friday"],
       ["05-25","Memorial Day"],["06-19","Juneteenth"],["07-03","Independence Day (obs)"],["09-07","Labor Day"],
       ["11-26","Thanksgiving"],["12-25","Christmas"]],
 2027:[["01-01","New Year's Day"],["01-18","MLK Day"],["02-15","Presidents Day"],["03-26","Good Friday"],
       ["05-31","Memorial Day"],["06-18","Juneteenth (obs)"],["07-05","Independence Day (obs)"],["09-06","Labor Day"],
       ["11-25","Thanksgiving"],["12-24","Christmas (obs)"]]
};
var allPass=true;
Object.keys(NYSE).forEach(function(y){
  console.log("=== "+y+" 年 NYSE 官方休市日 ===");
  NYSE[y].forEach(function(e){
    var p=e[0].split("-");
    var got=nyHoliday(+y,parseInt(p[0],10),parseInt(p[1],10));
    var ok=!!got;
    if(!ok) allPass=false;
    console.log("  "+e[0]+" "+e[1].padEnd(24)+" -> "+(got||"✗ 漏判")+"  "+(ok?"✓":"✗"));
  });
  // 反向：非官方休市日不应被标记
  var official={};
  NYSE[y].forEach(function(e){official[e[0]]=1;});
  var fp=[];
  for(var m=1;m<=12;m++)for(var d=1;d<=31;d++){
    var dt=new Date(Date.UTC(+y,m-1,d)); if(dt.getUTCMonth()!=m-1)continue;
    var dow=dt.getUTCDay(); if(dow===0||dow===6)continue;
    var key=String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    if(official[key])continue;
    if(nyHoliday(+y,m,d)) fp.push(key+"="+nyHoliday(+y,m,d));
  }
  console.log("  误判为休市的工作日: "+(fp.length?fp.join(", "):"无 ✓"));
  if(fp.length) allPass=false;
  console.log("");
});
console.log(allPass?"✓ 三年全部正确（命中官方休市日 + 零误判）":"✗ 仍有偏差");
