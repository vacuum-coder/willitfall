// 2D plans at 1:1 px (no viewBox scaling) so that every label is exactly 12px.
const fs=require('fs');
const r=v=>Math.round(v*100)/100;
const INK='#2B2622', T2='#6B6159', CLAY='#B84A30', SAGE='#4F6E5D', OCHRE='#8A5F17', POCHE='#3A332D', FLOOR='#FBF8F3';
const TXT='font-family="Manrope, sans-serif" font-size="12"';

// ---------- Walls editor: L-shaped room, k = 0.6 px/cm ----------
{
  const k=0.6, ox=57, oy=38, X=c=>r(ox+c*k), Y=c=>r(oy+c*k), p=(a)=>a.map(([x,y])=>X(x)+','+Y(y)).join(' ');
  const floor=[[0,0],[300,0],[300,270],[420,270],[420,420],[0,420]];
  const outer=[[-12,-12],[312,-12],[312,258],[432,258],[432,432],[-12,432]];
  const o=[];
  o.push(`<defs><clipPath id="wFloor"><polygon points="${p(floor)}"/></clipPath></defs>`);
  o.push(`<polygon points="${p(outer)}" fill="${POCHE}"/>`);
  o.push(`<polygon points="${p(floor)}" fill="${FLOOR}"/>`);
  const g=[]; for(let c=50;c<420;c+=50){g.push(`<line x1="${X(c)}" y1="${Y(0)}" x2="${X(c)}" y2="${Y(420)}"/>`); g.push(`<line x1="${X(0)}" y1="${Y(c)}" x2="${X(420)}" y2="${Y(c)}"/>`);}
  o.push(`<g clip-path="url(#wFloor)" stroke="#DDD1BE" stroke-width="0.6">${g.join('')}</g>`);
  // window on wall 1
  o.push(`<rect x="${X(50)}" y="${Y(-12)}" width="${r(100*k)}" height="${r(12*k)}" fill="#FFFFFF" stroke="${INK}" stroke-width="0.8"/>`);
  o.push(`<line x1="${X(50)}" y1="${Y(-6)}" x2="${X(150)}" y2="${Y(-6)}" stroke="${INK}" stroke-width="0.8"/>`);
  // door on wall 5: 1.2 m from corner E, 0.8 m wide, opens inward, leaf to the left (hinge at x=300)
  o.push(`<rect x="${X(220)}" y="${Y(420)}" width="${r(80*k)}" height="${r(12*k)}" fill="#FFFFFF"/>`);
  o.push(`<path d="M${X(220)},${Y(420)} A${r(80*k)},${r(80*k)} 0 0 1 ${X(300)},${Y(340)}" fill="none" stroke="${INK}" stroke-width="0.8" stroke-dasharray="3 3"/>`);
  o.push(`<line x1="${X(300)}" y1="${Y(420)}" x2="${X(300)}" y2="${Y(340)}" stroke="${INK}" stroke-width="1.6"/>`);
  // door offset dimension (outside, under wall 5)
  const dy=315, e0=r(Y(432)+2), e1=319;
  o.push(`<g stroke="${T2}" stroke-width="0.9"><line x1="${X(300)}" y1="${e0}" x2="${X(300)}" y2="${e1}"/><line x1="${X(420)}" y1="${e0}" x2="${X(420)}" y2="${e1}"/><line x1="${X(300)}" y1="${dy}" x2="${X(420)}" y2="${dy}"/><line x1="${X(300)-4}" y1="${dy+4}" x2="${X(300)+4}" y2="${dy-4}"/><line x1="${X(420)-4}" y1="${dy+4}" x2="${X(420)+4}" y2="${dy-4}"/></g>`);
  o.push(`<text x="${X(360)}" y="${dy-4}" text-anchor="middle" ${TXT} font-weight="600" fill="${T2}">1,2 м</text>`);
  // wall length labels: number in secondary ink, length in ink
  const lab=(x,y,n,len,rot)=>`<text x="${x}" y="${y}"${rot?` transform="rotate(-90 ${x} ${y})"`:''} text-anchor="middle" ${TXT} font-weight="600" fill="${INK}"><tspan fill="${T2}">${n} ·</tspan> ${len}</text>`;
  o.push(lab(X(150), r(Y(-12)-8), 1, '3,0 м'));
  o.push(lab(r(X(312)+15), Y(135), 2, '2,7 м', true));
  o.push(lab(X(360), r(Y(258)-8), 3, '1,2 м'));
  o.push(lab(r(X(432)+17), Y(345), 4, '1,5 м', true));
  o.push(lab(r(X(-12)-6), Y(210), 6, '4,2 м', true));
  // wall 5 is the selected wall (door host): dark pill
  o.push(`<rect x="${X(210)-34}" y="303" width="68" height="24" rx="4" fill="${INK}"/>`);
  o.push(`<text x="${X(210)}" y="319" text-anchor="middle" ${TXT} font-weight="600" fill="#FFFFFF">5 · 4,2 м</text>`);
  fs.writeFileSync(__dirname+'/wallsPlan.svgfrag',o.join('\n'));
  const corners={A:[0,0],B:[300,0],C:[300,270],D:[420,270],E:[420,420],F:[0,420]};
  const mids={1:[150,0],2:[300,135],3:[360,270],4:[420,345],5:[210,420],6:[0,210]};
  console.log('corners',JSON.stringify(Object.fromEntries(Object.entries(corners).map(([n,[x,y]])=>[n,[X(x),Y(y)]]))));
  console.log('mids',JSON.stringify(Object.fromEntries(Object.entries(mids).map(([n,[x,y]])=>[n,[X(x),Y(y)]]))));
}

