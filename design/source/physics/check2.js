const fs=require('fs');
const f=process.argv[2];
const s=fs.readFileSync(f,'utf8');
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const out=[];
out.push('support.js line: '+s.includes('<script src="./support.js"></script>'));
out.push('double braces: '+(/\{\{|\}\}/.test(s)));
out.push('data-dc-script: '+s.includes('data-dc-script'));
out.push('urls: '+JSON.stringify([...s.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map(m=>m[0])));
out.push('emoji: '+JSON.stringify([...s].filter(ch=>{const c=ch.codePointAt(0);return (c>=0x1F000&&c<=0x1FAFF)||(c>=0x2600&&c<=0x27BF)||c===0xFE0F;})));
out.push('bare &: '+[...s.matchAll(/&(?!amp;|lt;|gt;|quot;|#\d+;|nbsp;)/g)].length);
const body=s.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/,'');
const tags=[...body.matchAll(/<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)];
let unq=[];for(const t of tags){const a=t[2].replace(/"[^"]*"|'[^']*'/g,'""');if(/=\s*[^"'\s]/.test(a))unq.push(t[0].slice(0,80));}
out.push('unquoted attrs: '+unq.length+(unq.length?' '+JSON.stringify(unq.slice(0,5)):''));
const re=/<\/?([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;let m,st=[],errs=[];
const b2=s.replace(/<style>[\s\S]*?<\/style>/g,'<style></style>').replace(/(<script[^>]*>)[\s\S]*?(<\/script>)/g,'$1$2').replace(/<!doctype[^>]*>/i,'');
while((m=re.exec(b2))){const full=m[0],name=m[1].toLowerCase();
 if(full.startsWith('</')){const top=st.pop();if(top!==name){errs.push('close '+name+' but open '+top+' @'+m.index);if(top)st.push(top);}}
 else if(full.endsWith('/>')||VOID.has(name)){}else st.push(name);}
out.push('unclosed: '+JSON.stringify(st)+' errors: '+JSON.stringify(errs.slice(0,5)));
out.push('css font-size <12px: '+JSON.stringify([...s.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(x=>+x[1]).filter(v=>v<12)));
out.push('svg font-size attrs: '+JSON.stringify([...new Set([...s.matchAll(/font-size="([\d.]+)"/g)].map(x=>x[1]))]));
out.push('root: '+(s.match(/<x-dc>[\s\S]*?<\/helmet>\s*<div[^>]*style="(width:\d+px;height:\d+px)/)||[])[1]);
out.push('props: '+(s.match(/data-props='([^']*)'/)||[])[1]);
out.push('forbidden: '+JSON.stringify(['innerHTML','appendChild','<img','<iframe','localStorage'].filter(k=>s.includes(k))));
// ids unique, label for targets exist
const ids=[...s.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
out.push('dup ids: '+JSON.stringify(dup));
const fors=[...s.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map(x=>x[1]).filter(x=>!ids.includes(x));
out.push('label for missing: '+JSON.stringify(fors));
const heights=[...s.matchAll(/(?<![\w-])height:\s*(\d+)px/g)].map(x=>+x[1]);
out.push('heights used: '+JSON.stringify([...new Set(heights)].sort((a,b)=>a-b)));
const btnNoName=[...s.matchAll(/<button((?:[^>"']|"[^"]*")*)>([\s\S]*?)<\/button>/g)].filter(b=>!/aria-label=/.test(b[1])&&!b[2].replace(/<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,'').trim()).length;
out.push('buttons without name: '+btnNoName);
console.log(out.join('\n'));
