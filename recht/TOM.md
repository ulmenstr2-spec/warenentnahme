# Technische und organisatorische Maßnahmen

**warenentnahme.de · Josef Czerwinski, Ulmenstr. 2, 18057 Rostock**
Stand: September 2026 · Fassung 2026-09

Diese Aufstellung beschreibt die Maßnahmen nach Art. 32 DSGVO. Sie ist
Grundlage der Zusage in § 3 Abs. 3 des Auftragsverarbeitungsvertrags und
wird Kunden sowie deren Steuerberatern und Datenschutzbeauftragten auf
Anfrage herausgegeben.

Sie steht bewusst nicht öffentlich auf der Website: Eine vollständige
Beschreibung der Systemarchitektur hilft auch dem, der nach Lücken sucht.

---

## 1. Überblick über das System

Die Anwendung ist eine Web-Anwendung ohne eigenen Serverraum. Betrieb,
Rechenzentrum und Datenbank liegen bei der **IONOS SE**, Elgendorfer
Str. 57, 56410 Montabaur, Deutschland. Sämtliche Kundendaten werden in
Deutschland gespeichert.

Es gibt drei Stellen, an denen Daten das eigene System verlassen, und
alle drei sind im Auftragsverarbeitungsvertrag als Subunternehmer
benannt: IONOS (Betrieb), Stripe (Zahlung) und Anthropic (freiwillige
Rechnungserkennung).

---

## 2. Vertraulichkeit

### 2.1 Zutrittskontrolle

Der Betreiber unterhält keine eigenen Server. Der physische Schutz der
Anlagen obliegt der IONOS SE; deren Rechenzentren stehen in Deutschland.

Auf den Arbeitsgeräten des Betreibers liegen keine Kundendatenbestände.
Zugriff auf die Verwaltung erfolgt ausschließlich über verschlüsselte
Verbindungen.

### 2.2 Zugangskontrolle

**Kunden** melden sich mit E-Mail-Adresse und einer selbst gewählten PIN
an.

- Die PIN wird **niemals im Klartext gespeichert**, sondern ausschließlich
  als Prüfsumme nach dem bcrypt-Verfahren (`password_hash`,
  `PASSWORD_BCRYPT`). Auch der Betreiber kann sie nicht auslesen.
- Vor der ersten Nutzung muss die E-Mail-Adresse über einen Link
  bestätigt werden. Der Link ist zeitlich begrenzt und einmalig.
- Angemeldete Sitzungen laufen über zufällige Sitzungsschlüssel aus
  256 Bit (`random_bytes(32)`), erzeugt vom kryptografischen
  Zufallsgenerator des Systems. Jeder Schlüssel trägt einen
  Ablaufzeitpunkt und wird serverseitig gegen diesen geprüft.
- Beim Zurücksetzen der PIN wird ein zeitlich befristeter Einmalcode
  verschickt. Ob eine Adresse überhaupt hinterlegt ist, verrät die
  Antwort nicht — sonst ließe sich der Bestand an Kundenadressen
  abfragen.

**Verwaltungszugänge** (IONOS-Konto, Dateiübertragung, Datenbank,
Zahlungsdienst) hat ausschließlich der Betreiber. Es gibt keine
Mitarbeiter und keine weiteren Zugangsberechtigten.

### 2.3 Zugriffskontrolle

- Jede Abfrage von Kundendaten ist an die Kennung des angemeldeten
  Kontos gebunden. Ein Konto kann die Daten eines anderen Kontos
  technisch nicht abrufen.
- Sämtliche Datenbankzugriffe erfolgen über vorbereitete Anweisungen mit
  **abgeschalteter Emulation** (`PDO::ATTR_EMULATE_PREPARES => false`).
  Eingaben werden dadurch getrennt vom Befehl übertragen; das Einschleusen
  von Datenbankbefehlen ist ausgeschlossen.
- Die Auflistung von Verzeichnissen auf dem Webserver ist abgeschaltet
  (`Options -Indexes`).
