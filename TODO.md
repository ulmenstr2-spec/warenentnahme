# warenentnahme.de — Stand und Chronik

## Was jetzt offen ist

Der Rest der Datei ist Chronik — hier steht, woran noch etwas hängt.

**Am Produkt**

- [ ] **`server/api.php` hochladen** — Kopie jeder Anmeldung an den
      Betreiber. Bei einer Kündigung gab es die schon, bei einer Anmeldung
      nicht: ausgerechnet beim wichtigeren Ereignis. Solange es nur eine
      Handvoll Anmeldungen im Monat gibt, ist jede einzelne eine Nachricht
      über den Markt, die man nicht in der Datenbank suchen will. Und
      bleibt eine Anmeldung unbestätigt, ist genau das die Information —
      dann kommt die Mail beim Kunden nicht an.
- [ ] Löschung nach zwölf Monaten läuft nicht von allein — bisher Handarbeit,
      und niemand erinnert daran
- [ ] `api_php_patch.txt` in `/public/app/` ansehen und vermutlich löschen;
      `.txt` ist in der `.htaccess` nicht gesperrt
- [ ] Produktbeschreibung auf der Bezahlseite: „Vollzugriff für 12 Monate"
      klingt nach Ende, das Abo verlängert sich aber automatisch

**Papiere (Lücken sind in `recht/` markiert)**

- [ ] Datensicherung beim Hoster: welche, wie oft, wie lange, schon einmal
      zurückgespielt?
- [ ] Aufbewahrungsdauer der Server-Protokolle bei IONOS
- [ ] Zwei-Faktor-Anmeldung bei IONOS und Stripe
- [ ] **AVV mit IONOS** abschließen — sie stehen in § 4 des eigenen AVV
- [ ] Kontaktdaten des LfDI Mecklenburg-Vorpommern gegenprüfen, Link zum
      Meldeformular eintragen

**Vertrieb — das eigentliche Thema**

Das Produkt steht, Zahlung und Steuerliches sind geregelt. Ab hier
entscheidet sich alles daran, ob jemand davon erfährt.

- [ ] Mit drei Steuerberatern in Rostock sprechen. Nicht verkaufen,
      fragen: Wie machen eure Gastro-Mandanten das heute?
- [x] SEO — am 14.09. umgesetzt, siehe unten. Wirkung frühestens in
      vier bis sechs Wochen messbar.
- [x] Yves Lhuissier — **nicht weiter verfolgen.** Zweimal angeschrieben,
      keine Reaktion. Bleibt als Datenpunkt: Der Weg über Google und
      Selbstanmeldung hat in drei Monaten einen einzigen Menschen
      gebracht, und der hat sich nicht zurückgemeldet. Genau deshalb
      führt der nächste Schritt über Gespräche, nicht über Wartezeit.

**Erledigt und abgehakt:** AGB, AVV, Datenschutzerklärung, B2B-Schranke
mit Nachweis, Kündigungsbutton nach § 312k, lokale Schriftarten und
Programmbausteine, Anschrift in den Mails, Adressen ohne `.html`,
TOM-Datenblatt, Verarbeitungsverzeichnis, Löschkonzept,
Datenpannen-Ablaufplan, Fassungsarchiv — und seit dem 14.09. der
Livegang.

Widerrufsbelehrung und PAngV sind **entfallen**: Beides gilt nur
gegenüber Verbrauchern, und die B2B-Schranke schließt sie aus. So die
Kanzlei am 03.09.

## LIVE seit 14.09.2026

Der Zahlungsdienst läuft im Echtbetrieb. Vollständig durchgespielt mit
einem frischen Konto und einer echten Karte:

Bezahlseite (`checkout.stripe.com/…/cs_live_…`) → 3D-Secure-Freigabe über
die Bank → Rückkehr in die App → **„Testphase läuft — noch 30 Tage"** →
Kundenportal erreichbar → Testphase vorzeitig beendet → 49 € abgebucht →
Rechnung erzeugt → gekündigt → erstattet.

Die entscheidende Zeile ist die dritte: Dass die App die Testphase
anzeigt, beweist, dass der Webhook durchkommt, der Server schreibt und
die Freischaltung greift. Diese Kette war vorher nie unter echten
Bedingungen gelaufen.

