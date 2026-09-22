const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..');
let frag = fs.readFileSync(path.join(D, 'sceneC.svgfrag'), 'utf8').replace(/\r?\n$/, '');
const n = frag.split('rgba(184,74,48,0.09)').length - 1;
if (n !== 1) throw new Error('expected one 0.09 zone, got ' + n);
frag = frag.replace('rgba(184,74,48,0.09)', 'rgba(184,74,48,0.12)'); // зона стеллажа → --c-danger-zone
for (const name of ['C-Desktop', 'C-Mobile']) {
  const tpl = fs.readFileSync(path.join(__dirname, name + '.tpl.html'), 'utf8');
  if (tpl.split('<!--SCENE-->').length !== 2) throw new Error('placeholder ' + name);
  const out = tpl.replace('<!--SCENE-->', frag);
  fs.writeFileSync(path.join(D, 'project', name + '.dc.html'), out);
  console.log('wrote', name, out.length);
}
