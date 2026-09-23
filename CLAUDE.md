# warenentnahme.de

Web-Anwendung zur Dokumentation von **Sachentnahmen, Eigenverbrauch und
Personalessen** für Gastronomie und Lebensmittelbetriebe. Gebaut von Josef
Czerwinski (Grüne Kombüse, Rostock) zunächst für den eigenen Betrieb.

49 € im Jahr je Betrieb, 30 Tage kostenlos. **Seit 14.09.2026 im
Echtbetrieb mit echten Zahlungen.**

Zwei Modi: **Einzelunternehmen/GbR** rechnet mit den BMF-Pauschbeträgen,
**GmbH/UG** erfasst einzeln nach § 8 Abs. 3 EStG mit Jahresfreibetrag.

---

## Die wichtigste Regel

> **Der Deploy nimmt nur ausdrücklich benannte Dateien mit.**
> `deploy.yml` arbeitet mit einer Liste von `cp`-Befehlen, bewusst ohne
> Ausschlussliste. Was dort nicht steht, gelangt nicht auf den Server.
>
> **`server/*.php` wird NICHT deployt.** Diese Dateien müssen von Hand
> per FTP hochgeladen werden.

Das ist die Quelle der meisten Pannen in diesem Projekt. Wer eine
PHP-Datei ändert und nur mergt, bringt die neue App gegen einen alten
Server zum Laufen — meist ohne Fehlermeldung.

**Nach jeder Änderung an `server/` gehört in die Antwort an den Nutzer,
welche Datei wohin muss.**

| Datei | Zielordner |
|---|---|
| `api.php`, `api-stripe-actions.php`, `stripe-webhook.php` | `/public/app/` |
| `mailversand.php`, `rechtsstand.php`, `config*.php` | `/public/app/` |
| `kuendigung.php` | `/public/` ← **nicht** `/public/app/` |

`kuendigung.html` (Formular) geht automatisch raus, `kuendigung.php`
(Empfänger) nicht. Zwei fast gleiche Namen, zwei verschiedene Wege — das
hat schon einmal einen halben Tag gekostet.

**`config.php` und `config.stripe.php` enthalten Zugangsdaten**, stehen in
`.gitignore` und liegen ausschließlich auf dem Server. Niemals committen,
niemals in den Deploy aufnehmen, niemals in einer Antwort wiedergeben.

---

## Aufbau

| | |
|---|---|
| `app.html` | die Anwendung, ~7.000 Zeilen React 18 mit JSX in einer Datei |
| `landing.html` → `index.html` | Startseite |
| `pauschbetraege.html`, `eigenverbrauch-buchen.html`, `fuer-steuerberater.html` | Inhaltsseiten für die Suche |
| `agb.html`, `avv.html`, `datenschutz.html`, `impressum.html`, `kuendigung.html` | Rechtstexte |
| `lib/` | React, xlsx, jsPDF, pdf.js — **lokal**, nichts wird von außen geladen |
| `fonts/`, `schriften.css` | Schriftarten lokal |
| `server/` | PHP, **manueller Upload** |
| `recht/` | TOMs, Verarbeitungsverzeichnis, Löschkonzept, Fassungsarchiv — **bewusst nicht deployt** |
| `pruefung/` | ausführbare Dauerprüfungen |
| `TODO.md` | Stand und Chronik, oben steht was offen ist |

**Auf dem Server liegen Dateien, die nicht im Repo sind** — unter anderem
`api-proxy.php` (Anthropic-Proxy für den Rechnungsscan) und `bnn-index.php`.
Nicht davon ausgehen, dass `/public/app/` dem Repo entspricht.

**`README.md` ist veraltet.** Sie beschreibt eine Installation von vor dem
Umbau. Nicht als Quelle benutzen.

---

## Bauen

```bash
npm install --no-save esbuild
cp app.html /tmp/pruefbau.html && node build.mjs /tmp/pruefbau.html
```

> **`build.mjs` schreibt die Datei an Ort und Stelle um.**
> Niemals direkt auf `app.html` anwenden — das zerstört die Quelle.
> Immer erst kopieren. Der Deploy macht es genauso.

