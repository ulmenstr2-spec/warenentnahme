# Verzeichnis von Verarbeitungstätigkeiten

**warenentnahme.de · Josef Czerwinski, Ulmenstr. 2, 18057 Rostock**
**hallo@warenentnahme.de · Telefon +49 176 75192451**
Stand: September 2026 · Fassung 2026-09

Nach Art. 30 DSGVO. Ein Datenschutzbeauftragter ist nicht bestellt; die
Voraussetzungen des § 38 BDSG liegen nicht vor (keine Beschäftigten).

**Warum dieses Verzeichnis geführt wird:** Die Ausnahme des Art. 30
Abs. 5 DSGVO für Betriebe unter 250 Beschäftigten greift nicht. Sie gilt
nur bei *gelegentlicher* Verarbeitung — hier ist die Datenverarbeitung
das Geschäft selbst, sie läuft dauerhaft, und es sind Daten Dritter
betroffen (etwa Namen von Beschäftigten der Kunden bei Personalessen).

Das Verzeichnis hat **zwei Teile**, weil derselbe Betrieb in zwei Rollen
auftritt: als Verantwortlicher für die eigenen Abläufe (Teil A) und als
Auftragsverarbeiter für die Kunden (Teil B, Art. 30 Abs. 2).

---

# Teil A — als Verantwortlicher (Art. 30 Abs. 1)

## A1 Benutzerkonten und Anmeldung

| | |
|---|---|
| **Zweck** | Bereitstellung eines geschützten Zugangs, Zuordnung der Aufzeichnungen zum Kunden, Abgleich zwischen Geräten |
| **Betroffene** | Kunden (Unternehmer) |
| **Daten** | E-Mail-Adresse, Firmenbezeichnung, Prüfsumme der PIN, Sitzungsschlüssel mit Ablauf, Zeitpunkt der letzten Abgleichung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Empfänger** | IONOS SE (Betrieb) |
| **Drittland** | nein |
| **Löschung** | mit Löschung des Kontos; im Übrigen siehe Löschkonzept |

## A2 Nachweis der Unternehmereigenschaft

| | |
|---|---|
| **Zweck** | Beleg, dass der Vertrag mit einem Unternehmer nach § 14 BGB geschlossen wurde, und welche Fassung von AGB und AVV dabei galt |
| **Betroffene** | Kunden |
| **Daten** | Firmenbezeichnung, Zeitpunkt in UTC, Wortlaut der Erklärung, Fassungsnummern von AGB und AVV, Kundenkennung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. c DSGVO i. V. m. der Nachweisobliegenheit; Art. 6 Abs. 1 lit. f DSGVO (Beweissicherung) |
| **Empfänger** | IONOS SE |
| **Drittland** | nein |
| **Löschung** | drei Jahre nach Ende des Kalenderjahres, in dem der Vertrag endete (§§ 195, 199 BGB) |

## A3 Abo- und Zahlungsabwicklung

| | |
|---|---|
| **Zweck** | Abschluss und Verwaltung des kostenpflichtigen Abonnements, Einzug der Vergütung, Freischaltung und Sperrung |
| **Betroffene** | Kunden |
| **Daten** | E-Mail-Adresse, Name und Rechnungsanschrift (vom Kunden bei Stripe selbst eingetragen), Kunden- und Abonnementkennung, Status, Beginn und Ende der Abrechnungszeiträume, Kündigungsvermerk. **Zahlungsmitteldaten werden nicht verarbeitet** — sie erreichen den Server zu keinem Zeitpunkt. |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO; für die sichere Abwicklung zusätzlich Art. 6 Abs. 1 lit. f DSGVO |
| **Empfänger** | Stripe Technology Company Limited, Dublin |
| **Drittland** | Übermittlung an verbundene Unternehmen in den USA möglich; Grundlage sind die Standardvertragsklauseln der EU-Kommission |
| **Löschung** | Abonnementdaten mit Kontolöschung; Zahlungsbelege zehn Jahre (§ 147 AO) |

## A4 Rechnungsstellung und Buchhaltung

| | |
|---|---|
| **Zweck** | Erfüllung der steuerlichen Aufzeichnungs- und Aufbewahrungspflichten des eigenen Betriebs |
| **Betroffene** | Kunden |
| **Daten** | Name beziehungsweise Firma, Anschrift, Rechnungsbetrag, Datum, Rechnungsnummer, Zahlungsstatus |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. c DSGVO i. V. m. §§ 140 ff., 147 AO |
| **Empfänger** | Stripe (Belegerstellung), Steuerberater und Finanzverwaltung im gesetzlichen Rahmen |
| **Drittland** | wie A3 |
| **Löschung** | **zehn Jahre** ab Ende des Kalenderjahres der Rechnungsstellung (§ 147 Abs. 3 AO). Ein Löschverlangen steht dem nicht entgegen (Art. 17 Abs. 3 lit. b DSGVO). |

## A5 E-Mail-Kundenbetreuung

