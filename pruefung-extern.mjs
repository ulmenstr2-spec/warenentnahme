// Prueft, ob beim Aufruf irgendeiner Seite eine Verbindung zu einem fremden
// Server aufgebaut wird.
//
// Hintergrund: Schriftarten von Google und Programmbausteine von cdnjs
// uebermitteln die IP-Adresse jedes Besuchers an ein fremdes Unternehmen.
// Beides lag hier einmal vor. Eine Textsuche im Quelltext reicht als
// Nachweis nicht — eine Datei kann eine weitere nachladen. Deshalb wird
// wirklich ein Browser geoeffnet und jede Anfrage mitgeschrieben.
//
// Aufruf:  node pruefung-extern.mjs
// Voraussetzung: npm install --no-save playwright
//
// Nach dem Einbau jeder neuen Bibliothek wiederholen. Ein
// <script src="https://…"> ist schnell eingefuegt und in einer
// 7000-Zeilen-Datei nicht zu sehen.

import { execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const W = path.dirname(fileURLToPath(import.meta.url)) + '/';
const typen = {'.css':'text/css','.woff2':'font/woff2','.html':'text/html','.png':'image/png',
               '.jpg':'image/jpeg','.txt':'text/plain','.xml':'application/xml',
               '.json':'application/json','.js':'application/javascript'};

// Die App in der Fassung pruefen, die wirklich ausgeliefert wird: build.mjs
// entfernt die Babel-Zeile. Wer die Quelldatei misst, sieht eine
// Fremdadresse, die auf dem Server nie ankommt — und sucht umsonst.
const gebaut = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'we-')), 'app.html');
fs.copyFileSync(W + 'app.html', gebaut);
execSync(`node ${JSON.stringify(W + 'build.mjs')} ${JSON.stringify(gebaut)}`, { stdio: 'ignore' });

const server = http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  let datei;
  if (p === '/app/')                  datei = gebaut;
  else if (p.startsWith('/app/lib/')) datei = W + 'lib/' + p.slice('/app/lib/'.length);
  else if (p === '/')                 datei = W + 'landing.html';
  else                                datei = W + p.replace(/^\//, '');
  if (!fs.existsSync(datei) || fs.statSync(datei).isDirectory()) { res.statusCode = 404; return res.end('404'); }
  res.setHeader('Content-Type', typen[path.extname(datei)] || 'text/plain');
  res.end(fs.readFileSync(datei));
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const seiten = ['/', '/agb.html', '/avv.html', '/datenschutz.html', '/impressum.html',
                '/pauschbetraege.html', '/fuer-steuerberater.html', '/kuendigung.html', '/app/'];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined,
});
const befund = {};
for (const pfad of seiten) {
  // Jede Seite in einem frischen Profil — kein Zwischenspeicher, keine Altlasten.
  const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const fremd = new Set();
  page.on('request', r => {
    const h = new URL(r.url()).host;
    if (h !== `localhost:${port}` && h !== `127.0.0.1:${port}`) fremd.add(h);
  });
  await page.goto(`http://localhost:${port}${pfad}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  befund[pfad] = [...fremd].sort();
  await ctx.close();
}
await browser.close();
server.close();

for (const [pfad, hosts] of Object.entries(befund)) {
  console.log((hosts.length ? 'FREMD ' : '  ok  ') + '│ ' + pfad + (hosts.length ? '   → ' + hosts.join(', ') : ''));
}
const alle = [...new Set(Object.values(befund).flat())].sort();
console.log('\n' + (alle.length
  ? 'Fremde Gegenstellen: ' + alle.join(', ')
  : 'Keine einzige Verbindung nach draussen.'));
process.exit(alle.length ? 1 : 0);
