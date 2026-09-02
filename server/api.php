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

function sendMail(string $to, string $subject, string $body): void {
    $headers  = "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM . ">\r\n";
    $headers .= "Reply-To: " . MAIL_FROM . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: 8bit\r\n";
    $headers .= "X-Mailer: PHP/" . PHP_VERSION . "\r\n";

    mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
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
