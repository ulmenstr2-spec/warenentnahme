// Haelt die Pauschbetraege in app.html gegen die amtliche Tabelle.
//
// Diese Zahlen sind das Produkt. Stimmen sie nicht, ist alles andere
// egal — die App rechnet dann sauber, gruendlich und falsch.
//
// Die Sollwerte stehen hier bewusst noch einmal ausgeschrieben, statt aus
// app.html gelesen zu werden. Eine Pruefung, die ihren Massstab aus dem
// Geprueften bezieht, bestaetigt jeden Tippfehler.
//
// Quelle: BMF-Schreiben vom 23.12.2025,
// GZ IV D 3 - S 1547/00006/007/021, Jahreswerte netto je Person,
// gueltig 01.01.2026 bis 31.12.2026.
//
// Beim naechsten BMF-Schreiben: WERTE_JAHR in app.html hochzaehlen, die
// Tabelle dort ersetzen und diese Tabelle hier gegen das neue Schreiben
// neu abschreiben — aus dem Schreiben, nicht aus app.html.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const W = path.dirname(path.dirname(fileURLToPath(import.meta.url))) + '/';
const src = fs.readFileSync(W + 'app.html', 'utf8');

const JAHR = 2026;
const AMTLICH = {
  // Gewerbezweig                                 7 %    19 %
  'Gaststätten aller Art, kalte Speisen':       [1824,  629],
  'Gaststätten aller Art, kalte und warme':     [3173,  828],
  'Café und Konditorei':                        [1610,  598],
  'Bäckerei':                                   [1671,  214],
  'Fleischerei / Metzgerei':                    [1487,  567],
  'Nahrungs- und Genussmittel (Einzelhandel)':  [1395,  368],
};
// Welcher Schluessel in BETRIEBE welche Zeile der amtlichen Tabelle meint.
// Imbiss und Hotel sind keine eigenen Zeilen — beide sind Gaststaetten mit
// warmen Speisen.
const ZUORDNUNG = {
  gaststaetten:      'Gaststätten aller Art, kalte und warme',
  gaststaetten_kalt: 'Gaststätten aller Art, kalte Speisen',
  imbiss:            'Gaststätten aller Art, kalte und warme',
  hotel:             'Gaststätten aller Art, kalte und warme',
  cafe:              'Café und Konditorei',
  baeckerei:         'Bäckerei',
  fleischerei:       'Fleischerei / Metzgerei',
  sonstige:          'Nahrungs- und Genussmittel (Einzelhandel)',
};

const erg = [];
const p = (n, ok, d = '') => erg.push({ n, ok, d });

// Das Jahr, fuer das die Werte hinterlegt sind.
const jahrTreffer = src.match(/const WERTE_JAHR\s*=\s*(\d{4})/);
p('WERTE_JAHR steht in app.html', !!jahrTreffer);
if (jahrTreffer)
  p(`WERTE_JAHR ist ${JAHR} — dasselbe Jahr wie diese Tabelle`,
    parseInt(jahrTreffer[1]) === JAHR,
    `app.html sagt ${jahrTreffer[1]}, diese Prüfung kennt nur ${JAHR}. ` +
    `Entweder wurde app.html auf ein neues BMF-Schreiben gehoben und diese ` +
    `Tabelle nicht — dann gehört sie aus dem Schreiben nachgezogen.`);

// BETRIEBE aus der Quelle holen und wirklich auswerten.
const block = src.match(/const BETRIEBE = \{[\s\S]*?\n\};/);
if (!block) { console.log('FEHLER │ BETRIEBE nicht in app.html gefunden'); process.exit(1); }
const BETRIEBE = new Function(block[0] + '\nreturn BETRIEBE;')();

for (const [schluessel, zeile] of Object.entries(ZUORDNUNG)) {
  const b = BETRIEBE[schluessel];
  if (!b) { p(`${schluessel}: in BETRIEBE vorhanden`, false, 'fehlt'); continue; }
  const [s7, s19] = AMTLICH[zeile];
  p(`${schluessel} (${zeile}): ${s7} € / ${s19} €`,
    b.ust7 === s7 && b.ust19 === s19,
    `app.html hat ${b.ust7} € / ${b.ust19} €`);
}

// Kein Gewerbezweig ohne Anteil zum vollen Steuersatz. Jede Zeile der
// amtlichen Tabelle hat einen — wo 0 steht, fehlt Umsatzsteuer.
const ohne19 = Object.entries(BETRIEBE).filter(([, b]) => !b.ust19);
p('Keine Betriebsart ohne 19-%-Anteil', ohne19.length === 0,
  ohne19.map(([k]) => k).join(', ') + ' — dort wird keine Umsatzsteuer zum vollen Satz angesetzt');

// Jeder Schluessel in BETRIEBE ist zugeordnet: eine neue Betriebsart soll
// nicht ungeprueft durchrutschen.
const unzugeordnet = Object.keys(BETRIEBE).filter(k => !ZUORDNUNG[k]);
p('Jede Betriebsart ist einer amtlichen Zeile zugeordnet', unzugeordnet.length === 0,
  unzugeordnet.join(', ') + ' — in ZUORDNUNG ergänzen und gegen das BMF-Schreiben prüfen');

// ── Die oeffentliche Seite muss dieselben Zahlen nennen wie die App.
// pauschbetraege.html hat eine eigene Tabelle und einen eigenen Rechner.
// Zwei Orte fuer dieselbe Zahl laufen auseinander — am 15.09.2026 standen
// dort dieselben falschen Werte wie in der App, nur eben oeffentlich.
const seite = fs.readFileSync(W + 'pauschbetraege.html', 'utf8');
const seitenBlock = seite.match(/SAETZE\s*=\s*\{[\s\S]*?\}/);
if (!seitenBlock) {
  p('Rechner-Tabelle in pauschbetraege.html gefunden', false, 'SAETZE nicht gefunden');
} else {
  const SAETZE = new Function('return ' + seitenBlock[0].replace(/^SAETZE\s*=\s*/, '') + ';')();
  const abweichend = Object.entries(BETRIEBE)
    .filter(([k, b]) => !SAETZE[k] || SAETZE[k][0] !== b.ust7 || SAETZE[k][1] !== b.ust19)
    .map(([k, b]) => `${k}: App ${b.ust7}/${b.ust19}, Seite ${SAETZE[k] ? SAETZE[k].join('/') : 'fehlt'}`);
  p('Rechner auf pauschbetraege.html nennt dieselben Werte wie die App',
    abweichend.length === 0, abweichend.join('; '));

  // Und die Tabelle auf derselben Seite muss zum Rechner darunter passen.
  const fehltInTabelle = Object.values(SAETZE)
    .map(([a, b]) => [a, b, a + b])
    .filter(([a, b, g]) => {
      const de = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return !seite.includes(`<td class="num total">${de(g)}</td>`);
    });
  p('Tabelle auf pauschbetraege.html passt zum Rechner darunter',
    fehltInTabelle.length === 0,
    fehltInTabelle.map(([a, b, g]) => `Gesamtwert ${g} € steht nicht in der Tabelle`).join('; '));
}

const fehl = erg.filter(e => !e.ok);
console.log(erg.map(e => (e.ok ? '  ok   ' : 'FEHLER') + ' │ ' + e.n + (e.d && !e.ok ? '\n         ← ' + e.d : '')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length ? 1 : 0);
