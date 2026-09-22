// Copy of sceneC.js for C-Mobile-Edit3D. Room geometry untouched.
// Changes: wardrobe tilt th=0 (upright, edit mode), contact shadow for the upright pose,
// no ghost / trajectory / pillow marker (physics playback is off in edit mode),
// shelf zone opacity -> token --c-danger-zone, added rotation ring + knob + selection outline.
const c=Math.cos(Math.PI/6), s=64, ox=250, oy=196;
const P=(x,y,z)=>[ (x-y)*c*s+ox, ((x+y)/2 - z)*s+oy ];
const f=v=>Math.round(v*10)/10;
const pts=a=>a.map(p=>{const q=P(...p);return f(q[0])+','+f(q[1])}).join(' ');
const poly=(a,fill,extra='')=>`<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
const out=[];
const INK='#2B2622', CLAY='#B84A30', SAGE='#4F6E5D', OCHRE='#8A5F17';
function box(x0,x1,y0,y1,z0,z1,top,fx,fy,stroke=INK,sw=0.6){
  out.push(poly([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],fx,`stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"`));
  out.push(poly([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],fy,`stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"`));
  out.push(poly([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],top,`stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"`));
}
const W=3,L=4.2,H=2.7,T=0.12;
// walls
out.push(poly([[0,0,0],[0,L,0],[0,L,H],[0,0,H]],'#E7DFD3'));
out.push(poly([[0,0,0],[W,0,0],[W,0,H],[0,0,H]],'#F1EBE2'));
// window on wall y=0
out.push(poly([[0.5,0,1.0],[1.5,0,1.0],[1.5,0,2.2],[0.5,0,2.2]],'#E3EAE4',`stroke="${INK}" stroke-width="0.7"`));
out.push(`<polyline points="${pts([[1.0,0,1.0],[1.0,0,2.2]])}" fill="none" stroke="${INK}" stroke-width="0.6"/>`);
// wall caps (section poche)
out.push(poly([[0,0,H],[W,0,H],[W,-T,H],[-T,-T,H]],'#3A332D'));
out.push(poly([[0,0,H],[-T,-T,H],[-T,L,H],[0,L,H]],'#3A332D'));
// floor
out.push(poly([[0,0,0],[W,0,0],[W,L,0],[0,L,0]],'#E9DFCF'));
for(let x=0.3;x<W;x+=0.3) out.push(`<polyline points="${pts([[x,0,0],[x,L,0]])}" fill="none" stroke="#DDD1BE" stroke-width="0.6"/>`);
// floor-wall AO
out.push(`<polyline points="${pts([[0,L,0],[0,0,0],[W,0,0]])}" fill="none" stroke="#D2C4AE" stroke-width="1.5"/>`);
// zones (both use --c-danger-zone)
const zone=(x0,x1,y0,y1,op)=>{const a=[[x0,y0,0.003],[x1,y0,0.003],[x1,y1,0.003],[x0,y1,0.003]];
  out.push(poly(a,`rgba(184,74,48,${op})`)); out.push(poly(a,'url(#hatch3d)',`stroke="${CLAY}" stroke-width="1" stroke-dasharray="5 3"`));};
