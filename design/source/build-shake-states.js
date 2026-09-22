// Builds C-Shake-Desktop.dc.html and C-States.dc.html from the reference C-Desktop artboard.
// All values are taken from max/design-system/calm-night/tokens.css (written as literals).
const fs = require('fs');
const path = require('path');
const D = __dirname;
const OUT = path.join(D, 'project');
const ref = fs.readFileSync(path.join(D, 'reference', 'C-Desktop.dc.html'), 'utf8');

function cut(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('marker not found: ' + marker);
  const j = src.indexOf('</svg>', i);
  return src.slice(i, j + 6);
}
function swap(s, a, b) {
  if (!s.includes(a)) throw new Error('missing: ' + a);
  return s.split(a).join(b);
}

// ---------- reference plan, colors normalized to tokens ----------
let planSvg = cut(ref, '<svg viewBox="-60 -50 400 540"');
planSvg = swap(planSvg, '#FBF7F1', '#FBF8F3');
planSvg = swap(planSvg, '#F4EDE3', '#F3EEE5');
planSvg = swap(planSvg, '#DCE5DE', '#DCE6DF');
planSvg = swap(planSvg, '#F2D8CE', '#F4DCD3');
planSvg = swap(planSvg, '#F7E6DF', '#F4DCD3');

// ---------- reference 3D scene (wardrobe in flight), normalized ----------
let sceneSvg = cut(ref, '<svg viewBox="-48 -26 518 502"');
sceneSvg = swap(sceneSvg, 'rgba(184,74,48,0.09)', 'rgba(184,74,48,0.12)');
sceneSvg = swap(sceneSvg, 'font-size="12.5"', 'font-size="13"');
sceneSvg = swap(sceneSvg,
  'aria-label="Изометрия спальни: шкаф наклонился на 32 градуса и падает на подушку, пунктиром показано, где он окажется; стеллаж у двери упадёт на проход; комод сдвинется; зеркало закреплено."',
  'aria-label="Изометрия спальни во время тряски: пол дрожит, шкаф в полёте — наклонился на 32 градуса и падает на подушку, пунктиром показано, где он окажется; стеллаж у двери упадёт на проход; комод сдвинется; зеркало закреплено."');
// light shake lines at the floor: a ghost of the front floor edges and short motion strokes at the corners
const shakeLines = `
<g fill="none" stroke="#6B6159" stroke-width="1" stroke-linejoin="round">
  <polyline points="11.2,330.4 177.5,426.4 410.3,292" stroke-opacity="0.4"/>
  <polyline points="23.2,330.4 189.5,426.4 422.3,292" stroke-opacity="0.25"/>
</g>
<g stroke="#6B6159" stroke-width="1.5" stroke-linecap="round">
  <line x1="-14" y1="320" x2="-2" y2="320"/>
  <line x1="-22" y1="329" x2="-2" y2="329"/>
  <line x1="-14" y1="338" x2="-2" y2="338"/>
  <line x1="428" y1="283" x2="440" y2="283"/>
  <line x1="428" y1="292" x2="448" y2="292"/>
  <line x1="428" y1="301" x2="440" y2="301"/>
  <line x1="168" y1="440" x2="199" y2="440"/>
  <line x1="175" y1="448" x2="192" y2="448"/>
</g>`;
const aoLine = '<polyline points="17.2,330.4 250,196 416.3,292" fill="none" stroke="#D2C4AE" stroke-width="1.5"/>';
sceneSvg = swap(sceneSvg, aoLine, aoLine + shakeLines);

// ---------- skeleton scene (same projection and geometry as sceneC.js) ----------
const cs = Math.cos(Math.PI / 6), S = 64, OX = 250, OY = 196;
const P = (x, y, z) => [(x - y) * cs * S + OX, ((x + y) / 2 - z) * S + OY];
const r1 = (v) => Math.round(v * 10) / 10;
const pts = (a) => a.map((p) => { const q = P(...p); return r1(q[0]) + ',' + r1(q[1]); }).join(' ');
const W = 3, L = 4.2, H = 2.7;
function skBox(x0, x1, y0, y1, z0, z1) {
  const st = 'stroke="#D2C4AE" stroke-width="0.8" stroke-linejoin="round"';
  return [
    `<polygon points="${pts([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])}" fill="#DDD1BE" ${st}/>`,
    `<polygon points="${pts([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])}" fill="#D2C4AE" ${st}/>`,
    `<polygon points="${pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])}" fill="#F1EBE2" ${st}/>`,
  ].join('\n');
}
const skeleton = [
  `<polygon points="${pts([[0, 0, 0], [0, L, 0], [0, L, H], [0, 0, H]])}" fill="#E7DFD3"/>`,
  `<polygon points="${pts([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]])}" fill="#F1EBE2"/>`,
  `<polygon points="${pts([[0, 0, 0], [W, 0, 0], [W, L, 0], [0, L, 0]])}" fill="#E9DFCF"/>`,
  `<polyline points="${pts([[0, L, 0], [0, 0, 0], [W, 0, 0]])}" fill="none" stroke="#D2C4AE" stroke-width="1.5"/>`,
  skBox(0.2, 1.8, 0, 0.06, 0, 0.95),
  skBox(0.2, 1.8, 0.06, 2.0, 0, 0.52),
  skBox(0.02, 0.3, 2.05, 2.6, 0, 1.7),
  skBox(0, 0.45, 2.7, 3.7, 0, 0.9),
  skBox(2.45, 3.0, 0, 1.2, 0, 2.2),
  skBox(2.7, 3.0, 3.0, 3.8, 0, 2.0),
].join('\n');