Der Build übersetzt das JSX mit esbuild und entfernt den Babel-Verweis.
Er bricht bei Syntaxfehlern ab und nimmt damit den Deploy mit.

---

## Prüfen

Die Browserprüfungen brauchen `playwright` und einen Chromium.

```bash
npm install --no-save esbuild react@18.2.0 react-dom@18.2.0
npm install --no-save playwright        # oder einen vorhandenen verlinken
export PLAYWRIGHT_CHROMIUM=/pfad/zu/chromium   # falls nicht mitinstalliert
```

In einer Umgebung mit vorinstalliertem Playwright genügt oft:

```bash
ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright
ln -sfn /opt/node22/lib/node_modules/playwright-core node_modules/playwright-core
export PLAYWRIGHT_CHROMIUM=/opt/pw-browsers/chromium
```

React und React-DOM werden gebraucht, weil die App sie im Betrieb aus
`lib/` lädt — die Prüfungen speisen sie stattdessen ein.

| Prüfung | Was sie belegt |
|---|---|
| `node pruefung-extern.mjs` | Keine Seite baut eine Verbindung zu einem fremden Server auf |
| `pruefung/adressen-aufbau.sh && pruefung/adressen-pruefe.sh` | Adressregeln gegen echten Apache mit der echten `.htaccess` |
| `node pruefung/adressen-links.mjs` | Jeder interne Link antwortet direkt mit 200 — ein 301 gilt als Fehler |
| `node pruefung/mahlzeiten-dubletten.mjs` | Rückfrage bei doppelter Mahlzeit, beide Modi |
| `node pruefung/rechnen.mjs` | Die Geldfunktionen gegen exakte Bruchrechnung, 90.000 Werte je Rechenweg |
| `node pruefung/ust-satz-exporte.mjs` | Alle vier Exportwege nennen denselben USt-Satz fürs Personalessen |
| `node pruefung/pauschbetraege.mjs` | Die BMF-Werte in App **und** auf `pauschbetraege.html` gegen die amtliche Tabelle |
| `node pruefung/jahreswechsel.mjs` | Beide Modi warnen im Folgejahr vor veralteten Werten — und vorher nicht |
| `node pruefung/perioden.mjs` | Jeder Tag liegt in genau einem Abrechnungszeitraum, Stichtag 1–31 über zwölf Jahre |
| `node pruefung/perioden-bericht.mjs` | Der Bericht summiert genau die Einträge des gewählten Zeitraums, Grenztage inbegriffen |
| `node pruefung/sync-loeschen.mjs` | Zwei Geräte gegen einen echten Server: Gelöschtes bleibt gelöscht, „Jetzt herunterladen" holt wirklich den Serverstand |
| `node pruefung/konto.mjs` | PIN-Reset über den Link aus der Mail; beim Kontowechsel wandern keine fremden Einträge mit |
| `node pruefung/oberflaeche.mjs` | Aufräumen verschont benutzte Artikel, Manifest zeigt auf `/app/`, alle Reiter passen in eine Zeile |
| `node pruefung/freibetrag.mjs` | Die lohnsteuerliche Aufteilung des Warenrabatts, sieben Fälle inkl. Jahreswechsel und Vorverbrauch |
| `node pruefung/freibetrag-ausgaben.mjs` | Bildschirm, PDF und Excel nennen denselben lohnsteuerpflichtigen Betrag |

Für die Apache-Prüfungen: `sudo apt-get install -y apache2`. Der Testbau
muss unter `/var/www/` liegen — auf ein Verzeichnis, das der Benutzer
`www-data` nicht betreten darf, antwortet Apache mit 403, und das sieht
wie ein Fehler in den Regeln aus.

---

## Arbeitsweise

**Alles wird gemessen, nichts behauptet.**

Ein Dutzend echter Fehler in diesem Projekt wurde dadurch gefunden, dass
etwas *ausgeführt* wurde — nicht durch Lesen des Codes. Mehrere davon
hätten erst beim ersten zahlenden Kunden zugeschlagen, still und ohne
Fehlermeldung.

Konkret heißt das:

- Eine Schaltfläche gilt erst als geprüft, wenn sie **angeklickt** wurde.
  „Sichtbar" ist nicht „antippbar" — die Navigationsleiste hat einmal den
  Kündigungslink abgefangen.
