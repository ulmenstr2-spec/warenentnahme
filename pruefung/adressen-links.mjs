// Laedt jede Seite im Browser gegen den echten Apache und ruft jeden
// internen Link ab. Ein 301 gilt hier als Fehler: Er bedeutet, dass im
// Seitentext noch die alte Adresse mit .html steht. Die Seite kaeme zwar
// an, aber jeder Besucher zahlte einen unnoetigen Umweg — und Google
// bekaeme zwei Adressen fuer denselben Inhalt.
import { chromium } from 'playwright';
const U = 'https://localhost:8443';
const seiten = ['/', '/impressum', '/agb', '/avv', '/datenschutz',
                '/kuendigung', '/pauschbetraege', '/fuer-steuerberater', '/eigenverbrauch-buchen', '/app/'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:390,height:844}, ignoreHTTPSErrors:true });
const alle = new Map();   // Pfad → Seiten, die ihn verlinken
const fehler = [];

for (const pfad of seiten) {
  const page = await ctx.newPage();
  const js = []; page.on('pageerror', e => js.push(e.message));
  // Ein fehlgeschlagener Aufruf wurde hier frueher verschluckt. Laeuft der
  // Apache nicht, fand die Pruefung dann null Links und meldete Erfolg —
  // eine Pruefung, die nichts geprueft hat, sagt trotzdem "alles gut".
  const geladen = await page.goto(U + pfad, { waitUntil:'networkidle' })
    .then(()=>true).catch(e=>{fehler.push(`${pfad}: nicht erreichbar — ${e.message.split('\n')[0]}`);return false;});
  if(!geladen){ await page.close(); continue; }
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
console.log('Geprueft: ' + alle.size + ' verlinkte Adressen\n');
if (alle.size === 0)
  fehler.push('Keine einzige verlinkte Adresse gefunden. Laeuft der Apache unter '
    + U + '? Erst pruefung/adressen-aufbau.sh ausfuehren.');

// Die Abrufe laufen ueber den Browser-Kontext, nicht ueber fetch(). Der
// Testbau hat ein selbst ausgestelltes Zertifikat; fetch() bricht daran
// ab, der Kontext kennt ignoreHTTPSErrors. Solange oben null Links
// gefunden wurden, kam diese Schleife nie an die Reihe und der Abbruch
// fiel nicht auf.
for (const [ziel, von] of [...alle].sort()) {
  const r = await ctx.request.get(U + ziel, { maxRedirects: 0 });
  const ok = r.status() === 200;
  const zeile = (ok ? '  ok   ' : 'FEHLER ') + '│ ' + ziel.padEnd(24) + ' ' + r.status()
    + (r.status() >= 300 && r.status() < 400 ? ' → ' + r.headers()['location'] : '')
    + (ok ? '' : '   verlinkt von: ' + [...new Set(von)].join(', '));
  console.log(zeile);
  if (!ok) fehler.push(ziel + ' → ' + r.status());
}
await b.close();
console.log();
if (fehler.length) { console.log(fehler.length + ' Beanstandungen:'); fehler.forEach(f=>console.log('  ' + f)); }
else console.log('Alle Links zeigen direkt auf die neue Adresse — kein Umweg, keine Sackgasse.');
process.exit(fehler.length ? 1 : 0);