### Erledigt

- [x] Live-Konto freigeschaltet: Unternehmen verifiziert, Bank, Konto
      geschützt
- [x] Zahlungsbeschreibung `WARENENTNAHME.DE` — erscheint im
      Freigabedialog der Bank, geprüft
- [x] Stripe Tax **bewusst übersprungen** — als Kleinunternehmer nach
      § 19 UStG gibt es nichts zu berechnen, und es kostet pro Transaktion
- [x] Produkt und Preis aus der Sandbox ins Live-Konto kopiert
- [x] Kundenportal (kam mit der Kopie)
- [x] Webhook live: fünf Ereignisse, Nutzlast **Momentaufnahme**,
      API-Version **2026-07-29.dahlia**
- [x] Vier Werte in `config.stripe.php`
- [x] Kunden-E-Mails an: erfolgreiche Zahlungen, Rückerstattungen
- [x] Abo-Mails an: Erinnerung vor Ende der Testphase, bevorstehende
      Verlängerung, ablaufende Karten, fehlgeschlagene Kartenzahlungen,
      Bestätigungslink bei starker Kundenauthentifizierung
- [x] Rechnungsfußzeile mit § 19 UStG und Steuernummer — **im zweiten
      Anlauf**
- [x] Probeanmeldung durch die B2B-Schranke

### Vier Dinge, die dabei fast schiefgegangen wären

**1. Sandbox-Kennungen in der gemeinsamen Datenbank.** Test und Live sind
bei Stripe zwei Welten — die Datenbank ist aber nur eine. Bei drei Konten
stand noch eine `cus_…` aus der Sandbox, die es live nicht gibt. Der Code
hätte sie benutzt und wäre ins Leere gelaufen. Vor dem Umzug geleert
(ids 6, 7, 8), die vier freigeschalteten Konten blieben unberührt.

**2. `prod_` ist nicht `price_`.** Im Produktkatalog steht rechts groß die
Produkt-ID. In die `config.stripe.php` gehört die Preis-ID, zu holen über
die drei Punkte in der Preiszeile. Verwechselt man sie, kommt
`No such price` — und man sucht den Fehler im falschen Modus.

**3. Der Webhook wird beim Kopieren nicht mitgenommen.** Er gehört zu
einem Modus. Hätte man ihn vergessen, hätten Kunden bezahlt und wären
nicht freigeschaltet worden — ohne Fehlermeldung, ohne dass es jemandem
auffällt außer dem Kunden.

**4. Die Rechnungsfußzeile war zweimal nicht gespeichert.** Am 05.09. im
Feld eingetragen, aber nicht gespeichert — deshalb fehlte sie auf dem
Sandbox-Beleg, und deshalb hat das Kopieren ins Live-Konto sie auch nicht
mitgenommen: Es gab nichts zu kopieren.
**Regel: Nach jedem Speichern die Seite neu laden und nachsehen.**

### Die Rechnung stimmt (14.09.2026)

- [x] Fußzeile mit § 19 UStG und Steuernummer — im zweiten Anlauf, siehe
      oben
- [x] Aussteller heißt jetzt **Josef Czerwinski - warenentnahme.de**.
      Der Name kommt **nicht** aus dem Anzeigenamen im Stripe-Profil,
      sondern aus den öffentlichen Geschäftsangaben des Kontos.
- [x] `@warenentnahme` steht als eigene Zeile darunter. Der Kurzname
      selbst lässt sich nicht leeren, seine Anzeige auf Rechnungen aber
      über die Profileinstellungen steuern — Stripe weist im Dashboard
      selbst darauf hin.

### Anschrift des Kunden (14.09.2026)

`billing_address_collection` in `api-stripe-actions.php` eingebaut.

**Rechtlich nicht nötig:** Bei 49 € liegt eine Kleinbetragsrechnung nach
§ 33 UStDV vor (bis 250 €), da entfällt die Anschrift des Empfängers. Und
weil nach § 19 UStG keine Umsatzsteuer ausgewiesen wird, hat der Kunde
ohnehin keinen Vorsteuerabzug.

**Trotzdem erhoben, aus einem anderen Grund:** Ohne sie gibt es von keinem
Kunden mehr als eine E-Mail-Adresse. Hier werden B2B-Verträge mit
automatischer Jahresverlängerung geschlossen — wird davon je einer
streitig, ist eine E-Mail-Adresse kein Vertragspartner, den man
anschreiben kann.

