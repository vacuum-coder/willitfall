const fs=require("fs");
const f=process.argv[2];
const s=fs.readFileSync(f,"utf8");
const VOID=new Set(["area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"]);
const out=[];
out.push("support.js line: "+s.includes('<script src="./support.js"></script>'));
out.push("double braces: "+(/\{\{|\}\}/.test(s)));
out.push("urls: "+JSON.stringify([...s.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map(m=>m[0].slice(0,40))));
out.push("emoji: "+JSON.stringify([...s].filter(ch=>{const c=ch.codePointAt(0);return (c>=0x1F000&&c<=0x1FAFF)||(c>=0x2600&&c<=0x27BF)||c===0xFE0F;})));
out.push("bare &: "+[...s.matchAll(/&(?!amp;|lt;|gt;|quot;|#\d+;|nbsp;)/g)].length);
const body=s.replace(/<style>[\s\S]*?<\/style>/g,"").replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/,"");
let unq=0;for(const t of body.matchAll(/<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)){if(/=\s*[^"'\s]/.test(t[2].replace(/"[^"]*"|'[^']*'/g,'""'))) unq++;}
out.push("unquoted attrs: "+unq);
const re=/<\/?([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g; let m, st=[], errs=[];
const b2=s.replace(/<style>[\s\S]*?<\/style>/g,"<style></style>").replace(/(<script[^>]*>)[\s\S]*?(<\/script>)/g,"$1$2").replace(/<!doctype[^>]*>/i,"");
while((m=re.exec(b2))){const full=m[0],name=m[1].toLowerCase();
  if(full.startsWith("</")){const top=st.pop(); if(top!==name){errs.push("close "+name+" but open "+top); if(top) st.push(top);} }
  else if(full.endsWith("/>")||VOID.has(name)){} else st.push(name);}
out.push("unclosed: "+JSON.stringify(st)+" errors: "+JSON.stringify(errs.slice(0,5)));
out.push("css font-size <12px: "+JSON.stringify([...s.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(x=>+x[1]).filter(v=>v<12)));
out.push("root: "+(s.match(/<x-dc>[\s\S]*?<div style="(width:\d+px;height:\d+px)/)||[])[1]);
out.push("props: "+(s.match(/data-props='([^']*)'/)||[])[1]);
out.push("forbidden: "+JSON.stringify(["<img","<iframe","innerHTML","appendChild"].filter(k=>s.includes(k))));
const ids=[...s.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]); out.push("dup ids: "+JSON.stringify(ids.filter((v,i)=>ids.indexOf(v)!==i)));
const refs=[...s.matchAll(/url\(#([\w-]+)\)/g)].map(x=>x[1]); out.push("dangling url(#): "+JSON.stringify([...new Set(refs)].filter(r=>!ids.includes(r))));
out.push("unlabelled icon buttons: "+[...s.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].filter(b=>!/aria-label=/.test(b[0].slice(0,b[0].indexOf(">")))&&!b[1].replace(/<svg[\s\S]*?<\/svg>/g,"").replace(/<[^>]+>/g,"").trim()).length);
for(const t of ["Показывать зоны","Повернуть","Закрепить","Поставить на…","Удалить","Обзор","Сверху","С подушки","Приблизить","Отдалить","Вернуть вид","Тяните предмет по полу · колесо — масштаб · правая кнопка — вращать камеру",">90°<","Спальня в панельке, 3,0 × 4,2 м","×2,56","1,02 g","≈7,0","8,3","0,25 g","14,0°","2,2 м","На подушку","2 предмета упадут","Как посчитано","Проверка физики","проверка спальни на землетрясение"]) if(!s.includes(t)) out.push("MISSING: "+t);
out.push("fall zones in scene: "+/fill="rgba\(184,74,48,0\.(12|09)\)"/.test(s)+" · ghost/trajectory: "+/arrRed|stroke-dasharray="2 4"/.test(s));
console.log(out.join("\n"));
