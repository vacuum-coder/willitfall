// Edit-mode scene for C-Edit3D-Desktop — copy of sceneC.js (palette "Спокойная ночь").
// Room geometry untouched. Changes: wardrobe upright (wr angle 0°), fall zones / ghost / trajectory /
// pillow impact / commode slide arrow hidden (edit mode), selection overlays added on top.
// Usage: node sceneC-edit3d.js > scene-edit3d.svgfrag   (prints the whole <svg> block)
const c=Math.cos(Math.PI/6), s=64, ox=250, oy=196;
const P=(x,y,z)=>[ (x-y)*c*s+ox, ((x+y)/2 - z)*s+oy ];
const f=v=>Math.round(v*10)/10;
const pts=a=>a.map(p=>{const q=P(...p);return f(q[0])+','+f(q[1])}).join(' ');
const poly=(a,fill,extra='')=>`<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
const out=[];
const INK='#2B2622', CLAY='#B84A30', SAGE='#4F6E5D', OCHRE='#8A5F17', WHITE='#FFFFFF';
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
// EDIT MODE: fall zones hidden (toggle «Показывать зоны» is off)
// door clearance mark (kept: it is the exit, not a fall zone)
out.push(poly([[2.0,3.3,0.004],[2.8,3.3,0.004],[2.8,4.2,0.004],[2.0,4.2,0.004]],'none',`stroke="${SAGE}" stroke-width="1.1" stroke-dasharray="3 3"`));
// wardrobe contact shadow — upright footprint
out.push(poly([[2.35,0,0.004],[3.0,0,0.004],[3.0,1.25,0.004],[2.4,1.3,0.004]],'rgba(58,51,45,0.13)','filter="url(#soft)"'));
// bed
box(0.2,1.8,0,0.06,0,0.95,'#DCCDB6','#CBB99E','#D3C3AA');
box(0.2,1.8,0.06,2.0,0,0.32,'#E6DAC7','#D2C3AC','#DCCEB9');
box(0.24,1.76,0.08,1.96,0.32,0.52,'#FCFAF6','#ECE5D9','#F3EEE5');
box(0.24,1.76,0.72,1.96,0.52,0.56,'#8FA898','#7B9585','#859F8F');
box(0.38,1.62,0.12,0.5,0.52,0.64,'#FFFFFF','#ECE6DA','#F4EFE6');
// EDIT MODE: pillow impact outline hidden
// mirror (anchored) against wall x=0
box(0.02,0.3,2.05,2.6,0,1.7,'#E2DACD','#DCE6DF','#D3C9B8',SAGE,0.9);
const br=P(0,2.32,1.62); out.push(`<path d="M${f(br[0]-5)},${f(br[1]-10)} v10 h10" fill="none" stroke="${SAGE}" stroke-width="2" stroke-linecap="round"/>`);
// commode (slides) — slide arrow hidden in edit mode
box(0,0.45,2.7,3.7,0,0.9,'#EEDDB8','#DDC391','#E6D0A4',OCHRE,0.8);
for(const z of [0.3,0.6]) out.push(`<polyline points="${pts([[0.45,2.72,z],[0.45,3.68,z]])}" fill="none" stroke="${OCHRE}" stroke-width="0.6"/>`);

// ——— selection gizmo, floor level (drawn before the wardrobe so the wardrobe hides its far half) ———
const D=0.55, Hh=2.2, Y=1.2;
const CX=2.45+D/2, CY=Y/2;            // footprint centre (2.725, 0.6)
const R=0.85;                          // ring radius, m (clears the footprint corners by 0.19 m)
const cen=P(CX,CY,0);
const rx=R*c*s*Math.SQRT2, ry=R*s*Math.SQRT2/2;   // a floor circle is an axis-aligned ellipse in this isometry
out.push(`<ellipse cx="${f(cen[0])}" cy="${f(cen[1])}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${WHITE}" stroke-width="4"/>`);
out.push(`<ellipse cx="${f(cen[0])}" cy="${f(cen[1])}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${INK}" stroke-width="1.5"/>`);

// wardrobe UPRIGHT: theta = 0° about the bottom edge x=2.45
function wr(th,dx,y,dz){const t=th*Math.PI/180;return [2.45+dx*Math.cos(t)-dz*Math.sin(t), y, dx*Math.sin(t)+dz*Math.cos(t)];}
const th=0;
out.push(poly([wr(th,D,0,0),wr(th,D,Y,0),wr(th,D,Y,Hh),wr(th,D,0,Hh)],'#A4452D',`stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"`));
out.push(poly([wr(th,0,Y,0),wr(th,D,Y,0),wr(th,D,Y,Hh),wr(th,0,Y,Hh)],'#BC5236',`stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"`));
out.push(poly([wr(th,0,0,Hh),wr(th,D,0,Hh),wr(th,D,Y,Hh),wr(th,0,Y,Hh)],'#D47559',`stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"`));
out.push(`<polyline points="${pts([wr(th,0.05,Y,0.08),wr(th,0.05,Y,2.12)])}" fill="none" stroke="#8E3A25" stroke-width="0.6"/>`);
// shelf (danger, standing) — lighter clay
box(2.7,3.0,3.0,3.8,0,2.0,'#F2CDBE','#E3A48D','#D9937B',INK,0.7);
for(const z of [0.5,1.0,1.5]) out.push(`<polyline points="${pts([[2.7,3.8,z],[3.0,3.8,z]])}" fill="none" stroke="${INK}" stroke-width="0.5"/>`);
// EDIT MODE: ghost final position and fall trajectory hidden