**Die zweite Zeile ist die wichtige:** `customer_update => ['address' =>
'auto']`. Ohne sie schreibt die Bezahlseite die erhobene Anschrift nicht
in den Kundeneintrag zurück (Voreinstellung ist `never`) — und die
Rechnung zieht ihre Empfängerangaben von dort. Der Kunde tippte seine
Anschrift ein, und auf der Rechnung stünde sie trotzdem nicht.

- [ ] **`server/api-stripe-actions.php` per FTP nach `/public/app/`**
- [ ] Prüfen: Bezahlseite öffnen und schauen, ob nach der Anschrift
      gefragt wird. Dafür muss nichts bezahlt werden — Seite ansehen,
      Reiter schließen.
- [ ] Produktbeschreibung: „Vollzugriff für 12 Monate" steht auf der
      Bezahlseite und liest sich, als wäre danach Schluss. Das Abo
      verlängert sich aber automatisch (§ 5 AGB). Besser:
      „Jahresabo, verlängert sich automatisch, jederzeit kündbar."
- [ ] Unternehmensbeschreibung: „in form einer App" → „in Form einer App"

## Danach: SEO (Befund vom 07.09.2026)

Aus der Search Console, drei Monate: 21 Klicks, 1.017 Impressionen,
Klickrate 2,1 %, Durchschnittsposition 6,7.

**Die Lage in einem Satz: Seite eins für das Wort, Seite vier bis sieben
für das Problem.**

| Suchanfrage | Position | Klicks |
|---|---|---|
| warenentnahme | 3,1 | 6 |
| warenentnahmen | 2,2 | **0** |
| entnahme waren 2026 | 9,0 | 0 |
| pauschbeträge unentgeltliche wertabgaben 2026 | **34,0** | 0 |
| eigenverbrauch buchen | **63,8** | 0 |

Alle sechs Klicks kommen von „warenentnahme" — und das ist kein
Markenname, sondern das deutsche Wort für die Sache. Wer das googelt,
will wissen, was es ist oder welche Zahlen gelten. Nicht, welche App es
dafür gibt.

### Umgesetzt am 14.09.2026

- [x] **„unentgeltliche Wertabgaben" in Titel und Überschrift** der
      Pauschbeträge-Seite. Der amtliche BMF-Begriff stand dort nur in der
      Beschreibung — daher Platz 34, obwohl der Inhalt passt.
      „Sachentnahmen" bleibt im Titel und im Vorspann, damit die
      bisherige Sichtbarkeit nicht verlorengeht.
- [x] **Neue Seite `eigenverbrauch-buchen.html`.** Platz 64 hieß: dazu
      gibt es nichts. Jetzt rund 1.100 Wörter zum Buchungssatz, zur
      Bewertung nach § 10 Abs. 4 UStG und § 6 EStG, zur Aufteilung 7/19 %,
      zum monatlichen Ablauf und zu den beiden Sonderfällen GmbH und
      Personalessen. Verlinkt aus Startseite, Pauschbeträgen und der
      Steuerberater-Seite, in `sitemap.xml` und im Deploy aufgenommen.
- [x] **Titel und Überschrift der Startseite auf „Warenentnahme"**
      umgestellt. Vorher hieß beides „Sachentnahmen" — wer nach
      *Warenentnahme* sucht (Platz 2 bis 3, aber nur 0 bis 6 % Klickrate),
      sah ein Ergebnis, das ein anderes Wort verspricht. Der Fachbegriff
      steht jetzt im Untertitel.

**Kontonummern stehen bewusst nicht auf der neuen Seite.** Sie hängen vom
Kontenrahmen ab, und eine falsche Nummer auf einer Seite, die sich an
Steuerberater richtet, ist schlimmer als gar keine. Stattdessen ist die
Kontenbezeichnung genannt, über die man sie in jeder Software findet.

- [ ] In vier bis sechs Wochen in der Search Console nachsehen, ob sich
      Position und Klickrate bewegt haben. Vorher lohnt der Blick nicht —
      Google braucht die Zeit.

