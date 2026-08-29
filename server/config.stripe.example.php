<?php
/**
 * Vorlage für config.stripe.php
 *
 * NICHT diese Datei umbenennen und hochladen, sondern eine Kopie erstellen,
 * die Schlüssel eintragen und als config.stripe.php per FTP nach
 * /public/app/ legen. Die echte Datei gehört NICHT ins Repository —
 * sie steht bereits in .gitignore.
 *
 * Die Schlüssel stehen im Stripe-Dashboard:
 *   Entwickler → API-Schlüssel        → sk_… und pk_…
 *   Entwickler → Webhooks → Endpunkt  → whsec_…
 *
 * Zum Testen die Testschlüssel (sk_test_… / pk_test_…) verwenden.
 */

// Preis: Jahresabo 49 EUR, 30 Tage Testphase
define('STRIPE_PRICE_ID',       'price_1U8jq3BlitlFPQjTQWiolg3J');

define('STRIPE_SECRET_KEY',      'sk_test_HIER_EINTRAGEN');
define('STRIPE_PUBLISHABLE_KEY', 'pk_test_HIER_EINTRAGEN');
define('STRIPE_WEBHOOK_SECRET',  'whsec_HIER_EINTRAGEN');

// Rücksprungadressen nach der Bezahlung
define('STRIPE_SUCCESS_URL', 'https://www.warenentnahme.de/app/?checkout=success');
define('STRIPE_CANCEL_URL',  'https://www.warenentnahme.de/app/?checkout=cancel');
