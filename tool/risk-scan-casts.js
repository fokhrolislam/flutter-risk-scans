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

const risky = [];
let commentSkipped = 0, guardedSkipped = 0;

for (const f of walk(ROOT)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    if (!/\bas\s+(Map|List)\b/.test(ln)) return;

    // কমেন্ট-লাইন বাদ (docblock-এ "as Map লিখবেন না" জাতীয় নির্দেশনা)
    if (/^\s*(\/\/|\/\/\/|\*|\/\*)/.test(ln)) { commentSkipped++; return; }

    // আগের ২ লাইন + এই লাইন মিলিয়ে is-গার্ড আছে কিনা (ternary সাধারণত আগের লাইনে)
    const window = lines.slice(Math.max(0, i - 2), i + 1).join(' ');
    if (/\bis\s+(Map|List)\b/.test(window)) { guardedSkipped++; return; }

    risky.push(rel(f) + ':' + (i + 1) + '  ' + ln.trim().slice(0, 100));
  });
}

console.log('কমেন্ট-লাইন বাদ: ' + commentSkipped + ' | আগের লাইনে is-গার্ড আছে: ' + guardedSkipped);
console.log('আসল ঝুঁকিপূর্ণ as Map/List: ' + risky.length);
risky.forEach((x) => console.log('   - ' + x));