**Ehrliche Erwartung:** Selbst wenn beides gut klappt — fünffache
Impressionen, Klickrate auf 5 % — sind das etwa fünfzig Anmeldungen im
Jahr statt vier. Ein Fortschritt, aber nicht der Weg zu 200 Kunden.

Zwei Zeilen aus der Tabelle sind übrigens Rauschen: „kostet das was?" und
„es muss kostenlos sein" stehen nirgends auf den Seiten, Google hat
sinngemäß geraten. Zwei Impressionen, null Klicks. Nicht hinterherlaufen.

## Kündigungs-Hinweis (erledigt am 02.09.2026)

- [x] `server/migration-stripe-2.sql` in phpMyAdmin ausführen
      (Spalte `cancel_at_period_end`)
- [x] `server/stripe-webhook.php` und `server/api-stripe-actions.php`
      erneut per FTP nach `/public/app/` laden
- [x] Im Kundenportal kündigen — die App zeigt
      „Gekündigt. Nutzbar noch bis 02.10.2026"

## Kündigungsbutton (erledigt am 03.09.2026)

**Merke: Es sind ZWEI Dateien mit fast gleichem Namen.**

| Datei | Was | Wie sie auf den Server kommt |
|---|---|---|
| `kuendigung.html` | das Formular | automatisch mit dem Deploy |
| `kuendigung.php` | der Empfänger, verschickt die Mails | **von Hand** nach `/public/` |

Beide gehören nach `/public/`, nicht nach `/public/app/`. Fehlt der
Empfänger, zeigt das Formular beim Absenden nur sich selbst noch einmal.
Genau das ist beim Einrichten passiert.

- [x] `server/mailversand.php` nach `/public/app/`
- [x] `server/api.php` nach `/public/app/`
- [x] `server/kuendigung.php` nach `/public/`
- [x] Vollständig durchgespielt: Formular → Bestätigungsseite mit
      Vorgangsnummer → Kopie an den Betreiber → Bestätigung an den Kunden,
      bei T-Online im Posteingang
- [x] Auch in der App verlinkt, unten neben der Versionszeile. Dort
      schließt man das Abo ab, also sucht man dort auch die Kündigung.

## Rechnungs-Scan (02.09.2026)

Ein Nutzer meldete: „nicht alle Artikel erfasst oder mehrfach erfasst".
Ursache gefunden und behoben — ab dem zweiten Durchgang wurde die Rechnung
nicht mehr mitgeschickt, das Modell sollte aus einem Dokument weiterlesen,
das es nicht mehr sah.

- [ ] Neue `app.html` geht mit dem Merge automatisch raus
- [ ] Yves Lhuissier antworten und um einen der fehlgeschlagenen Belege
      bitten — als echter Testfall wertvoller als jeder nachgebaute
- [ ] Später prüfen: Zwischenspeicher des Anbieters für das wiederholte
      Mitschicken der Rechnung. Spart Kosten, konnte hier nicht getestet
      werden und gehörte deshalb nicht in die Fehlerbehebung.

## Aus der anwaltlichen Prüfung (03.09.2026)

Die Kanzlei empfiehlt die Umstellung auf ein **reines B2B-Modell**. Damit
entfallen Widerrufsrecht, PAngV-Pflichten und der Zwang zur monatlichen
Kündigung — die jährliche Verlängerung darf bleiben.

- [x] **Google Fonts lokal** — war als Abmahnrisiko eingestuft, umgesetzt
- [x] **AGB, AVV und Datenschutz-Ergänzung eingebaut** (`agb.html`,
      `avv.html`, `datenschutz.html`), im Fußbereich aller Seiten verlinkt
- [x] **B2B-Schranke bei der Registrierung**: Klartext-Hinweis, aktive
      Checkbox (nicht vorangekreuzt), Pflichtfeld Betriebsname.
      Steuernummer ist ausdrücklich **nicht** nötig.
- [x] **Nachweis speichern**: Zeitstempel in UTC, Betriebsname, Wortlaut
      der Erklärung, Fassungen von AGB und AVV — beim Konto in der
      Datenbank. Der Kunde bekommt dieselben Angaben per Mail.
- [x] **Bestandskonten**: Fenster beim nächsten Start, das die
      Bestätigung nachholt. Wegklickbar (die Beschränkung wirkt nicht
      rückwirkend, und wer seine Steuerunterlagen hier hat, darf nicht
      ausgesperrt werden) — die Sperre sitzt im Server:
      **ohne Bestätigung keine Bezahlseite.**
