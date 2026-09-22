const fs=require('fs');
let s=fs.readFileSync(__dirname+'/../scene.js','utf8');
const R=(a,b)=>{ if(!s.includes(a)) throw new Error('missing '+a); s=s.split(a).join(b); };
// window (specific first)
R(`'#D3DEE3','stroke="#1A1A18" stroke-width="1"'`,`'#2F3B43','stroke="#4A4E55" stroke-width="1"'`);
R(`fill="none" stroke="#1A1A18" stroke-width="0.8"/>\`);\n// wall caps`,`fill="none" stroke="#4A4E55" stroke-width="0.8"/>\`);\n// wall caps`);
// door clearance (specific) -> neutral
R(`'none','stroke="#2F5D7C" stroke-width="1.2" stroke-dasharray="3 3"'`,`'none','stroke="#A7A9AD" stroke-width="1.2" stroke-dasharray="3 3"'`);
const map=[
 ['#E3DCCF','#232529'],['#EEE8DD','#26282C'],['#23221F','#0B0C0D'],['#E8DBC3','#2A2C30'],['#D9C8A9','#33363B'],['#BFAF92','#101113'],
 ['rgba(214,69,31,','rgba(229,72,42,'],['#D6451F','#E5482A'],['rgba(26,26,24,0.16)','rgba(0,0,0,0.5)'],
 ["'#B9AB91','#A89A80','#B0A288'","'#5A5F66','#464A50','#50545A'"],
 ["'#CDBFA5','#B8AA8F','#C2B49A'","'#6A6F76','#4F535A','#5C6168'"],
 ["'#FBF8F2','#EAE3D5','#F1EBDF'","'#9EA3AA','#7C8188','#8A8F96'"],
 ["'#9FB2C0','#8599A8','#91A5B3'","'#3E5566','#2F4250','#36495A'"],
 ["'#FFFFFF','#ECE6DA','#F4EFE6'","'#C9CCD0','#A3A7AC','#B5B9BE'"],
 ["'#A69D89','#C7D5DB','#958C78'","'#3A3D42','#4E6470','#2F3236'"],['#2F5D7C','#5BB0D6'],
 ["'#E3CFA2','#CDB47E','#D6BF8C'","'#45484E','#35383D','#3D4046'"],['#8F5A0F','#F2C200'],
 ['#B03716','#A8321C'],['#C94620','#C73E24'],['#E4623C','#E5482A'],['#9E3113','#7E2614'],
 ["'#EC9A7C','#D4694A','#C85B3B'","'#F4907A','#DC6A51','#C95842'"],
 ['#1A1A18','#0B0C0D'],
];
for(const [a,b] of map) R(a,b);
fs.writeFileSync(__dirname+'/scene-b.js',s);
