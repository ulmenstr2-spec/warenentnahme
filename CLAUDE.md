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

Wenn eine Annahme sich als falsch erweist, gehört das klar gesagt und
nicht umschifft.

---

## Fallen, die schon zugeschnappt sind

**Die Mahlzeiten-Logik gibt es zweimal.** `function MealsTab`
(Einzelunternehmen) und `function GmbhMealsTab` (GmbH) haben dieselben
Funktionen `addOne`/`removeOne`/`count`. Eine Änderung an einer Stelle ist
fast immer an beiden nötig — danach suchen, nicht nach Zeilennummern.

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
