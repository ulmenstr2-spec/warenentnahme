// Prueft die lohnsteuerliche Aufteilung des Warenrabatts — die beiden
// Fragen, an denen am 23.09.2026 die Buchhalterin eines Kunden haengen
// blieb:
//
//   1. Welcher Umsatzsteuersatz gilt fuer die Positionen im Freibetrag?
//      Der Bericht nannte den Warenrabatt als eine Zahl. Die
//      USt-Aufschluesselung darunter fasst alle Bewertungsarten zusammen,
//      so dass der Anteil des Warenrabatts je Satz nirgends stand.
//
//   2. Welcher Betrag gehoert auf den Lohnzettel? Der Bericht zeigte die
//      Jahressumme und den Rest des Freibetrags. Den steuerpflichtigen
//      Anteil DIESES Zeitraums musste man selbst ausrechnen.
//
// Die Rechnung ist nicht "Jahressumme minus 1.080". Der Freibetrag wird
// der Zeit nach verbraucht: was vor dem Zeitraum schon angefallen ist,
// ist weg. Steuerpflichtig im Zeitraum ist die Differenz der
// Ueberschreitungen vor und nach ihm.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const W = path.dirname(path.dirname(fileURLToPath(import.meta.url))) + '/';
const src = fs.readFileSync(W + 'app.html', 'utf8');

// Die echte Funktion aus app.html holen, samt allem, was sie braucht.
const holFn = (name) => {
  const m = src.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}'));
  if (!m) throw new Error('nicht gefunden in app.html: ' + name);
  return m[0] + '\n';
};
const holConst = (name) => {
  const m = src.match(new RegExp('const ' + name + '\\s*=\\s*[^\\n]*;'));
  if (!m) throw new Error('nicht gefunden in app.html: ' + name);
  return m[0] + '\n';
};
const { gmbhFreibetragAufteilung, GMBH_RABATT_FREIBETRAG } = new Function(
  holConst('GMBH_RABATT_FREIBETRAG') +
  holConst('isDiscountRelevant') +
  // roundCurrency ist mehrzeilig
  src.match(/const roundCurrency = \(value\) => \{[\s\S]*?\n\};/)[0] + '\n' +
  holFn('gmbhFreibetragAufteilung') +
  'return {gmbhFreibetragAufteilung, GMBH_RABATT_FREIBETRAG};')();

const erg = [];
const p = (n, ok, d = '') => erg.push({ n, ok, d });

p(`Der Freibetrag steht auf ${GMBH_RABATT_FREIBETRAG} €`, GMBH_RABATT_FREIBETRAG === 1080,
  'gefunden: ' + GMBH_RABATT_FREIBETRAG);

const PERSONEN = [{ id: 'p1', name: 'Person Eins', aktiv: true },
                  { id: 'p2', name: 'Person Zwei', aktiv: true }];
const rabatt = (id, datum, betrag, mwst = 7) =>
  ({ id: 'w' + datum + id + betrag, person: id, datum, methode: 'rabatt', vorteil: betrag, mwst });

// ── 1. Der Freibetrag wird der Zeit nach verbraucht
// 1.000 € vor dem Zeitraum, 100 € darin: 80 € fallen noch in den
// Freibetrag, 20 € sind steuerpflichtig. "Jahressumme minus 1.080"
// ergaebe dieselben 20 € — deshalb daneben ein Fall, wo es auseinander-
// laeuft.
{
  const w = [];
  for (let i = 1; i <= 8; i++) w.push(rabatt('p1', `2026-0${i}-15`, 125));
  w.push(rabatt('p1', '2026-09-05', 60, 7));
  w.push(rabatt('p1', '2026-09-12', 40, 19));
  const [z] = gmbhFreibetragAufteilung(w, [PERSONEN[0]], '2026', '2026-09-01', '2026-09-30');
  p('Vor dem Zeitraum angefallen: 1.000 €', z.vorher === 1000, 'gefunden: ' + z.vorher);
  p('Im Zeitraum angefallen: 100 €', z.imZeitraum === 100, 'gefunden: ' + z.imZeitraum);
  p('Davon im Freibetrag: 80 €', z.imFreibetrag === 80, 'gefunden: ' + z.imFreibetrag);
  p('Davon lohnsteuerpflichtig: 20 €', z.steuerpflichtig === 20, 'gefunden: ' + z.steuerpflichtig);
  p('Freibetrag danach erschöpft', z.restNachher === 0, 'gefunden: ' + z.restNachher);
  p('Aufteilung nach Steuersatz: 60 € zu 7 %, 40 € zu 19 %',
    z.brutto7 === 60 && z.brutto19 === 40,
    `gefunden: 7 % ${z.brutto7} €, 19 % ${z.brutto19} €`);
}