- [x] **Weg ins Kundenportal** für laufende Kunden ergänzt. Bis dahin
      führte dorthin nur die Schaltfläche im Hinweisbanner, und das
      erscheint nur in der Testphase oder nach einer Kündigung — ein
      laufender Jahreskunde hatte gar keinen Zugang, obwohl § 5 Abs. 3
      der AGB ihn in den Kontoeinstellungen zusagt.

### Reihenfolge beim Einspielen — die ist wichtig

Erst die Datenbank, dann die PHP-Dateien, **erst danach mergen**. Wird
zuerst gemergt, geht die neue App raus, während der alte Server die
Bestätigung noch gar nicht kennt: Es würde sich jemand anmelden und der
Nachweis käme nie zustande. Rückwirkend lässt sich das nicht heilen.

1. [ ] `server/migration-b2b.sql` in phpMyAdmin ausführen
       (vorher Sicherung der Tabelle `users`)
2. [ ] **Drei** Dateien per FTP nach `/public/app/`:
       `api.php`, `api-stripe-actions.php` und — neu, leicht zu
       übersehen — **`rechtsstand.php`**. Dort stehen der Wortlaut der
       Erklärung und die Fassungen von AGB und AVV. Fehlt die Datei,
       antwortet die API auf **jede** Anfrage mit einem Serverfehler,
       auch beim Login. Das ist derselbe Fehler wie damals bei
       `kuendigung.php`.
3. [ ] Erst jetzt den Pull Request mergen — `app.html` geht dann raus.
4. [ ] Danach selbst einmal ausprobieren: App neu laden, das Fenster
       „Kurz dein Betrieb bestätigen" muss erscheinen.

- [x] Der Kanzlei gemeldet: Tippfehler „Ntzungsverhältnis" in der AGB-Vorlage
      (korrigiert) und die unvollständige Stripe-Anschrift

## Fremde Gegenstellen (05.09.2026)

Die Kanzlei hatte Google Fonts als Abmahnrisiko benannt. Behoben wurde
damals genau das — **die naheliegende Frage, was die App sonst noch von
außen holt, wurde nicht gestellt.**

Sie holte sechs Programmbausteine von `cdnjs.cloudflare.com`: React,
React-DOM, xlsx, jsPDF und pdf.js samt Arbeitsdatei. Beim Öffnen der App
ging damit die IP-Adresse jedes Kunden an ein US-Unternehmen — derselbe
Vorgang, wegen dem die Schriftarten weichen mussten. In der
Datenschutzerklärung stand davon nichts.

- [x] Alle sechs Dateien liegen unter `lib/` und gehen mit dem Deploy nach
      `/public/app/lib/`. Fassungsnummer steht im Dateinamen, damit sie
      dauerhaft zwischengespeichert werden dürfen (`.htaccess`).
- [x] `pdf.worker` ebenfalls lokal. Sie wird erst beim Scannen nachgeladen
      und fällt beim Durchsehen deshalb nicht auf.
- [x] Babel bleibt im Quelltext als fremde Adresse stehen — `build.mjs`
      entfernt die Zeile beim Deploy. **Wer die Quelldatei misst statt der
      gebauten, sieht eine Fremdadresse, die auf dem Server nie ankommt.**
- [x] Datenschutzerklärung § 6 heißt jetzt „Schriftarten und
      Programmbausteine" und sagt zu, dass gar nichts mehr nach außen geht.
- [x] Nachgemessen: alle neun Seiten in je einem frischen Browserprofil,
      jede ausgehende Verbindung mitgeschrieben. Ergebnis: keine.

**Merke für die Zukunft:** Nach jedem Einbau einer neuen Bibliothek die
Messung wiederholen (`node pruefung-extern.mjs`). Ein `<script src="https://…">`
ist schnell eingefügt und in einer 7000-Zeilen-Datei nicht zu sehen.

## Anschrift in den Mails (05.09.2026)

Alle Mails endeten mit „Dein warenentnahme.de Team" — ohne Namen, ohne
Anschrift. Geschäftsmäßige E-Mail trägt dieselben Pflichtangaben wie ein
Brief.

