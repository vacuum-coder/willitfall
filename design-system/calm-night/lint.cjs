#!/usr/bin/env node
// Проверяльщик дизайн-системы «Спокойная ночь».
// Находит в макетах (.html) и коде (.css, .ts, .tsx, .js, .jsx) любые значения, которых нет в tokens.css.
// Запуск: node lint.cjs <файл или папка> [...]   Код выхода 1 — есть нарушения.
const fs = require('fs');
const path = require('path');

const tokensCss = fs.readFileSync(path.join(__dirname, 'tokens.css'), 'utf8');
const vars = {};
for (const m of tokensCss.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();

const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').replace(/\(\s*/g, '(').replace(/\s*\)/g, ')').trim();
const pick = (prefix) => Object.entries(vars).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v);

const allowed = {
  color: new Set(Object.values(vars).flatMap((v) => v.match(/#[0-9a-f]{6}\b|rgba\([^)]*\)/gi) || []).map(norm)),
  fontSize: new Set(pick('fs-').map(norm)),
  lineHeight: new Set([...pick('lh-').map(norm), 'normal', '1']),
  spacing: new Set([...pick('s-').map(norm), '0', '0px', '1px', 'auto']),
  radius: new Set([...pick('r-').map(norm), '0', '0px', '50%']),
  shadow: new Set([...pick('sh-').map(norm), 'none']),
  letter: new Set([...pick('ls-').map(norm), '0', 'normal']),
  weight: new Set(['400', '500', '600', '700', 'normal', 'bold']),
};
allowed.color.add('#ffffff'); allowed.color.add('#000000'); // белый есть в токенах; чёрный — только для прозрачности масок

const PROPS = {
  'font-size': 'fontSize', 'line-height': 'lineHeight', 'border-radius': 'radius', 'box-shadow': 'shadow',
  'letter-spacing': 'letter', 'font-weight': 'weight',
  gap: 'spacing', 'row-gap': 'spacing', 'column-gap': 'spacing',
  padding: 'spacing', 'padding-top': 'spacing', 'padding-right': 'spacing', 'padding-bottom': 'spacing', 'padding-left': 'spacing',
  'padding-inline': 'spacing', 'padding-block': 'spacing',
  margin: 'spacing', 'margin-top': 'spacing', 'margin-right': 'spacing', 'margin-bottom': 'spacing', 'margin-left': 'spacing',
  'margin-inline': 'spacing', 'margin-block': 'spacing',
};

function checkValue(kind, raw) {
  const v = norm(raw.replace(/!important/, ''));
  if (/var\(|calc\(|inherit|initial|unset/.test(v)) return [];
  if (kind === 'shadow') return allowed.shadow.has(v) ? [] : [raw.trim()];
  if (kind === 'spacing' || kind === 'radius') {
    // многозначные записи вроде "12px 16px": проверяем каждую часть; отрицательный отступ допустим, если допустим его модуль
    return v.split(' ').filter((part) => part && !allowed[kind].has(part.replace(/^-/, '')));
  }
  return allowed[kind].has(v) ? [] : [raw.trim()];
}

function lintText(text, file) {
  const out = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F-])|rgba?\([^)]*\)/g)) {
      if (!allowed.color.has(norm(m[0]))) out.push({ file, line: i + 1, kind: 'color', value: m[0] });
    }
    for (const m of line.matchAll(/(?<![\w-])(font-size|line-height|border-radius|box-shadow|letter-spacing|font-weight|row-gap|column-gap|gap|padding(?:-(?:top|right|bottom|left|inline|block))?|margin(?:-(?:top|right|bottom|left|inline|block))?)\s*:\s*([^;"'}]+)/g)) {
      const kind = PROPS[m[1]];
      // In TS/JS a one-word key (gap, padding, margin) is a style object: the camelCase pass below checks it.
      if (/\.(tsx?|jsx?)$/.test(file) && !m[1].includes('-')) continue;
      for (const bad of checkValue(kind, m[2])) out.push({ file, line: i + 1, kind: m[1], value: bad });
    }
    for (const m of line.matchAll(/font-family\s*:\s*([^;"}]+)/g)) {
      if (!/Literata|Manrope|inherit|var\(/.test(m[1])) out.push({ file, line: i + 1, kind: 'font-family', value: m[1].trim() });
    }
    // React style objects: camelCase keys; a bare number means px (unitless for fontWeight / lineHeight).
    if (/\.(tsx?|jsx?)$/.test(file)) {
      for (const m of line.matchAll(/(?<![\w$.-])(fontSize|lineHeight|borderRadius|boxShadow|letterSpacing|fontWeight|rowGap|columnGap|gap|padding(?:Top|Right|Bottom|Left|Inline|Block)?|margin(?:Top|Right|Bottom|Left|Inline|Block)?|fontFamily)\s*:\s*('[^']*'|"[^"]*"|`[^`]*`|-?\d+(?:\.\d+)?)/g)) {
        const key = m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
        let value = m[2];
        if (/^['"`]/.test(value)) value = value.slice(1, -1);
        else if (key !== 'font-weight' && key !== 'line-height' && value !== '0') value = `${value}px`;
        if (key === 'font-family') {
          if (!/Literata|Manrope|inherit|var\(/.test(value)) out.push({ file, line: i + 1, kind: 'fontFamily', value });
          continue;
        }
        for (const bad of checkValue(PROPS[key], value)) out.push({ file, line: i + 1, kind: m[1], value: bad });
      }
      // Tailwind arbitrary values such as p-[13px] or text-[15px] bypass the tokens.
      for (const m of line.matchAll(/\b[a-z-]+-\[\d+(?:\.\d+)?px\]/g)) out.push({ file, line: i + 1, kind: 'tailwind', value: m[0] });
    }
  });
  return out;
}

function walk(p, acc) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(p)) if (!['node_modules', '.git', 'dist'].includes(f)) walk(path.join(p, f), acc);
  } else if (/\.(html|css|tsx?|jsx?)$/.test(p) && !/tokens\.css$|lint\.js$/.test(p)) acc.push(p);
  return acc;
}

const targets = process.argv.slice(2);
if (!targets.length) { console.log('Использование: node lint.cjs <файл или папка> [...]'); process.exit(2); }
const files = targets.flatMap((t) => walk(t, []));
let total = 0;
for (const f of files) {
  const v = lintText(fs.readFileSync(f, 'utf8'), f);
  total += v.length;
  if (v.length) {
    console.log(`\n${path.basename(f)} — нарушений: ${v.length}`);
    for (const x of v.slice(0, 60)) console.log(`  стр. ${x.line}: ${x.kind} → ${x.value}`);
    if (v.length > 60) console.log(`  … и ещё ${v.length - 60}`);
  } else console.log(`${path.basename(f)} — чисто`);
}
console.log(`\nИтого нарушений: ${total} в ${files.length} файлах`);
process.exit(total ? 1 : 0);
