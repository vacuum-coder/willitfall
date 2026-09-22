const fs=require('fs');
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const frag=fs.readFileSync('sceneC-mobile-edit3d.svgfrag','utf8').trim();
for(const f of ['project/C-Mobile-Plan.dc.html','project/C-Mobile-Edit3D.dc.html']){
  const s=fs.readFileSync(f,'utf8'); const out=[];
  out.push('support.js line: '+s.includes('<script src="./support.js"></script>'));
  out.push('double braces: '+(/\{\{|\}\}/.test(s)));
  const urls=[...s.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map(m=>m[0]); out.push('urls: '+JSON.stringify(urls));
  const emoji=[...s].filter(ch=>{const c=ch.codePointAt(0);return (c>=0x1F000&&c<=0x1FAFF)||(c>=0x2600&&c<=0x27BF)||c===0xFE0F;}); out.push('emoji: '+emoji.length);
  out.push('bare &: '+[...s.matchAll(/&(?!amp;|lt;|gt;|quot;|#\d+;|nbsp;)/g)].length);
  const body=s.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/,'');
  const tags=[...body.matchAll(/<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)]; let unq=[];
  for(const t of tags){const a=t[2].replace(/"[^"]*"|'[^']*'/g,'""'); if(/=\s*[^"'\s]/.test(a)) unq.push(t[0].slice(0,80));}
  out.push('unquoted attrs: '+unq.length);
  const re=/<\/?([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g; let m, st=[], errs=[];
  const b2=s.replace(/<style>[\s\S]*?<\/style>/g,'<style></style>').replace(/(<script[^>]*>)[\s\S]*?(<\/script>)/g,'$1$2').replace(/<!doctype[^>]*>/i,'');
  while((m=re.exec(b2))){const full=m[0],name=m[1].toLowerCase();
    if(full.startsWith('</')){const top=st.pop(); if(top!==name){errs.push('close '+name+' but open '+top); if(top) st.push(top);} }
    else if(full.endsWith('/>')||VOID.has(name)){} else st.push(name);}
  out.push('unclosed: '+JSON.stringify(st)+' errors: '+JSON.stringify(errs.slice(0,5)));
  out.push('css font-size <12px: '+JSON.stringify([...s.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(x=>+x[1]).filter(v=>v<12)));
  out.push('root: '+(s.match(/<x-dc>[\s\S]*?<div style="(width:\d+px;height:\d+px)/)||[])[1]);
  out.push('props: '+(s.match(/data-props='([^']*)'/)||[])[1]);
  out.push('innerHTML/appendChild: '+/innerHTML|appendChild/.test(s));
  const ids=[...s.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]); out.push('dup ids: '+JSON.stringify(ids.filter((v,i)=>ids.indexOf(v)!==i)));
  const refs=[...s.matchAll(/url\(#([\w-]+)\)|for="([\w-]+)"|aria-labelledby="([\w-]+)"/g)].map(x=>x[1]||x[2]||x[3]); out.push('missing refs: '+JSON.stringify(refs.filter(r=>!ids.includes(r))));
  // svg text effective px size
  for(const sv of s.matchAll(/<svg viewBox="([^"]+)" width="(\d+)"[\s\S]*?<\/svg>/g)){const vb=sv[1].split(/\s+/).map(Number); const k=+sv[2]/vb[2];
    const fs_=[...sv[0].matchAll(/font-size="([\d.]+)"/g)].map(x=>+(x[1]*k).toFixed(2)); if(fs_.length) out.push('svg text px (scale '+k.toFixed(4)+'): '+JSON.stringify([...new Set(fs_)]));}
  if(f.includes('Edit3D')) out.push('fragment verbatim: '+s.includes(frag));
  const btns=[...body.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].filter(b=>!/aria-label=/.test(b[1]) && !b[2].replace(/<svg[\s\S]*?<\/svg>|<[^>]+>/g,'').trim()); out.push('buttons without name: '+btns.length);
  console.log('== '+f+'\n'+out.join('\n'));
}