// ---------- shared pieces ----------
const head = (title) => `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,500;0,600;1,500&amp;family=Manrope:wght@400;500;600;700&amp;display=swap">
<style>
body{margin:0;font-family:'Manrope',system-ui,sans-serif;background:#F6F1EA;color:#2B2622}
a{color:#2B2622;text-decoration:none}a:hover{color:#B84A30}
button,select,input{font-family:inherit}
button{cursor:pointer}
button:disabled,select:disabled,input:disabled{cursor:not-allowed}
.btn-p{transition:background-color 120ms cubic-bezier(0.2,0.7,0.2,1)}
.btn-p:hover{background:#A4452D}
.btn-p:active{background:#8E3A25}
.btn-s{transition:background-color 120ms cubic-bezier(0.2,0.7,0.2,1)}
.btn-s:hover{background:#FBF8F3}
.btn-p:disabled:hover{background:#B84A30}
.btn-s:disabled:hover{background:#FFFFFF}
.seg:hover{background:#FBF8F3}
.rng{-webkit-appearance:none;appearance:none;background:transparent;margin:0;padding:0;cursor:pointer}
.rng:disabled{cursor:not-allowed}
.rng::-webkit-slider-runnable-track{height:28px;background:transparent;border:0}
.rng::-moz-range-track{height:28px;background:transparent;border:0}
.rng::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;box-sizing:border-box;width:18px;height:18px;margin-top:calc((28px - 18px) / 2);border-radius:50%;background:#FFFFFF;border:2px solid #2B2622;box-shadow:0 1px 3px rgba(43,38,34,0.18)}
.rng::-moz-range-thumb{box-sizing:border-box;width:18px;height:18px;border-radius:50%;background:#FFFFFF;border:2px solid #2B2622;box-shadow:0 1px 3px rgba(43,38,34,0.18)}
.num::-webkit-inner-spin-button,.num::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.num{-moz-appearance:textfield;appearance:textfield}
.chk{width:18px;height:18px;margin:1px 0 0;accent-color:#4F6E5D;cursor:pointer}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
a:focus-visible,button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #2B2622;outline-offset:2px}
</style>
</helmet>
`;
const tail = (w, h) => `</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}} }'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
`;

const OFF = ';opacity:0.4';
const dis = (on) => (on ? ' disabled="disabled"' : '');

