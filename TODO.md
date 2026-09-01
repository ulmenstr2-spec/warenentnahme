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
      erstellen (Price-ID ist bereits eingetragen, Schlüssel eintragen)
- [ ] **Stripe-Dashboard**: Webhook-Endpunkt auf
      `https://www.warenentnahme.de/app/stripe-webhook.php` einrichten,
      die fünf Ereignisse abonnieren, Kundenportal aktivieren (Kündigung
      und Zahlungsmittel ändern, deutsche Sprache)
- [ ] **Testlauf** mit Karte `4242 4242 4242 4242`: Bezahlung →
      Status `trialing` → im Portal kündigen → Status `canceled` →
      neue Einträge gesperrt, Export weiterhin möglich

## Aus früheren Sitzungen

- [ ] **Bestätigungsmail auf Spam prüfen** (GMX, Web.de, Gmail). Landet sie
      im Spam-Ordner, gehen neue Nutzer verloren, ohne dass es auffällt.
      Gegenmittel wären SPF- und DKIM-Einträge im IONOS-Konto.
- [ ] **Datenbank-Passwort ändern** — das alte steht weiterhin in der
      Git-Historie
- [ ] **AVV mit IONOS** im Kundenkonto abschließen; den Entwurf für eigene
      Kunden (`AVV-ENTWURF.md`) anwaltlich prüfen lassen
- [ ] **Impressum**: Steuernummer ergänzen, falls gewünscht (nicht
      verpflichtend; eine USt-IdNr gibt es bei Kleinunternehmerschaft nicht)
