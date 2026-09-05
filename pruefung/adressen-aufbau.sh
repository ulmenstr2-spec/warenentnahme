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
W=/home/user/warenentnahme
B=/var/www/wetest

sudo mkdir -p /var/www/wetest && sudo chmod 755 /var/www/wetest && sudo chown 0:0 /var/www/wetest
rm -rf "$B/dist"; mkdir -p "$B/dist/root" "$B/dist/app"

# Genau die Schritte aus .github/workflows/deploy.yml
cp "$W/landing.html"  "$B/dist/root/index.html"
cp "$W/htaccess.txt"  "$B/dist/root/.htaccess"
cp "$W/impressum.html" "$W/datenschutz.html" "$W/pauschbetraege.html" "$W/fuer-steuerberater.html" "$B/dist/root/"
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

sudo a2enmod rewrite ssl headers >/dev/null 2>&1 || true
sudo rm -f /etc/apache2/sites-enabled/*
sudo cp "$B/vhost.conf" /etc/apache2/sites-available/test.conf
sudo a2ensite test >/dev/null 2>&1
sudo sed -i 's/^Listen 80$/Listen 8080/' /etc/apache2/ports.conf
sudo apache2ctl configtest
sudo apache2ctl restart 2>/dev/null || sudo apache2ctl start
sleep 1
echo "Apache laeuft auf https://localhost:8443"
