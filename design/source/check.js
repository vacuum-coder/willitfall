const fs=require('fs');
const frag=fs.readFileSync('scene.svgfrag','utf8').trim();
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
for(const f of ['design/project/Main.dc.html','design/project/A-Mobile.dc.html']){
  const s=fs.readFileSync(f,'utf8');
  const out=[];
  out.push('support.js line: '+s.includes('<script src="./support.js"></script>'));
  out.push('double braces: '+(/\{\{|\}\}/.test(s)));
  out.push('data-dc-script: '+s.includes('data-dc-script'));
  const urls=[...s.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map(m=>m[0]);
  out.push('urls: '+JSON.stringify(urls));
  const emoji=[...s].filter(ch=>{const c=ch.codePointAt(0);return (c>=0x1F000&&c<=0x1FAFF)||(c>=0x2600&&c<=0x27BF)||c===0xFE0F;});
  out.push('emoji: '+JSON.stringify(emoji));
  for(const id of ['hatch3d','soft','arrRed','arrAmber']) out.push('def '+id+': '+new RegExp('id="'+id+'"').test(s));
  out.push('fragment verbatim: '+s.includes(frag));
  // bare ampersands
  const amps=[...s.matchAll(/&(?!amp;|lt;|gt;|quot;|#\d+;|nbsp;)/g)].length;
  out.push('bare &: '+amps);
  // unquoted attrs
  const body=s.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/,'');
  const tags=[...body.matchAll(/<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)];
  let unq=[];
  for(const t of tags){const a=t[2].replace(/"[^"]*"|'[^']*'/g,'""'); if(/=\s*[^"'\s]/.test(a)) unq.push(t[0].slice(0,80));}
  out.push('unquoted attrs: '+unq.length+(unq.length?' '+JSON.stringify(unq.slice(0,5)):''));
  // tag balance
  const re=/<\/?([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g; let m, st=[], errs=[];
  const b2=s.replace(/<style>[\s\S]*?<\/style>/g,'<style></style>').replace(/(<script[^>]*>)[\s\S]*?(<\/script>)/g,'$1$2').replace(/<!doctype[^>]*>/i,'');
  while((m=re.exec(b2))){const full=m[0],name=m[1].toLowerCase();
    if(full.startsWith('</')){const top=st.pop(); if(top!==name){errs.push('close '+name+' but open '+top+' @'+m.index); if(top) st.push(top);} }
    else if(full.endsWith('/>')||VOID.has(name)){} else st.push(name);}
  out.push('unclosed: '+JSON.stringify(st)+' errors: '+JSON.stringify(errs.slice(0,5)));
  // font sizes below 12px in CSS px
  const small=[...s.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(x=>+x[1]).filter(v=>v<12);
  out.push('css font-size <12px: '+JSON.stringify(small));
  // root size
  out.push('root: '+(s.match(/<x-dc>[\s\S]*?<div style="(width:\d+px;height:\d+px)/)||[])[1]);
  out.push('props: '+(s.match(/data-props='([^']*)'/)||[])[1]);
  console.log('== '+f+'\n'+out.join('\n'));
}
