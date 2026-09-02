<?php
/**
 * Kündigungserklärung nach § 312k BGB — Empfang und Bestätigung.
 *
 * ACHTUNG: Diese Datei wird NICHT automatisch deployt (siehe deploy.yml).
 * Sie gehört per FTP nach /public/ — also neben index.html, nicht in /app/.
 *
 * Was das Gesetz verlangt und wo es hier steht:
 *   - Schaltfläche „Verträge hier kündigen", ohne Anmeldung erreichbar
 *     → im Fußbereich der Website, führt auf kuendigung.html
 *   - Bestätigungsseite mit Eingabefeldern für Vertrag, Person, Grund und
 *     Zeitpunkt                                    → kuendigung.html
 *   - Bestätigungsschaltfläche „Jetzt kündigen"    → kuendigung.html
 *   - Speicherbarkeit der Erklärung mit Datum und Uhrzeit
 *     → die Seite unten zeigt alles zum Ausdrucken oder Speichern
 *   - Sofortige Bestätigung des Zugangs in Textform
 *     → E-Mail an die angegebene Adresse, plus Kopie an den Betreiber
 *
 * BEWUSST NICHT AUTOMATISIERT: Das Abo wird hier nicht gekündigt. Das
 * Formular ist ohne Anmeldung erreichbar — wer eine fremde E-Mail-Adresse
 * einträgt, könnte sonst das Abo eines Fremden beenden. Die Erklärung
 * geht deshalb an den Betreiber, der sie in Stripe ausführt. Das Gesetz
 * verlangt den Zugang und dessen Bestätigung, keine Automatik.
 */

require __DIR__ . '/app/config.php';
require __DIR__ . '/app/mailversand.php';

/** Einfache Bremse gegen Missbrauch: Das Formular verschickt Mails an
 *  frei eingegebene Adressen. Ohne Begrenzung wäre es ein Versandhelfer
 *  für Fremde. */
function darfSenden(): bool {
    $verzeichnis = sys_get_temp_dir() . '/we_kuendigung';
    @mkdir($verzeichnis, 0700, true);
    $datei = $verzeichnis . '/' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unbekannt');
    $jetzt = time();
    $zeiten = is_file($datei) ? array_filter(explode(',', (string)@file_get_contents($datei))) : [];
    $zeiten = array_values(array_filter($zeiten, fn($t) => $jetzt - (int)$t < 3600));
    if (count($zeiten) >= 5) return false;
    $zeiten[] = $jetzt;
    @file_put_contents($datei, implode(',', $zeiten));
    return true;
}