// ---------- Furniture plan with TV and vase, k = 0.56 px/cm ----------
{
  const k=0.56, ox=32, oy=32, X=c=>r(ox+c*k), Y=c=>r(oy+c*k), S=c=>r(c*k);
  const rect=(x,y,w,h,extra)=>`<rect x="${X(x)}" y="${Y(y)}" width="${S(w)}" height="${S(h)}" ${extra}/>`;
  const o=[];
  o.push(`<defs><pattern id="hatch2d" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${CLAY}" stroke-width="1" stroke-opacity="0.5"/></pattern><marker id="pArrOchre" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,1 L9,5 L0,9 z" fill="${OCHRE}"/></marker></defs>`);
  o.push(rect(0,0,300,420,`fill="${FLOOR}"`));
  // bed
  o.push(rect(20,0,160,200,`rx="2" fill="#F3EEE5" stroke="${INK}" stroke-width="0.8"`));
  o.push(`<path d="M${X(20)},${Y(70)} H${X(180)} V${Y(197)} A${S(3)},${S(3)} 0 0 1 ${X(177)},${Y(200)} H${X(23)} A${S(3)},${S(3)} 0 0 1 ${X(20)},${Y(197)} Z" fill="#DCE6DF" stroke="${SAGE}" stroke-width="0.6"/>`);
  o.push(rect(30,8,140,42,`rx="4" fill="#FFFFFF" stroke="${INK}" stroke-width="0.6"`));
  o.push(`<text x="${X(100)}" y="${Y(164)}" text-anchor="middle" ${TXT} font-weight="600" fill="${INK}">Кровать</text>`);
  // fall zones
  const zone=(x,y,w,h)=>{o.push(rect(x,y,w,h,`fill="rgba(184,74,48,0.12)"`)); o.push(rect(x,y,w,h,`fill="url(#hatch2d)" stroke="${CLAY}" stroke-width="0.8" stroke-dasharray="4 3"`));};
  // door clearance under the zones, so the shelf hatch over the exit stays visible
  o.push(rect(200,330,80,90,`fill="#E3EAE4" stroke="${SAGE}" stroke-width="0.8" stroke-dasharray="3 2"`));
  zone(25,0,220,120); zone(70,300,200,80);
  // door
  o.push(`<path d="M${X(200)},${Y(340)} A${S(80)},${S(80)} 0 0 1 ${X(280)},${Y(420)}" fill="none" stroke="${INK}" stroke-width="0.6" stroke-dasharray="2 2"/>`);
  o.push(`<line x1="${X(200)}" y1="${Y(420)}" x2="${X(200)}" y2="${Y(340)}" stroke="${INK}" stroke-width="1.5"/>`);
  o.push(`<text x="${X(244)}" y="${Y(409)}" text-anchor="middle" ${TXT} font-weight="700" fill="${SAGE}" stroke="#E3EAE4" stroke-width="3" stroke-linejoin="round" paint-order="stroke">выход</text>`);
  // wardrobe (not selected)
  o.push(rect(245,0,55,120,`fill="#F4DCD3" stroke="${CLAY}" stroke-width="1"`));
  o.push(`<text x="${X(280)}" y="${Y(60)}" transform="rotate(-90 ${X(280)} ${Y(60)})" text-anchor="middle" ${TXT} font-weight="700" fill="${INK}">Шкаф</text>`);
  // shelf
  o.push(rect(270,300,30,80,`fill="#F4DCD3" stroke="${CLAY}" stroke-width="0.9"`));
  o.push(`<text x="${X(264)}" y="${Y(292)}" text-anchor="end" ${TXT} font-weight="700" fill="${INK}">Стеллаж</text>`);
  // dresser with the vase on it and the TV on the wall above it
  o.push(rect(0,270,45,100,`fill="#F5EAD3" stroke="${OCHRE}" stroke-width="0.9"`));
  o.push(`<text x="${X(32)}" y="${Y(308)}" transform="rotate(-90 ${X(32)} ${Y(308)})" text-anchor="middle" ${TXT} font-weight="700" fill="${INK}">Комод</text>`);
  o.push(`<line x1="${X(54)}" y1="${Y(284)}" x2="${X(98)}" y2="${Y(284)}" stroke="${OCHRE}" stroke-width="1.2" marker-end="url(#pArrOchre)"/>`);
  o.push(rect(0,270,8,100,`fill="#F4DCD3" stroke="${CLAY}" stroke-width="0.9"`));
  o.push(`<circle cx="${X(30)}" cy="${Y(355)}" r="3" fill="#F4DCD3" stroke="${CLAY}" stroke-width="0.9"/>`);
  const halo='stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" paint-order="stroke"';
  o.push(`<text x="${X(54)}" y="${Y(325)}" ${TXT} font-weight="700" fill="${INK}" ${halo}>Телевизор</text>`);
  o.push(`<text x="${X(54)}" y="${Y(360)}" ${TXT} font-weight="700" fill="${INK}" ${halo}>Ваза</text>`);
  // mirror
  o.push(rect(0,205,30,55,`fill="#E3EAE4" stroke="${SAGE}" stroke-width="0.9"`));
  o.push(`<path d="M${X(8)},${Y(213)} V${Y(225)} H${X(20)}" fill="none" stroke="${SAGE}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`);
  o.push(`<text x="${X(40)}" y="${Y(240)}" ${TXT} font-weight="700" fill="${INK}">Зеркало</text>`);
  // walls
  o.push(`<g fill="${POCHE}">${[[-12,-12,62,12],[150,-12,162,12],[-12,0,12,432],[300,0,12,432],[-12,420,212,12],[280,420,32,12]].map(([x,y,w,h])=>rect(x,y,w,h,'')).join('')}</g>`);
  o.push(rect(50,-12,100,12,`fill="#FFFFFF" stroke="${INK}" stroke-width="0.6"`));
  o.push(`<line x1="${X(50)}" y1="${Y(-6)}" x2="${X(150)}" y2="${Y(-6)}" stroke="${INK}" stroke-width="0.6"/>`);
  // selection frame around the TV
  const fx0=X(-6), fx1=X(12), fy0=Y(264), fy1=Y(376);
  o.push(`<rect x="${fx0}" y="${fy0}" width="${r(fx1-fx0)}" height="${r(fy1-fy0)}" fill="none" stroke="${INK}" stroke-width="0.8" stroke-dasharray="3 2"/>`);
  o.push(`<g fill="#FFFFFF" stroke="${INK}" stroke-width="0.9">${[[fx0,fy0],[fx1,fy0],[fx0,fy1],[fx1,fy1]].map(([x,y])=>`<rect x="${r(x-2.5)}" y="${r(y-2.5)}" width="5" height="5"/>`).join('')}</g>`);
  // dimensions and scale
  const t=(x0,y0,x1,y1)=>`<line x1="${r(x0)}" y1="${r(y0)}" x2="${r(x1)}" y2="${r(y1)}"/>`;
  o.push(`<g stroke="${T2}" stroke-width="0.6">${t(X(0),Y(-16),X(0),Y(-34))}${t(X(300),Y(-16),X(300),Y(-34))}${t(X(0),Y(-28),X(300),Y(-28))}${t(X(0)-3,Y(-28)+3,X(0)+3,Y(-28)-3)}${t(X(300)-3,Y(-28)+3,X(300)+3,Y(-28)-3)}${t(X(-16),Y(0),X(-34),Y(0))}${t(X(-16),Y(420),X(-34),Y(420))}${t(X(-28),Y(0),X(-28),Y(420))}${t(X(-28)-3,Y(0)+3,X(-28)+3,Y(0)-3)}${t(X(-28)-3,Y(420)+3,X(-28)+3,Y(420)-3)}</g>`);
  o.push(`<text x="${X(150)}" y="11" text-anchor="middle" ${TXT} font-weight="600" fill="${T2}">300</text>`);
  o.push(`<text x="11" y="${Y(210)}" transform="rotate(-90 11 ${Y(210)})" text-anchor="middle" ${TXT} font-weight="600" fill="${T2}">420</text>`);
  o.push(`<rect x="${X(0)}" y="${Y(450)}" width="${S(50)}" height="4" fill="${INK}"/>`);
  o.push(`<rect x="${X(50)}" y="${Y(450)}" width="${S(50)}" height="4" fill="#FFFFFF" stroke="${INK}" stroke-width="0.6"/>`);
  o.push(`<text x="${X(0)}" y="302" text-anchor="middle" ${TXT} fill="${T2}">0</text>`);
  o.push(`<text x="${X(100)}" y="302" text-anchor="middle" ${TXT} fill="${T2}">1 м</text>`);
  fs.writeFileSync(__dirname+'/itemsPlan.svgfrag',o.join('\n'));
  console.log('items: floor bottom',Y(420),'scale y',Y(450),'frame',fx0,fy0,fx1,fy1);
}
