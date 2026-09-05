# Offene Punkte

## Blocker für die Live-Schaltung des Abos

Diese Punkte blockieren **nicht** die Tests mit Stripe-Testschlüsseln, aber
sie müssen erledigt sein, bevor echtes Geld fließt.

- [ ] **AGB** — Vertragsgegenstand, Laufzeit (1 Jahr), Verlängerung,
      Kündigungsfrist, Leistungsumfang, Haftung, Gerichtsstand
- [ ] **Widerrufsbelehrung** — für Verbraucher gesetzlich vorgeschrieben.
      Bei rein gewerblichen Kunden entfällt sie; da sich das bei der
      Anmeldung nicht sicher unterscheiden lässt, ist die Belehrung der
      sichere Weg. Dazu die Frage, ob ein vorzeitiger Leistungsbeginn
      vereinbart wird (sonst läuft die Frist gegen den Start der Nutzung).
- [x] **Kündigungsbutton nach § 312k BGB** — gebaut: `kuendigung.html`
      mit Formular und Schaltfläche „Jetzt kündigen", verlinkt als
      „Verträge hier kündigen" im Fußbereich aller Seiten, ohne
      Anmeldung erreichbar. `server/kuendigung.php` nimmt die Erklärung
      entgegen, bestätigt sofort per Mail und zeigt eine speicher- und
      druckbare Seite mit Datum, Uhrzeit und Vorgangsnummer.
      **Die Formulierungen gehören trotzdem einmal geprüft.**
      Das Abo wird bewusst nicht automatisch beendet: Das Formular ist
      ohne Anmeldung erreichbar, sonst könnte jemand mit einer fremden
      E-Mail-Adresse das Abo eines Fremden kündigen. Die Erklärung geht
      an den Betreiber, der sie in Stripe ausführt.
- [ ] **Preisangaben nach PAngV** prüfen: Gesamtpreis, Hinweis auf
      § 19 UStG (steht bereits auf der Preisseite), Laufzeit
- [ ] Rechnungsfußzeile in Stripe: `Gemäß § 19 UStG wird keine
      Umsatzsteuer berechnet.` + Steuernummer `079/211/00250`

> Hinweis: Das ist keine Rechtsberatung. Vor der Live-Schaltung von einer
> Person mit entsprechender Zulassung prüfen lassen.

## Technisch offen

Der Einbau in `api.php` ist erledigt — die ergänzte Datei liegt als
`server/api.php` im Repository und muss nur noch hochgeladen werden.

- [ ] **Datenbank**: `server/migration-stripe.sql` in phpMyAdmin ausführen
      (vorher Sicherung der Tabelle `users` anlegen). Danach nicht vergessen:
      - Bestandsnutzer freischalten (auskommentierte Zeile am Dateiende)
      - eigenes Konto dauerhaft freischalten:
        `UPDATE users SET subscription_status='active' WHERE email='…';`
- [ ] **Diese vier Dateien** per FTP nach `/public/app/` laden:
      `api.php`, `api-stripe-actions.php`, `stripe-webhook.php`,
      `config.stripe.php`
- [ ] **Stripe-Bibliothek** installieren: `composer require stripe/stripe-php`
      oder Release herunterladen und nach `/public/app/stripe-php/` legen
- [ ] **`config.stripe.php`** aus `server/config.stripe.example.php`
      erstellen. Alle vier Werte eintragen — **auch die Price-ID**, und zwar
      die aus dem Modus, dessen Schlüssel danebenstehen. Eine Live-ID wirft
      im Testmodus `No such price`.
- [ ] **Stripe-Dashboard**: Webhook-Endpunkt auf
      `https://www.warenentnahme.de/app/stripe-webhook.php` einrichten,
      die fünf Ereignisse abonnieren, Kundenportal aktivieren (Kündigung
      und Zahlungsmittel ändern, deutsche Sprache)
- [x] **Testlauf** mit Karte `4242 4242 4242 4242` — am 02.09.2026
      vollständig durchgespielt: Bezahlung, Testphase, Kündigung im
      Kundenportal, Sperre neuer Einträge, Export (PDF und Backup)
      weiterhin möglich.

## Für den Livegang

- [ ] Produkt und Preis (49 €/Jahr) im **Live-Modus** anlegen — die
      bisherige ID gehört zur Sandbox und funktioniert dort nicht
- [ ] Webhook-Endpunkt im Live-Modus einrichten, dieselben fünf
      Ereignisse, neues Signaturgeheimnis
- [ ] In `config.stripe.php` vier Werte tauschen: `sk_`, `pk_`,
      Price-ID, `whsec_` — **kopieren, nicht abtippen** (I und l sehen
      in diesen IDs gleich aus)
- [ ] Kundenportal auch im Live-Modus konfigurieren (Kündigung zum
      Periodenende, Zahlungsmethoden, Rechnungshistorie)

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

## Offen für den Livegang (Stand 05.09.2026)

- [ ] Probeanmeldung mit einer fremden Adresse — die B2B-Schranke ist im
      Echtbetrieb noch von niemandem durchlaufen worden
- [ ] Ein echtes Rechnungs-PDF ansehen: Kommt die Kleinunternehmer-Fußzeile
      an, und stehen Name und Anschrift des Ausstellers darauf?
- [ ] `api_php_patch.txt` in `/public/app/` ansehen und vermutlich löschen.
      `.txt` ist in der `.htaccess` nicht gesperrt und wird im Klartext
      ausgeliefert, anders als die `.php`-Dateien daneben.

## Papiere nach den Vorgaben der Kanzlei (offen)

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
