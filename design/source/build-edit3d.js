// Builds project/C-Edit3D-Desktop.dc.html from the normalised main screen project/C-Desktop.dc.html.
// Everything shared (header, left column, headline, 3D panel frame, bottom row, right column) is copied
// byte-for-byte; only the edit-mode parts are replaced. Each replacement must match exactly once.
const fs = require('fs');
const path = require('path');
const dir = __dirname;
let s = fs.readFileSync(path.join(dir, 'project/C-Desktop.dc.html'), 'utf8');
const scene = fs.readFileSync(path.join(dir, 'scene-edit3d.svgfrag'), 'utf8').trimEnd()
  .split('\n').map((l) => '          ' + l).join('\n');

function swap(label, re, to) {
  const m = s.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
  if (!m || m.length !== 1) throw new Error(`${label}: expected 1 match, got ${m ? m.length : 0}`);
  s = s.replace(re, () => to);
}
const lit = (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// A. title
swap('title', lit('<title>Спальня · десктоп</title>'), '<title>Правка в 3D · десктоп</title>');

// B. switch styles (the only new control type on this screen)
swap('css', lit('a:focus-visible,button:focus-visible'),
`.sw{-webkit-appearance:none;appearance:none;position:relative;flex:none;box-sizing:border-box;width:32px;height:20px;margin:0;border:1px solid #6B6159;border-radius:999px;background:#FFFFFF;cursor:pointer;transition:background-color 120ms}
.sw::before{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:999px;background:#6B6159;transition:transform 120ms}
.sw:checked{background:#2B2622;border-color:#2B2622}
.sw:checked::before{background:#FFFFFF;transform:translateX(12px)}
a:focus-visible,button:focus-visible`);

// C. plan: same selection as in 3D (dashed frame + handles, rotation ring clipped to the room, handle at 90°,
//    move arrows from (225,145) = floor point (2.25, 1.45) m); fall zones, 2,2 m dimension and slide arrow hidden.
swap('plan aria', /aria-label="План спальни 300 на 420 см\.[^"]*"/,
  'aria-label="План спальни 300 на 420 см. Выбран шкаф у правой стены справа от изголовья: пунктирная рамка, кольцо поворота с ручкой и стрелки перемещения к кровати и вдоль стены. Зоны падения скрыты. Стеллаж у двери, комод и зеркало у левой стены."');
swap('plan defs', /<defs>\s*<pattern id="hatch2d"[\s\S]*?<\/defs>/,
`<defs>
              <clipPath id="planRoom"><rect x="0" y="0" width="300" height="420"/></clipPath>
              <marker id="pArrMove" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,1 L9,5 L0,9 z" fill="#2B2622"/></marker>
            </defs>`);
swap('plan zones', /\n\s*<rect x="25" y="0" width="220" height="120" fill="rgba\(184,74,48,0\.12\)"\/>\n\s*<rect x="25" y="0"[^\n]*\n\s*<rect x="70" y="300"[^\n]*\n\s*<rect x="70" y="300"[^\n]*/, '');
swap('plan ring', lit('            <rect x="245" y="0" width="55" height="120" fill="#F4DCD3"'),
`            <g clip-path="url(#planRoom)" fill="none">
              <circle cx="272.5" cy="60" r="85" stroke="#FFFFFF" stroke-width="4"/>
              <circle cx="272.5" cy="60" r="85" stroke="#2B2622" stroke-width="1.6"/>
            </g>
            <rect x="245" y="0" width="55" height="120" fill="#F4DCD3"`);
swap('plan slide arrow', /\n\s*<line x1="54" y1="284" x2="98" y2="284"[^\n]*/, '');
swap('plan dimension', /\n\s*<line x1="241" y1="104" x2="29" y2="104"[^\n]*\n\s*<text x="135" y="95"[^\n]*/, '');
swap('plan handles', /(<rect x="302" y="122" width="8" height="8"\/>\n\s*<\/g>)/,
`<rect x="302" y="122" width="8" height="8"/>
            </g>
            <circle cx="272.5" cy="145" r="9" fill="#FFFFFF" stroke="#2B2622" stroke-width="1.6"/>
            <g stroke-linecap="round">
              <line x1="225" y1="145" x2="190" y2="145" stroke="#FFFFFF" stroke-width="5"/>
              <line x1="225" y1="145" x2="225" y2="180" stroke="#FFFFFF" stroke-width="5"/>
            </g>
            <line x1="225" y1="145" x2="190" y2="145" stroke="#2B2622" stroke-width="2" marker-end="url(#pArrMove)"/>
            <line x1="225" y1="145" x2="225" y2="180" stroke="#2B2622" stroke-width="2" marker-end="url(#pArrMove)"/>
            <circle cx="225" cy="145" r="3.5" fill="#2B2622" stroke="#FFFFFF" stroke-width="1.5"/>`);

