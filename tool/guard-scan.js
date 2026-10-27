const fs = require('fs'), path = require('path');
function walk(d, o = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, o);
    else if (p.endsWith('.dart') && !/app_localizations/.test(p)) o.push(p);
  }
  return o;
}
const flagRe = /bool (_saving|_submitting|_busy|_posting|_sending|_paying|_collecting)\s*=\s*false/g;
const res = [];
for (const f of walk('lib')) {
  const src = fs.readFileSync(f, 'utf8');
  const flags = [...new Set([...src.matchAll(flagRe)].map(m => m[1]))];
  if (!flags.length) continue;
  const writes = (src.match(/\.(post|put|delete)\(/g) || []).length;
  for (const fl of flags) {
    const decl = (src.match(new RegExp('bool ' + fl + '\\s*=\\s*false', 'g')) || []).length;
    const guards = (src.match(new RegExp('if \\([^)]*\\b' + fl + '\\b[^)]*\\)\\s*return', 'g')) || []).length;
    const setsTrue = (src.match(new RegExp(fl + '\\s*=\\s*true', 'g')) || []).length;
    if (guards < decl) {
      res.push({ file: f.split(path.sep).join('/'), flag: fl, decl, guards, setsTrue, writes,
        mtime: fs.statSync(f).mtime.toISOString().slice(0, 10) });
    }
  }
}
res.sort((a, b) => a.file.localeCompare(b.file));
for (const r of res) {
  console.log(`${r.mtime}  ${r.file}  ${r.flag} decl=${r.decl} guards=${r.guards} setTrue=${r.setsTrue} writes=${r.writes}`);
}
console.log('total', res.length);