- Ein Export gilt erst als geprüft, wenn ihn jemand **in dem Programm
  geöffnet hat, in dem der Empfänger ihn öffnet.** Die CSV-Datei war
  formal makellos und kam trotzdem falsch an.
- Wo eine Behauptung nicht belegbar ist, gehört sie als offene Lücke
  markiert — siehe `recht/TOM.md`, Abschnitt 7.
- **Eine Prüfung, die nicht fehlschlagen kann, prüft nichts.** Nach jeder
  neuen Prüfung einmal den Fehler wieder einbauen und zusehen, dass sie
  anspringt. `adressen-links.mjs` hat monatelang „alles gut" gemeldet:
  ohne laufenden Apache fand sie null Links, verschluckte den Abbruch und
  kam nie bis zu ihrer eigenen Schleife.

Wenn eine Annahme sich als falsch erweist, gehört das klar gesagt und
nicht umschifft.

---

## Fallen, die schon zugeschnappt sind

**Die Mahlzeiten-Logik gibt es zweimal.** `function MealsTab`
(Einzelunternehmen) und `function GmbhMealsTab` (GmbH) haben dieselben
Funktionen `addOne`/`removeOne`/`count`. Eine Änderung an einer Stelle ist
fast immer an beiden nötig — danach suchen, nicht nach Zeilennummern.

**Es gibt sieben Ausgabewege, und sie müssen dieselbe Zahl nennen.**
Neutrales CSV, DATEV, Lexware, sevDesk, Excel, PDF und die
Bildschirmansicht — je Modus. Am 15.09.2026 wiesen sie für dieselbe
Mahlzeit desselben Tages zwei verschiedene Umsatzsteuersätze aus: Excel
7 %, die drei Buchhaltungsformate 19 %. Ursache war ein fest
hingeschriebener Satz statt `mealUstSatz`. Wer einen Steuersatz, ein
Konto oder eine Bewertung ändert, ändert sie an allen sieben Stellen —
`pruefung/ust-satz-exporte.mjs` liest sie im echten Browser nach.

**Der Umsatzsteuersatz fürs Personalessen hängt am Datum.** Bis
31.12.2025 19 %, ab 01.01.2026 wieder 7 %. Die eine gültige Fassung ist
`mealUstSatz` ganz oben. Die Regel stand schon zweimal als lokale Kopie
und einmal als hingeschriebenes Datum im Code — jede Kopie läuft
irgendwann auseinander.

**`Math.round(betrag * 100)` rundet halbe Cent falsch ab.** 2,675 × 100
ist im Rechner 267.49999999999997. Deshalb geht jede Währungsrundung
durch `roundCurrency`, das den Wert vorher über `toFixed(4)` einfängt.
Erreichbar war das über Einkaufspreis plus Handlingaufschlag: bei den
15 % der Vorgabe traf es 116 von 5.000 Einkaufspreisen.
`pruefung/rechnen.mjs` prüft das gegen exakte Bruchrechnung mit BigInt —
ein Maßstab, der selbst mit Gleitkommazahlen rechnet, bestätigt den
Fehler nur.

**Die amtlichen Werte stehen an zwei Orten.** `BETRIEBE` in `app.html`
und Tabelle plus Rechner in `pauschbetraege.html`. Am 15.09.2026 stand in
beiden dasselbe falsch: von sieben Betriebsarten stimmte genau eine — die
Gaststätte, also der eigene Betrieb. Bei Bäckerei, Fleischerei und
Sonstigen stand der 19-%-Anteil auf 0, obwohl eine Bäckerei Kaffee
verkauft, und drei Gewerbezweige des Schreibens fehlten ganz.
`pruefung/pauschbetraege.mjs` hält beide Orte gegen eine dritte, von Hand
aus dem BMF-Schreiben abgeschriebene Tabelle.

**Eine Null kann richtig sein.** „Milch, Milcherzeugnisse, Fettwaren und
Eier (Eh.)" hat im Schreiben wirklich 0 € beim vollen Steuersatz — das
Sortiment läuft vollständig zum ermäßigten. Eine pauschale Regel „nie 0"
wäre daran zu Unrecht angesprungen; die Prüfung vergleicht deshalb Zeile
für Zeile gegen das Schreiben statt gegen eine Faustregel.