const ico = {
  chevron: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false" style="position:absolute;right:14px;top:14px;pointer-events:none"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="#2B2622" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus10: '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M5 1v8M1 5h8" stroke="#2B2622" stroke-width="1.5" stroke-linecap="round"/></svg>',
  plus16: (c) => `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 3v10M3 8h10" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  shake: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M1 8.5h2.5l1.5-3 2.5 6 2.5-7 2 4H15" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  move: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1.5v13M1.5 8h13M8 1.5L6 3.5M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2" fill="none" stroke="#6B6159" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false" style="flex:none"><path d="M10 2.5l8 14.5H2z" fill="none" stroke="#B84A30" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 8v4.5M10 14.8v0.1" stroke="#B84A30" stroke-width="1.5" stroke-linecap="round"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" stroke="#2B2622" stroke-width="1.5" stroke-linecap="round"/></svg>',
  cubeOff: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5z M3.5 6.25L10 10l6.5-3.75 M10 10v7.5" fill="none" stroke="#6B6159" stroke-width="1.5" stroke-linejoin="round"/><path d="M2.5 2.5l15 15" stroke="#B84A30" stroke-width="1.5" stroke-linecap="round"/></svg>',
  planIco: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 2.5h11v11h-11z M2.5 7.5h5 M7.5 2.5v5 M10 13.5v-3.5h3.5" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  undo: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5.5 3.5L2.5 6.5l3 3M2.5 6.5H10a3.5 3.5 0 0 1 0 7H7" fill="none" stroke="#2B2622" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  spinner: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6" fill="none" stroke="#E6DED2" stroke-width="1.5"/><path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="#6B6159" stroke-width="1.5" stroke-linecap="round"/></svg>',
  addRoom: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false" style="flex:none;margin-top:2px"><path d="M3 3h14v14H3z" fill="none" stroke="#6B6159" stroke-width="1.5" stroke-dasharray="3 2"/><path d="M10 6.5v7M6.5 10h7" stroke="#2B2622" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

const PANEL = 'background:#FFFFFF;border:1px solid #E6DED2;border-radius:12px;box-shadow:0 1px 2px rgba(43,38,34,0.04)';
const BTN_P = 'height:40px;padding:0 16px;display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:6px;background:#B84A30;color:#FFFFFF;font-size:14px;line-height:20px;font-weight:600;white-space:nowrap';
const BTN_S = 'height:40px;padding:0 14px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #D9CFC1;border-radius:6px;background:#FFFFFF;color:#2B2622;font-size:14px;line-height:20px;font-weight:600;white-space:nowrap';
const CHIP = 'display:flex;align-items:center;gap:4px;height:32px;padding:0 8px;border:1px solid #E6DED2;border-radius:6px;background:#FBF8F3;font-size:13px;line-height:18px;font-weight:600;color:#2B2622;text-align:left;white-space:nowrap';
const NUMERAL = "font-family:'Literata',serif;font-style:italic;font-weight:500;font-size:22px;line-height:28px;color:#2B2622";

const chip = (label, off) => `<button type="button" class="btn-s"${dis(off)} style="${CHIP}${off ? OFF : ''}">${ico.plus10}${label}</button>`;

function segmented(off) {
  const a = off ? dis(true) : '';
  return `<div role="group" aria-label="Камера" style="display:flex;height:32px;box-sizing:border-box;border:1px solid #D9CFC1;border-radius:6px;background:#FFFFFF;overflow:hidden${off ? OFF : ''}">
              <button type="button" aria-pressed="true"${a} style="height:30px;padding:0 12px;border:0;background:#2B2622;font-size:13px;line-height:18px;font-weight:600;color:#FFFFFF">Обзор</button>
              <button type="button" class="seg" aria-pressed="false"${a} style="height:30px;padding:0 12px;border:0;background:transparent;font-size:13px;line-height:18px;font-weight:500;color:#6B6159">Сверху</button>
              <button type="button" class="seg" aria-pressed="false"${a} style="height:30px;padding:0 12px;border:0;background:transparent;font-size:13px;line-height:18px;font-weight:500;color:#6B6159">С подушки</button>
            </div>`;
}

const legend = `<ul aria-label="Легенда" style="list-style:none;margin:0;padding:0;display:flex;gap:12px;font-size:12px;line-height:16px;color:#2B2622">
            <li style="display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="width:8px;height:8px;border-radius:999px;background:#B84A30"></span>упадёт</li>
            <li style="display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="width:8px;height:8px;border-radius:999px;background:#8A5F17"></span>сдвинется</li>
            <li style="display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="width:8px;height:8px;border-radius:999px;background:#4F6E5D"></span>закреплён</li>
          </ul>`;

// ---------- desktop screen blocks (reference layout, values on tokens) ----------
function header(off) {
  return `  <header style="height:64px;flex:none;box-sizing:border-box;display:flex;align-items:center;gap:48px;padding:0 32px;border-bottom:1px solid #E6DED2">
    <a href="#top" aria-label="[Название] — проверка спальни на землетрясение" style="display:flex;align-items:center;gap:12px;color:#2B2622">
      <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">
        <path d="M19 10.5A6.5 6.5 0 1 1 12.5 4a5 5 0 0 0 6.5 6.5z" stroke="#2B2622" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M2.5 22.5h5l1.8-3 2.4 5 3-7 2.4 5 1.4-2h7" stroke="#B84A30" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span style="display:flex;flex-direction:column">
        <span style="font-family:'Literata',serif;font-weight:600;font-size:18px;line-height:24px;letter-spacing:-0.01em">[Название]</span>
        <span style="font-size:13px;line-height:18px;color:#6B6159">проверка спальни на землетрясение</span>
      </span>
    </a>
    <nav aria-label="Разделы" style="display:flex;align-self:stretch;gap:32px">
      <a href="#room" aria-current="page" style="display:flex;align-items:center;height:63px;box-sizing:border-box;padding-top:2px;border-bottom:2px solid #B84A30;font-size:14px;line-height:20px;font-weight:700;color:#2B2622">Комната</a>
      <a href="#method" style="display:flex;align-items:center;height:63px;box-sizing:border-box;padding-top:2px;border-bottom:2px solid transparent;font-size:14px;line-height:20px;font-weight:500;color:#6B6159">Как посчитано</a>
      <a href="#physics" style="display:flex;align-items:center;height:63px;box-sizing:border-box;padding-top:2px;border-bottom:2px solid transparent;font-size:14px;line-height:20px;font-weight:500;color:#6B6159">Проверка физики</a>
    </nav>
    <div style="margin-left:auto;display:flex;align-items:center;gap:10px${off ? OFF : ''}">
      <label for="city" style="font-size:12px;line-height:16px;font-weight:600;color:#6B6159">Город</label>
      <div style="position:relative">
        <select id="city"${dis(off)} style="-webkit-appearance:none;appearance:none;height:40px;padding:0 36px 0 12px;border:1px solid #D9CFC1;border-radius:6px;background:#FFFFFF;font-size:14px;line-height:20px;font-weight:600;color:#2B2622">
          <option selected="selected">Алматы</option>
        </select>
        ${ico.chevron}
      </div>
    </div>
  </header>
`;
}

function leftColumn(off) {
  return `    <section aria-label="Параметры: комната, этаж, сила толчка" style="display:flex;flex-direction:column;min-width:0">

      <div style="display:flex;align-items:baseline;gap:10px;height:28px">
        <span style="${NUMERAL}">1</span>
        <label for="room-select" style="font-size:16px;line-height:24px;font-weight:700">Комната</label>
        <span style="font-size:13px;line-height:18px;color:#6B6159">готовая планировка или своя</span>
      </div>
      <div style="position:relative;margin-top:8px${off ? OFF : ''}">
        <select id="room-select"${dis(off)} style="-webkit-appearance:none;appearance:none;width:100%;height:40px;box-sizing:border-box;padding:0 36px 0 14px;border:1px solid #D9CFC1;border-radius:6px;background:#FFFFFF;font-size:14px;line-height:20px;font-weight:600;color:#2B2622">
          <option selected="selected">Спальня в панельке, 3,0 × 4,2 м</option>
          <option>Своя планировка</option>
        </select>
        ${ico.chevron}
      </div>

      <div style="margin-top:12px;padding:12px;${PANEL}">
        <div style="display:flex;align-items:baseline;justify-content:space-between;height:24px">
          <h2 style="margin:0;font-family:'Literata',serif;font-weight:600;font-size:16px;line-height:24px">План</h2>
          <span style="font-size:12px;line-height:16px;color:#6B6159">вид сверху · размеры в см</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          ${planSvg}
          <div role="group" aria-label="Добавить предмет" style="flex:1;display:flex;flex-direction:column;gap:6px;min-width:0">
            <span style="font-size:12px;line-height:16px;font-weight:600;color:#6B6159">Добавить:</span>
            ${chip('Шкаф', off)}
            ${chip('Стеллаж', off)}
            ${chip('Комод', off)}
            ${chip('Зеркало', off)}
            ${chip('Холодильник', off)}
            <div style="margin-top:auto;display:flex;flex-direction:column;gap:6px;padding-top:10px;border-top:1px solid #E6DED2;font-size:12px;line-height:16px;color:#6B6159">
              <span style="display:flex;align-items:center;gap:6px"><svg width="14" height="8" viewBox="0 0 14 8" aria-hidden="true" focusable="false"><rect x="0.5" y="0.5" width="13" height="7" fill="#F4DCD3" stroke="#B84A30" stroke-dasharray="3 2"/></svg>зона падения</span>
              <span style="display:flex;align-items:center;gap:6px"><svg width="14" height="8" viewBox="0 0 14 8" aria-hidden="true" focusable="false"><rect x="0.5" y="0.5" width="13" height="7" fill="none" stroke="#4F6E5D" stroke-dasharray="2 2"/></svg>проход</span>
            </div>
          </div>
        </div>
        <p style="margin:8px 0 0;display:flex;align-items:center;gap:8px;height:18px;font-size:13px;line-height:18px;color:#6B6159">
          ${ico.move}
          Перетащите предмет — у стены он прилипает сам
        </p>
      </div>

      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #E6DED2">
        <div style="display:flex;align-items:center;justify-content:space-between;height:32px">
          <div style="display:flex;align-items:baseline;gap:10px">
            <span style="${NUMERAL}">2</span>
            <label for="floor" style="font-size:16px;line-height:24px;font-weight:700">Этаж</label>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="display:flex;align-items:center;height:32px;box-sizing:border-box;border:1px solid #D9CFC1;border-radius:6px;background:#FFFFFF${off ? OFF : ''}">
              <button type="button" aria-label="Этажом ниже"${dis(off)} style="width:32px;height:30px;padding:0;border:0;background:transparent;display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 8h8" stroke="#2B2622" stroke-width="1.5" stroke-linecap="round"/></svg></button>
              <input id="floor" class="num" type="number" min="1" max="9" value="8"${dis(off)} style="width:40px;height:30px;box-sizing:border-box;padding:0;border:0;border-left:1px solid #E6DED2;border-right:1px solid #E6DED2;background:transparent;text-align:center;font-family:'Literata',serif;font-size:18px;font-weight:600;color:#2B2622">
              <button type="button" aria-label="Этажом выше"${dis(off)} style="width:32px;height:30px;padding:0;border:0;background:transparent;display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 8h8M8 4v8" stroke="#2B2622" stroke-width="1.5" stroke-linecap="round"/></svg></button>
            </div>
            <span style="font-size:14px;line-height:20px;color:#2B2622">из 9 <span style="color:#6B6159">·</span> <strong style="font-weight:700">×2,56</strong></span>
          </div>
        </div>
        <p style="margin:4px 0 0;font-size:13px;line-height:18px;color:#6B6159">На 8-м этаже толчок усиливается в 2,56 раза.</p>
      </div>

      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #E6DED2">
        <div style="display:flex;align-items:baseline;gap:10px;height:48px">
          <span style="${NUMERAL}">3</span>
          <label for="shake" style="font-size:16px;line-height:24px;font-weight:700">Сила толчка</label>
          <span style="margin-left:auto;font-family:'Literata',serif;font-weight:500;font-size:44px;line-height:48px;letter-spacing:-0.02em;color:#2B2622">9,0 <span style="font-size:22px;line-height:28px;letter-spacing:0">балла</span></span>
        </div>
        <p style="margin:0;text-align:right;font-size:13px;line-height:18px;color:#6B6159">на 8-м этаже это ускорение пола 1,02 g</p>
        <div style="padding:0 10px;margin-top:12px${off ? OFF : ''}">
          <div style="position:relative;height:40px">
            <div style="position:absolute;right:20%;top:0;height:40px;box-sizing:border-box;padding-right:6px;border-right:1px dashed #2B2622;font-size:12px;line-height:16px;font-weight:600;color:#2B2622;white-space:nowrap">расчётная для Алматы</div>
            <div style="position:absolute;right:75.4%;top:20px;height:20px;box-sizing:border-box;padding-right:6px;border-right:1px solid #B84A30;font-size:12px;line-height:16px;font-weight:600;color:#B84A30;white-space:nowrap">Стеллаж <span style="font-weight:700">6,2</span></div>
            <div style="position:absolute;left:39.4%;top:20px;height:20px;box-sizing:border-box;padding-left:6px;border-left:1px solid #B84A30;font-size:12px;line-height:16px;font-weight:600;color:#B84A30;white-space:nowrap">Шкаф <span style="font-weight:700">7,0</span></div>
          </div>
          <div style="position:relative;height:28px">
            <div style="position:absolute;left:0;right:0;top:12px;height:4px;border-radius:2px;background:#E6DED2"></div>
            <div style="position:absolute;left:0;width:80%;top:12px;height:4px;border-radius:2px;background:#3A332D"></div>
            <div style="position:absolute;left:24.6%;top:0;width:1px;height:11px;background:#B84A30"></div>
            <div style="position:absolute;left:39.4%;top:0;width:1px;height:11px;background:#B84A30"></div>
            <div style="position:absolute;left:24.6%;top:10px;width:8px;height:8px;margin-left:-4px;box-sizing:border-box;border-radius:999px;background:#B84A30;border:1px solid #FFFFFF"></div>
            <div style="position:absolute;left:39.4%;top:10px;width:8px;height:8px;margin-left:-4px;box-sizing:border-box;border-radius:999px;background:#B84A30;border:1px solid #FFFFFF"></div>
            <input id="shake" class="rng" type="range" min="5" max="10" step="0.1" value="9" aria-valuetext="9,0 балла"${dis(off)} style="position:absolute;left:-9px;top:0;width:calc(100% + 18px);height:28px">
          </div>
          <div aria-hidden="true" style="position:relative;height:16px;margin-top:4px;font-size:12px;line-height:16px;color:#6B6159">
            <span style="position:absolute;left:0;transform:translateX(-50%)">5</span>
            <span style="position:absolute;left:20%;transform:translateX(-50%)">6</span>
            <span style="position:absolute;left:40%;transform:translateX(-50%)">7</span>
            <span style="position:absolute;left:60%;transform:translateX(-50%)">8</span>
            <span style="position:absolute;left:80%;transform:translateX(-50%);color:#2B2622;font-weight:700">9</span>
            <span style="position:absolute;left:100%;transform:translateX(-50%)">10</span>
          </div>
        </div>
      </div>
    </section>
`;
}

function centerColumnShake() {
  return `    <section aria-labelledby="h-main" style="display:flex;flex-direction:column;min-width:0">
      <p style="margin:0;font-size:13px;line-height:18px;font-weight:500;color:#6B6159">Алматы · 8-й этаж из 9 · 9,0 балла · ускорение пола 1,02 g</p>
      <h1 id="h-main" style="margin:8px 0 0;font-family:'Literata',serif;font-weight:500;font-size:32px;line-height:40px;letter-spacing:-0.01em;color:#2B2622">Что упадёт, пока вы спите</h1>
      <p style="margin:8px 0 0;max-width:520px;font-family:'Literata',serif;font-style:italic;font-weight:500;font-size:18px;line-height:24px;color:#6B6159">При расчётном толчке шкаф опрокинется на подушку, а стеллаж перекроет выход к двери.</p>

      <div style="margin-top:20px;height:642px;box-sizing:border-box;padding:16px;display:flex;flex-direction:column;${PANEL}">
        <div style="height:32px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:14px">
            <h2 style="margin:0;font-family:'Literata',serif;font-weight:600;font-size:18px;line-height:24px">3D</h2>
            ${segmented(false)}
          </div>
          ${legend}
        </div>

        <div style="margin-top:16px;height:504px">
          ${sceneSvg}
        </div>

        <div style="margin-top:16px;height:40px;display:flex;align-items:center;gap:8px">
          <button type="button" class="btn-p" aria-busy="true" style="position:relative;overflow:hidden;width:220px;${BTN_P};justify-content:flex-start;font-variant-numeric:tabular-nums">${ico.shake}Трясём… 1,2 с из 3<span aria-hidden="true" style="position:absolute;left:0;right:0;bottom:0;height:4px;background:#8E3A25"><span style="display:block;width:40%;height:4px;background:#FFFFFF"></span></span></button>
          <button type="button" class="btn-s" disabled="disabled" style="${BTN_S}${OFF}">Сбросить</button>
          <p style="margin:0 0 0 auto;font-size:12px;line-height:16px;color:#6B6159;text-align:right">Решает формула,<br>показывает физический движок</p>
        </div>
      </div>
    </section>
`;
}

function todo(n, id, name, tail, tailColor, desc, done) {
  const muted = done ? ';color:#6B6159' : '';
  return `          <li style="display:grid;grid-template-columns:22px 1fr 18px;column-gap:10px;align-items:start;padding:6px 0;border-top:1px solid #E6DED2${done ? ';border-bottom:1px solid #E6DED2' : ''}">
            <span style="font-family:'Literata',serif;font-style:italic;font-weight:500;font-size:18px;line-height:24px;color:${done ? '#6B6159' : '#2B2622'}">${n}</span>
            <label for="${id}" style="display:flex;flex-direction:column;gap:2px;cursor:pointer">
              <span style="font-size:14px;line-height:20px;font-weight:700${muted}">${name} <span style="font-weight:600;color:${tailColor}">— ${tail}</span></span>
              <span style="font-size:13px;line-height:18px;color:${done ? '#6B6159' : '#2B2622'}">${desc}</span>
            </label>
            <input id="${id}" class="chk" type="checkbox"${done ? ' checked="checked"' : ''}>
          </li>`;
}

function aside(off) {
  const row = (dt, dd, last) => {
    const b = 'border-top:1px solid #E6DED2' + (last ? ';border-bottom:1px solid #E6DED2' : '');
    return `          <dt style="padding:4px 0;${b};color:#6B6159">${dt}</dt>
          <dd style="margin:0;padding:4px 0;${b};font-weight:700;text-align:right">${dd}</dd>`;
  };
  return `    <aside aria-label="Выбранный предмет и итог" style="display:flex;flex-direction:column;min-width:0">
      <section aria-labelledby="h-item" style="padding:20px 16px;${PANEL}">
        <p style="margin:0;font-size:12px;line-height:16px;font-weight:600;color:#6B6159">Выбранный предмет</p>
        <div style="margin-top:4px;display:flex;align-items:baseline;gap:10px;height:32px">
          <h2 id="h-item" style="margin:0;font-family:'Literata',serif;font-weight:600;font-size:26px;line-height:32px">Шкаф</h2>
          <span style="font-size:13px;line-height:18px;color:#6B6159">120 × 55 × 220 см</span>
          <span style="margin-left:auto;align-self:center;display:inline-flex;align-items:center;gap:4px;height:24px;box-sizing:border-box;padding:0 8px;border:1px solid #B84A30;border-radius:4px;background:#FFFFFF;font-size:12px;line-height:16px;font-weight:600;color:#B84A30;white-space:nowrap"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M8.5 1.5L2 8M2 3.5V8h4.5" fill="none" stroke="#B84A30" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>На подушку</span>
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #E6DED2">
          <p style="margin:0;display:flex;align-items:baseline;gap:8px;font-family:'Literata',serif;font-weight:500;color:#B84A30"><span style="font-size:44px;line-height:48px;letter-spacing:-0.02em">≈7,0</span><span style="font-size:22px;line-height:28px">балла</span></p>
          <p style="margin:4px 0 0;font-size:14px;line-height:20px;font-weight:600;color:#2B2622">упадёт при такой силе толчка на 8-м этаже</p>
          <p style="margin:2px 0 0;font-size:13px;line-height:18px;color:#6B6159">на 1-м этаже — при 8,3</p>
        </div>
        <dl style="margin:14px 0 0;display:grid;grid-template-columns:1fr auto;font-size:14px;line-height:20px">
${row('Порог опрокидывания', '0,25 g')}
${row('Угол опрокидывания', '14,0°')}
${row('Длина зоны падения', '2,2 м')}
${row('Направление', 'к кровати', true)}
        </dl>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button type="button" class="btn-p"${dis(off)} style="flex:1;${BTN_P};padding:0 10px${off ? OFF : ''}">Закрепить к стене</button>
          <button type="button" class="btn-s"${dis(off)} style="${BTN_S};padding:0 10px${off ? OFF : ''}">Повернуть</button>
          <button type="button" class="btn-s"${dis(off)} style="${BTN_S};padding:0 10px${off ? OFF : ''}">Удалить</button>
        </div>
      </section>

      <section id="summary" aria-labelledby="h-sum" style="margin-top:24px">
        <h2 id="h-sum" style="margin:0;font-family:'Literata',serif;font-weight:500;font-size:22px;line-height:28px">Итог при 9 баллах</h2>
        <p style="margin:6px 0 0;font-size:14px;line-height:20px;color:#2B2622"><strong style="font-weight:700;color:#B84A30">2 предмета упадут</strong> · <strong style="font-weight:700;color:#8A5F17">1 сдвинется</strong> · <strong style="font-weight:700;color:#4F6E5D">1 закреплён</strong></p>
        <p style="margin:12px 0 4px;font-size:12px;line-height:16px;font-weight:600;color:#6B6159">Что сделать — по порядку опасности</p>
        <ol style="list-style:none;margin:0;padding:0">
${todo(1, 'todo-1', 'Шкаф', 'на подушку', '#B84A30', 'Закрепить уголком к несущей стене', false)}
${todo(2, 'todo-2', 'Стеллаж', 'перекроет выход', '#B84A30', 'Закрепить или переставить от двери', false)}
${todo(3, 'todo-3', 'Комод', 'сдвинется', '#8A5F17', 'Противоскользящие накладки', false)}
${todo(4, 'todo-4', 'Зеркало', 'закреплено', '#4F6E5D', 'Ничего делать не нужно', true)}
        </ol>
        <p style="margin:10px 0 0;font-size:12px;line-height:16px;color:#6B6159">Скрининг по упрощённой физике, не заменяет инженерное обследование.</p>
      </section>
    </aside>
`;
}

const toast = `  <div role="status" aria-live="polite" aria-label="Итог тряски" style="position:absolute;right:32px;bottom:28px;width:384px;box-sizing:border-box;padding:16px;background:#FFFFFF;border:1px solid #E6DED2;border-radius:12px;box-shadow:0 12px 32px rgba(43,38,34,0.14)">
    <div style="display:flex;align-items:flex-start;gap:12px">
      ${ico.warn}
      <p style="margin:0;flex:1;font-size:14px;line-height:20px;color:#2B2622"><strong style="font-weight:600;color:#B84A30">Упали 2 предмета:</strong> шкаф — на подушку, стеллаж — перекрыл выход</p>
      <button type="button" class="btn-s" aria-label="Закрыть уведомление" style="flex:none;width:32px;height:32px;margin:-6px -6px 0 0;padding:0;border:0;border-radius:6px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">${ico.close}</button>
    </div>
    <div style="margin-top:12px;padding-left:32px;display:flex;gap:8px">
      <button type="button" class="btn-s" style="${BTN_S}">Сбросить</button>
      <button type="button" class="btn-p" style="${BTN_P}">Как закрепить</button>
    </div>
  </div>
`;

const shakeHtml = head('Тряска · десктоп') +
`<div style="width:1440px;height:900px;position:relative;display:flex;flex-direction:column;background:#F6F1EA;color:#2B2622;overflow:hidden;font-family:'Manrope',system-ui,sans-serif" id="top">

${header(true)}
  <main id="room" style="height:836px;flex:none;box-sizing:border-box;padding:24px 32px 28px;display:grid;grid-template-columns:392px 552px 384px;column-gap:24px">

${leftColumn(true)}
${centerColumnShake()}
${aside(true)}  </main>

  <!-- Всплывающее уведомление: появляется, когда тряска закончилась (3 с) -->
${toast}</div>
` + tail(1440, 900);

// ---------- C-States ----------
// Plan of the empty room: walls, window, door, dimensions — no furniture.
const planEmpty = `<svg viewBox="-60 -50 400 540" width="244" height="329" role="img" aria-label="План пустой спальни 300 на 420 см: окно в верхней стене, дверь внизу справа, мебели пока нет." style="display:block;flex:none">
              <rect x="0" y="0" width="300" height="420" fill="#FBF8F3"/>
              <circle cx="150" cy="176" r="26" fill="none" stroke="#D9CFC1" stroke-width="2" stroke-dasharray="5 4"/>
              <path d="M150,162 V190 M136,176 H164" stroke="#6B6159" stroke-width="2.4" stroke-linecap="round"/>
              <text x="150" y="238" text-anchor="middle" font-family="Manrope, sans-serif" font-size="20" font-weight="600" fill="#6B6159">Комната пуста</text>
              <path d="M200,340 A80,80 0 0 1 280,420" fill="none" stroke="#2B2622" stroke-width="0.9" stroke-dasharray="3 3"/>
              <line x1="200" y1="420" x2="200" y2="340" stroke="#2B2622" stroke-width="2.4"/>
              <g fill="#3A332D">
                <rect x="-12" y="-12" width="62" height="12"/>
                <rect x="150" y="-12" width="162" height="12"/>
                <rect x="-12" y="0" width="12" height="432"/>
                <rect x="300" y="0" width="12" height="432"/>
                <rect x="-12" y="420" width="212" height="12"/>
                <rect x="280" y="420" width="32" height="12"/>
              </g>
              <rect x="50" y="-12" width="100" height="12" fill="#FFFFFF" stroke="#2B2622" stroke-width="0.8"/>
              <line x1="50" y1="-6" x2="150" y2="-6" stroke="#2B2622" stroke-width="0.8"/>
              <g stroke="#6B6159" stroke-width="0.9">
                <line x1="0" y1="-16" x2="0" y2="-34"/>
                <line x1="300" y1="-16" x2="300" y2="-34"/>
                <line x1="0" y1="-28" x2="300" y2="-28"/>
                <line x1="-5" y1="-23" x2="5" y2="-33"/>
                <line x1="295" y1="-23" x2="305" y2="-33"/>
                <line x1="-16" y1="0" x2="-34" y2="0"/>
                <line x1="-16" y1="420" x2="-34" y2="420"/>
                <line x1="-28" y1="0" x2="-28" y2="420"/>
                <line x1="-33" y1="5" x2="-23" y2="-5"/>
                <line x1="-33" y1="425" x2="-23" y2="415"/>
              </g>
              <text x="150" y="-34" text-anchor="middle" font-family="Manrope, sans-serif" font-size="20" font-weight="600" fill="#6B6159">300</text>
              <text x="-35" y="210" transform="rotate(-90 -35 210)" text-anchor="middle" font-family="Manrope, sans-serif" font-size="20" font-weight="600" fill="#6B6159">420</text>
              <rect x="0" y="450" width="50" height="6" fill="#2B2622"/>
              <rect x="50" y="450" width="50" height="6" fill="#FFFFFF" stroke="#2B2622" stroke-width="1"/>
              <text x="0" y="482" text-anchor="middle" font-family="Manrope, sans-serif" font-size="20" fill="#6B6159">0</text>
              <text x="100" y="482" text-anchor="middle" font-family="Manrope, sans-serif" font-size="20" fill="#6B6159">1 м</text>
            </svg>`;

// Custom plan whose dragged corner D (0,420) -> D' (328,318) makes wall D'A cross wall BC at X (300,291).
const X = [300, 291];
const planError = `<svg viewBox="-60 -50 400 540" width="244" height="329" role="img" aria-label="Своя планировка с ошибкой: левый нижний угол перетащен за правую стену, новая стена пересекает правую стену. Место пересечения выделено красным." style="display:block;flex:none">
              <defs>
                <pattern id="hatchErr" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#B84A30" stroke-width="1.3" stroke-opacity="0.5"/></pattern>
                <marker id="arrGhost" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,1 L9,5 L0,9 z" fill="#6B6159"/></marker>
              </defs>
              <polygon points="0,0 300,0 ${X[0]},${X[1]}" fill="#FBF8F3"/>
              <polygon points="${X[0]},${X[1]} 300,420 328,318" fill="#B84A30" fill-opacity="0.07"/>
              <polygon points="${X[0]},${X[1]} 300,420 328,318" fill="url(#hatchErr)"/>
              <polyline points="300,420 0,420 0,0" fill="none" stroke="#6B6159" stroke-width="1.2" stroke-dasharray="6 5"/>
              <rect x="-6" y="414" width="12" height="12" fill="none" stroke="#6B6159" stroke-width="1.2" stroke-dasharray="3 3"/>
              <line x1="14" y1="415" x2="306" y2="323" stroke="#6B6159" stroke-width="1.2" stroke-dasharray="3 5" marker-end="url(#arrGhost)"/>
              <g fill="none" stroke="#3A332D" stroke-width="12" stroke-linecap="square" stroke-linejoin="miter">
                <polyline points="0,0 300,0 300,420 328,318"/>
                <line x1="328" y1="318" x2="0" y2="0"/>
              </g>
              <rect x="50" y="-6" width="100" height="12" fill="#FFFFFF" stroke="#2B2622" stroke-width="0.8"/>
              <line x1="50" y1="0" x2="150" y2="0" stroke="#2B2622" stroke-width="0.8"/>
              <g stroke="#B84A30" stroke-width="12" stroke-linecap="butt">
                <line x1="300" y1="231" x2="300" y2="351"/>
                <line x1="328" y1="318" x2="257" y2="249"/>
              </g>
              <circle cx="${X[0]}" cy="${X[1]}" r="16" fill="#FFFFFF" stroke="#B84A30" stroke-width="3"/>
              <path d="M${X[0] - 6},${X[1] - 6} l12,12 M${X[0] + 6},${X[1] - 6} l-12,12" stroke="#B84A30" stroke-width="3" stroke-linecap="round"/>
              <text x="276" y="${X[1] + 7}" text-anchor="end" font-family="Manrope, sans-serif" font-size="20" font-weight="700" fill="#B84A30" stroke="#FBF8F3" stroke-width="5" stroke-linejoin="round" paint-order="stroke">пересечение</text>
              <g fill="#FFFFFF" stroke="#2B2622" stroke-width="1.4">
                <rect x="-6" y="-6" width="12" height="12"/>
                <rect x="294" y="-6" width="12" height="12"/>
                <rect x="294" y="414" width="12" height="12"/>
              </g>
              <rect x="320" y="310" width="16" height="16" fill="#B84A30" stroke="#2B2622" stroke-width="1.4"/>
              <rect x="0" y="450" width="50" height="6" fill="#2B2622"/>
              <rect x="50" y="450" width="50" height="6" fill="#FFFFFF" stroke="#2B2622" stroke-width="1"/>
              <text x="0" y="482" text-anchor="middle" font-family="Manrope, sans-serif" font-size="20" fill="#6B6159">0</text>
              <text x="100" y="482" text-anchor="middle" font-family="Manrope, sans-serif" font-size="20" fill="#6B6159">1 м</text>
            </svg>`;

const skeletonSvg = `<svg viewBox="8 12 418 418" width="220" height="220" role="img" aria-label="Скелетон 3D-сцены: контуры стен, пола и мебели без деталей" style="display:block">
${skeleton}
              </svg>`;

const FRAME = 'margin-top:8px;height:392px;box-sizing:border-box;padding:16px;border:1px solid #D9CFC1;border-radius:12px;background:#F6F1EA;overflow:hidden';
const card = (id, title, note, body) => `  <section aria-labelledby="${id}" style="display:flex;flex-direction:column;min-width:0">
    <div style="height:24px;display:flex;align-items:baseline;justify-content:space-between">
      <h2 id="${id}" style="margin:0;font-size:18px;line-height:24px;font-weight:700;color:#2B2622">${title}</h2>
      <span style="font-size:12px;line-height:16px;font-weight:600;color:#6B6159">${note}</span>
    </div>
    <div style="${FRAME}">
${body}
    </div>
  </section>
`;

const planHeader = (caption) => `<div style="display:flex;align-items:baseline;gap:8px;height:24px">
              <h3 style="margin:0;font-family:'Literata',serif;font-weight:600;font-size:16px;line-height:24px">План</h3>
              <span style="font-size:12px;line-height:16px;color:#6B6159">${caption}</span>
            </div>`;

const panel3dHead = `<div style="height:32px;display:flex;align-items:center;gap:14px">
          <h3 style="margin:0;font-family:'Literata',serif;font-weight:600;font-size:18px;line-height:24px">3D</h3>
          ${segmented(true)}
        </div>`;

const stEmpty = `      <div style="height:358px;box-sizing:border-box;display:flex;gap:24px;padding:12px;${PANEL}">
            ${planEmpty}
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;padding-top:4px">
            ${planHeader('вид сверху · размеры в см')}
            <div style="margin-top:16px;display:flex;align-items:flex-start;gap:12px">
              ${ico.addRoom}
              <p style="margin:0;font-size:16px;line-height:24px;font-weight:600;color:#2B2622">Добавьте шкаф или стеллаж — начнём с самого высокого</p>
            </div>
            <div role="group" aria-label="Добавить предмет" style="margin-top:16px;padding-left:32px">
              <span style="display:block;font-size:12px;line-height:16px;font-weight:600;color:#6B6159">Добавить:</span>
              <div style="margin-top:6px;display:flex;gap:8px">
                <button type="button" class="btn-p" style="${BTN_P}">${ico.plus16('#FFFFFF')}Шкаф</button>
                <button type="button" class="btn-s" style="${BTN_S}">${ico.plus16('#2B2622')}Стеллаж</button>
              </div>
              <div style="margin-top:8px;display:flex;gap:6px">
                ${chip('Комод', false)}
                ${chip('Зеркало', false)}
                ${chip('Холодильник', false)}
              </div>
            </div>
            <p style="margin:auto 0 0;display:flex;align-items:center;gap:8px;font-size:13px;line-height:18px;color:#6B6159">${ico.move}Перетащите предмет — у стены он прилипает сам</p>
          </div>
        </div>`;

const stNo3d = `      <div style="height:358px;box-sizing:border-box;display:flex;flex-direction:column;padding:16px;${PANEL}">
        ${panel3dHead}
        <div role="status" style="margin-top:16px;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;background:#FBF8F3;border:1px dashed #D9CFC1;border-radius:6px">
          <span aria-hidden="true" style="width:40px;height:40px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:1px solid #D9CFC1;border-radius:999px;background:#FFFFFF">${ico.cubeOff}</span>
          <p style="margin:12px 0 0;font-size:16px;line-height:24px;font-weight:600;color:#2B2622">Ваш браузер не показывает 3D.</p>
          <p style="margin:4px 0 0;font-size:14px;line-height:20px;color:#6B6159">План и расчёт работают как обычно</p>
          <button type="button" class="btn-p" style="margin-top:16px;${BTN_P}">${ico.planIco}Открыть план</button>
        </div>
      </div>`;

const stLoading = `      <div style="height:358px;box-sizing:border-box;display:flex;flex-direction:column;padding:16px;${PANEL}">
        ${panel3dHead}
        <div aria-busy="true" style="margin-top:16px;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center">
          ${skeletonSvg}
          <p role="status" style="margin:12px 0 0;display:flex;align-items:center;gap:8px;font-size:13px;line-height:18px;font-weight:500;color:#6B6159">${ico.spinner}Готовим 3D…</p>
        </div>
      </div>`;

const stShape = `      <div style="height:358px;box-sizing:border-box;display:flex;gap:24px;padding:12px;${PANEL}">
            ${planError}
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;padding-top:4px">
            ${planHeader('своя планировка · вид сверху')}
            <div role="alert" style="margin-top:16px;display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid #B84A30;border-radius:6px;background:#FFFFFF">
              ${ico.warn}
              <div>
                <p style="margin:0;font-size:14px;line-height:20px;font-weight:600;color:#B84A30">Стены пересекаются — сдвиньте угол</p>
                <p style="margin:4px 0 0;font-size:13px;line-height:18px;color:#6B6159">Расчёт и 3D обновятся, когда стены перестанут пересекаться.</p>
              </div>
            </div>
            <div style="margin-top:16px;display:flex;gap:8px">
              <button type="button" class="btn-s" style="${BTN_S}">${ico.undo}Отменить</button>
            </div>
            <div style="margin-top:auto;display:flex;flex-direction:column;gap:6px;padding-top:10px;border-top:1px solid #E6DED2;font-size:12px;line-height:16px;color:#6B6159">
              <span style="display:flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><rect x="1" y="1" width="10" height="10" fill="#B84A30" stroke="#2B2622" stroke-width="1"/></svg>угол, который нужно сдвинуть</span>
              <span style="display:flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="4.5" fill="#FFFFFF" stroke="#B84A30" stroke-width="1.5"/></svg>место пересечения</span>
              <span style="display:flex;align-items:center;gap:6px"><svg width="14" height="8" viewBox="0 0 14 8" aria-hidden="true" focusable="false"><path d="M1 4h12" stroke="#6B6159" stroke-width="1.2" stroke-dasharray="3 2"/></svg>где стены были до перетаскивания</span>
            </div>
          </div>
        </div>`;

const statesHtml = head('Состояния · десктоп') +
`<div style="width:1440px;height:900px;position:relative;box-sizing:border-box;padding:16px 48px;display:grid;grid-template-columns:660px 660px;grid-template-rows:424px 424px;column-gap:24px;row-gap:20px;background:#F6F1EA;color:#2B2622;overflow:hidden;font-family:'Manrope',system-ui,sans-serif" id="top">
  <h1 class="sr">Состояния экрана «Комната»: пусто, нет 3D, загрузка, ошибка формы</h1>
${card('st-empty', 'Пустая комната', 'План · левая колонка', stEmpty)}${card('st-no3d', '3D не загрузилось', '3D · центральная колонка', stNo3d)}${card('st-load', 'Загрузка 3D', '3D · центральная колонка', stLoading)}${card('st-shape', 'Ошибка формы комнаты', 'Своя планировка · левая колонка', stShape)}</div>
` + tail(1440, 900);

fs.writeFileSync(path.join(OUT, 'C-Shake-Desktop.dc.html'), shakeHtml);
fs.writeFileSync(path.join(OUT, 'C-States.dc.html'), statesHtml);
console.log('written', shakeHtml.length, statesHtml.length);
