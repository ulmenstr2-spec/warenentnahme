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

## Kündigungsbutton hochladen

- [ ] `server/mailversand.php` nach `/public/app/` — **zuerst**,
      `api.php` bricht sonst ab
- [ ] `server/api.php` nach `/public/app/` (nutzt jetzt mailversand.php)
- [ ] `server/kuendigung.php` nach `/public/` — **nicht** nach /app/
- [ ] Nach dem Merge deployt `kuendigung.html` von allein
- [ ] Prüfen: Fußbereich → „Verträge hier kündigen" → Formular →
      „Jetzt kündigen" → Bestätigungsseite und zwei Mails
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