**Das Jahr steht in `WERTE_JAHR`, sonst nirgends.** Pauschbeträge,
Sachbezugswerte und der Freibetrag gelten je Kalenderjahr. Beim nächsten
BMF-Schreiben: `WERTE_JAHR` hochzählen, die drei Wertetabellen ersetzen,
`pruefung/pauschbetraege.mjs` aus dem neuen Schreiben nachziehen — nicht
aus `app.html`, sonst bestätigt die Prüfung jeden Tippfehler. Bis das
geschieht, warnt `JahrHinweis` den Nutzer in beiden Modi.

**Der Abrechnungszeitraum wird nirgends mehr von Hand gerechnet.** Er
läuft vom Stichtag bis zum Tag *vor* dem nächsten Stichtag; dadurch kann
weder eine Lücke noch eine Überschneidung entstehen. Die Funktionen dafür
(`periodUm`, `periodStart`, `periodEnde`, `periodNaechsterStart`) stehen
oben bei `mealUstSatz`. Vorher stand dieselbe Rechnung viermal im Code,
und bei Stichtag 29–31 rollte `new Date(jahr, monat+1, tag-1)` über: der
31. Februar ist der 3. März. Ergebnis waren Zeiträume bis 61 Tage und
Tage, die in zwei Berichten gleichzeitig standen. Über die Oberfläche war
das nicht erreichbar — sie bietet nur 1., 5., 10., 15., 16., 20. und 25.
—, über eine wiederhergestellte Sicherung schon.

**Beim Sync ist „leere Liste" etwas anderes als „keine Liste".** Eine
leere Liste in der Nutzlast heißt: der Server hat davon nichts, und das
ist eine Aussage. Ein fehlender Schlüssel heißt: der Server weiß von
dieser Liste nichts — alte Fassung, nichts anzufangen. Geprüft wurde
früher `d.meals?.length`, was beides gleich behandelte. Wer auf dem Handy
alle Mahlzeiten löschte und am Rechner „Jetzt herunterladen" drückte,
behielt sie dort und lud sie danach wieder hoch.

**Beim Prüfen der Synchronisation die Selbstläufer im Blick behalten.**
Die App lädt zwei Sekunden nach jeder Änderung von selbst hoch und ruft
beim Start ab. Ein Test, der erst den Serverstand setzt und dann klickt,
misst nichts — das Gerät hat den Server längst überschrieben.
`sync-loeschen.mjs` sperrt den Push dafür und protokolliert, was der
Server wirklich ausgeliefert hat.

**Die beiden Modi benennen den Artikelbezug verschieden.** Einträge des
Einzelunternehmens speichern `articleId`, GmbH-Mitnahmen `artId`. Das
Aufräumen suchte nur nach `artId` — damit galt jeder benutzte Artikel des
Einzelunternehmens als unbenutzt und wurde entfernt. Wer nach einem Feld
über beide Modi sucht, muss beide Namen lesen.

**Das Gerät merkt sich, zu welchem Konto seine Daten gehören**
(`gt_daten_konto`). Beim Abmelden bleiben die Daten absichtlich liegen,
damit ein Versehen nichts kostet. Ohne den Merker lief die nächste
Anmeldung eines *anderen* Kontos aber im Zusammenführ-Modus, und der
automatische Push lud die Entnahmen des einen Betriebs in das Konto des
anderen. `gt_sync_pushed_at` wird beim Abmelden gelöscht, `gt_daten_konto`
ausdrücklich nicht — daran erkennt die nächste Anmeldung den Wechsel.

**Nicht jeder gemeldete Fehler ist einer.** Im CSS stand
`grid-template-columns:repeat(6,1fr)`, obwohl der GmbH-Modus sieben
Reiter hat. Sieht nach einem Fehler aus, ist keiner: das `<nav>`-Element
setzt die Spalten inline aus `TABS.length`. Gemessen, bevor etwas
geändert wurde. Die tote 6 ist trotzdem weg, damit sie nicht beim
nächsten Blick wieder als Fehler gemeldet wird.

