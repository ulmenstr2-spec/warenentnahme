<?php
/**
 * Stripe-Webhook — nimmt Abo-Ereignisse entgegen und schreibt den Status
 * in die Nutzertabelle.
 *
 * ACHTUNG: Diese Datei wird NICHT automatisch deployt (siehe deploy.yml).
 * Sie liegt hier im Repository als Vorlage und muss einmalig per FTP nach
 * /public/app/stripe-webhook.php hochgeladen werden.
 *
 * Ungetestet: Diese Umgebung hat keinen Zugriff auf Datenbank, Stripe oder
 * den Server. Vor dem Scharfschalten bitte mit Stripe-Testschluesseln und
 * "Testereignis senden" im Dashboard pruefen.
 *
 * Kein JWT, keine CORS-Header — Stripe ruft direkt auf, die Echtheit wird
 * ueber die Signatur geprueft.
 */

require_once __DIR__ . '/config.php';         // DB-Zugang
require_once __DIR__ . '/config.stripe.php';  // STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
require_once __DIR__ . '/stripe-php/init.php';

\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

$payload   = @file_get_contents('php://input');
$signatur  = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

try {
    $event = \Stripe\Webhook::constructEvent($payload, $signatur, STRIPE_WEBHOOK_SECRET);
} catch (\UnexpectedValueException $e) {
    http_response_code(400);
    exit('Ungueltige Nutzlast');
} catch (\Stripe\Exception\SignatureVerificationException $e) {
    http_response_code(400);
    exit('Signatur ungueltig');
}

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (Throwable $e) {
    // 500 sorgt dafuer, dass Stripe es spaeter erneut versucht — besser als
    // ein stilles 200, bei dem das Ereignis verloren waere.
    http_response_code(500);
    exit('DB nicht erreichbar');
}

/**
 * Doppelte Zustellung abfangen. Stripe liefert Ereignisse mehrfach aus,
 * wenn eine Antwort ausbleibt; ohne diese Sperre wuerde derselbe Vorgang
 * mehrfach verarbeitet.
 */
$pdo->exec("CREATE TABLE IF NOT EXISTS stripe_events (
    id VARCHAR(255) PRIMARY KEY,
    verarbeitet_am DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$st = $pdo->prepare('SELECT 1 FROM stripe_events WHERE id = ?');
$st->execute([$event->id]);
if ($st->fetchColumn()) {
    http_response_code(200);
    exit('Bereits verarbeitet');
}

/** Stripe-Status auf die in der App verwendeten Werte abbilden. */
function statusAbbilden(string $stripeStatus): string {
    switch ($stripeStatus) {
        case 'trialing':            return 'trialing';
        case 'active':              return 'active';
        case 'past_due':
        case 'unpaid':              return 'past_due';
        case 'canceled':
        case 'incomplete_expired':  return 'canceled';
        default:                    return 'none';
    }
}

function zeit(?int $ts): ?string {
    return $ts ? gmdate('Y-m-d H:i:s', $ts) : null;
}

function nutzerSetzen(PDO $pdo, string $customerId, array $felder): void {
    if (!$felder) return;
    $teile = [];
    $werte = [];
    foreach ($felder as $spalte => $wert) {
        $teile[]  = "`$spalte` = ?";
        $werte[]  = $wert;
    }
    $werte[] = $customerId;
    $sql = 'UPDATE users SET ' . implode(', ', $teile) . ' WHERE stripe_customer_id = ?';
    $pdo->prepare($sql)->execute($werte);
}

try {
    switch ($event->type) {

        case 'checkout.session.completed': {
            $s = $event->data->object;
            if (!empty($s->customer)) {
                nutzerSetzen($pdo, $s->customer, [
                    'stripe_subscription_id' => $s->subscription ?? null,
                    'subscription_status'    => 'trialing',
                ]);
            }
            break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            $sub = $event->data->object;
            nutzerSetzen($pdo, $sub->customer, [
                'stripe_subscription_id' => $sub->id,
                'subscription_status'    => statusAbbilden($sub->status),
                'trial_ends_at'          => zeit($sub->trial_end ?? null),
                'current_period_end'     => zeit($sub->current_period_end ?? null),
            ]);
            break;
        }

        case 'customer.subscription.deleted': {
            $sub = $event->data->object;
            nutzerSetzen($pdo, $sub->customer, [
                'subscription_status' => 'canceled',
                'current_period_end'  => zeit($sub->current_period_end ?? null),
            ]);
            break;
        }

        case 'invoice.payment_failed': {
            $inv = $event->data->object;
            if (!empty($inv->customer)) {
                nutzerSetzen($pdo, $inv->customer, ['subscription_status' => 'past_due']);
            }
            break;
        }

        default:
            // Nicht abonnierte Ereignisse still bestaetigen.
            break;
    }

    $pdo->prepare('INSERT INTO stripe_events (id, verarbeitet_am) VALUES (?, UTC_TIMESTAMP())')
        ->execute([$event->id]);

} catch (Throwable $e) {
    error_log('[stripe-webhook] ' . $event->type . ': ' . $e->getMessage());
    // 500, damit Stripe erneut zustellt statt das Ereignis zu verwerfen.
    http_response_code(500);
    exit('Verarbeitung fehlgeschlagen');
}

http_response_code(200);
echo 'OK';
