# Löschkonzept

**warenentnahme.de · Josef Czerwinski**
Stand: September 2026 · Fassung 2026-09

Personenbezogene Daten werden nur so lange gespeichert, wie es für den
jeweiligen Zweck erforderlich ist oder eine gesetzliche Aufbewahrungspflicht
besteht.

## Der Ablauf nach einer Kündigung

1. **Mit Wirksamwerden der Kündigung** wird das Konto für die Erfassung
   neuer Daten gesperrt. Die bestehenden Aufzeichnungen bleiben lesbar,
   Berichte und Exporte funktionieren weiter.
2. **Zwölf Monate** bleibt dieser Nur-Lese-Zugang bestehen, damit der
   Kunde seine steuerlichen Aufbewahrungspflichten (§ 147 AO, GoBD)
   erfüllen kann. So steht es in § 6 Abs. 1 der AGB.
3. **Nach Ablauf der zwölf Monate** werden Konto und Aufzeichnungen
   gelöscht. Der Kunde wird vor Ablauf per E-Mail erinnert, seine
   Exporte zu sichern.
4. **Verlangt der Kunde vorher die Löschung**, wird sie sofort ausgeführt,
   soweit keine gesetzliche Aufbewahrungspflicht entgegensteht.

## Was trotz Löschverlangen bleibt

Rechnungs- und Buchungsbelege unterliegen einer Aufbewahrungsfrist von
**zehn Jahren** (§ 147 Abs. 3 AO). Sie werden nicht gelöscht; der
Löschanspruch tritt insoweit zurück (Art. 17 Abs. 3 lit. b DSGVO). Sie
werden ausschließlich zu diesem Zweck vorgehalten und für nichts anderes
verwendet.

Ebenfalls aufbewahrt werden der Nachweis der Unternehmereigenschaft und
Kündigungserklärungen — **drei Jahre** ab Ende des Kalenderjahres, in dem
der Vertrag endete. Grund ist die regelmäßige Verjährungsfrist der
§§ 195, 199 BGB: Vor deren Ablauf muss belegbar bleiben, was wann
vereinbart und erklärt wurde.

## Die einzelnen Fristen

| Was | Frist | Grund |
|---|---|---|
| Kundenkonto und Aufzeichnungen | 12 Monate nach Kündigung | AGB § 6 Abs. 1 |
| Rechnungen und Buchungsbelege | 10 Jahre | § 147 Abs. 3 AO |
| Nachweis der Unternehmereigenschaft | 3 Jahre nach Vertragsende | §§ 195, 199 BGB |
| Kündigungserklärungen | 3 Jahre | §§ 195, 199 BGB |
| E-Mails der Kundenbetreuung | 12 Monate, bei rechtlicher Bedeutung 3 Jahre | Bearbeitung, Beweissicherung |
| Fassungen von AGB und AVV | dauerhaft im Archiv | Zuordnung zu gespeicherten Fassungsnummern |
| Server-Protokolle | ⚠️ noch einzutragen | Betriebssicherheit |
| Hochgeladene Belege für die Rechnungserkennung | keine dauerhafte Speicherung | nur für die Dauer der Erkennung |
| Daten auf dem Gerät des Kunden | vom Kunden selbst zu löschen | liegen nicht beim Betreiber |

## Wie gelöscht wird

Die Löschung erfolgt durch Entfernen der Datensätze aus der Datenbank.
Sicherungskopien, die den Datensatz noch enthalten, werden nicht
gesondert bereinigt — sie werden turnusmäßig überschrieben. Bis dahin
werden sie nicht für andere Zwecke ausgewertet.

## Zuständigkeit und Nachweis

Zuständig ist der Betreiber persönlich; es gibt keine weiteren
Zugangsberechtigten. Löschungen auf Verlangen eines Betroffenen werden
mit Datum und Umfang schriftlich festgehalten, um die Erfüllung nachweisen
zu können (Art. 5 Abs. 2 DSGVO).

## Was noch fehlt

- [ ] **Der Ablauf nach Nummer 3 ist bisher nicht eingerichtet.** Die
      Sperre nach Kündigung wirkt, die Löschung nach zwölf Monaten müsste
      derzeit von Hand erfolgen — und niemand erinnert daran. Entweder
      einen Kalendereintrag anlegen oder es später technisch lösen.
      **Solange das offen ist, beschreibt dieses Konzept eine Absicht,
      keine Automatik.**
- [ ] Aufbewahrungsdauer der Server-Protokolle bei IONOS erfragen und in
      die Tabelle eintragen.