function seite(string $titel, string $inhalt, bool $fehler = false): never {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>' . htmlspecialchars($titel) . ' – warenentnahme.de</title>
<style>
  body{margin:0;background:#f4f6f2;color:#1a2612;
       font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       line-height:1.6;padding:40px 20px}
  .k{max-width:640px;margin:0 auto;background:#fff;border:1px solid #dfe6d6;
     border-radius:16px;padding:32px}
  h1{font-size:23px;margin:0 0 16px;color:' . ($fehler ? '#b3261e' : '#2f5d1e') . '}
  dl{margin:24px 0;border-top:1px solid #eceee8}
  dt{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7a5c;
     margin-top:16px}
  dd{margin:2px 0 0;font-size:15px}
  .hinweis{background:#f4f6f2;border-radius:12px;padding:16px;font-size:14px;
           color:#4a5a3c;margin-top:24px}
  a{color:#2f5d1e}
  @media print{body{background:#fff;padding:0}.k{border:none}.drucken{display:none}}
  .drucken{display:inline-block;margin-top:20px;padding:11px 20px;background:#2f5d1e;
           color:#fff;border:none;border-radius:10px;font-size:15px;cursor:pointer;
           font-family:inherit}
</style></head><body><div class="k">' . $inhalt . '</div></body></html>';
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /kuendigung.html');
    exit;
}

// Honigtopf: ein für Menschen unsichtbares Feld. Ist es ausgefüllt, war
// es ein Bot.
if (trim($_POST['website'] ?? '') !== '') {
    seite('Kündigung', '<h1>Danke</h1><p>Deine Erklärung ist eingegangen.</p>');
}

$feld = fn(string $n, int $max = 300) => mb_substr(trim((string)($_POST[$n] ?? '')), 0, $max);

$name    = $feld('name');
$email   = $feld('email', 200);
$anschr  = $feld('anschrift', 500);
$vertrag = $feld('vertrag');
$art     = $feld('art', 40);
$grund   = $feld('grund', 1000);
$termin  = $feld('termin', 60);

$fehlen = [];
if ($name === '')                                        $fehlen[] = 'Name';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))          $fehlen[] = 'E-Mail-Adresse';
if (!in_array($art, ['ordentlich', 'ausserordentlich'], true)) $fehlen[] = 'Art der Kündigung';
if ($art === 'ausserordentlich' && $grund === '')        $fehlen[] = 'Grund der außerordentlichen Kündigung';

if ($fehlen) {
    seite('Angaben unvollständig',
        '<h1>Da fehlt noch etwas</h1><p>Bitte ergänze: <strong>'
        . htmlspecialchars(implode(', ', $fehlen)) . '</strong></p>'
        . '<p><a href="/kuendigung.html">Zurück zum Formular</a></p>', true);
}

if (!darfSenden()) {
    seite('Zu viele Versuche',
        '<h1>Zu viele Versuche</h1><p>Von dieser Verbindung wurden in der letzten '
        . 'Stunde bereits mehrere Kündigungen abgeschickt. Bitte versuche es später '
        . 'noch einmal oder schreib direkt an '
        . '<a href="mailto:' . MAIL_FROM . '">' . MAIL_FROM . '</a>.</p>', true);
}

$zeit = new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin'));
$eingang = $zeit->format('d.m.Y H:i:s') . ' Uhr';
$zeichen = strtoupper(substr(hash('sha256', $email . $zeit->format('c')), 0, 8));

$zeilen = [
    'Eingang'         => $eingang,
    'Vorgangsnummer'  => $zeichen,
    'Name'            => $name,
    'E-Mail'          => $email,
    'Anschrift'       => $anschr !== '' ? $anschr : '(nicht angegeben)',
    'Vertrag'         => $vertrag !== '' ? $vertrag : 'warenentnahme.de Jahresabo',
    'Art'             => $art === 'ordentlich' ? 'Ordentliche Kündigung' : 'Außerordentliche Kündigung',
    'Grund'           => $grund !== '' ? $grund : '(nicht angegeben)',
    'Zum Zeitpunkt'   => $termin !== '' ? $termin : 'zum nächstmöglichen Zeitpunkt',
];

$alsText = '';
foreach ($zeilen as $k => $v) $alsText .= str_pad($k . ':', 18) . $v . "\n";

// 1) An den Betreiber — damit die Kündigung ausgeführt werden kann.
sendMail(MAIL_FROM, 'Kündigung eingegangen — ' . $zeichen,
    "Über das Formular nach § 312k BGB ist eine Kündigung eingegangen.\n\n"
    . $alsText
    . "\nBitte das Abo in Stripe zum genannten Zeitpunkt beenden.\n");

// 2) An die kündigende Person — die gesetzlich verlangte Bestätigung.
sendMail($email, 'Deine Kündigung ist eingegangen',
    "Hallo " . $name . ",\n\n"
    . "deine Kündigung ist bei uns eingegangen. Hier zur Bestätigung, was uns\n"
    . "vorliegt:\n\n"
    . $alsText
    . "\nDeine bisherigen Aufzeichnungen und sämtliche Exporte bleiben auch nach\n"
    . "dem Ende zugänglich — an deine Steuerdokumentation kommst du weiterhin.\n\n"
    . "Bei Rückfragen antworte einfach auf diese Mail.\n\n"
    . "Viele Grüße\nwarenentnahme.de\n");

$tabelle = '';
foreach ($zeilen as $k => $v) {
    $tabelle .= '<dt>' . htmlspecialchars($k) . '</dt><dd>' . nl2br(htmlspecialchars($v)) . '</dd>';
}

seite('Kündigung eingegangen',
    '<h1>Kündigung eingegangen</h1>
     <p>Wir haben deine Erklärung erhalten. Eine Bestätigung ist an
     <strong>' . htmlspecialchars($email) . '</strong> unterwegs.</p>
     <dl>' . $tabelle . '</dl>
     <div class="hinweis">Diese Seite ist dein Nachweis. Du kannst sie ausdrucken
     oder als PDF speichern. Deine bisherigen Aufzeichnungen und Exporte bleiben
     auch nach dem Ende des Abos zugänglich.</div>
     <button class="drucken" onclick="window.print()">Speichern oder ausdrucken</button>');
