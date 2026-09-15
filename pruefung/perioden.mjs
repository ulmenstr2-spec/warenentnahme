// Prueft die Abrechnungszeitraeume aus app.html.
//
// Ein Zeitraum entscheidet, welche Entnahme in welchen Bericht faellt.
// Faellt ein Tag in zwei Zeitraeume, steht er in zwei Berichten; faellt
// er in keinen, verschwindet er. Beides ist still — der Bericht sieht
// vollstaendig aus.
//
// Zwei Fragen:
//   1. Zerlegen die Zeitraeume die Zeit lueckenlos und ueberschneidungs-
//      frei? Ueber zwoelf Jahre, fuer jeden Stichtag von 1 bis 31.
//   2. Aendert die Neufassung etwas an den Stichtagen, die die App
//      ueberhaupt anbietet? Sie darf nicht. Ein Nutzer, der seit Monaten
//      mit dem 15. arbeitet, soll nach einem Update dieselben Zeitraeume
//      sehen wie vorher, sonst verschieben sich seine Berichte.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const W = path.dirname(path.dirname(fileURLToPath(import.meta.url))) + '/';
const src = fs.readFileSync(W + 'app.html', 'utf8');

// Die echten Funktionen aus app.html holen, nicht nachbauen.
// Einstellig ohne Klammern (t=>…) oder mehrstellig mit ((a,b)=>…),
// Rumpf in geschweiften Klammern oder als Einzeiler.
const hol = (name) => {
  // Einzeiler zuerst: sonst frisst das mehrzeilige Muster gierig bis zum
  // naechsten "\n};" und nimmt die folgende Funktion mit.
  const arg = '(?:\\([^)]*\\)|[A-Za-z_$][\\w$]*)';
  let m = src.match(new RegExp('const ' + name + '\\s*=\\s*' + arg + '\\s*=>[^\\n]*;'));
  if (!m) m = src.match(new RegExp('const ' + name + '\\s*=\\s*' + arg + '\\s*=>\\s*\\{[\\s\\S]*?\\n\\};'));
  if (!m) throw new Error('nicht gefunden in app.html: ' + name);
  return m[0] + '\n';
};
const namen = ['periodTagGueltig','periodTagImMonat','periodStart',
               'periodNaechsterStart','periodEnde','periodStr','periodUm'];
const { periodUm, periodTagGueltig } =
  new Function(namen.map(hol).join('') + 'return {periodUm,periodTagGueltig};')();

// Die Fassung, die bis zum 15.09.2026 an vier Stellen im Code stand.
// Sie bleibt hier stehen, damit belegbar ist, dass sich fuer die
// waehlbaren Stichtage nichts geaendert hat.
const alteFassung = (tag, zeitpunkt) => {
  const d = tag || 1;
  let start = new Date(zeitpunkt.getFullYear(), zeitpunkt.getMonth(), d);
  if (start > zeitpunkt) start = new Date(start.getFullYear(), start.getMonth() - 1, d);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, d - 1);
  const s = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { sk: s(start), ek: s(end) };
};

