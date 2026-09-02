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

/* Preis: Jahresabo 49 EUR, 30 Tage Testphase.
 *
 * Die ID gehoert zu genau einem Modus. Test und Live sind bei Stripe zwei
 * getrennte Welten mit eigenen Produkten — eine Live-ID wirft im Testmodus
 * "No such price" und umgekehrt. Also die ID immer aus dem Produktkatalog
 * des Modus holen, dessen Schluessel unten stehen.
 *
 * Bekannt ist bisher nur die Sandbox-ID:
 *   price_1U8jq3BlitlFPQjTQWioIg3J
 *
 * Eine Live-ID gibt es noch nicht — das Produkt muss im Live-Modus erst
 * angelegt werden.
 *
 * Beim Abtippen aufpassen: In diesen IDs stecken grosses I und kleines l
 * direkt nebeneinander (…QWioIg3J), und in vielen Schriftarten sehen sie
 * gleich aus. Ein vertauschtes Zeichen sieht spaeter wie eine ID aus dem
 * falschen Modus aus und kostet eine Stunde Suche. Immer kopieren, nie
 * abtippen.
 */
define('STRIPE_PRICE_ID',       'price_HIER_EINTRAGEN');

define('STRIPE_SECRET_KEY',      'sk_test_HIER_EINTRAGEN');
define('STRIPE_PUBLISHABLE_KEY', 'pk_test_HIER_EINTRAGEN');
define('STRIPE_WEBHOOK_SECRET',  'whsec_HIER_EINTRAGEN');

// Rücksprungadressen nach der Bezahlung
define('STRIPE_SUCCESS_URL', 'https://www.warenentnahme.de/app/?checkout=success');
define('STRIPE_CANCEL_URL',  'https://www.warenentnahme.de/app/?checkout=cancel');

// Rücksprung aus dem Kundenportal (Kündigung, Zahlungsmittel ändern).
// Ohne Parameter, weil hier nichts bestätigt werden muss.
define('STRIPE_PORTAL_RETURN_URL', 'https://www.warenentnahme.de/app/');
