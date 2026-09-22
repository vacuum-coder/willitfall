const fs=require('fs');
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const PAIR={12:16,13:18,14:20,16:24,18:24,22:28,26:32,32:40,44:48};
for(const f of process.argv.slice(2)){
  const s=fs.readFileSync(f,'utf8'); const out=[];
  out.push('support.js line: '+s.includes('<script src="./support.js"></script>'));
  out.push('double braces: '+(/\{\{|\}\}/.test(s)));
  out.push('urls: '+JSON.stringify([...s.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map(m=>m[0])));
  const emoji=[...s].filter(ch=>{const c=ch.codePointAt(0);return (c>=0x1F000&&c<=0x1FAFF)||(c>=0x2600&&c<=0x27BF)||c===0xFE0F;});
  out.push('emoji: '+JSON.stringify(emoji));
  out.push('bare &: '+[...s.matchAll(/&(?!amp;|lt;|gt;|quot;|#\d+;|nbsp;)/g)].length);
  out.push('forbidden: '+JSON.stringify(['innerHTML','appendChild','<img','<iframe'].filter(k=>s.includes(k))));
  const body=s.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/,'');
  const tags=[...body.matchAll(/<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)];
  let unq=[]; for(const t of tags){const a=t[2].replace(/"[^"]*"|'[^']*'/g,'""'); if(/=\s*[^"'\s]/.test(a)) unq.push(t[0].slice(0,80));}
  out.push('unquoted attrs: '+unq.length+(unq.length?' '+JSON.stringify(unq.slice(0,5)):''));
  const re=/<\/?([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g; let m, st=[], errs=[];
  const b2=s.replace(/<style>[\s\S]*?<\/style>/g,'<style></style>').replace(/(<script[^>]*>)[\s\S]*?(<\/script>)/g,'$1$2').replace(/<!doctype[^>]*>/i,'');
  while((m=re.exec(b2))){const full=m[0],name=m[1].toLowerCase();
    if(full.startsWith('</')){const top=st.pop(); if(top!==name){errs.push('close '+name+' but open '+top+' @'+m.index); if(top) st.push(top);} }
    else if(full.endsWith('/>')||VOID.has(name)){} else st.push(name);}
  out.push('unclosed: '+JSON.stringify(st)+' errors: '+JSON.stringify(errs.slice(0,5)));
  out.push('root: '+(s.match(/<\/helmet>\s*<div style="(width:\d+px;height:\d+px)/)||[])[1]);
  out.push('props: '+(s.match(/data-props='([^']*)'/)||[])[1]);
  // pairing: every style="" containing font-size must contain matching line-height
  const bad=[];
  for(const mm of s.matchAll(/style="([^"]*)"/g)){const st=mm[1]; const fs_=st.match(/font-size:(\d+(?:\.\d+)?)px/); if(!fs_) continue; const lh=st.match(/line-height:(\d+)px/); const want=PAIR[+fs_[1]]; if(!want||!lh||+lh[1]!==want) bad.push(fs_[1]+'/'+(lh?lh[1]:'-')+'  '+st.slice(0,70));}
  for(const mm of s.matchAll(/line-height:(\d+)px/g)) if(!Object.values(PAIR).includes(+mm[1])) bad.push('lh '+mm[1]);
  out.push('font/lh pairing problems: '+bad.length+(bad.length?'\n  '+bad.join('\n  '):''));
  out.push('svg font-size attrs: '+JSON.stringify([...new Set([...s.matchAll(/font-size="([^"]+)"/g)].map(x=>x[1]))]));
  out.push('css heights: '+JSON.stringify([...new Set([...s.matchAll(/(?<![\w-])height:(\d+)px/g)].map(x=>+x[1]))].sort((a,b)=>a-b)));
  out.push('svg sizes: '+JSON.stringify([...new Set([...s.matchAll(/<svg[^>]*?width="(\d+)" height="(\d+)"/g)].map(x=>x[1]+'x'+x[2]))]));
  console.log('== '+f+'\n'+out.join('\n'));
}
