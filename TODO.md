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
- [ ] **Kündigungsbutton nach § 312k BGB** — bei online geschlossenen
      Dauerschuldverhältnissen mit Verbrauchern verlangt das Gesetz eine
      unmittelbar erreichbare Schaltfläche „Verträge hier kündigen".
      Das Stripe-Kundenportal allein genügt dafür voraussichtlich nicht,
      weil es hinter dem Login liegt — die Schaltfläche muss ohne
      Anmeldung erreichbar sein.
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

## Aus früheren Sitzungen

## Mailversand (02.09.2026)

Getestet: Bestätigungsmails kamen bei Gmail und Outlook **gar nicht** an —
auch nicht im Spam. Ursache: `mail()` verschickt vom Webserver, nicht über
die Mailserver aus dem SPF-Eintrag der Domain. SPF und DMARC sind gesetzt,
ein DKIM-Eintrag war unter den gängigen Namen nicht auffindbar.

Umgestellt auf SMTP mit Anmeldung über das vorhandene Postfach
`hallo@warenentnahme.de`.

- [ ] In `config.php` ergänzen:
      ```php
      define('SMTP_HOST',   'smtp.ionos.de');
      define('SMTP_PORT',   465);
      define('SMTP_SECURE', 'ssl');
      define('SMTP_USER',   'hallo@warenentnahme.de');
      define('SMTP_PASS',   'DAS-POSTFACH-PASSWORT');
      ```
- [ ] `MAIL_FROM` von `noreply@` auf `hallo@warenentnahme.de` ändern —
      unter fremdem Namen zu verschicken führt wieder zur Abweisung
- [ ] Neue `server/api.php` hochladen
- [ ] Mit `server/mailtest.php` prüfen, danach die Datei **löschen**
- [ ] Zur Sicherheit eine echte Registrierung mit einer Gmail-Adresse
- [ ] **Datenbank-Passwort ändern** — das alte steht weiterhin in der
      Git-Historie
- [ ] **AVV mit IONOS** im Kundenkonto abschließen; den Entwurf für eigene
      Kunden (`AVV-ENTWURF.md`) anwaltlich prüfen lassen
- [ ] **Impressum**: Steuernummer ergänzen, falls gewünscht (nicht
      verpflichtend; eine USt-IdNr gibt es bei Kleinunternehmerschaft nicht)