// Die Stichtage, die die Oberflaeche anbietet — aus app.html gelesen,
// damit diese Pruefung mitwaechst, wenn dort einer hinzukommt.
const angebot = src.match(/\{\[([\d,]+)\]\.map\(d=>\(?\s*<button key=\{d\} onClick=\{\(\)=>setTmpDay/);
const WAEHLBAR = angebot ? angebot[1].split(',').map(Number) : null;

const erg = [];
const p = (n, ok, d = '') => erg.push({ n, ok, d });
p('Die wählbaren Stichtage stehen in app.html', !!WAEHLBAR,
  'Auswahlliste nicht gefunden — heißt setTmpDay noch so?');

const VON = 2024, BIS = 2035;
const iso = d => d.toISOString().slice(0, 10);

// ── 1. Lückenlos und überschneidungsfrei, für jeden Stichtag 1–31
const kaputt = [];
for (let tag = 1; tag <= 31; tag++) {
  const zeitraeume = new Map();
  for (let j = VON; j <= BIS; j++)
    for (let t = 0; t < 366; t++) {
      const heute = new Date(j, 0, 1 + t, 12);
      if (heute.getFullYear() !== j) break;
      const z = periodUm(tag, heute);
      zeitraeume.set(z.sk + '|' + z.ek, z);
    }
  let doppelt = 0, keinmal = 0, laengstes = 0, beispiel = '';
  for (const z of zeitraeume.values())
    laengstes = Math.max(laengstes,
      (Date.parse(z.ek + 'T00:00:00Z') - Date.parse(z.sk + 'T00:00:00Z')) / 86400000 + 1);
  for (let j = VON + 1; j <= BIS - 1; j++)
    for (let t = 0; t < 366; t++) {
      const d = new Date(Date.UTC(j, 0, 1 + t));
      if (d.getUTCFullYear() !== j) break;
      const s = iso(d);
      let n = 0;
      for (const z of zeitraeume.values()) if (s >= z.sk && s <= z.ek) n++;
      if (n !== 1) { if (n > 1) doppelt++; else keinmal++; if (!beispiel) beispiel = `${s} liegt in ${n} Zeiträumen`; }
    }
  if (doppelt || keinmal || laengstes > 31)
    kaputt.push(`Stichtag ${tag}: ${doppelt} Tage doppelt, ${keinmal} Tage nirgends, längster Zeitraum ${laengstes} Tage (${beispiel})`);
}
p(`Jeder Tag liegt in genau einem Zeitraum, Stichtag 1–31, ${VON}–${BIS}`,
  kaputt.length === 0, kaputt.slice(0, 4).join('\n           '));

// ── 2. Für die wählbaren Stichtage darf sich nichts geändert haben
if (WAEHLBAR) {
  const abweichend = [];
  for (const tag of WAEHLBAR)
    for (let j = VON; j <= BIS; j++)
      for (let t = 0; t < 366; t++) {
        const heute = new Date(j, 0, 1 + t, 12);
        if (heute.getFullYear() !== j) break;
        const a = alteFassung(tag, heute), b = periodUm(tag, heute);
        if (a.sk !== b.sk || a.ek !== b.ek)
          abweichend.push(`Stichtag ${tag}, am ${iso(new Date(Date.UTC(j, 0, 1 + t)))}: vorher ${a.sk}…${a.ek}, jetzt ${b.sk}…${b.ek}`);
      }
  p(`Für die wählbaren Stichtage (${WAEHLBAR.join(', ')}.) gilt weiterhin dasselbe`,
    abweichend.length === 0,
    `${abweichend.length} Abweichungen, z. B. ${abweichend[0]}`);

  // Gegenprobe: Bei 29, 30 und 31 MUSS sich etwas geaendert haben,
  // sonst prueft der Vergleich oben nichts.
  const gebessert = [];
  for (const tag of [29, 30, 31]) {
    let n = 0;
    for (let t = 0; t < 366; t++) {
      const heute = new Date(2026, 0, 1 + t, 12);
      if (heute.getFullYear() !== 2026) break;
      const a = alteFassung(tag, heute), b = periodUm(tag, heute);
      if (a.sk !== b.sk || a.ek !== b.ek) n++;
    }
    if (n) gebessert.push(`${tag}.: ${n} Tage`);
  }
  p('Bei Stichtag 29, 30 und 31 liefert die Neufassung andere Zeiträume',
    gebessert.length === 3, 'unverändert geblieben — dann greift die Korrektur nicht: ' + gebessert.join(', '));
}

// ── 3. Unbrauchbare Stichtage aus einer Sicherung
const muell = [[0, 1], [-5, 1], [99, 31], [null, 1], [undefined, 1], ['abc', 1], ['15', 15], [1.7, 1]];
const muellFehler = muell.filter(([v, soll]) => periodTagGueltig(v) !== soll)
  .map(([v]) => `${JSON.stringify(v)} → ${periodTagGueltig(v)}`);
p('Unbrauchbare Stichtage werden eingefangen', muellFehler.length === 0, muellFehler.join(', '));

const fehl = erg.filter(e => !e.ok);
console.log(erg.map(e => (e.ok ? '  ok   ' : 'FEHLER') + ' │ ' + e.n + (e.d && !e.ok ? '\n         ← ' + e.d : '')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length ? 1 : 0);
