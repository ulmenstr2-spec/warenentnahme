# Rechtliche Unterlagen

**Nichts in diesem Ordner gelangt auf den Server.** Der
Veröffentlichungsvorgang (`.github/workflows/deploy.yml`) kopiert
ausschließlich ausdrücklich benannte Dateien — was hier liegt, ist nicht
benannt und bleibt damit intern.

Das ist auch so gewollt: Die Maßnahmenbeschreibung gehört nicht ins
offene Netz, und das Archiv der Fassungen ist Aktenmaterial, keine
Website.

## Was hier liegt

| Datei | Wofür | Wer bekommt sie zu sehen |
|---|---|---|
| `TOM.md` | Technische und organisatorische Maßnahmen (Art. 32 DSGVO) | Kunden, deren Steuerberater und Datenschutzbeauftragte — **auf Anfrage**, nicht öffentlich |
| `VERZEICHNIS.md` | Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) | die Aufsichtsbehörde auf Verlangen |
| `LOESCHKONZEPT.md` | Welche Daten wann verschwinden | intern; Auszüge auf Anfrage |
| `DATENPANNE.md` | Ablaufplan für den Ernstfall, 72-Stunden-Frist | intern — **im Ernstfall braucht man das in Minuten, nicht in Stunden** |
| `fassungen/` | Unveränderte Kopien der Vertragstexte je Fassung | Beweismittel |

## Warum das Archiv der Fassungen wichtig ist

Bei jedem Kunden steht in der Datenbank, welche Fassung von AGB und AVV
bei seiner Anmeldung galt — etwa `agb_version = 2026-09`.

Werden die Texte später geändert, zeigt diese Nummer ins Leere: Auf der
Website steht dann etwas anderes. Genau dann braucht man den Wortlaut von
damals — und zwar nicht aus der Versionsverwaltung herausgesucht, während
ein Anwaltsschreiben auf dem Tisch liegt, sondern als Datei, die man
öffnen und ausdrucken kann.

**Regel: Wer einen Vertragstext ändert, macht drei Dinge.**

1. Fassungsnummer in der Seite selbst hochzählen (die Zeile „Fassung …")
2. Dieselbe Nummer in `server/rechtsstand.php` eintragen
3. Eine unveränderte Kopie hier ablegen: `fassungen/<Nummer>-<name>.html`

Aufbewahrung: mindestens drei Jahre nach Ende des Kalenderjahres, in dem
der letzte Vertrag unter dieser Fassung endete (§§ 195, 199 BGB).
Textdateien kosten nichts — im Zweifel behalten.

## Bisherige Fassungen

| Fassung | Datei | Was sich geändert hat |
|---|---|---|
| 2026-09 | `2026-09-agb.html` | erste Fassung |
| 2026-09 | `2026-09-avv.html` | erste Fassung |
| 2026-09b | `2026-09b-avv.html` | § 3 Abs. 3 verweist auf die dokumentierten TOMs und sagt ihre Herausgabe auf Verlangen zu |
| 2026-09 | `2026-09-datenschutz.html` | Stand nach Aufnahme von Stripe, KI-Erkennung, lokalen Schriftarten und Programmbausteinen |

Die Datenschutzerklärung trägt keine Fassungsnummer in der Datenbank —
ihr wird nicht zugestimmt, sie informiert nur. Eine Kopie liegt trotzdem
hier, weil man auch dafür belegen können will, was wann darin stand.

## Noch offen

In `TOM.md` (Abschnitt 7) und `LOESCHKONZEPT.md` stehen Punkte, die sich
nicht aus dem Quelltext ableiten lassen — Datensicherung, Protokolldauer,
Zwei-Faktor-Anmeldung, der AVV mit IONOS.

**Diese Punkte gehören geklärt, bevor die Maßnahmenbeschreibung an einen
Kunden herausgeht.** Eine ehrliche Lücke ist besser als eine Zusage, die
im Ernstfall nicht trägt — aber eine geschlossene Lücke ist besser als
beides.