- Zugangsdaten (Datenbank, Postfach, Zahlungsdienst) liegen in
  Konfigurationsdateien, die weder im Quelltextverwaltungssystem noch im
  Veröffentlichungsvorgang enthalten sind. Der Veröffentlichungsvorgang
  arbeitet mit einer **ausdrücklichen Liste erlaubter Dateien**, nicht mit
  einer Ausschlussliste — was nicht benannt ist, gelangt nicht auf den
  Server.

### 2.4 Trennungskontrolle

Die Aufzeichnungen jedes Kunden liegen unter seiner eigenen Kennung
(`user_data.user_id`). Es gibt keine gemeinsam genutzten Datenbestände
und keine Auswertung über Kunden hinweg.

---

## 3. Integrität

### 3.1 Weitergabekontrolle

- Der Zugriff auf Website und Anwendung erfolgt **ausschließlich
  verschlüsselt**. Unverschlüsselte Aufrufe werden dauerhaft auf die
  verschlüsselte Adresse umgeleitet.
- Die Anwendung darf nur von der eigenen Domain eingebettet werden
  (`Content-Security-Policy: frame-ancestors`).
- **Beim Aufruf von Website und Anwendung entstehen keine Verbindungen zu
  Dritten.** Schriftarten und sämtliche Programmbausteine liegen auf dem
  eigenen Server. Dies wird nicht nur behauptet, sondern **gemessen**:
  Ein Prüfprogramm (`pruefung-extern.mjs`) öffnet jede Seite in einem
  frischen Browserprofil und protokolliert jede ausgehende Verbindung.
- **Zahlungsdaten erreichen den Server zu keinem Zeitpunkt.** Der
  Bezahlvorgang läuft vollständig auf einer von Stripe betriebenen Seite.
  Kartennummern und Bankverbindungen werden weder gespeichert noch
  eingesehen.
- E-Mails werden über einen angemeldeten, verschlüsselten Zugang
  verschickt (SMTP über SSL, Port 465). Die Absenderprüfverfahren SPF,
  DKIM und DMARC sind eingerichtet und wurden gegen mehrere Anbieter
  bestätigt.

### 3.2 Eingabekontrolle

- Die Bestätigung der Unternehmereigenschaft wird mit Zeitpunkt in **UTC**,
  Firmenbezeichnung, vollständigem Wortlaut der Erklärung und den
  Fassungsnummern von AGB und AVV festgehalten.
- Der Wortlaut wird **serverseitig** festgeschrieben und nicht vom
  Endgerät übernommen. Ein verändertes Endgerät kann den Nachweis
  deshalb nicht verfälschen.
- Eine einmal erteilte Bestätigung wird nicht überschrieben.
- Jede Fassung der Vertragstexte wird unverändert archiviert
  (`recht/fassungen/`), damit zu jeder gespeicherten Fassungsnummer der
  zugehörige Wortlaut auffindbar bleibt.
- Kündigungen erhalten eine Vorgangsnummer mit Datum und Uhrzeit; Kunde
  und Betreiber bekommen je eine Bestätigung per E-Mail.

---

## 4. Verfügbarkeit und Belastbarkeit

- **Der Kunde kann seinen gesamten Datenbestand jederzeit selbst
  vollständig ausleiten** — als PDF, CSV, Excel und als vollständige
  Sicherungsdatei. Er ist damit nicht auf die Verfügbarkeit des Dienstes
  angewiesen, um an seine Unterlagen zu kommen.
- Die Anwendung arbeitet auf dem Gerät auch ohne Verbindung weiter; die
  Abgleichung mit dem Server erfolgt, sobald wieder eine Verbindung
  besteht. Ein Serverausfall führt nicht zu Datenverlust auf dem Gerät.
- Nach einer Kündigung bleiben die Aufzeichnungen für zwölf Monate im
  Nur-Lese-Zugriff erhalten, damit steuerliche Aufbewahrungspflichten
  erfüllt werden können.
