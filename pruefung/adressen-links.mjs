// Laedt jede Seite im Browser gegen den echten Apache und ruft jeden
// internen Link ab. Ein 301 gilt hier als Fehler: Er bedeutet, dass im
// Seitentext noch die alte Adresse mit .html steht. Die Seite kaeme zwar
// an, aber jeder Besucher zahlte einen unnoetigen Umweg — und Google
// bekaeme zwei Adressen fuer denselben Inhalt.
import { chromium } from 'playwright';
const U = 'https://localhost:8443';
const seiten = ['/', '/impressum', '/agb', '/avv', '/datenschutz',
                '/kuendigung', '/pauschbetraege', '/fuer-steuerberater', '/app/'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:390,height:844}, ignoreHTTPSErrors:true });
const alle = new Map();   // Pfad → Seiten, die ihn verlinken
const fehler = [];

for (const pfad of seiten) {
  const page = await ctx.newPage();
  const js = []; page.on('pageerror', e => js.push(e.message));
  await page.goto(U + pfad, { waitUntil:'networkidle' }).catch(()=>{});
  await page.waitForTimeout(800);
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')]
    .map(a => a.getAttribute('href'))
    .filter(h => h && !h.startsWith('#') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(h) && !h.startsWith('//')));
  for (const l of links) {
    const ziel = new URL(l, U + pfad).pathname;
    if (!alle.has(ziel)) alle.set(ziel, []);
    alle.get(ziel).push(pfad);
  }
  if (js.length) fehler.push(`${pfad}: JS-Fehler ${js.join(' | ')}`);
  await page.close();
}
await b.close();

console.log('Geprueft: ' + alle.size + ' verlinkte Adressen\n');
for (const [ziel, von] of [...alle].sort()) {
  const r = await fetch(U + ziel, { redirect: 'manual' });
  const ok = r.status === 200;
  const zeile = (ok ? '  ok   ' : 'FEHLER ') + '│ ' + ziel.padEnd(24) + ' ' + r.status
    + (r.status >= 300 && r.status < 400 ? ' → ' + r.headers.get('location') : '')
    + (ok ? '' : '   verlinkt von: ' + [...new Set(von)].join(', '));
  console.log(zeile);
  if (!ok) fehler.push(ziel + ' → ' + r.status);
}
console.log();
if (fehler.length) { console.log(fehler.length + ' Beanstandungen:'); fehler.forEach(f=>console.log('  ' + f)); }
else console.log('Alle Links zeigen direkt auf die neue Adresse — kein Umweg, keine Sackgasse.');
process.exit(fehler.length ? 1 : 0);
