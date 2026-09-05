<?php
/**
 * Mailversand für warenentnahme.de
 *
 * Wird von api.php und von kuendigung.php eingebunden. Erwartet, dass
 * config.php bereits geladen ist (MAIL_FROM, MAIL_FROM_NAME, SMTP_*).
 *
 * ACHTUNG: Diese Datei wird NICHT automatisch deployt (siehe deploy.yml).
 * Sie gehört per FTP nach /public/app/.
 */

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
/**
 * Absenderangaben unter jeder Mail.
 *
 * Geschaeftsmaessige E-Mail traegt dieselben Pflichtangaben wie ein Brief:
 * Name und ladungsfaehige Anschrift des Anbieters. Vorher endeten alle drei
 * Mails mit „Dein warenentnahme.de Team" — ohne Namen, ohne Anschrift.
 *
 * Bewusst hier und nicht an den drei Absendestellen: So kann es beim
 * Schreiben einer vierten Mail niemand vergessen, und die Angaben koennen
 * nicht auseinanderlaufen.
 */
function mailFusszeile(): string {
    return "\n\n"
         . "-- \n"
         . "warenentnahme.de\n"
         . "Josef Czerwinski, Ulmenstr. 2, 18057 Rostock\n"
         . "hallo@warenentnahme.de · Telefon +49 176 75192451\n"
         . "Kleinunternehmer nach § 19 UStG, keine USt-IdNr.\n"
         . "Impressum: https://www.warenentnahme.de/impressum.html\n"
         . "Datenschutz: https://www.warenentnahme.de/datenschutz.html";
}

function sendMail(string $to, string $subject, string $body): void {
    $betreff = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $body    = rtrim($body) . mailFusszeile();

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
