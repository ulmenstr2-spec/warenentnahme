#!/bin/bash
# Baut die Deploy-Struktur nach und startet Apache mit der echten .htaccess.
#
# Braucht Apache mit mod_rewrite und mod_ssl:
#   sudo apt-get install -y apache2
# Danach:  pruefung/adressen-aufbau.sh && pruefung/adressen-pruefe.sh
# Der Testserver muss unter /var/www liegen — auf ein Verzeichnis, das
# Apache (Benutzer www-data) nicht betreten darf, antwortet er mit 403,
# und das sieht wie ein Fehler in den Regeln aus.
set -e
# Das Projektverzeichnis aus dem Ort dieses Skripts ableiten, nicht fest
# hinschreiben. Mit einem festen Pfad lief die Pruefung nur auf dem einen
# Rechner, auf dem sie geschrieben wurde — in GitHub Actions liegt das
# Repository woanders.
W="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
B=/var/www/wetest

# Das Verzeichnis gehoert dem, der die Pruefung startet — nicht root.
# Mit chown 0:0 konnte die naechste Zeile dort nichts anlegen, sobald
# das Skript nicht als root lief. Auf diesem Rechner faellt das nicht
# auf, in GitHub Actions laeuft es als "runner". 755 bleibt, damit
# Apache (www-data) weiterhin hineinschauen darf — auf ein
# Verzeichnis, das er nicht betreten kann, antwortet er mit 403.
sudo mkdir -p /var/www/wetest
sudo chown "$(id -u):$(id -g)" /var/www/wetest
sudo chmod 755 /var/www/wetest
rm -rf "$B/dist"; mkdir -p "$B/dist/root" "$B/dist/app"

# Genau die Schritte aus .github/workflows/deploy.yml
cp "$W/landing.html"  "$B/dist/root/index.html"
cp "$W/htaccess.txt"  "$B/dist/root/.htaccess"
cp "$W/impressum.html" "$W/datenschutz.html" "$W/pauschbetraege.html" "$W/fuer-steuerberater.html" "$W/eigenverbrauch-buchen.html" "$B/dist/root/"
cp "$W/kuendigung.html" "$W/agb.html" "$W/avv.html" "$B/dist/root/"
cp "$W/schriften.css" "$B/dist/root/"
cp -r "$W/fonts" "$B/dist/root/fonts"
cp "$W/robots.txt" "$W/sitemap.xml" "$B/dist/root/"
cp "$W"/*.png "$W/josef.jpg" "$B/dist/root/" 2>/dev/null || true

sed -e "s/__BUILD_ID__/testtesttest/g" -e "s/__BUILD_DATE__/01.01.2026 00:00/g" \
    "$W/app.html" > "$B/dist/app/index.html"
node "$W/build.mjs" "$B/dist/app/index.html" >/dev/null
cp "$W/manifest.json" "$B/dist/app/manifest.json"
cp "$W/splash-logo.png" "$B/dist/app/splash-logo.png"
cp -r "$W/lib" "$B/dist/app/lib"
sed "s/__BUILD_ID__/testtesttest/g" "$W/sw.js" > "$B/dist/app/sw.js"

# Die App liegt auf dem Server unter /public/app/ — hier also in root/app.
mv "$B/dist/app" "$B/dist/root/app"

cat > "$B/vhost.conf" <<CONF
Listen 8443
<VirtualHost *:8443>
  ServerName www.warenentnahme.de
  DocumentRoot $B/dist/root
  SSLEngine on
  SSLCertificateFile    /etc/ssl/certs/ssl-cert-snakeoil.pem
  SSLCertificateKeyFile /etc/ssl/private/ssl-cert-snakeoil.key
  <Directory $B/dist/root>
    AllowOverride All
    Require all granted
  </Directory>
  ErrorLog $B/error.log
  CustomLog $B/access.log combined
</VirtualHost>
CONF

# Die drei Befehle hier haben ihre Fehler frueher verschluckt
# (>/dev/null 2>&1 || true). Faellt a2enmod aus, kennt Apache SSLEngine
# nicht, configtest bricht ab — und im Protokoll stand nur "exit 1".
# In GitHub Actions ist das Protokoll das einzige, was man hat.
sudo a2enmod rewrite ssl headers
sudo rm -f /etc/apache2/sites-enabled/*
sudo cp "$B/vhost.conf" /etc/apache2/sites-available/test.conf
sudo a2ensite test
sudo sed -i 's/^Listen 80$/Listen 8080/' /etc/apache2/ports.conf

# Das Testzertifikat kommt aus dem Paket ssl-cert, das apache2 nur
# empfiehlt und nicht zwingend mitbringt. Ohne die Datei scheitert
# configtest an SSLCertificateFile.
if [ ! -s /etc/ssl/certs/ssl-cert-snakeoil.pem ]; then
  echo "Testzertifikat fehlt — wird erzeugt."
  sudo apt-get install -y ssl-cert
  sudo make-ssl-cert generate-default-snakeoil --force-overwrite
fi

diagnose() {
  echo "────────── Apache liess sich nicht starten ──────────"
  echo "— configtest —";      sudo apache2ctl configtest 2>&1 | sed 's/^/   /'
  echo "— geladene Module —"; sudo apache2ctl -M 2>&1 | grep -E 'rewrite|ssl|headers' | sed 's/^/   /'
  echo "— belegte Ports —";   (sudo ss -lntp 2>/dev/null || sudo netstat -lntp 2>/dev/null) | sed 's/^/   /'
  echo "— Fehlerprotokoll —"; sudo tail -30 "$B/error.log" 2>/dev/null | sed 's/^/   /'
  echo "— Apache-Protokoll —";sudo tail -12 /var/log/apache2/error.log 2>/dev/null | sed 's/^/   /'
  echo "─────────────────────────────────────────────────────"
}
trap diagnose ERR

sudo apache2ctl configtest
sudo apache2ctl restart || sudo apache2ctl start
sleep 1

# Belegen, dass er wirklich antwortet. Ein gestarteter Apache, der auf
# 8443 nicht horcht, haette die Linkpruefung sonst erst viel spaeter und
# viel unverstaendlicher scheitern lassen.
if ! curl -ksS -o /dev/null -w '%{http_code}' https://localhost:8443/ | grep -q '^[23]'; then
  echo "Apache antwortet auf https://localhost:8443/ nicht."
  diagnose
  exit 1
fi
trap - ERR
echo "Apache laeuft auf https://localhost:8443"
