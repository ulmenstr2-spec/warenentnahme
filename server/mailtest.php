<?php
/**
 * Wegwerf-Diagnose für den Mailversand.
 *
 * NACH DEM TEST LÖSCHEN. Solange sie liegt, kann jeder sie aufrufen und
 * damit Mails an die unten eingetragenen Adressen auslösen.
 *
 * Sie zeigt keine Passwörter — nur, ob der Versand geklappt hat und woran
 * er sonst scheitert.
 */
header('Content-Type: text/plain; charset=utf-8');
require __DIR__ . '/config.php';

// >>> HIER die eigenen Testadressen eintragen <<<
$ziele = [
    'DEINE-ADRESSE@gmail.com',
    'DEINE-ADRESSE@outlook.de',
];

echo "Absender\n";
echo "  MAIL_FROM : " . (defined('MAIL_FROM') ? MAIL_FROM : '(nicht gesetzt)') . "\n\n";

echo "SMTP-Einstellungen\n";
foreach (['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER'] as $k) {
    echo '  ' . str_pad($k, 12) . ': ' . (defined($k) ? constant($k) : '(nicht gesetzt)') . "\n";
}
echo '  ' . str_pad('SMTP_PASS', 12) . ': '
   . (defined('SMTP_PASS') && SMTP_PASS ? 'gesetzt (' . strlen(SMTP_PASS) . ' Zeichen)' : 'NICHT GESETZT') . "\n\n";

if (!defined('SMTP_HOST') || !SMTP_HOST) {
    echo "SMTP ist nicht eingerichtet — es liefe noch der alte Weg über mail().\n";
    echo "Bitte die vier Zeilen in config.php ergänzen.\n";
    exit;
}

// Die Versandfunktionen aus api.php mitbenutzen, ohne die API auszuführen.
$quelle = file_get_contents(__DIR__ . '/api.php');
preg_match_all('/\nfunction (smtpAntwort|smtpBefehl|smtpSenden)\(.*?\n\}\n/s', $quelle, $treffer);
if (!$treffer[0]) { echo "Konnte die SMTP-Funktionen in api.php nicht finden.\n"; exit; }
eval(implode("\n", $treffer[0]));

echo "Sendeversuch\n";
foreach ($ziele as $z) {
    $fehler = null;
    $ok = smtpSenden(
        $z,
        '=?UTF-8?B?' . base64_encode('warenentnahme.de – Zustelltest') . '?=',
        "Test vom " . date('d.m.Y H:i') . "\n\nWenn diese Mail ankommt, funktioniert der Versand über SMTP.\nUmlaute zur Kontrolle: äöüß\n",
        $fehler
    );
    echo '  ' . str_pad($z, 40) . ($ok ? 'gesendet' : 'FEHLER: ' . $fehler) . "\n";
}

echo "\n\"gesendet\" heißt: Der Mailserver hat sie angenommen — das ist mehr\n";
echo "als beim alten Weg. Ob sie zugestellt wird, zeigt trotzdem erst das\n";
echo "Postfach. Danach diese Datei bitte löschen.\n";
