<?php
/**
 * warenentnahme.de — Konfiguration
 * Diese Datei NIEMALS ins Git-Repository committen!
 *
 * Ionos Datenbankzugangsdaten findest du im Ionos Control Panel unter:
 * Hosting → Datenbanken → Details
 */

// ── DATENBANK (Ionos MySQL)
define('DB_HOST', 'db5019887325.hosting-data.io');   // <-- deinen Ionos DB-Host eintragen
define('DB_NAME', 'dbs15368656');              // <-- deinen DB-Namen eintragen
define('DB_USER', 'dbu4646627');              // <-- deinen DB-User eintragen
define('DB_PASS', '#Gruenekombuese15');            // <-- dein DB-Passwort eintragen

// ── E-MAIL (Ionos SMTP über PHP mail())
define('MAIL_FROM',    'noreply@warenentnahme.de');
define('MAIL_FROM_NAME', 'warenentnahme.de');

// ── SECURITY
define('TOKEN_LIFETIME_HOURS', 24 * 30);   // Token gültig 30 Tage
define('VERIFY_CODE_MINUTES',  60);         // Bestätigungslink gültig 60 Min.
define('RESET_CODE_MINUTES',   30);         // Reset-Link gültig 30 Min.

// ── APP URL (für Links in E-Mails)
define('APP_URL', 'https://www.warenentnahme.de');

// ── CORS: Erlaubte Origins
define('ALLOWED_ORIGIN', 'https://www.warenentnahme.de');