| | |
|---|---|
| **Zweck** | Beantwortung von Anfragen, Fehlermeldungen, Rückfragen zu Rechnungen |
| **Betroffene** | Kunden, Interessenten |
| **Daten** | E-Mail-Adresse, Name, Inhalt der Nachricht samt Anhängen |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO bei Vertragsbezug, sonst Art. 6 Abs. 1 lit. f DSGVO |
| **Empfänger** | IONOS SE (Postfachbetrieb) |
| **Drittland** | nein |
| **Löschung** | zwölf Monate nach Abschluss des Vorgangs; bei rechtlich bedeutsamen Vorgängen drei Jahre ab Ende des Kalenderjahres |

## A6 Kündigungen über die Schaltfläche nach § 312k BGB

| | |
|---|---|
| **Zweck** | Entgegennahme, Bestätigung und Ausführung von Kündigungserklärungen |
| **Betroffene** | Kunden |
| **Daten** | Name, E-Mail-Adresse, freiwillig Anschrift, Vertragsbezeichnung, Art der Kündigung, freiwillig Begründung, Zeitpunkt, Vorgangsnummer |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO; Art. 6 Abs. 1 lit. c DSGVO für die Bestätigung in Textform |
| **Empfänger** | IONOS SE |
| **Drittland** | nein |
| **Löschung** | drei Jahre ab Ende des Kalenderjahres der Kündigung |

## A7 Server-Protokolle

| | |
|---|---|
| **Zweck** | Betriebssicherheit, Fehlersuche, Abwehr von Angriffen |
| **Betroffene** | alle Besucher der Website und der Anwendung |
| **Daten** | IP-Adresse, Zeitpunkt, abgerufene Adresse, Rückgabecode, übertragene Menge, Browserkennung, verweisende Seite |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO (sicherer Betrieb) |
| **Empfänger** | IONOS SE |
| **Drittland** | nein |
| **Löschung** | ⚠️ **noch einzutragen** — Aufbewahrungsdauer bei IONOS erfragen (siehe TOM, Abschnitt 7) |

## A8 Lokale Speicherung auf dem Gerät

| | |
|---|---|
| **Zweck** | Nutzung der Anwendung ohne bestehende Verbindung, Zwischenspeicherung der Eingaben |
| **Betroffene** | Kunden |
| **Daten** | die vom Kunden erfassten Aufzeichnungen, Anmeldekennung, Einstellungen |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO; technisch erforderlich im Sinne des § 25 Abs. 2 Nr. 2 TDDDG, daher einwilligungsfrei |
| **Empfänger** | keine — die Daten verlassen das Gerät nicht |
| **Drittland** | nein |
| **Löschung** | durch den Kunden selbst (Abmelden, Browserdaten löschen) |

---

# Teil B — als Auftragsverarbeiter (Art. 30 Abs. 2)

Verantwortlicher ist jeweils der Kunde. Grundlage ist der beim Vertragsschluss
mitgeschlossene Auftragsverarbeitungsvertrag (`avv.html`, Fassung 2026-09).

## B1 Speicherung und Aufbereitung der Aufzeichnungen

| | |
|---|---|
| **Kategorien der Verarbeitung** | Speichern, Auswerten, Bereitstellen von Monats- und Jahresberichten sowie Exporten |
| **Betroffene** | Beschäftigte des Kunden (bei Personalessen und Sachbezügen), Lieferanten, Geschäftspartner |
| **Daten** | Namen, Beträge, Datumsangaben, Warenbezeichnungen, Aufzeichnungen über Entnahmen und Mahlzeiten |
| **Empfänger** | IONOS SE |
| **Drittland** | nein |
| **Löschung** | nach Weisung des Kunden; im Übrigen siehe Löschkonzept |

## B2 Rechnungserkennung mit KI (freiwillig)

| | |
|---|---|
| **Kategorien der Verarbeitung** | Auslesen von Artikeln, Mengen und Preisen aus einer vom Kunden hochgeladenen Lieferantenrechnung oder einem Lieferschein |
| **Betroffene** | Lieferanten und deren Beschäftigte, soweit auf dem Beleg genannt |
| **Daten** | sämtliche Angaben des übermittelten Dokuments — neben Artikeln und Preisen auch Name und Anschrift des Lieferanten |
| **Empfänger** | Anthropic Ireland, Limited |
| **Drittland** | Verarbeitung durch verbundene Unternehmen außerhalb der EU nicht ausgeschlossen; Grundlage sind die Standardvertragsklauseln. Vertraglich zugesichert ist, dass die Inhalte **nicht zum Training von Modellen** verwendet werden. |
| **Löschung** | Der Betreiber speichert die hochgeladenen Dateien nicht dauerhaft; sie werden nur für die Dauer der Erkennung verarbeitet. |
| **Besonderheit** | Die Funktion startet ausschließlich, wenn der Kunde eine Datei dafür auswählt. Alle übrigen Teile der Anwendung funktionieren ohne sie. |

---

## Technische und organisatorische Maßnahmen

Für alle vorstehenden Tätigkeiten gelten die Maßnahmen nach Art. 32 DSGVO,
beschrieben in `TOM.md` (Fassung 2026-09).
