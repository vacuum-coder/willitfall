// Builds standalone HTML pages from the canvas artboards in source/project and a gallery index.html.
// Run: node design/build.cjs
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'source', 'project');
const OUT = __dirname;

const DESKTOP = [1440, 900], PHONE = [390, 844];
const SCREENS = [
  ['C-Desktop', 'Главный экран: план и 3D', DESKTOP],
  ['C-Mobile', 'Главный экран', PHONE],
  ['C-Mobile-Plan', 'План комнаты', PHONE],
  ['C-Edit3D-Desktop', 'Правка в 3D', DESKTOP],
  ['C-Mobile-Edit3D', 'Правка в 3D', PHONE],
  ['C-Shake-Desktop', 'Тряска: симуляция против формулы', DESKTOP],
  ['C-Walls-Desktop', 'Стены: любая форма комнаты', DESKTOP],
  ['C-HowItWorks-Desktop', 'Как посчитано', DESKTOP],
  ['C-HowItWorks-Mobile', 'Как посчитано', PHONE],
  ['C-PhysicsCheck-Desktop', 'Проверка физики', DESKTOP],
  ['C-States', 'Состояния: пусто, нет WebGL, загрузка, ошибка', DESKTOP],
  ['C-WallItems-Desktop', 'Предметы на стене', DESKTOP],
];
const OTHER = [
  ['Main', 'А · Чертёж', DESKTOP], ['A-Mobile', 'А · Чертёж', PHONE],
  ['B-Desktop', 'Б · Сигнал ГО', DESKTOP], ['B-Mobile', 'Б · Сигнал ГО', PHONE],
];

function convert(name) {
  const src = path.join(SRC, `${name}.dc.html`);
  if (!fs.existsSync(src)) return null;
  const h = fs.readFileSync(src, 'utf8')
    .replace(/<script src="\.\/support\.js"><\/script>\s*/, '')
    .replace(/<x-dc>/, '<div class="x-dc">').replace(/<\/x-dc>/, '</div>')
    .replace(/<helmet>/, '').replace(/<\/helmet>/, '');
  fs.writeFileSync(path.join(OUT, `${name}.html`), h);
  return `${name}.html`;
}

const cell = ([name, label, [w, h]]) => {
  const f = convert(name), sc = w > 1000 ? 0.5 : 0.62;
  const size = `width:${Math.round(w * sc)}px;height:${Math.round(h * sc)}px`;
  const cap = `${label} · ${w}×${h}`;
  return f
    ? `<figure><div class="clip" style="${size}"><iframe src="${f}" title="${cap}" loading="lazy" style="width:${w}px;height:${h}px;transform:scale(${sc})"></iframe></div><figcaption>${cap} · <a href="${f}" target="_blank">открыть</a></figcaption></figure>`
    : `<figure><div class="wait" style="${size}">ещё не нарисован</div><figcaption>${cap}</figcaption></figure>`;
};

const page = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Макеты</title>
<style>
body{margin:0;background:#F6F1EA;color:#2B2622;font-family:system-ui,sans-serif}
header{padding:28px 40px 8px}h1{margin:0;font-size:28px}header p{margin:6px 0 0;color:#6B6159}
section{padding:24px 40px 40px;border-top:1px solid #E6DED2}h2{margin:0 0 16px;font-size:22px}
.row{display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap}figure{margin:0}
.clip{overflow:hidden;border:1px solid #D9CFC1;background:#fff}.clip iframe{border:0;transform-origin:0 0;display:block}
.wait{display:flex;align-items:center;justify-content:center;border:1px dashed #D9CFC1;color:#6B6159}
figcaption{margin-top:8px;font-size:14px;color:#6B6159}a{color:#2B2622}
</style></head><body>
<header><h1>Макеты</h1><p>Вариант В «Спокойная ночь» — эталон для приложения. Каждый экран приложения сверяется со своим макетом по скриншоту.</p></header>
<section><h2>В · Спокойная ночь</h2><div class="row">${SCREENS.map(cell).join('')}</div></section>
<section><h2>Отклонённые варианты</h2><div class="row">${OTHER.map(cell).join('')}</div></section>
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), page);
console.log('built:', fs.readdirSync(OUT).filter((f) => f.endsWith('.html')).join(', '));