- [x] `mailFusszeile()` in `server/mailversand.php`. Bewusst dort und nicht
      an den vier Absendestellen: So kann es bei einer fünften Mail
      niemand vergessen.
- [x] Gilt damit auch für die beiden Kündigungsmails — `kuendigung.php`
      bindet dieselbe Datei ein.
- [ ] **`server/mailversand.php` per FTP nach `/public/app/` laden.**
      `kuendigung.php` selbst bleibt unverändert.

## PIN-Reset war kaputt (05.09.2026)

Aufgefallen an einer echten Mail im Posteingang, nicht im Code.

Der Link lautete `https://www.warenentnahme.de?reset=…` — ohne `/app/`.
Dort steht die Werbeseite, und die kennt `?reset=` nicht. Der Code wird
**ausschließlich** über diesen Link zugestellt: Wer seinen PIN vergessen
hatte, kam damit nicht mehr in sein Konto. Ohne Fehlermeldung, ohne
Hinweis — die Seite sah einfach normal aus.

`APP_URL` zeigt auf die Wurzel der Domain. An einer Stelle stand deshalb
richtig `APP_URL . '/app/api.php?verify='`, an fünf anderen fehlte das
`/app/`.

Bei der E-Mail-Bestätigung fiel es nie auf, weil dort nur die *bequeme*
Hälfte verloren ging: Das Konto wurde freigeschaltet, nur die
automatische Anmeldung blieb aus. Man landete auf der Werbeseite und
meldete sich eben von Hand an. Beim PIN-Reset gibt es diesen zweiten Weg
nicht.

- [x] `appUrl()` in `api.php`. Die Adresse wird nur noch dort
      zusammengesetzt — wer sie anderswo von Hand baut, macht denselben
      Fehler wieder.
- [x] Alle fünf Stellen umgestellt und mit der echten `api.php` geprüft,
      `APP_URL` dabei auf `https://www.warenentnahme.de` gesetzt wie auf
      dem Server: beide Mail-Links und alle drei Weiterleitungsseiten
      zeigen jetzt auf `/app/`.
- [ ] **`server/api.php` erneut per FTP nach `/public/app/` laden.**
- [ ] Danach selbst durchspielen: „PIN vergessen" → Mail → Link
      anklicken → die App muss sich öffnen und nach einem neuen PIN fragen.

## Adressen ohne .html (05.09.2026)

`warenentnahme.de/impressum` statt `warenentnahme.de/impressum.html`.

Zwei Regeln in der `.htaccess`, die zusammengehören: Die erste nimmt das
`.html` aus der sichtbaren Adresse, die zweite hängt es intern wieder an,
damit die Datei gefunden wird.

**Warum sich das nicht im Kreis dreht:** Die erste Regel prüft
`%{THE_REQUEST}` — die Zeile, die der Browser geschickt hat. Die ändert
sich beim internen Umschreiben *nicht*. Ohne diese Bedingung sähe die
erste Regel das Ergebnis der zweiten und beide riefen sich endlos
gegenseitig auf.

**`/app/` bleibt ausgenommen.** Dort liegt die Anwendung, und `sw.js`
legt `/app/index.html` vorsorglich im Zwischenspeicher ab. Eine
Weiterleitung mitten in einem vorgehaltenen Pfad bringt den
Zwischenspeicher durcheinander.

- [x] Alte Adressen mit `.html` leiten dauerhaft weiter (301). Wichtig:
      Sie stehen in schon verschickten Mails, in der Suchmaschine und im
      Schreiben an die Kanzlei.
- [x] Alle internen Links, `canonical`-Angaben, `og:url`, `sitemap.xml`
      und die Adressen in den Mails umgestellt — sie zeigen direkt auf
      die neue Adresse, nicht auf den Umweg.
- [x] Mit **echtem Apache** geprüft, nicht nachgebaut: 34 Prüfungen,
      dazu jeder verlinkte Pfad einmal abgerufen. `pruefung/adressen-*`.

