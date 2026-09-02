<?php
/**
 * warenentnahme.de — Auth & Sync API
 * Endpunkt: https://warenentnahme.de/app/api.php
 *
 * Aktionen:
 *   register   — Registrierung (E-Mail + PIN)
 *   verify     — E-Mail-Bestätigung per Code
 *   login      — Login → Token
 *   push       — Daten hochladen
 *   pull       — Daten herunterladen
 *   reset_req  — PIN-Reset anfordern
 *   reset_do   — PIN-Reset durchführen
 *   status     — Sync-Status prüfen (Token-Check)
 */

require __DIR__ . '/config.php';

// ── CORS ────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if($_SERVER['REQUEST_METHOD'] === 'OPTIONS'){ http_response_code(204); exit; }

// ── GET: E-Mail-Bestätigung und PIN-Reset per Link aus der Mail
if($_SERVER['REQUEST_METHOD'] === 'GET'){
    // Datenbankverbindung für GET-Handler
    try {
        $pdoGet = new PDO(
            "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4",
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    } catch(PDOException $e){
        showHtmlError('Datenbankverbindung fehlgeschlagen. Bitte versuche es später erneut.');
    }

    if(isset($_GET['verify'])){
        // E-Mail-Bestätigungslink: api.php?verify=CODE&email=EMAIL
        doVerify($pdoGet, []);
    } elseif(isset($_GET['reset'])){
        // PIN-Reset-Link: Weiterleitung zur App mit Reset-Parametern
        $resetCode = urlencode($_GET['reset'] ?? '');
        $email     = urlencode($_GET['email'] ?? '');
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>warenentnahme.de – PIN zurücksetzen</title>
        <meta http-equiv="refresh" content="1;url=' . APP_URL . '?reset=' . $resetCode . '&email=' . $email . '">
        </head><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 20px;background:#f4f6f2;">
        <div style="max-width:360px;margin:0 auto;">
        <div style="font-size:48px;margin-bottom:16px;">🔑</div>
        <h2 style="color:#1a2612;margin-bottom:8px;">PIN zurücksetzen</h2>
        <p style="color:#5a6a4a;">Du wirst zur App weitergeleitet…</p>
        <a href="' . APP_URL . '?reset=' . $resetCode . '&email=' . $email . '"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3a7020;color:#fff;
           border-radius:10px;text-decoration:none;font-weight:600;">Jetzt öffnen</a>
        </div></body></html>';
        exit;
    } else {
        header('Location: ' . APP_URL);
        exit;
    }
    exit;
}

// ── POST: JSON-API
header('Content-Type: application/json; charset=utf-8');
if($_SERVER['REQUEST_METHOD'] !== 'POST'){ jsonErr('Nur POST erlaubt', 405); }

// ── INPUT ────────────────────────────────────────────────────
$raw = file_get_contents('php://input');
$in  = json_decode($raw, true);
if(!$in || !isset($in['action'])){ jsonErr('Ungültige Anfrage'); }

$action = $in['action'];

// ── DB ───────────────────────────────────────────────────────
try {
    $pdo = new PDO(
        "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4",
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_EMULATE_PREPARES => false]
    );
} catch(PDOException $e){
    jsonErr('Datenbankverbindung fehlgeschlagen', 500);
}

// ── ROUTING ─────────────────────────────────────────────────
switch($action){
    case 'register':  doRegister($pdo, $in);  break;
    case 'verify':    doVerify($pdo, $in);    break;
    case 'login':     doLogin($pdo, $in);     break;
    case 'push':      doPush($pdo, $in);      break;
    case 'pull':      doPull($pdo, $in);      break;
    case 'reset_req': doResetReq($pdo, $in);  break;
    case 'reset_do':  doResetDo($pdo, $in);   break;
    case 'status':    doStatus($pdo, $in);    break;

    // Abo-Aktionen. Die Umsetzung liegt in api-stripe-actions.php,
    // damit diese Datei uebersichtlich bleibt.
    case 'create_checkout_session':
    case 'create_portal_session':
    case 'subscription_status':
                      doStripe($pdo, $in, $action); break;

    default:          jsonErr('Unbekannte Aktion');
}

