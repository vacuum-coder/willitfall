// Copy of sceneC.js for C-WallItems. Room geometry and projection untouched.
// Changes: TV is the selected item (strong danger palette), wardrobe stands upright (danger2, not selected),
// vase on the dresser, vase fall zone (fan r=1.25 m), TV fall trajectory. All colors from tokens.css.
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
// zones (both use the --c-danger-zone token)
const zone=(x0,x1,y0,y1)=>{const a=[[x0,y0,0.003],[x1,y0,0.003],[x1,y1,0.003],[x0,y1,0.003]];
  out.push(poly(a,'rgba(184,74,48,0.12)')); out.push(poly(a,'url(#hatch3d)',`stroke="${CLAY}" stroke-width="1" stroke-dasharray="5 3"`));};
zone(0.25,2.45,0,1.2);
zone(0.7,2.7,3.0,3.8);
// vase fall zone: fan of radius 1.25 m (vase 0.35 + dresser 0.9) around the vase, toward the room
const VX=0.27, VY=3.4, VR=1.25;
const fan=[[VX,VY,0.003]]; for(const a of [-39,-35,-30,-25,-20,-15,-10,-5,0,5,10,15,20,25,30,35,39]){const t=a*Math.PI/180; fan.push([VX+VR*Math.cos(t),VY+VR*Math.sin(t),0.003]);}
out.push(poly(fan,'rgba(184,74,48,0.12)')); out.push(poly(fan,'url(#hatch3d)',`stroke="${CLAY}" stroke-width="1" stroke-dasharray="5 3"`));
// door clearance mark
out.push(poly([[2.0,3.3,0.004],[2.8,3.3,0.004],[2.8,4.2,0.004],[2.0,4.2,0.004]],'none',`stroke="${SAGE}" stroke-width="1.1" stroke-dasharray="3 3"`));
// bed
box(0.2,1.8,0,0.06,0,0.95,'#DCCDB6','#CBB99E','#D3C3AA');
box(0.2,1.8,0.06,2.0,0,0.32,'#E6DAC7','#D2C3AC','#DCCEB9');
box(0.24,1.76,0.08,1.96,0.32,0.52,'#FCFAF6','#ECE5D9','#F3EEE5');
box(0.24,1.76,0.72,1.96,0.52,0.56,'#8FA898','#7B9585','#859F8F');
box(0.38,1.62,0.12,0.5,0.52,0.64,'#FFFFFF','#ECE6DA','#F4EFE6');
// mirror (anchored) against wall x=0
box(0.02,0.3,2.05,2.6,0,1.7,'#E2DACD','#DCE6DF','#D3C9B8',SAGE,0.9);
const br=P(0,2.32,1.62); out.push(`<path d="M${f(br[0]-5)},${f(br[1]-10)} v10 h10" fill="none" stroke="${SAGE}" stroke-width="2" stroke-linecap="round"/>`);
// commode (slides)
box(0,0.45,2.7,3.7,0,0.9,'#EEDDB8','#DDC391','#E6D0A4',OCHRE,0.8);
for(const z of [0.3,0.6]) out.push(`<polyline points="${pts([[0.45,2.72,z],[0.45,3.68,z]])}" fill="none" stroke="${OCHRE}" stroke-width="0.6"/>`);
const a0=P(0.55,3.2,0.004), a1=P(0.95,3.2,0.004); out.push(`<line x1="${f(a0[0])}" y1="${f(a0[1])}" x2="${f(a1[0])}" y2="${f(a1[1])}" stroke="${OCHRE}" stroke-width="1.6" marker-end="url(#arrAmber)"/>`);
// TV on a bracket on wall x=0 above the commode: 100 x 8 x 60 cm, bracket at 1.4 m (TV centre)
box(0.05,0.13,2.7,3.7,1.1,1.7,'#D47559','#A4452D','#BC5236',INK,0.8);
out.push(`<polyline points="${pts([[0.13,2.74,1.14],[0.13,3.66,1.14],[0.13,3.66,1.66],[0.13,2.74,1.66],[0.13,2.74,1.14]])}" fill="none" stroke="#8E3A25" stroke-width="0.6"/>`);
// vase on the commode: 10 x 10 x 35 cm
box(VX-0.05,VX+0.05,VY-0.05,VY+0.05,0.9,1.25,'#F2CDBE','#E3A48D','#D9937B',INK,0.7);
// wardrobe standing (not selected now): same box as wr(0,...) about x=2.45
box(2.45,3.0,0,1.2,0,2.2,'#F2CDBE','#E3A48D','#D9937B',INK,0.7);
out.push(`<polyline points="${pts([[3.0,0.6,0.08],[3.0,0.6,2.12]])}" fill="none" stroke="${INK}" stroke-width="0.5"/>`);
// shelf (danger, standing) — lighter clay
box(2.7,3.0,3.0,3.8,0,2.0,'#F2CDBE','#E3A48D','#D9937B',INK,0.7);
for(const z of [0.5,1.0,1.5]) out.push(`<polyline points="${pts([[2.7,3.8,z],[3.0,3.8,z]])}" fill="none" stroke="${INK}" stroke-width="0.5"/>`);
// TV fall trajectory: from the top front edge to the floor inside the fan
const q0=[0.13,3.2,1.7], q1=[1.05,3.2,1.55], q2=[1.4,3.2,0.05], tr=[];
for(let i=0;i<=16;i++){const t=i/16, u=1-t; tr.push([0,1,2].map(k=>u*u*q0[k]+2*u*t*q1[k]+t*t*q2[k]));}
out.push(`<polyline points="${pts(tr)}" fill="none" stroke="${CLAY}" stroke-width="1.4" stroke-dasharray="2 4" marker-end="url(#arrRed)"/>`);
// label anchors
const la={tv:P(0.13,3.2,1.55),vase:P(VX+0.05,VY,1.25),wardrobe:P(2.72,0.6,2.2),shelf:P(2.85,3.4,2.0),commode:P(0.22,3.2,0.9),mirror:P(0.16,2.33,1.7),
  tvFaceBL:P(0.13,3.7,1.1),tvFaceBR:P(0.13,2.7,1.1),tvFaceTR:P(0.13,2.7,1.7),vaseTop:P(VX,VY,1.25),fanEnd:P(VX+VR,VY,0)};
console.log(out.join('\n'));
console.error(JSON.stringify(Object.fromEntries(Object.entries(la).map(([k,v])=>[k,[f(v[0]),f(v[1])]]))));