// D. plan legend: «зона падения» is hidden in edit mode -> key for the selection frame
swap('plan legend', /<rect x="0\.5" y="0\.5" width="13" height="7" fill="#F4DCD3" stroke="#B84A30" stroke-dasharray="3 2"\/><\/svg>зона падения/,
  '<rect x="0.5" y="0.5" width="13" height="7" fill="none" stroke="#2B2622" stroke-dasharray="3 2"/></svg>выбрано');

// E. 3D header: legend moves into the scene; camera panel gets zoom + «Вернуть вид»
const legendRe = /\n {10}<ul aria-label="Легенда"[\s\S]*?<\/ul>/;
const legend = s.match(legendRe)[0].trim();
swap('header legend', legendRe, `
          <div style="display:flex;align-items:center;gap:8px">
            <div role="group" aria-label="Масштаб" style="display:flex;height:32px;box-sizing:border-box;border:1px solid #D9CFC1;border-radius:6px;background:#FFFFFF">
              <button type="button" aria-label="Приблизить" style="width:32px;height:100%;padding:0;border:0;background:transparent;display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 3v10M3 8h10" fill="none" stroke="#2B2622" stroke-width="1.5" stroke-linecap="round"/></svg></button>
              <button type="button" aria-label="Отдалить" style="width:32px;height:100%;padding:0;border:0;border-left:1px solid #E6DED2;background:transparent;display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8h10" fill="none" stroke="#2B2622" stroke-width="1.5" stroke-linecap="round"/></svg></button>
            </div>
            <button type="button" style="height:32px;padding:0 10px;display:flex;align-items:center;gap:6px;border:1px solid #D9CFC1;border-radius:6px;background:#FFFFFF;font-size:13px;line-height:18px;font-weight:600;color:#2B2622;white-space:nowrap"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B2622" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>Вернуть вид</button>
          </div>`);

// F. scene: edit-mode SVG (sceneC-edit3d.js, same 518×510 frame) + HTML overlays
const tbBtn = (color, icon, label) =>
  `            <button type="button" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:44px;padding:0 8px;border:0;border-radius:6px;background:transparent;font-size:12px;line-height:16px;font-weight:600;color:${color};white-space:nowrap">${icon}${label}</button>`;
const ic24 = (color, d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
swap('scene', /<div style="margin-top:12px;height:510px;flex:none">\n\s*<svg viewBox="-48 -26 518 510"[\s\S]*?<\/svg>\n {8}<\/div>/,
`<div style="position:relative;margin-top:12px;height:510px;flex:none">
${scene}
          <div style="position:absolute;left:0;top:0;display:flex;align-items:center;gap:16px">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;line-height:18px;font-weight:600;color:#2B2622;cursor:pointer"><input class="sw" type="checkbox" role="switch">Показывать зоны</label>
            <span aria-hidden="true" style="width:1px;height:16px;background:#E6DED2"></span>
            ${legend}
          </div>

          <div role="toolbar" aria-label="Действия со шкафом" style="position:absolute;right:8px;top:96px;display:flex;align-items:stretch;gap:2px;padding:4px;background:#FFFFFF;border:1px solid #E6DED2;border-radius:12px;box-shadow:0 12px 32px rgba(43,38,34,0.14)">
${tbBtn('#2B2622', ic24('#2B2622', '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>'), 'Повернуть')}
${tbBtn('#2B2622', '<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#2B2622" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 2.5v10.5h10.5"/><path d="M3 7.5h2.5M8.5 13v-2.5"/></svg>', 'Закрепить')}
${tbBtn('#2B2622', ic24('#2B2622', '<path d="M12 2.5v7"/><path d="M9 7l3 3 3-3"/><rect x="6" y="13" width="12" height="6" rx="1"/><path d="M3 21.5h18"/>'), 'Поставить на…')}
            <span aria-hidden="true" style="width:1px;margin:6px 2px;background:#E6DED2"></span>
${tbBtn('#B84A30', ic24('#B84A30', '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10.5 11v5.5M13.5 11v5.5"/>'), 'Удалить')}
            <span aria-hidden="true" style="position:absolute;right:88px;bottom:-6px;width:10px;height:10px;background:#FFFFFF;border-right:1px solid #E6DED2;border-bottom:1px solid #E6DED2;transform:rotate(45deg)"></span>
          </div>

          <p style="position:absolute;left:0;right:0;bottom:4px;margin:0;text-align:center;font-size:12px;line-height:16px;font-weight:500;color:#6B6159;white-space:nowrap">Тяните предмет по полу · колесо — масштаб · правая кнопка — вращать камеру</p>
        </div>`);

fs.writeFileSync(path.join(dir, 'project/C-Edit3D-Desktop.dc.html'), s);
console.log('written', s.length, 'chars');
