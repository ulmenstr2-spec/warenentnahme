#!/bin/bash
# Prueft die .htaccess-Regeln gegen einen echten Apache.
U=https://localhost:8443
fehler=0

# $1 Pfad  $2 erwarteter Code  $3 erwartetes Ziel (leer = keine Weiterleitung)
p(){
  antwort=$(curl -sk -o /dev/null -w '%{http_code} %{redirect_url}' "$U$1")
  code=${antwort%% *}; ziel=${antwort#* }
  ziel=${ziel#https://localhost:8443}
  soll_ziel="$3"
  if [ "$code" = "$2" ] && [ "$ziel" = "$soll_ziel" ]; then
    printf '  ok   │ %-28s %s %s\n' "$1" "$code" "$ziel"
  else
    printf 'FEHLER │ %-28s bekam %s %s — erwartet %s %s\n' "$1" "$code" "$ziel" "$2" "$soll_ziel"
    fehler=$((fehler+1))
  fi
}

echo "── Alte Adressen leiten dauerhaft weiter"
p /impressum.html          301 /impressum
p /agb.html                301 /agb
p /avv.html                301 /avv
p /datenschutz.html        301 /datenschutz
p /kuendigung.html         301 /kuendigung
p /pauschbetraege.html     301 /pauschbetraege
p /fuer-steuerberater.html 301 /fuer-steuerberater
p /index.html              301 /

echo
echo "── Neue Adressen liefern die Seite"
for s in / /impressum /agb /avv /datenschutz /kuendigung /pauschbetraege /fuer-steuerberater; do
  p "$s" 200 ""
done

echo
echo "── Die App bleibt unberuehrt (Zwischenspeicher)"
p /app/            200 ""
p /app/index.html  200 ""
p /app/sw.js       200 ""
p /app/lib/react-18.2.0.min.js 200 ""

echo
echo "── Uebriges Beiwerk"
p /schriften.css   200 ""
p /robots.txt      200 ""
p /sitemap.xml     200 ""
p /gibtesnicht     404 ""
p /gibtesnicht.html 301 /gibtesnicht

echo
echo "── Kein Kreisverkehr (max. 5 Spruenge)"
for s in /impressum.html /index.html /agb.html; do
  aus=$(curl -skL --max-redirs 5 -o /dev/null -w '%{http_code} %{num_redirects} %{url_effective}' "$U$s")
  code=$(echo "$aus" | cut -d' ' -f1); n=$(echo "$aus" | cut -d' ' -f2)
  ende=$(echo "$aus" | cut -d' ' -f3 | sed "s|https://localhost:8443||")
  if [ "$code" = "200" ] && [ "$n" -le 1 ]; then
    printf '  ok   │ %-28s %s Sprung → %s\n' "$s" "$n" "$ende"
  else
    printf 'FEHLER │ %-28s %s nach %s Spruengen → %s\n' "$s" "$code" "$n" "$ende"
    fehler=$((fehler+1))
  fi
done

echo
echo "── Inhalt stimmt (nicht nur der Rueckgabecode)"
for paar in "/impressum:Impressum" "/agb:Allgemeine Geschäftsbedingungen" \
            "/avv:Auftragsverarbeitung" "/datenschutz:Datenschutzerklärung" \
            "/kuendigung:Vertrag" "/pauschbetraege:Pauschbeträge"; do
  pfad=${paar%%:*}; wort=${paar#*:}
  if curl -sk "$U$pfad" | grep -q "$wort"; then
    printf '  ok   │ %-28s enthaelt „%s"\n' "$pfad" "$wort"
  else
    printf 'FEHLER │ %-28s ohne „%s"\n' "$pfad" "$wort"
    fehler=$((fehler+1))
  fi
done

echo
if [ $fehler -eq 0 ]; then echo "Alle Pruefungen bestanden."; else echo "$fehler Pruefungen fehlgeschlagen."; fi
exit $fehler