// ——— selection overlays (on top) ———
// 1) outline of the selected wardrobe: silhouette hexagon, white halo + ink
const sil=[wr(th,0,Y,0),wr(th,D,Y,0),wr(th,D,0,0),wr(th,D,0,Hh),wr(th,0,0,Hh),wr(th,0,Y,Hh)];
out.push(`<polygon points="${pts(sil)}" fill="none" stroke="${WHITE}" stroke-width="5" stroke-linejoin="round"/>`);
out.push(`<polygon points="${pts(sil)}" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`);
// 2) move arrows on the floor: from O along −x (towards the bed) and +y (along the wall to the door)
const O=[2.25,1.45,0], ax=[1.9,1.45,0], ay=[2.25,1.8,0];
const po=P(...O), pa=P(...ax), pb=P(...ay);
for(const e of [pa,pb]) out.push(`<line x1="${f(po[0])}" y1="${f(po[1])}" x2="${f(e[0])}" y2="${f(e[1])}" stroke="${WHITE}" stroke-width="4" stroke-linecap="round"/>`);
for(const e of [pa,pb]) out.push(`<line x1="${f(po[0])}" y1="${f(po[1])}" x2="${f(e[0])}" y2="${f(e[1])}" stroke="${INK}" stroke-width="1.6" marker-end="url(#arrInk)"/>`);
out.push(`<circle cx="${f(po[0])}" cy="${f(po[1])}" r="2.6" fill="${INK}" stroke="${WHITE}" stroke-width="1.2"/>`);
// 3) rotation handle on the ring at 90° (+y, in front of the wardrobe, inside the room) + «90°» step label under it
const ta=90*Math.PI/180, hp=P(CX+R*Math.cos(ta), CY+R*Math.sin(ta), 0);
const hx=f(hp[0]), hy=f(hp[1]);
out.push(`<circle cx="${hx}" cy="${hy}" r="10" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/>`);
out.push(`<g transform="translate(${f(hx-6)} ${f(hy-6)}) scale(0.5)" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></g>`);
out.push(`<rect x="${f(hx-18)}" y="${f(hy+14)}" width="36" height="24" rx="4" fill="${WHITE}" stroke="${INK}" stroke-width="1"/>`);
out.push(`<text x="${hx}" y="${f(hy+30.4)}" text-anchor="middle" font-family="Manrope, sans-serif" font-size="12" font-weight="700" fill="${INK}">90°</text>`);

const svg=[
`<svg viewBox="-48 -26 518 510" width="518" height="510" role="img" aria-label="Изометрия спальни в режиме правки: шкаф выпрямлен и стоит у стены. Он выбран: обведён контуром, вокруг него на полу кольцо поворота с ручкой и шагом 90°, стрелки показывают, что его можно тянуть по полу к кровати и вдоль стены. Зоны падения скрыты." style="display:block">`,
`  <defs>`,
`    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>`,
`    <marker id="arrInk" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,1 L9,5 L0,9 z" fill="${INK}"/></marker>`,
`  </defs>`,
...out,
`</svg>`];
console.log(svg.join('\n'));
// anchors in viewBox units (screen px = viewBox + (48, 26) at 518×510, same frame as C-Desktop)
const top=P(CX,CY,Hh), topCorner=P(2.45,0,Hh);
console.error(JSON.stringify({centre:[f(cen[0]),f(cen[1])],rx:f(rx),ry:f(ry),handle:[hx,hy],O:[f(po[0]),f(po[1])],ax:[f(pa[0]),f(pa[1])],ay:[f(pb[0]),f(pb[1])],topFace:[f(top[0]),f(top[1])],topCorner:[f(topCorner[0]),f(topCorner[1])]}));
