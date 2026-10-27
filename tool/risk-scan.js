const fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || 'lib/features';

function walk(d, acc = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, acc);
    else if (f.name.endsWith('.dart')) acc.push(p);
  }
  return acc;
}
const rel = (f) => f.split(path.sep).join('/');
const lineOf = (s, i) => s.slice(0, i).split('\n').length;

let ddTotal = 0;
const ddMissing = [];
const castRaw = [];
const parseRaw = [];

for (const f of walk(ROOT)) {
  const s = fs.readFileSync(f, 'utf8');

  // ১) Dropdown উইজেট — কল-বডির ভেতরে isExpanded: true আছে কিনা
  const dd = /Dropdown(?:Button|ButtonFormField)\s*[<(]/g;
  let m;
  while ((m = dd.exec(s))) {
    ddTotal++;
    const chunk = s.slice(m.index, m.index + 900);
    if (!/isExpanded:\s*true/.test(chunk)) {
      ddMissing.push(rel(f) + ':' + lineOf(s, m.index));
    }
  }

  // ২) as Map / as List — একই লাইনে `is Map`/`is List` গার্ড না থাকলে ঝুঁকি
  const lines = s.split('\n');
  lines.forEach((ln, i) => {
    if (/\bas\s+(Map|List)\b/.test(ln) && !/\bis\s+(Map|List)\b/.test(ln)) {
      castRaw.push(rel(f) + ':' + (i + 1) + '  ' + ln.trim().slice(0, 90));
    }
    if (/\b(?:int|double)\.parse\s*\(/.test(ln)) {
      parseRaw.push(rel(f) + ':' + (i + 1) + '  ' + ln.trim().slice(0, 90));
    }
  });
}

console.log('Dropdown উইজেট মোট: ' + ddTotal + '  |  isExpanded:true নেই: ' + ddMissing.length);
ddMissing.slice(0, 20).forEach((x) => console.log('   - ' + x));
console.log('');
console.log('as Map/List (একই লাইনে is-গার্ড ছাড়া): ' + castRaw.length);
castRaw.slice(0, 20).forEach((x) => console.log('   - ' + x));
console.log('');
console.log('int/double.parse (tryParse নয়): ' + parseRaw.length);
parseRaw.forEach((x) => console.log('   - ' + x));
