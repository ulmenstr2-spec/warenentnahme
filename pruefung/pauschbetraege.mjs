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
// GZ IV D 3 - S 1547/00006/007/021, DOK COO.7005.100.2.13818400,
// Jahreswerte netto je Person, gueltig 01.01.2026 bis 31.12.2026.
// Am 15.09.2026 aus dem Schreiben selbst abgeschrieben, Zeile fuer Zeile.
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
// Die vollstaendige Tabelle des Schreibens, alle neun Zeilen.
const AMTLICH = {
  // Gewerbezweig                                       7 %    19 %
  'Bäckerei':                                        [1671,  214],
  'Fleischerei/Metzgerei':                           [1487,  567],
  'Gaststätten aller Art, a) kalte Speisen':         [1824,  629],
  'Gaststätten aller Art, b) kalte und warme':       [3173,  828],
  'Getränkeeinzelhandel':                            [ 123,  276],
  'Café und Konditorei':                             [1610,  598],
  // Diese Null steht so im Schreiben: das Sortiment laeuft vollstaendig
  // zum ermaessigten Satz. Kein Uebertragungsfehler.
  'Milch, Milcherzeugnisse, Fettwaren und Eier (Eh.)':[721,    0],
  'Nahrungs- und Genussmittel (Eh.)':                [1395,  368],
  'Obst, Gemüse, Südfrüchte und Kartoffeln (Eh.)':   [ 384,  169],
};
// Welcher Schluessel in BETRIEBE welche Zeile der amtlichen Tabelle meint.
// Imbiss und Hotel sind keine eigenen Zeilen — beide sind Gaststaetten mit
// warmen Speisen.
const ZUORDNUNG = {
  gaststaetten:      'Gaststätten aller Art, b) kalte und warme',
  gaststaetten_kalt: 'Gaststätten aller Art, a) kalte Speisen',
  imbiss:            'Gaststätten aller Art, b) kalte und warme',
  hotel:             'Gaststätten aller Art, b) kalte und warme',
  cafe:              'Café und Konditorei',
  baeckerei:         'Bäckerei',
  fleischerei:       'Fleischerei/Metzgerei',
  sonstige:          'Nahrungs- und Genussmittel (Eh.)',
  getraenke:         'Getränkeeinzelhandel',
  milch:             'Milch, Milcherzeugnisse, Fettwaren und Eier (Eh.)',
  obstgemuese:       'Obst, Gemüse, Südfrüchte und Kartoffeln (Eh.)',
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

// Eine 0 beim vollen Steuersatz nur dort, wo das Schreiben sie auch hat.
// Frueher standen drei Nullen im Code, die im Schreiben keine sind —
// eine Baeckerei verkauft Kaffee. Genau eine Zeile hat wirklich eine
// Null, und eine pauschale Regel "nie 0" waere an ihr zu Unrecht
// angesprungen.
const falscheNull = Object.entries(BETRIEBE)
  .filter(([k, b]) => !b.ust19 && AMTLICH[ZUORDNUNG[k]] && AMTLICH[ZUORDNUNG[k]][1] !== 0)
  .map(([k]) => k);
p('Eine 0 beim vollen Steuersatz nur, wo das Schreiben sie hat', falscheNull.length === 0,
  falscheNull.join(', ') + ' — dort wird keine Umsatzsteuer zum vollen Satz angesetzt, obwohl das Schreiben eine vorsieht');

// Keine Zeile des Schreibens fehlt. Sonst waehlt ein Getraenkehaendler
// notgedrungen etwas Falsches.
const fehlend = Object.keys(AMTLICH).filter(z => !Object.values(ZUORDNUNG).includes(z));
p('Jede Zeile des BMF-Schreibens ist in der App wählbar', fehlend.length === 0,
  'nicht abgebildet: ' + fehlend.join('; '));

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
