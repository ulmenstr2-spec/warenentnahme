-- Zweite Datenbank-Erweiterung: vorgemerkte Kündigung
--
-- Einmalig in phpMyAdmin ausführen (SQL-Reiter). Vorher wie beim ersten
-- Mal eine Sicherung der Tabelle `users` anlegen.
--
-- Hintergrund: Wer im Kundenportal kündigt, behält den Zugang bis zum Ende
-- des bezahlten Zeitraums. Der Status bleibt solange `trialing` oder
-- `active` — an ihm allein ist eine Kündigung also nicht zu erkennen.
-- Ohne dieses Feld stand in der App weiterhin „wird automatisch
-- fortgesetzt", obwohl gekündigt war.

ALTER TABLE `users`
  ADD COLUMN `cancel_at_period_end` TINYINT(1) NOT NULL DEFAULT 0
  AFTER `current_period_end`;

-- Bestandsdaten: Niemand hat bisher gekündigt, 0 ist also richtig.
-- Falls doch, korrigiert der nächste Webhook das von allein.
