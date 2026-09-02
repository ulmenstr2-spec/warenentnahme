<?php
/**
 * Die drei Abo-Aktionen für api.php.
 *
 * ACHTUNG: Diese Datei wird NICHT automatisch deployt (siehe deploy.yml).
 * Sie muss einmalig per FTP neben api.php nach /public/app/ geladen werden.
 *
 * Ungetestet: Diese Umgebung hat keinen Zugriff auf Datenbank, Stripe oder
 * den Server. Bitte mit Stripe-Testschlüsseln prüfen, bevor echtes Geld fließt.
 *
 * Der Einbau in api.php ist bereits erledigt: dort gibt es drei zusätzliche
 * `case`-Zweige im Routing und die Funktion `doStripe()`, die zuerst
 * `requireAuth()` aufruft und dann hierher weiterreicht.
 *
 * Erwartet wird:
 *   $pdo   — die bestehende PDO-Verbindung
 *   $user  — der Rückgabewert von requireAuth(), mindestens mit `id`
 *            und `email`
 *   $action— der Wert aus dem JSON-Feld "action"
 *
 * Rückgabe ist immer ein Array mit `ok`. Bei `ok => false` steht in
 * `error` ein Satz, der direkt in der App angezeigt werden kann.
 */

require_once __DIR__ . '/config.stripe.php';
require_once __DIR__ . '/stripe-php/init.php';

/** MySQL-DATETIME → ISO 8601 mit Zeitzone.
 *
 *  Nicht kosmetisch: "2026-09-28 12:00:00" wirft in Safari ein Invalid Date.
 *  Die App rechnet daraus die verbleibenden Testtage aus — ohne das T und
 *  den Zeitzonen-Zusatz stünde dort auf iPhones NaN.
 */
function stripe_zeit_iso(?string $wert): ?string {
    if (!$wert) return null;
    $ts = strtotime($wert . ' UTC');
    return $ts ? gmdate('c', $ts) : null;
}

/** Den Nutzer frisch laden — der Webhook kann den Status zwischenzeitlich
 *  geändert haben, der übergebene Datensatz wäre dann veraltet. */
function stripe_nutzer_laden(PDO $pdo, $userId): ?array {
    $st = $pdo->prepare('SELECT id, email, stripe_customer_id, stripe_subscription_id,
                                subscription_status, trial_ends_at, current_period_end
                         FROM users WHERE id = ?');
    $st->execute([$userId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/** Kundeneintrag bei Stripe sicherstellen und die Nummer merken. */
function stripe_kunde_sichern(PDO $pdo, array $u): string {
    if (!empty($u['stripe_customer_id'])) return $u['stripe_customer_id'];

    $kunde = \Stripe\Customer::create([
        'email'    => $u['email'],
        'metadata' => ['user_id' => (string)$u['id']],
    ]);
    $pdo->prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')
        ->execute([$kunde->id, $u['id']]);
    return $kunde->id;
}

function stripe_aktion(PDO $pdo, array $user, string $action): array {
    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

    $u = stripe_nutzer_laden($pdo, $user['id']);
    if (!$u) return ['ok' => false, 'error' => 'Konto nicht gefunden.'];

    try {
        switch ($action) {

            case 'subscription_status':
                return [
                    'ok'                  => true,
                    'subscription_status' => $u['subscription_status'] ?: 'none',
                    'trial_ends_at'       => stripe_zeit_iso($u['trial_ends_at']),
                    'current_period_end'  => stripe_zeit_iso($u['current_period_end']),
                ];

            case 'create_checkout_session': {
                if (in_array($u['subscription_status'], ['trialing', 'active'], true)) {
                    return ['ok' => false, 'error' => 'Es läuft bereits ein Abo für dieses Konto.'];
                }
                $kundeId = stripe_kunde_sichern($pdo, $u);

                // Die 30 Tage gibt es einmal. Wer schon einmal ein Abo hatte,
                // bekommt beim erneuten Abschluss keine zweite Testphase —
                // sonst ließe sich durch Kündigen und Neuabschluss dauerhaft
                // kostenlos weiternutzen.
                $abo = ['metadata' => ['user_id' => (string)$u['id']]];
                if (empty($u['stripe_subscription_id']) && $u['subscription_status'] === 'none') {
                    $abo['trial_period_days'] = 30;
                }

                $sitzung = \Stripe\Checkout\Session::create([
                    'mode'                       => 'subscription',
                    'customer'                   => $kundeId,
                    'client_reference_id'        => (string)$u['id'],
                    'line_items'                 => [['price' => STRIPE_PRICE_ID, 'quantity' => 1]],
                    'subscription_data'          => $abo,
                    // Auch während der Testphase eine Zahlungsmethode verlangen,
                    // sonst endet das Abo nach 30 Tagen still statt zu starten.
                    'payment_method_collection'  => 'always',
                    'allow_promotion_codes'      => true,
                    'locale'                     => 'de',
                    'success_url'                => STRIPE_SUCCESS_URL,
                    'cancel_url'                 => STRIPE_CANCEL_URL,
                ]);
                return ['ok' => true, 'url' => $sitzung->url];
            }

            case 'create_portal_session': {
                if (empty($u['stripe_customer_id'])) {
                    return ['ok' => false, 'error' => 'Für dieses Konto gibt es noch kein Abo.'];
                }
                $rueck = defined('STRIPE_PORTAL_RETURN_URL')
                    ? STRIPE_PORTAL_RETURN_URL
                    : STRIPE_CANCEL_URL;

                $sitzung = \Stripe\BillingPortal\Session::create([
                    'customer'   => $u['stripe_customer_id'],
                    'return_url' => $rueck,
                    'locale'     => 'de',
                ]);
                return ['ok' => true, 'url' => $sitzung->url];
            }
        }
    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log('[stripe-aktion] ' . $action . ': ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Die Bezahlung ist gerade nicht erreichbar. Bitte später nochmal versuchen.'];
    } catch (Throwable $e) {
        error_log('[stripe-aktion] ' . $action . ': ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Es ist ein Fehler aufgetreten. Bitte später nochmal versuchen.'];
    }

    return ['ok' => false, 'error' => 'Unbekannte Aktion.'];
}
