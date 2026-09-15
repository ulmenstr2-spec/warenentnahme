// Prueft die zentralen Geldfunktionen aus app.html.
//
// Die Funktionen werden aus der Quelle gezogen und wirklich ausgefuehrt —
// nicht nachgebaut. Waere hier eine Kopie, wuerde die Pruefung die Kopie
// pruefen und die App unbemerkt daneben laufen.
//
// Der Massstab ist exakte Bruchrechnung mit BigInt. Eine Referenz, die
// selbst mit Gleitkommazahlen rechnet, hat dieselben Fehler wie das
// Geprueft und bestaetigt jeden davon.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const W = path.dirname(path.dirname(fileURLToPath(import.meta.url))) + '/';
const src = fs.readFileSync(W + 'app.html', 'utf8');

const hol = (name) => {
  let m = src.match(new RegExp('const ' + name + ' = \\([^)]*\\) => \\{[\\s\\S]*?\\n\\};'));
  if (!m) m = src.match(new RegExp('const ' + name + ' = \\([^)]*\\) => [^\\n]*;'));
  if (!m) throw new Error('nicht gefunden in app.html: ' + name);
  return m[0] + '\n';
};
// eval() legt in einem Modul keine Bindungen an — deshalb ueber new Function.
const namen = ['roundCurrency', 'calcNetFromGross', 'calcGrossFromNet', 'calcUstFromNet'];
const { roundCurrency, calcNetFromGross, calcGrossFromNet, calcUstFromNet } =
  new Function(namen.map(hol).join('') + 'return {' + namen.join(',') + '};')();

const erg = [];
const p = (n, ok, d = '') => erg.push({ n, ok, d });

// Exakter Massstab: p/q kaufmaennisch auf Cent, vom Nullpunkt weg.
const centExakt = (p_, q) => {
  let z = p_; const neg = z < 0n; if (neg) z = -z;
  const c = (z * 200n + q) / (2n * q);
  return Number(neg ? -c : c) / 100;
};

// ── 1. Halbe Cent muessen aufrunden
// Math.round(x*100) allein rundet 2,675 ab, weil die Zahl im Rechner
// 267.49999999999997 ist. Betrifft echte Preise, nicht nur Theorie.
const halbe = [[1.005, 1.01], [2.675, 2.68], [8.045, 8.05], [1.115, 1.12], [0.615, 0.62],
               [-1.005, -1.01], [-2.675, -2.68]];
const kaputt = halbe.filter(([v, soll]) => roundCurrency(v) !== soll);
p('Halber Cent rundet auf, in beide Richtungen', kaputt.length === 0,
  kaputt.map(([v, s]) => `${v} → ${roundCurrency(v)} statt ${s}`).join(', '));

// ── 2. Die echten Preiswege gegen exakte Bruchrechnung
// Weg 1: Einkaufspreis + Handlingaufschlag (Vorgabe 15 %)
// Weg 2: Gaeste-Verkaufspreis × 0,96
// Weg 3: Netto aus Brutto
const wege = [];
for (const [zn, zd] of [[10n,100n],[125n,1000n],[150n,1000n],[200n,1000n],[250n,1000n],[300n,1000n]])
  for (let c = 1; c <= 5000; c++) {
    const s = Number(zn) / Number(zd);
    wege.push(['EK+Handling', (c/100)*(1+s), BigInt(c)*(zd+zn), 100n*zd]);
  }
for (let c = 1; c <= 20000; c++) wege.push(['Gäste-VK × 0,96', (c/100)*0.96, BigInt(c)*96n, 10000n]);
for (const u of [7n,19n]) for (let c = 1; c <= 20000; c++)
  wege.push([`Netto aus Brutto @${u}%`, (c/100)/(1+Number(u)/100), BigInt(c)*100n, 100n*(100n+u)]);

const proWeg = {};
for (const [weg, flt, zaehler, nenner] of wege) {
  proWeg[weg] ??= { n: 0, erst: '' };
  if (roundCurrency(flt) !== centExakt(zaehler, nenner)) {
    proWeg[weg].n++;
    if (!proWeg[weg].erst) proWeg[weg].erst = `${flt} → ${roundCurrency(flt)} statt ${centExakt(zaehler, nenner)}`;
  }
}
for (const [weg, v] of Object.entries(proWeg))
  p(`${weg}: gerundet wie exakt gerechnet`, v.n === 0, `${v.n} Abweichungen, z. B. ${v.erst}`);

// ── 3. Glatte Cent-Betraege duerfen sich nicht veraendern
let glatt = 0, glattErst = '';
for (let c = -50000; c <= 50000; c++) {
  const v = c / 100;
  if (roundCurrency(v) !== v) { glatt++; if (!glattErst) glattErst = `${v} → ${roundCurrency(v)}`; }
}
p('Glatte Cent-Beträge bleiben unverändert', glatt === 0, `${glatt} verändert, z. B. ${glattErst}`);

// ── 4. Unbrauchbare Eingaben ergeben 0, nicht NaN oder Infinity
const muell = [['abc',0],[null,0],[undefined,0],[NaN,0],[Infinity,0],[-Infinity,0],['',0]];
const muellFehler = muell.filter(([v, soll]) => roundCurrency(v) !== soll);
p('Unbrauchbare Eingaben ergeben 0', muellFehler.length === 0,
  muellFehler.map(([v]) => `${JSON.stringify(v)} → ${roundCurrency(v)}`).join(', '));

// ── 5. Brutto = Netto + USt, ueber den ganzen Wertebereich
let unstimmig = 0, unstErst = '';
for (let cent = 1; cent <= 50000; cent++) {
  const brutto = cent / 100;
  for (const ust of [7, 19]) {
    const netto = calcNetFromGross(brutto, ust);
    const steuer = roundCurrency(brutto - netto);
    if (roundCurrency(netto + steuer) !== brutto) { unstimmig++; if (!unstErst) unstErst = `${brutto} @${ust}%`; }
  }
}
p('Brutto = Netto + USt (50.000 Werte × 2 Sätze)', unstimmig === 0,
  `${unstimmig} Abweichungen, z. B. ${unstErst}`);

// ── 6. calcGrossFromNet und calcUstFromNet passen zusammen
let ruecklauf = 0, ruecklaufErst = '';
for (let cent = 1; cent <= 50000; cent++) {
  const netto = cent / 100;
  for (const ust of [7, 19]) {
    const brutto = calcGrossFromNet(netto, ust);
    const steuer = calcUstFromNet(netto, ust);
    if (roundCurrency(netto + steuer) !== brutto) {
      ruecklauf++; if (!ruecklaufErst) ruecklaufErst = `${netto} @${ust}%: ${netto}+${steuer} ≠ ${brutto}`;
    }
  }
}
p('Netto + calcUstFromNet = calcGrossFromNet', ruecklauf === 0,
  `${ruecklauf} Abweichungen, z. B. ${ruecklaufErst}`);

const fehl = erg.filter(e => !e.ok);
console.log(erg.map(e => (e.ok ? '  ok   ' : 'FEHLER') + ' │ ' + e.n + (e.d && !e.ok ? '\n         ← ' + e.d : '')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length ? 1 : 0);
