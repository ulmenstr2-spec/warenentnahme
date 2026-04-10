# Warenentnahme App – Installationsanleitung

## Inhalt des Pakets

| Datei | Beschreibung |
|-------|-------------|
| index.html | Die App (läuft komplett im Browser) |
| api-proxy.php | KI-Proxy für Rechnungsscan (Claude Vision) |
| bnn-index.php | Listet BNN-Dateien auf dem Server |
| upload-bnn.php | Passwortgeschütztes BNN-Upload-Interface |
| .htaccess | Sicherheitseinstellungen |
| bnn/ | Ordner für BNN-Preislisten |

---

## Installation (5 Minuten)

### Schritt 1 – Ordner anlegen bei IONOS
Im Webspace Explorer unter `/public/` einen neuen Ordner `app` anlegen.

### Schritt 2 – Alle Dateien hochladen
Den gesamten Inhalt des ZIP-Archivs in `/public/app/` hochladen.
(Also: index.html, api-proxy.php, bnn-index.php, upload-bnn.php, .htaccess und den bnn/ Ordner)

### Schritt 3 – API-Key eintragen
Die Datei `api-proxy.php` öffnen und den Anthropic API-Key eintragen:

```php
define('ANTHROPIC_API_KEY', 'sk-ant-DEIN-KEY-HIER');
```

Den API-Key bekommst du auf: https://console.anthropic.com/

### Schritt 4 – Passwort ändern (wichtig!)
In `upload-bnn.php` das Standard-Passwort ändern:

```php
define('UPLOAD_PASSWORD', 'dein-sicheres-passwort');
```

### Schritt 5 – Fertig!
Die App ist jetzt erreichbar unter: **https://www.warenentnahme.de/app/**

---

## BNN-Dateien importieren

**Desktop:** Direkt in der App hochladen (Drag & Drop)

**Einmalig auf den Server laden (empfohlen):**
1. https://www.warenentnahme.de/app/upload-bnn.php aufrufen
2. Passwort eingeben
3. BNN-Dateien von Terra Naturkost hochladen
4. In der App auf "BNN vom Server laden" klicken

**iPhone/iPad:**
1. BNN-Datei aus der Terra-E-Mail in die Files-App speichern
2. In der App auf "BNN-Datei auswählen" tippen
3. In der Files-App die Datei auswählen

---

## Rechnungsscan (KI)

Der Rechnungsscan erfordert einen Anthropic API-Key (claude.ai Account).
Kosten: ca. 0,01–0,03 € pro Scan.

Ohne API-Key kann die App trotzdem vollständig genutzt werden –
nur der Rechnungsscan ist dann nicht verfügbar.

---

## Ordnerstruktur auf dem Server

```
/public/app/
├── index.html          ← Die App
├── api-proxy.php       ← KI-Proxy (API-Key hier eintragen!)
├── bnn-index.php       ← BNN-Dateiliste
├── upload-bnn.php      ← BNN-Upload (Passwort hier ändern!)
├── .htaccess           ← Sicherheit
└── bnn/                ← BNN-Dateien hier ablegen
    ├── terra_2026_01.bnn
    └── terra_2026_02.bnn
```

---

## Sicherheitshinweise

- `api-proxy.php` enthält den API-Key – niemals den Quellcode öffentlich teilen
- Das Upload-Passwort in `upload-bnn.php` unbedingt ändern
- Der `bnn/` Ordner ist durch `.htaccess` vor direktem Listing geschützt

---

*warenentnahme.de – Stand Februar 2026*
