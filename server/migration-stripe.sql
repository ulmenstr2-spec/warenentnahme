-- Datenbank-Erweiterung für die Abo-Verwaltung
--
-- Einmalig in phpMyAdmin ausführen (IONOS → Datenbanken → phpMyAdmin →
-- Datenbank auswählen → Reiter „SQL").
--
-- Vorher: Bitte eine Sicherung der Tabelle `users` anlegen
-- (phpMyAdmin → Tabelle users → Exportieren). Diese Umgebung hat keinen
-- Zugriff auf die Datenbank, die Anweisungen sind also ungetestet.

ALTER TABLE `users`
  ADD COLUMN `stripe_customer_id`     VARCHAR(255) NULL AFTER `id`,
  ADD COLUMN `stripe_subscription_id` VARCHAR(255) NULL AFTER `stripe_customer_id`,
  ADD COLUMN `subscription_status`
      ENUM('none','trialing','active','past_due','canceled') NOT NULL DEFAULT 'none'
      AFTER `stripe_subscription_id`,
  ADD COLUMN `trial_ends_at`          DATETIME NULL AFTER `subscription_status`,
  ADD COLUMN `current_period_end`     DATETIME NULL AFTER `trial_ends_at`;

-- Der Webhook findet den Nutzer über die Stripe-Kundennummer.
CREATE INDEX `idx_stripe_customer` ON `users` (`stripe_customer_id`);

-- Bestandsnutzer aus der Beta behalten vorerst 'none'. Falls sie
-- dauerhaft freigeschaltet bleiben sollen, stattdessen:
-- UPDATE `users` SET `subscription_status` = 'active' WHERE `id` IN (…);