// ── 2. Der Freibetrag war schon vor dem Zeitraum ueberschritten
// Hier zeigt sich, warum "Jahressumme minus 1.080" falsch waere: die
// Jahressumme ist 1.300, minus 1.080 waeren 220 — steuerpflichtig IM
// ZEITRAUM sind aber nur die 100 des Zeitraums, weil die 120 davor
// schon im Vormonat versteuert wurden.
{
  const w = [rabatt('p1', '2026-08-15', 1200), rabatt('p1', '2026-09-10', 100)];
  const [z] = gmbhFreibetragAufteilung(w, [PERSONEN[0]], '2026', '2026-09-01', '2026-09-30');
  p('Bereits überschritten: im Zeitraum sind 100 € steuerpflichtig, nicht 220 €',
    z.steuerpflichtig === 100 && z.imFreibetrag === 0,
    `steuerpflichtig ${z.steuerpflichtig} €, im Freibetrag ${z.imFreibetrag} € ` +
    `(Jahressumme minus Freibetrag wäre 220 € — das wäre doppelt versteuert)`);
}

// ── 3. Freibetrag noch nicht ausgeschoepft
{
  const w = [rabatt('p1', '2026-09-10', 200)];
  const [z] = gmbhFreibetragAufteilung(w, [PERSONEN[0]], '2026', '2026-09-01', '2026-09-30');
  p('Unter dem Freibetrag: nichts steuerpflichtig', z.steuerpflichtig === 0 && z.imFreibetrag === 200,
    `steuerpflichtig ${z.steuerpflichtig} €`);
  p('Freibetrag-Rest 880 €', z.restNachher === 880, 'gefunden: ' + z.restNachher);
}

// ── 4. Der Freibetrag gilt je Person, nicht je Betrieb
{
  const w = [rabatt('p1', '2026-09-10', 1100), rabatt('p2', '2026-09-10', 1100)];
  const zeilen = gmbhFreibetragAufteilung(w, PERSONEN, '2026', '2026-09-01', '2026-09-30');
  p('Je Person ein eigener Freibetrag', zeilen.length === 2 &&
    zeilen.every(z => z.steuerpflichtig === 20),
    zeilen.map(z => `${z.name}: ${z.steuerpflichtig} €`).join(', '));
}

// ── 5. Der Freibetrag gilt je Kalenderjahr, kein Uebertrag
{
  const w = [rabatt('p1', '2025-12-20', 1000), rabatt('p1', '2026-01-10', 200)];
  const [z] = gmbhFreibetragAufteilung(w, [PERSONEN[0]], '2026', '2026-01-01', '2026-01-31');
  p('Das Vorjahr zählt nicht mit', z.vorher === 0 && z.steuerpflichtig === 0,
    `vorher ${z.vorher} €, steuerpflichtig ${z.steuerpflichtig} € — ` +
    `der Freibetrag beginnt jedes Kalenderjahr neu`);
}

// ── 6. Nur freibetragsrelevante Methoden zaehlen
// Marktwert und EK+Handling laufen ausdruecklich am Freibetrag vorbei.
{
  const w = [
    rabatt('p1', '2026-09-10', 1100),
    { id: 'wm', person: 'p1', datum: '2026-09-11', methode: 'marktwert', vorteil: 500, mwst: 7 },
    { id: 'we', person: 'p1', datum: '2026-09-12', methode: 'ek', vorteil: 500, mwst: 7 },
  ];
  const [z] = gmbhFreibetragAufteilung(w, [PERSONEN[0]], '2026', '2026-09-01', '2026-09-30');
  p('Marktwert und EK+Handling zählen nicht in den Freibetrag',
    z.imZeitraum === 1100 && z.steuerpflichtig === 20,
    `im Zeitraum ${z.imZeitraum} €, steuerpflichtig ${z.steuerpflichtig} €`);
}

// ── 7. Die Aufteilung nach Steuersatz muss die Summe ergeben
{
  const w = [rabatt('p1', '2026-09-02', 33.33, 7), rabatt('p1', '2026-09-03', 66.67, 19),
             rabatt('p1', '2026-09-04', 10.01, 7)];
  const [z] = gmbhFreibetragAufteilung(w, [PERSONEN[0]], '2026', '2026-09-01', '2026-09-30');
  p('7 % plus 19 % ergibt den Betrag des Zeitraums',
    Math.abs((z.brutto7 + z.brutto19) - z.imZeitraum) < 0.005,
    `7 % ${z.brutto7} + 19 % ${z.brutto19} = ${z.brutto7 + z.brutto19}, Zeitraum ${z.imZeitraum}`);
}

const fehl = erg.filter(e => !e.ok);
console.log(erg.map(e => (e.ok ? '  ok   ' : 'FEHLER') + ' │ ' + e.n + (e.d && !e.ok ? '\n         ← ' + e.d : '')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length ? 1 : 0);