// ════════════════════════════════════════════════════════════
// AKTIONEN
// ════════════════════════════════════════════════════════════

function doRegister(PDO $pdo, array $in): void {
    $email = normalizeEmail($in['email'] ?? '');
    $pin   = trim($in['pin'] ?? '');

    if(!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonErr('Ungültige E-Mail-Adresse');
    if(mb_strlen($pin) < 4) jsonErr('PIN mindestens 4 Zeichen');
    if(mb_strlen($pin) > 50) jsonErr('PIN zu lang');

    // Bereits registriert?
    $existing = $pdo->prepare("SELECT id, verified FROM users WHERE email = ?");
    $existing->execute([$email]);
    $user = $existing->fetch(PDO::FETCH_ASSOC);

    if($user && $user['verified']) {
        jsonErr('E-Mail bereits registriert. Bitte einloggen.');
    }

    $pinHash    = password_hash($pin, PASSWORD_BCRYPT);
    $verifyCode = bin2hex(random_bytes(24)); // 48-stelliger Code
    $verifyExp  = date('Y-m-d H:i:s', strtotime('+' . VERIFY_CODE_MINUTES . ' minutes'));

    if($user) {
        // Nicht verifiziert — Code erneuern
        $upd = $pdo->prepare("
            UPDATE users SET pin_hash=?, verify_code=?, verify_exp=? WHERE email=?
        ");
        $upd->execute([$pinHash, $verifyCode, $verifyExp, $email]);
    } else {
        // Neu anlegen
        $ins = $pdo->prepare("
            INSERT INTO users (email, pin_hash, verify_code, verify_exp)
            VALUES (?, ?, ?, ?)
        ");
        $ins->execute([$email, $pinHash, $verifyCode, $verifyExp]);
    }

    // Bestätigungsmail senden
    $verifyUrl = APP_URL . '/app/api.php?verify=' . urlencode($verifyCode) . '&email=' . urlencode($email);
    sendMail(
        $email,
        'warenentnahme.de – E-Mail bestätigen',
        "Hallo,\n\nbitte bestätige deine E-Mail-Adresse:\n\n{$verifyUrl}\n\nDer Link ist " . VERIFY_CODE_MINUTES . " Minuten gültig.\n\nWenn du dich nicht registriert hast, ignoriere diese Mail.\n\nDein warenentnahme.de Team"
    );

    jsonOk(['message' => 'Bestätigungsmail gesendet. Bitte prüfe dein Postfach.']);
}

function doVerify(PDO $pdo, array $in): void {
    // Auch per GET aufrufbar (Link in E-Mail)
    $code  = trim($in['code']  ?? $_GET['verify'] ?? '');
    $email = normalizeEmail($in['email'] ?? $_GET['email'] ?? '');

    if(!$code || !$email) jsonErr('Code oder E-Mail fehlt');

    $stmt = $pdo->prepare("
        SELECT id FROM users
        WHERE email=? AND verify_code=? AND verify_exp > NOW() AND verified=0
    ");
    $stmt->execute([$email, $code]);
    $user = $stmt->fetch();

    if(!$user) {
        // Per GET-Aufruf → HTML-Antwort
        if(isset($_GET['verify'])){
            echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>warenentnahme.de</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;">
            <h2>❌ Link ungültig oder abgelaufen</h2>
            <p>Bitte registriere dich erneut.</p>
            <a href="' . APP_URL . '">Zur App</a></body></html>';
            exit;
        }
        jsonErr('Ungültiger oder abgelaufener Bestätigungslink');
    }

    // Verifizieren + Token ausstellen
    $token    = bin2hex(random_bytes(32));
    $tokenExp = date('Y-m-d H:i:s', strtotime('+' . TOKEN_LIFETIME_HOURS . ' hours'));

    $pdo->prepare("
        UPDATE users SET verified=1, verify_code=NULL, verify_exp=NULL,
        token=?, token_exp=? WHERE id=?
    ")->execute([$token, $tokenExp, $user['id']]);

    // Per GET → HTML mit Auto-Redirect
    if(isset($_GET['verify'])){
        echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>warenentnahme.de</title>
        <meta http-equiv="refresh" content="3;url=' . APP_URL . '?verified=1&token=' . urlencode($token) . '&email=' . urlencode($email) . '">
        </head><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2>✓ E-Mail bestätigt!</h2>
        <p>Du wirst automatisch zur App weitergeleitet…</p>
        <a href="' . APP_URL . '?verified=1&token=' . urlencode($token) . '&email=' . urlencode($email) . '">Jetzt öffnen</a>
        </body></html>';
        exit;
    }

    jsonOk(['token' => $token, 'email' => $email]);
}

function doLogin(PDO $pdo, array $in): void {
    $email = normalizeEmail($in['email'] ?? '');
    $pin   = trim($in['pin'] ?? '');

    if(!$email || !$pin) jsonErr('E-Mail und PIN erforderlich');

    $stmt = $pdo->prepare("SELECT id, pin_hash, verified FROM users WHERE email=?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if(!$user || !password_verify($pin, $user['pin_hash'])){
        jsonErr('E-Mail oder PIN falsch');
    }
    if(!$user['verified']){
        jsonErr('E-Mail noch nicht bestätigt. Bitte prüfe dein Postfach.');
    }

    // Neues Token ausstellen
    $token    = bin2hex(random_bytes(32));
    $tokenExp = date('Y-m-d H:i:s', strtotime('+' . TOKEN_LIFETIME_HOURS . ' hours'));

    $pdo->prepare("UPDATE users SET token=?, token_exp=? WHERE id=?")
        ->execute([$token, $tokenExp, $user['id']]);

    jsonOk(['token' => $token, 'email' => $email]);
}

function doPush(PDO $pdo, array $in): void {
    $user = requireAuth($pdo, $in);

    $data = $in['data'] ?? null;
    if(!$data || !is_array($data)) jsonErr('Keine Daten übermittelt');

    // Daten als JSON speichern
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if(!$json) jsonErr('Daten konnten nicht kodiert werden');

    // Upsert: einfügen oder aktualisieren
    $stmt = $pdo->prepare("
        INSERT INTO user_data (user_id, payload) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE payload=VALUES(payload), updated_at=NOW()
    ");
    $stmt->execute([$user['id'], $json]);

    // last_sync aktualisieren
    $pdo->prepare("UPDATE users SET last_sync=NOW() WHERE id=?")
        ->execute([$user['id']]);

    jsonOk(['saved' => true, 'ts' => date('c')]);
}

function doPull(PDO $pdo, array $in): void {
    $user = requireAuth($pdo, $in);

    $stmt = $pdo->prepare("
        SELECT payload, updated_at FROM user_data WHERE user_id=?
    ");
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if(!$row){
        jsonOk(['empty' => true]);
        return;
    }

    $data = json_decode($row['payload'], true);
    jsonOk(['data' => $data, 'updatedAt' => $row['updated_at']]);
}

function doResetReq(PDO $pdo, array $in): void {
    $email = normalizeEmail($in['email'] ?? '');
    if(!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonErr('Ungültige E-Mail-Adresse');

    $stmt = $pdo->prepare("SELECT id, verified FROM users WHERE email=?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Immer OK zurückgeben — kein User-Enumeration
    if(!$user || !$user['verified']){
        jsonOk(['message' => 'Falls ein Konto existiert, wurde eine Mail gesendet.']);
        return;
    }

    $resetCode = bin2hex(random_bytes(24));
    $resetExp  = date('Y-m-d H:i:s', strtotime('+' . RESET_CODE_MINUTES . ' minutes'));

    $pdo->prepare("UPDATE users SET reset_code=?, reset_exp=? WHERE id=?")
        ->execute([$resetCode, $resetExp, $user['id']]);

    $resetUrl = APP_URL . '?reset=' . urlencode($resetCode) . '&email=' . urlencode($email);
    sendMail(
        $email,
        'warenentnahme.de – PIN zurücksetzen',
        "Hallo,\n\ndu hast einen PIN-Reset angefordert:\n\n{$resetUrl}\n\nDer Link ist " . RESET_CODE_MINUTES . " Minuten gültig.\n\nWenn du keinen Reset angefordert hast, ignoriere diese Mail.\n\nDein warenentnahme.de Team"
    );

    jsonOk(['message' => 'Falls ein Konto existiert, wurde eine Mail gesendet.']);
}

function doResetDo(PDO $pdo, array $in): void {
    $email   = normalizeEmail($in['email'] ?? '');
    $code    = trim($in['code'] ?? '');
    $newPin  = trim($in['pin'] ?? '');

    if(!$email || !$code) jsonErr('E-Mail und Code erforderlich');
    if(mb_strlen($newPin) < 4) jsonErr('Neuer PIN mindestens 4 Zeichen');

    $stmt = $pdo->prepare("
        SELECT id FROM users
        WHERE email=? AND reset_code=? AND reset_exp > NOW()
    ");
    $stmt->execute([$email, $code]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if(!$user) jsonErr('Ungültiger oder abgelaufener Reset-Link');

    $newHash  = password_hash($newPin, PASSWORD_BCRYPT);
    $token    = bin2hex(random_bytes(32));
    $tokenExp = date('Y-m-d H:i:s', strtotime('+' . TOKEN_LIFETIME_HOURS . ' hours'));

    $pdo->prepare("
        UPDATE users SET pin_hash=?, reset_code=NULL, reset_exp=NULL,
        token=?, token_exp=? WHERE id=?
    ")->execute([$newHash, $token, $tokenExp, $user['id']]);

    jsonOk(['token' => $token, 'email' => $email, 'message' => 'PIN erfolgreich geändert']);
}

function doStatus(PDO $pdo, array $in): void {
    $user = requireAuth($pdo, $in);
    jsonOk([
        'email'    => $user['email'],
        'lastSync' => $user['last_sync'],
    ]);
}

/**
 * Abo: Bezahlseite oeffnen, Kundenportal oeffnen, Status abfragen.
 *
 * requireAuth steht bewusst als erste Zeile: ohne gueltigen Token darf
 * niemand eine Bezahlseite oder das Kundenportal eines fremden Kontos
 * oeffnen. requireAuth bricht bei ungueltigem Token selbst mit 401 ab.
 */
function doStripe(PDO $pdo, array $in, string $action): void {
    $user = requireAuth($pdo, $in);

    // Erst hier laden — solange kein Abo genutzt wird, muessen weder die
    // Stripe-Bibliothek noch die Schluessel vorhanden sein.
    require_once __DIR__ . '/api-stripe-actions.php';

    $antwort = stripe_aktion($pdo, $user, $action);
    if (empty($antwort['ok'])) {
        jsonErr($antwort['error'] ?? 'Abo-Aktion fehlgeschlagen');
    }
    unset($antwort['ok']);   // jsonOk setzt ok=true selbst
    jsonOk($antwort);
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function requireAuth(PDO $pdo, array $in): array {
    $token = trim($in['token'] ?? '');
    if(!$token) jsonErr('Nicht authentifiziert', 401);

    $stmt = $pdo->prepare("
        SELECT id, email, last_sync FROM users
        WHERE token=? AND token_exp > NOW() AND verified=1
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if(!$user) jsonErr('Sitzung abgelaufen – bitte erneut einloggen', 401);
    return $user;
}

function normalizeEmail(string $email): string {
    return strtolower(trim($email));
}

/**
 * Mailversand.
 *
 * Frueher lief das ueber mail(). Das reicht nicht mehr: Gmail und Outlook
 * nehmen seit 2024 kaum noch Post an, die sich nicht ausweisen kann, und
 * mail() verschickt vom Webserver — nicht ueber die Mailserver, die im
 * SPF-Eintrag der Domain stehen. Ergebnis waren Registrierungen, bei denen
 * die Bestaetigungsmail spurlos verschwand: nicht im Postfach, nicht im
 * Spam, keine Fehlermeldung.
 *
 * Jetzt ueber SMTP mit Anmeldung. Damit verschickt der Postfachanbieter,
 * SPF und DKIM stimmen automatisch.
 *
 * Dafuer gehoeren vier Zeilen in die config.php:
 *
 *     define('SMTP_HOST',   'smtp.ionos.de');
 *     define('SMTP_PORT',   465);
 *     define('SMTP_SECURE', 'ssl');            // 465 = ssl, 587 = tls
 *     define('SMTP_USER',   'hallo@warenentnahme.de');
 *     define('SMTP_PASS',   'DAS-POSTFACH-PASSWORT');
 *
 * MAIL_FROM sollte dieselbe Adresse sein wie SMTP_USER — verschickt man
 * unter fremdem Namen, weisen die Empfaenger wieder ab.
 *
 * Fehlt SMTP_HOST, laeuft der alte Weg weiter. So macht ein Hochladen
 * dieser Datei nichts kaputt, bevor die config.php ergaenzt ist.
 */
function sendMail(string $to, string $subject, string $body): void {
    $betreff = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    if (!defined('SMTP_HOST') || !SMTP_HOST) {
        $headers  = "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM . ">\r\n";
        $headers .= "Reply-To: " . MAIL_FROM . "\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "Content-Transfer-Encoding: 8bit\r\n";
        $headers .= "X-Mailer: PHP/" . PHP_VERSION . "\r\n";
        mail($to, $betreff, $body, $headers);
        return;
    }

    $fehler = null;
    if (!smtpSenden($to, $betreff, $body, $fehler)) {
        // Nicht abbrechen: Der Nutzer hat sein Konto trotzdem. Aber es muss
        // im Protokoll stehen, sonst sucht man den Fehler wieder tagelang.
        error_log('[sendMail] SMTP an ' . $to . ' fehlgeschlagen: ' . $fehler);
    }
}

/** Eine Zeile der Serverantwort lesen; mehrzeilige Antworten zusammenfassen. */
function smtpAntwort($vb): string {
    $alles = '';
    while (($zeile = fgets($vb, 1024)) !== false) {
        $alles .= $zeile;
        // Bei mehrzeiligen Antworten steht nach dem Code ein "-".
        if (strlen($zeile) < 4 || $zeile[3] !== '-') break;
    }
    return $alles;
}

/** Befehl schicken und pruefen, ob die Antwort mit dem erwarteten Code beginnt. */
function smtpBefehl($vb, ?string $befehl, string $erwartet, ?string &$fehler): bool {
    if ($befehl !== null) fwrite($vb, $befehl . "\r\n");
    $antwort = smtpAntwort($vb);
    if (strncmp($antwort, $erwartet, strlen($erwartet)) !== 0) {
        // Bewusst nur die Antwort des Servers protokollieren, nie den
        // gesendeten Befehl: Bei AUTH LOGIN stuende dort das Passwort.
        $fehler = 'erwartet ' . $erwartet . ', bekam: ' . trim($antwort);
        return false;
    }
    return true;
}

/**
 * Minimaler SMTP-Client. Bewusst ohne Fremdbibliothek — fuer eine
 * Registrierungsmail braucht es keine.
 */
function smtpSenden(string $to, string $betreff, string $body, ?string &$fehler = null): bool {
    $host   = SMTP_HOST;
    $port   = defined('SMTP_PORT')   ? (int)SMTP_PORT : 587;
    $sicher = defined('SMTP_SECURE') ? strtolower(SMTP_SECURE) : 'tls';

    // Unverschluesselt nur gegen den eigenen Rechner — das ist fuer Tests
    // gedacht. Gegen einen echten Server gingen sonst die Zugangsdaten
    // im Klartext ueber die Leitung.
    if ($sicher === 'none' && !in_array($host, ['localhost', '127.0.0.1'], true)) {
        $fehler = 'Unverschluesseltes SMTP ist nur gegen localhost erlaubt.';
        return false;
    }

    $ziel = ($sicher === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $vb = @stream_socket_client($ziel, $nr, $txt, 20, STREAM_CLIENT_CONNECT,
        stream_context_create(['ssl' => ['SNI_enabled' => true]]));
    if (!$vb) { $fehler = 'Verbindung zu ' . $ziel . ' fehlgeschlagen: ' . $txt; return false; }
    stream_set_timeout($vb, 20);

    $wer = defined('APP_URL') ? parse_url(APP_URL, PHP_URL_HOST) : 'localhost';
    $wer = $wer ?: 'localhost';

    try {
        if (!smtpBefehl($vb, null,            '220', $fehler)) return false;
        if (!smtpBefehl($vb, 'EHLO ' . $wer,  '250', $fehler)) return false;

        if ($sicher === 'tls') {
            if (!smtpBefehl($vb, 'STARTTLS', '220', $fehler)) return false;
            if (!stream_socket_enable_crypto($vb, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                $fehler = 'Verschluesselung liess sich nicht aufbauen.'; return false;
            }
            if (!smtpBefehl($vb, 'EHLO ' . $wer, '250', $fehler)) return false;
        }

        if (defined('SMTP_USER') && SMTP_USER) {
            if (!smtpBefehl($vb, 'AUTH LOGIN',                  '334', $fehler)) return false;
            if (!smtpBefehl($vb, base64_encode(SMTP_USER),      '334', $fehler)) return false;
            if (!smtpBefehl($vb, base64_encode(SMTP_PASS),      '235', $fehler)) {
                $fehler = 'Anmeldung abgelehnt — Benutzername oder Passwort stimmt nicht.';
                return false;
            }
        }

        if (!smtpBefehl($vb, 'MAIL FROM:<' . MAIL_FROM . '>', '250', $fehler)) return false;
        if (!smtpBefehl($vb, 'RCPT TO:<' . $to . '>',         '250', $fehler)) return false;
        if (!smtpBefehl($vb, 'DATA',                          '354', $fehler)) return false;

        $kopf = [
            'Date: '         . date('r'),
            'From: '         . '=?UTF-8?B?' . base64_encode(MAIL_FROM_NAME) . '?= <' . MAIL_FROM . '>',
            'To: '           . $to,
            'Subject: '      . $betreff,
            'Message-ID: <'  . bin2hex(random_bytes(12)) . '@' . $wer . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        // Zeilenenden vereinheitlichen; eine Zeile mit einem einzelnen Punkt
        // wuerde den Datenteil sonst vorzeitig beenden.
        $text = preg_replace('/\r\n|\r|\n/', "\r\n", $body);
        $text = preg_replace('/^\./m', '..', $text);

        fwrite($vb, implode("\r\n", $kopf) . "\r\n\r\n" . $text . "\r\n.\r\n");
        if (!smtpBefehl($vb, null, '250', $fehler)) return false;

        $ende = null;
        smtpBefehl($vb, 'QUIT', '221', $ende);
        return true;
    } finally {
        fclose($vb);
    }
}

function jsonOk(array $data): never {
    echo json_encode(['ok' => true, ...$data], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonErr(string $msg, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function showHtmlError(string $msg): never {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>warenentnahme.de</title>
    </head><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 20px;background:#f4f6f2;">
    <div style="max-width:360px;margin:0 auto;">
    <h2 style="color:#c0392b;margin-bottom:12px;">Fehler</h2>
    <p style="color:#5a6a4a;margin-bottom:24px;">' . htmlspecialchars($msg) . '</p>
    <a href="' . APP_URL . '" style="display:inline-block;padding:12px 24px;background:#3a7020;
    color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">Zur App</a>
    </div></body></html>';
    exit;
}