- Der Betreiber behält sich vor, den Dienst mit einer Vorankündigungsfrist
  von mindestens 90 Tagen einzustellen. Innerhalb dieser Frist ist der
  vollständige Datenexport möglich.

> **Offen — vor Herausgabe dieses Dokuments klären.** Siehe Abschnitt 7.

---

## 5. Verfahren zur regelmäßigen Überprüfung

- **Auftragskontrolle:** Die Verarbeitung erfolgt ausschließlich auf
  Veranlassung des Kunden über die Bedienoberfläche. Es findet keine
  Verarbeitung zu eigenen Zwecken des Betreibers statt.
- **Automatisierte Prüfungen:** Im Quelltextbestand liegen ausführbare
  Prüfungen, die nach jeder Änderung laufen — unter anderem eine Messung
  sämtlicher ausgehender Verbindungen, eine Prüfung der Adressregeln
  gegen einen echten Webserver und ein Durchlauf der Anmeldestrecke in
  einem Browser.
- **Datenschutzfreundliche Voreinstellungen:** Es findet keine
  Nachverfolgung des Nutzungsverhaltens statt. Es werden keine Cookies zu
  Werbezwecken gesetzt und keine Daten zu Werbezwecken an Dritte
  weitergegeben. Die Rechnungserkennung startet ausschließlich, wenn der
  Kunde eine Datei dafür auswählt; alle übrigen Teile der Anwendung
  funktionieren ohne sie.
- **Keine Nutzung zum Training:** Für die Rechnungserkennung ist
  vertraglich zugesichert, dass die übermittelten Inhalte nicht zum
  Training von Modellen verwendet werden.

---

## 6. Subunternehmer

| Unternehmen | Sitz | Aufgabe | Ort der Verarbeitung |
|---|---|---|---|
| IONOS SE | Montabaur, Deutschland | Betrieb, Server, Datenbank | Deutschland |
| Stripe Technology Company Limited | Dublin, Irland | Zahlungsabwicklung | EU, Übermittlung in die USA auf Grundlage der Standardvertragsklauseln |
| Anthropic Ireland, Limited | Irland | Rechnungserkennung (freiwillig) | EU; Verarbeitung durch verbundene Unternehmen außerhalb der EU nicht ausgeschlossen, Standardvertragsklauseln |

---

## 7. Was noch zu klären ist

Die folgenden Punkte lassen sich nicht aus dem Quelltext ableiten. Sie
gehören geprüft und hier eingetragen, **bevor dieses Dokument an einen
Kunden herausgegeben wird.** Lieber eine ehrliche Lücke als eine Zusage,
die im Ernstfall nicht trägt.

- [ ] **Datensicherung.** Welche Sicherung enthält der gebuchte
      IONOS-Tarif? In welchem Abstand wird gesichert, wie lange werden
      die Sicherungen aufbewahrt, und liegen sie getrennt vom
      Produktivsystem? Angaben aus dem IONOS-Kundenkonto übernehmen.
- [ ] **Wiederherstellung erprobt?** Eine Sicherung, die nie zurückgespielt
      wurde, ist eine Vermutung. Einmal an einer Kopie der Datenbank
      durchspielen und das Datum hier vermerken.
- [ ] **Aufbewahrungsdauer der Server-Protokolle.** Wie lange speichert
      IONOS Zugriffsprotokolle mit IP-Adressen? Der Wert gehört auch ins
      Verarbeitungsverzeichnis.
- [ ] **Zwei-Faktor-Anmeldung** für das IONOS-Konto und das
      Stripe-Konto aktiviert? Das sind die beiden Zugänge, über die im
      Ernstfall alles offensteht.
- [ ] **Auftragsverarbeitungsvertrag mit IONOS** im Kundenkonto
      abgeschlossen? Ohne ihn hängt die Kette der Subunternehmer in der
      Luft — IONOS ist in § 4 des eigenen AVV benannt.
- [ ] **Verwahrung der Zugangsdaten.** Wo liegen Datenbank-, Postfach-
      und Zahlungsdienstschlüssel? Ein Passwortspeicher gehört hier
      benannt.
