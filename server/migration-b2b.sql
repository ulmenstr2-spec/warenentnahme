-- Dritte Datenbank-Erweiterung: B2B-Schranke und Nachweis
--
-- Einmalig in phpMyAdmin ausführen (IONOS → Datenbanken → phpMyAdmin →
-- Datenbank auswählen → Reiter „SQL"). Vorher wie bei den beiden ersten
-- Malen eine Sicherung der Tabelle `users` anlegen
-- (phpMyAdmin → Tabelle users → Exportieren).
--
-- Hintergrund: Das Angebot richtet sich ausschließlich an Unternehmer
-- (§ 14 BGB). Damit diese Beschränkung vor Gericht trägt, reicht ein Satz
-- in den AGB nicht — es muss nachweisbar sein, dass der Kunde die
-- Unternehmereigenschaft bei Vertragsschluss aktiv bestätigt hat.
--
-- Gespeichert wird deshalb nicht nur ein Häkchen, sondern der komplette
-- Wortlaut, den der Kunde vor sich hatte, dazu Zeitpunkt (UTC),
-- Firmenbezeichnung und die Fassungen von AGB und AVV. Ein späteres
-- Ändern der Texte macht damit alte Bestätigungen nicht wertlos.

ALTER TABLE `users`
  ADD COLUMN `firma`             VARCHAR(200) NULL AFTER `email`,
  ADD COLUMN `b2b_bestaetigt_am` DATETIME     NULL AFTER `firma`,
  ADD COLUMN `b2b_erklaerung`    TEXT         NULL AFTER `b2b_bestaetigt_am`,
  ADD COLUMN `agb_version`       VARCHAR(20)  NULL AFTER `b2b_erklaerung`,
  ADD COLUMN `avv_version`       VARCHAR(20)  NULL AFTER `agb_version`;

-- Bestandskonten bleiben bewusst auf NULL.
--
-- Eine B2B-Beschränkung wirkt nicht rückwirkend auf bereits geschlossene
-- Nutzungsverhältnisse. Diese Konten dürfen also weiterarbeiten — sie
-- bekommen beim nächsten Login ein Fenster, das die Bestätigung nachholt.
-- Solange die fehlt, lässt der Server keinen Zahlungsvorgang zu.
--
-- Also NICHT vorbelegen. Ein `UPDATE users SET b2b_bestaetigt_am = NOW()`
-- wäre genau das Gegenteil eines Nachweises: eine Bestätigung, die der
-- Kunde nie abgegeben hat.

-- Zur Kontrolle nach dem Ausführen:
-- SELECT id, email, firma, b2b_bestaetigt_am, agb_version FROM users;
