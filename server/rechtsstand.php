<?php
/**
 * Der rechtliche Stand an einer einzigen Stelle.
 *
 * Hier stehen die Fassungen von AGB und AVV sowie der genaue Wortlaut der
 * Unternehmerbestätigung. Beides wird bei jeder Bestätigung mit in die
 * Datenbank geschrieben.
 *
 * Warum der Wortlaut hier steht und nicht aus der App kommt:
 * Die App laeuft im Browser des Kunden und laesst sich dort veraendern.
 * Wuerde der Server den Text uebernehmen, den die App mitschickt, koennte
 * im Nachweis alles Moegliche stehen — der Nachweis waere wertlos. Der
 * Server kennt den Text selbst; die App schickt nur, dass angekreuzt wurde.
 *
 * Wird ein Text geaendert, gehoert die Fassungsnummer mit geaendert.
 * Alte Bestaetigungen behalten dann ihre alte Nummer und bleiben
 * zuordenbar — genau darum steht sie in der Datenbank.
 */

// Fassungen. Entsprechen dem „Stand" in agb.html und avv.html.
define('AGB_VERSION', '2026-09');
define('AVV_VERSION', '2026-09');

// Wortlaut bei der Registrierung von Neukunden.
define('B2B_ERKLAERUNG_NEU',
    'Ich bestätige, dass ich die Anwendung ausschließlich als Unternehmer / '
  . 'Gewerbetreibender (§ 14 BGB) für betriebliche Zwecke nutze. Ich '
  . 'akzeptiere die Allgemeinen Geschäftsbedingungen (AGB), die '
  . 'Datenschutzerklärung sowie den Vertrag zur Auftragsverarbeitung (AVV).');

// Wortlaut fuer Bestandskonten, die die Bestaetigung nachholen.
define('B2B_ERKLAERUNG_BESTAND',
    'Ich bestätige, dass ich das Nutzerkonto ausschließlich als Unternehmer '
  . 'im Sinne des § 14 BGB nutze und akzeptiere die AGB sowie den AVV.');

/**
 * Firmenbezeichnung pruefen und aufraeumen.
 *
 * Gibt den bereinigten Namen zurueck oder null, wenn er unbrauchbar ist.
 * Die Kanzlei verlangt ein Pflichtfeld — eine leere oder aus einem einzigen
 * Zeichen bestehende Angabe erfuellt das nicht.
 */
function firma_pruefen($wert): ?string {
    if (!is_string($wert)) return null;
    // Zeilenumbrueche und doppelte Leerzeichen raus: der Name landet
    // spaeter in Mails und Ausdrucken.
    $name = trim(preg_replace('/\s+/u', ' ', $wert));
    if (mb_strlen($name) < 2)   return null;
    if (mb_strlen($name) > 200) return null;
    return $name;
}
