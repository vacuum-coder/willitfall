// Walls mode for C-Walls: same projection, palette and wall height as sceneC.js.
// Room: 3.0 x 4.2 rectangle plus a 1.2 x 1.5 niche at the front-right (plan x 3.0..4.2, y 2.7..4.2).
// Two back walls at full height (x=0, y=0), all other walls cut low (dollhouse section), no furniture.
const c=Math.cos(Math.PI/6), s=64, ox=250, oy=196;
const P=(x,y,z)=>[ (x-y)*c*s+ox, ((x+y)/2 - z)*s+oy ];
const f=v=>Math.round(v*10)/10;
const pts=a=>a.map(p=>{const q=P(...p);return f(q[0])+','+f(q[1])}).join(' ');
const poly=(a,fill,extra='')=>`<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
const out=[];
const INK='#2B2622', POCHE='#3A332D', WL='#E7DFD3', WB='#F1EBE2';
const W=3,L=4.2,H=2.7,T=0.12, HC=0.12; // HC — height of the low cut walls
const NX=4.2, NY=2.7;                   // niche outer corner
const DX0=2.2, DX1=3.0;                 // door on wall 5 (y=4.2): offset 1.2 m from corner E, width 0.8 m
// cut wall box: visible faces are +x, +y and the poche top
function cut(x0,x1,y0,y1){
  out.push(poly([[x1,y0,0],[x1,y1,0],[x1,y1,HC],[x1,y0,HC]],WL,`stroke="${INK}" stroke-width="0.6" stroke-linejoin="round"`));
  out.push(poly([[x0,y1,0],[x1,y1,0],[x1,y1,HC],[x0,y1,HC]],WB,`stroke="${INK}" stroke-width="0.6" stroke-linejoin="round"`));
  out.push(poly([[x0,y0,HC],[x1,y0,HC],[x1,y1,HC],[x0,y1,HC]],POCHE,`stroke="${INK}" stroke-width="0.6" stroke-linejoin="round"`));
}
// back walls (full height)
out.push(poly([[0,0,0],[0,L,0],[0,L,H],[0,0,H]],WL));
out.push(poly([[0,0,0],[W,0,0],[W,0,H],[0,0,H]],WB));
// window on wall y=0 (wall 1)
out.push(poly([[0.5,0,1.0],[1.5,0,1.0],[1.5,0,2.2],[0.5,0,2.2]],'#E3EAE4',`stroke="${INK}" stroke-width="0.7"`));
out.push(`<polyline points="${pts([[1.0,0,1.0],[1.0,0,2.2]])}" fill="none" stroke="${INK}" stroke-width="0.6"/>`);
// wall caps (section poche) and the cut ends of the back walls
out.push(poly([[0,0,H],[W,0,H],[W,-T,H],[-T,-T,H]],POCHE));
out.push(poly([[0,0,H],[-T,-T,H],[-T,L,H],[0,L,H]],POCHE));
out.push(poly([[W,0,0],[W,-T,0],[W,-T,H],[W,0,H]],POCHE));
out.push(poly([[-T,L,0],[0,L,0],[0,L,H],[-T,L,H]],POCHE));
// L-shaped floor
const floor=[[0,0,0],[W,0,0],[W,NY,0],[NX,NY,0],[NX,L,0],[0,L,0]];
out.push(poly(floor,'#E9DFCF'));
for(let x=0.3;x<NX-0.01;x+=0.3){const y0=x<=W+0.001?0:NY; out.push(`<polyline points="${pts([[x,y0,0],[x,L,0]])}" fill="none" stroke="#DDD1BE" stroke-width="0.6"/>`);}
// floor-wall AO along the full-height walls
out.push(`<polyline points="${pts([[0,L,0],[0,0,0],[W,0,0]])}" fill="none" stroke="#D2C4AE" stroke-width="1.5"/>`);
// door swing on the floor: hinge at (3.0, 4.2), opens inward, leaf to the left (as on the plan)
const arc=[]; for(let a=0;a<=90;a+=6){const t=a*Math.PI/180; arc.push([DX1-0.8*Math.cos(t), L-0.8*Math.sin(t), 0.004]);}
out.push(`<polyline points="${pts(arc)}" fill="none" stroke="${INK}" stroke-width="0.9" stroke-dasharray="3 3"/>`);
out.push(`<polyline points="${pts([[DX1,L,0.004],[DX1,L-0.8,0.004]])}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`);
// low cut walls, back to front
cut(W, W+T, -T, NY-T);        // wall 2
cut(W, NX, NY-T, NY);          // wall 3 (niche)
cut(NX, NX+T, NY-T, L);        // wall 4
cut(-T, DX0, L, L+T);          // wall 5, left of the door
cut(DX1, NX+T, L, L+T);        // wall 5, right of the door
// corner markers (same round handles as on the plan), at the top of the cut
const corners=[[0,0],[W,0],[W,NY],[NX,NY],[NX,L],[0,L]];
for(const [x,y] of corners){const q=P(x,y,HC); out.push(`<circle cx="${f(q[0])}" cy="${f(q[1])}" r="4.5" fill="#FFFFFF" stroke="${INK}" stroke-width="1.5"/>`);}
const la={window:P(1.0,0,1.6),door:P(2.6,L,0.02),niche:P((W+NX)/2,(NY+L)/2,0),cornerD:P(NX,NY,HC),bottom:P(NX+T,L+T,0),left:P(-T,L+T,0)};
console.log(out.join('\n'));
console.error(JSON.stringify(Object.fromEntries(Object.entries(la).map(([k,v])=>[k,[f(v[0]),f(v[1])]]))));