zone(0.25,2.45,0,1.2,0.12);
zone(0.7,2.7,3.0,3.8,0.12);
// door clearance mark
out.push(poly([[2.0,3.3,0.004],[2.8,3.3,0.004],[2.8,4.2,0.004],[2.0,4.2,0.004]],'none',`stroke="${SAGE}" stroke-width="1.1" stroke-dasharray="3 3"`));
// wardrobe contact shadow, upright pose
out.push(poly([[2.3,0,0.004],[3.0,0,0.004],[3.0,1.32,0.004],[2.34,1.34,0.004]],'rgba(58,51,45,0.13)','filter="url(#soft)"'));
// rotation ring on the floor around the wardrobe footprint (drawn before furniture so the wardrobe hides its back arc)
const RC=[2.725,0.6], RR=0.75;
const ringPt=(deg)=>{const a=deg*Math.PI/180;return [RC[0]+RR*Math.cos(a), RC[1]+RR*Math.sin(a), 0.005];};
const rc=P(RC[0],RC[1],0.005);
const rx=f(RR*Math.SQRT2*c*s), ry=f(RR*Math.SQRT2*0.5*s);
out.push(`<ellipse cx="${f(rc[0])}" cy="${f(rc[1])}" rx="${rx}" ry="${ry}" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
// bed
box(0.2,1.8,0,0.06,0,0.95,'#DCCDB6','#CBB99E','#D3C3AA');
box(0.2,1.8,0.06,2.0,0,0.32,'#E6DAC7','#D2C3AC','#DCCEB9');
box(0.24,1.76,0.08,1.96,0.32,0.52,'#FCFAF6','#ECE5D9','#F3EEE5');
box(0.24,1.76,0.72,1.96,0.52,0.56,'#8FA898','#7B9585','#859F8F');
box(0.38,1.62,0.12,0.5,0.52,0.64,'#FFFFFF','#ECE6DA','#F4EFE6');
// fall-zone outline continues over the bed top (no impact marker in edit mode)
out.push(poly([[0.25,0.08,0.66],[1.76,0.08,0.66],[1.76,1.2,0.66],[0.25,1.2,0.66]],'none',`stroke="${CLAY}" stroke-width="1.3" stroke-dasharray="6 3"`));
// mirror (anchored) against wall x=0
box(0.02,0.3,2.05,2.6,0,1.7,'#E2DACD','#DCE6DF','#D3C9B8',SAGE,0.9);
const br=P(0,2.32,1.62); out.push(`<path d="M${f(br[0]-5)},${f(br[1]-10)} v10 h10" fill="none" stroke="${SAGE}" stroke-width="2" stroke-linecap="round"/>`);
// commode (slides)
box(0,0.45,2.7,3.7,0,0.9,'#EEDDB8','#DDC391','#E6D0A4',OCHRE,0.8);
for(const z of [0.3,0.6]) out.push(`<polyline points="${pts([[0.45,2.72,z],[0.45,3.68,z]])}" fill="none" stroke="${OCHRE}" stroke-width="0.6"/>`);
const a0=P(0.55,3.2,0.004), a1=P(0.95,3.2,0.004); out.push(`<line x1="${f(a0[0])}" y1="${f(a0[1])}" x2="${f(a1[0])}" y2="${f(a1[1])}" stroke="${OCHRE}" stroke-width="1.6" marker-end="url(#arrAmber)"/>`);
// wardrobe, pivot x=2.45 — th=0: upright
function wr(th,dx,y,dz){const t=th*Math.PI/180;return [2.45+dx*Math.cos(t)-dz*Math.sin(t), y, dx*Math.sin(t)+dz*Math.cos(t)];}
const th=0, D=0.55, Hh=2.2, Y=1.2;
out.push(poly([wr(th,D,0,0),wr(th,D,Y,0),wr(th,D,Y,Hh),wr(th,D,0,Hh)],'#A4452D',`stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"`));
out.push(poly([wr(th,0,Y,0),wr(th,D,Y,0),wr(th,D,Y,Hh),wr(th,0,Y,Hh)],'#BC5236',`stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"`));
out.push(poly([wr(th,0,0,Hh),wr(th,D,0,Hh),wr(th,D,Y,Hh),wr(th,0,Y,Hh)],'#D47559',`stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"`));
out.push(`<polyline points="${pts([wr(th,0.05,Y,0.08),wr(th,0.05,Y,2.12)])}" fill="none" stroke="#8E3A25" stroke-width="0.6"/>`);
// shelf (danger, standing) — lighter clay
box(2.7,3.0,3.0,3.8,0,2.0,'#F2CDBE','#E3A48D','#D9937B',INK,0.7);
for(const z of [0.5,1.0,1.5]) out.push(`<polyline points="${pts([[2.7,3.8,z],[3.0,3.8,z]])}" fill="none" stroke="${INK}" stroke-width="0.5"/>`);
// selection outline: silhouette of the wardrobe box grown by 6 cm
const g=0.06, sx0=2.45-g, sx1=3.0+g, sy0=-g, sy1=Y+g, sz1=Hh+g;
out.push(poly([[sx0,sy0,sz1],[sx1,sy0,sz1],[sx1,sy0,0],[sx1,sy1,0],[sx0,sy1,0],[sx0,sy1,sz1]],'none',`stroke="${INK}" stroke-width="1.2" stroke-dasharray="5 4" stroke-linejoin="round"`));
// ring grip: two arrow arcs from the knob (front point of the ring) + knob
const arc=(from,to)=>{const a=[];const st=from<to?3:-3;for(let d=from;st>0?d<=to:d>=to;d+=st)a.push(ringPt(d));return a;};
out.push(`<polyline points="${pts(arc(40,12))}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" marker-end="url(#arrInk)"/>`);
out.push(`<polyline points="${pts(arc(50,78))}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" marker-end="url(#arrInk)"/>`);
const kn=P(...ringPt(45));
out.push(`<circle cx="${f(kn[0])}" cy="${f(kn[1])}" r="10" fill="#FFFFFF" stroke="${INK}" stroke-width="2.2"/>`);
// label anchors
const la={wardrobeTop:P(...wr(th,0.275,0.6,Hh)),shelf:P(2.85,3.4,2.0),knob:kn,ringCenter:rc,ringRx:[rx,ry]};
console.log(out.join('\n'));
console.error(JSON.stringify(Object.fromEntries(Object.entries(la).map(([k,v])=>[k,[f(v[0]),f(v[1])]]))));