**Der Rabattfreibetrag ist lohnsteuerlich, nicht umsatzsteuerlich.**
§ 8 Abs. 3 EStG stellt bis 1.080 € im Jahr je Person von der *Lohnsteuer*
frei. Die Umsatzsteuer bleibt davon unberührt — sie läuft auf den vollen
Vorteil mit dem Satz der jeweiligen Ware, auch bei Positionen im
Freibetrag. Genau das hat am 23.09.2026 die Buchhalterin eines Kunden
gefragt, weil es im Bericht nirgends stand.

**Verbraucht wird der Freibetrag der Zeit nach.** Der steuerpflichtige
Anteil *eines Zeitraums* ist nicht „Jahressumme minus 1.080", sondern die
Differenz der Überschreitungen vor und nach ihm. Wer im August schon
1.200 € hatte, versteuert im September die vollen 100 € des Monats —
nicht 220 €, die wären doppelt. `gmbhFreibetragAufteilung` rechnet das,
`pruefung/freibetrag.mjs` prüft beide Fälle.

**CSV braucht ein Dezimalkomma.** Bei Semikolon als Trennzeichen liest
deutsches Excel einen Punkt als Datum: aus `4.57` wird „Apr 57". Es trifft
nur Werte, deren ganzzahliger Teil zwischen 1 und 12 liegt — die Tabelle
sieht deshalb überwiegend richtig aus. Die Ausgaben für **DATEV, Lexware
und sevDesk bleiben bewusst beim Punkt**; dort steht im Code „kein Komma",
und keines der Importformate ließ sich prüfen.

**Stripe: Test und Live sind zwei Welten, die Datenbank ist nur eine.**
Produkt, Preis, Webhook, Kundenportal und Rechnungsfußzeile gibt es je
Modus einmal. Kundennummern aus der Sandbox in der gemeinsamen Datenbank
laufen im Echtbetrieb ins Leere.

**`prod_` ist nicht `price_`.** In `config.stripe.php` gehört die
Preis-ID. Die Produkt-ID steht im Dashboard größer daneben.

**Der Wortlaut der B2B-Erklärung steht serverseitig** in
`rechtsstand.php`, nicht in der App. Würde der Server den Text
übernehmen, den die App mitschickt, wäre der Nachweis wertlos. Wird ein
Vertragstext geändert: Fassungsnummer in der Seite hochzählen, in
`rechtsstand.php` eintragen, unveränderte Kopie nach `recht/fassungen/`.

**Keine fremden Server.** Schriftarten und Programmbausteine liegen
lokal. Ein neues `<script src="https://…">` macht das rückgängig — nach
jedem Einbau einer Bibliothek `pruefung-extern.mjs` laufen lassen.

---

## Konventionen

**Kommentare und Commit-Botschaften auf Deutsch**, in ganzen Sätzen. Sie
erklären, *warum* etwas so ist — besonders bei Stellen, die ohne
Begründung wie ein Fehler aussehen. Das Repo ist über Monate von einer
Person gepflegt worden, die kein Entwickler ist; die Kommentare sind ihr
Gedächtnis.

**Commit-Botschaften** nennen den Befund, die Ursache und was geprüft
wurde. Keine Einzeiler.

**Pull Requests** beschreiben, was gefunden wurde und wie es belegt ist.
Am Ende steht, was der Nutzer selbst einspielen muss.

Ist ein PR gemergt, ist er erledigt — Folgearbeit bekommt einen neuen PR.
Die Branch wird dafür auf den aktuellen `main` gesetzt.

---

## Stand

**Produkt und Recht sind fertig.** Zahlung läuft im Echtbetrieb, Rechnungen
stimmen, AGB und AVV sind anwaltlich abgenommen, das Angebot ist ein
reines B2B-Modell nach § 14 BGB.

**Der Vertrieb existiert nicht.** Sieben Konten, davon vier ohne Abo
freigeschaltet, null zahlende Kunden. Die Suche brachte in drei Monaten
21 Klicks und einen einzigen fremden Nutzer, der nicht antwortete.

Nur der zweite Punkt entscheidet, ob daraus ein Geschäft wird. **Bei
Vorschlägen das im Blick behalten** — weiteres Bauen ist selten die
Antwort.

Was offen ist, steht oben in `TODO.md`.