**Was noch `.php` zeigt:** Nach dem Absenden des Kündigungsformulars
steht `/kuendigung.php` in der Adresszeile. Das lässt sich nicht wie bei
`.html` verstecken, weil `kuendigung.html` und `kuendigung.php`
denselben Namen tragen — `/kuendigung` ist schon vergeben. Ließe sich
lösen, indem der Empfänger anders heißt; dafür müsste eine Datei auf dem
Server umbenannt werden, die von Hand dort liegt. Für eine
Schönheitskorrektur an einer rechtlich wichtigen Strecke zu riskant.

## Offen für den Livegang (Stand 05.09.2026) — überholt

> Erledigt am 14.09., siehe „LIVE seit 14.09.2026". Bleibt als Chronik
> stehen, weil die beiden ersten Punkte damals der Grund waren, mit dem
> Livegang noch zu warten — und beide haben etwas zutage gefördert.

- [x] Probeanmeldung mit einer fremden Adresse
- [x] Ein echtes Rechnungs-PDF ansehen — **hat die fehlende Anschrift und
      die nicht gespeicherte Fußzeile aufgedeckt.** Genau deshalb wollte
      ich das fertige PDF sehen und nicht nur die Einstellung.
- [ ] `api_php_patch.txt` in `/public/app/` ansehen und vermutlich löschen.
      `.txt` ist in der `.htaccess` nicht gesperrt und wird im Klartext
      ausgeliefert, anders als die `.php`-Dateien daneben.

## Papiere nach den Vorgaben der Kanzlei (05.09.2026)

Alle vier liegen unter `recht/`. Sie gehen **nicht** auf den Server —
der Deploy nimmt nur ausdrücklich benannte Dateien mit, und `recht/`
steht nicht auf der Liste. Nachgemessen: `/recht/TOM.md` ist nicht
erreichbar, und `.md` sperrt die `.htaccess` zusätzlich.

- [x] **`recht/TOM.md`** — die Maßnahmen nach Art. 32. Beschrieben ist
      nur, was sich aus dem Quelltext belegen lässt: bcrypt statt
      Klartext, 256-Bit-Sitzungsschlüssel mit Ablauf, vorbereitete
      Anweisungen ohne Emulation, erzwungenes HTTPS, keine Verbindungen
      zu Dritten (gemessen), Zahlungsdaten erreichen den Server nie.
- [x] **`recht/VERZEICHNIS.md`** — zwei Teile, weil derselbe Betrieb in
      zwei Rollen auftritt: acht Tätigkeiten als Verantwortlicher, zwei
      als Auftragsverarbeiter. Die beiden Lücken, die die Kanzlei am
      häufigsten sieht, sind bewusst abgedeckt: die eigenen Abläufe
      (Buchhaltung, Stripe, Support-Mails, Server-Protokolle) und
      konkrete Fristen statt „nach Kündigung".
- [x] **`recht/LOESCHKONZEPT.md`** — mit Fristentabelle.
- [x] **`recht/DATENPANNE.md`** — Ablaufplan mit Mailvorlage.
- [x] **`recht/fassungen/`** — unveränderte Kopien je Fassung.
- [x] AVV § 3 Abs. 3 verweist jetzt auf die dokumentierten TOMs und sagt
      ihre Herausgabe auf Verlangen zu — so wollte es die Kanzlei.
      Dadurch neue Fassung **2026-09b**; die alte liegt im Archiv.

### Was daran noch nicht stimmt

Drei Stellen sind ehrlich als Lücke markiert, statt sie zu erfinden:

- [ ] **Datensicherung.** Welche Sicherung enthält der IONOS-Tarif, wie
      oft, wie lange aufbewahrt? Steht in `TOM.md` Abschnitt 7 als offen.
      **Die Maßnahmenbeschreibung sollte erst danach an einen Kunden
      gehen** — eine Zusage zur Verfügbarkeit ohne geprüfte Sicherung
      trägt nicht.
- [ ] **Aufbewahrungsdauer der Server-Protokolle** bei IONOS erfragen.
      Fehlt im Verzeichnis (A7) und im Löschkonzept.
- [ ] **Löschung nach zwölf Monaten läuft nicht von allein.** Die Sperre
      nach Kündigung wirkt, die Löschung danach müsste von Hand erfolgen
      — und niemand erinnert daran. Solange das so ist, beschreibt das
      Löschkonzept eine Absicht, keine Automatik.
- [ ] Kontaktdaten des LfDI Mecklenburg-Vorpommern gegenprüfen und den
      Link zum Meldeformular eintragen. Von hier aus nicht erreichbar.
- [ ] **AVV mit IONOS** im Kundenkonto abschließen — IONOS ist in § 4 des
      eigenen AVV als Subunternehmer benannt.
- [ ] Zwei-Faktor-Anmeldung bei IONOS und Stripe.

### Nach dem Merge

- [ ] **`server/rechtsstand.php` per FTP nach `/public/app/`** — sonst
      steht bei neuen Anmeldungen weiter die alte AVV-Fassung im
      Nachweis.

## Papiere nach den Vorgaben der Kanzlei (alter Eintrag)

- [ ] **TOM-Datenblatt**, zwei Seiten: HTTPS/TLS, PIN als Hash, IONOS nach
      ISO 27001, Rollen und Rechte, tägliche Sicherungen. Nicht öffentlich
      — Herausgabe auf Verlangen genügt. Der AVV sollte darauf verweisen.
- [ ] **Verzeichnis von Verarbeitungstätigkeiten** (Art. 30). Die zwei
      Lücken, die die Kanzlei am häufigsten sieht: eigene Abläufe
      (Buchhaltung, Rechnungen über Stripe, Support-Mails, Server-Protokolle)
      werden vergessen, und die Löschfristen bleiben zu vage.
- [ ] **Löschkonzept**, fünf bis zehn Sätze — der Ablauf existiert bereits
      technisch, er ist nur nicht aufgeschrieben.
- [ ] **Datenpannen-Ablaufplan**, eine Seite: Kontakt des LfDI
      Mecklenburg-Vorpommern, 72-Stunden-Frist, Mailvorlage für Kunden.
- [ ] **Fassungsarchiv** `recht/fassungen/` — unveränderte Kopien von AGB,
      AVV und Datenschutz je Fassung. Aufbewahrung mindestens drei Jahre ab
      Ende des Kalenderjahres, in dem der letzte Vertrag unter dieser
      Fassung endete (§§ 195, 199 BGB); die Kanzlei empfiehlt dauerhaft.

## Aus früheren Sitzungen

## Mailversand (02.09.2026)

Getestet: Bestätigungsmails kamen bei Gmail und Outlook **gar nicht** an —
auch nicht im Spam. Ursache: `mail()` verschickt vom Webserver, nicht über
die Mailserver aus dem SPF-Eintrag der Domain. SPF und DMARC sind gesetzt,
ein DKIM-Eintrag war unter den gängigen Namen nicht auffindbar.

Umgestellt auf SMTP mit Anmeldung über das vorhandene Postfach
`hallo@warenentnahme.de`. **Erledigt und bestätigt:** Gmail meldet
`SPF: PASS`, `DKIM: PASS` (Selektor `s1-ionos`), `DMARC: PASS`,
Zustellung in 0 Sekunden über `mout.kundenserver.de`.

Ein DKIM-Eintrag war also die ganze Zeit vorhanden — er wurde nur nicht
genutzt, weil `mail()` am Mailserver vorbei verschickte.

- [x] In `config.php` ergänzen:
      ```php
      define('SMTP_HOST',   'smtp.ionos.de');
      define('SMTP_PORT',   465);
      define('SMTP_SECURE', 'ssl');
      define('SMTP_USER',   'hallo@warenentnahme.de');
      define('SMTP_PASS',   'DAS-POSTFACH-PASSWORT');
      ```
- [x] `MAIL_FROM` von `noreply@` auf `hallo@warenentnahme.de` geändert
- [x] Neue `server/api.php` hochgeladen
- [x] Mit `server/mailtest.php` geprüft
- [ ] **`mailtest.php` vom Server löschen**
- [ ] Echte Registrierung mit einer Gmail-Adresse durchspielen
      (Posteingang, nicht Spam?)
- [ ] **Datenbank-Passwort ändern** — das alte steht weiterhin in der
      Git-Historie
- [ ] **AVV mit IONOS** im Kundenkonto abschließen; den Entwurf für eigene
      Kunden (`AVV-ENTWURF.md`) anwaltlich prüfen lassen
- [ ] **Impressum**: Steuernummer ergänzen, falls gewünscht (nicht
      verpflichtend; eine USt-IdNr gibt es bei Kleinunternehmerschaft nicht)
