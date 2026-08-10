// Build-Schritt für den Deploy: kompiliert das text/babel-Script in der
// HTML-Datei zu normalem JavaScript und entfernt die Babel-CDN-Einbindung.
// Das Repo bleibt unverändert — nur die Deploy-Kopie wird umgebaut.
// Aufruf: node build.mjs <html-datei>
import { readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const file = process.argv[2];
if (!file) { console.error('Aufruf: node build.mjs <html-datei>'); process.exit(1); }

let html = readFileSync(file, 'utf8');

const open = '<script type="text/babel">';
const start = html.indexOf(open);
if (start === -1) { console.error('Kein text/babel-Script gefunden'); process.exit(1); }
const end = html.indexOf('</script>', start);
const src = html.slice(start + open.length, end);

// JSX → JS. target es2017 deckt auch ältere iOS/Android-Browser ab.
// Namen bleiben erhalten (kein Identifier-Mangling) — nur Whitespace/Syntax kompaktiert.
const out = transformSync(src, {
  loader: 'jsx',
  target: 'es2017',
  minifyWhitespace: true,
  minifySyntax: true,
});

// Sicherheit: ein "</script" im kompilierten Code (z. B. in einem String)
// würde das HTML-Parsing abbrechen — escapen.
const code = out.code.replace(/<\/script/gi, '<\\/script');

html = html.slice(0, start) + '<script>' + code + '</script>' + html.slice(end + '</script>'.length);

// Babel-Standalone wird nicht mehr gebraucht
const before = html.length;
html = html.replace(/<script src="[^"]*babel[^"]*"><\/script>\s*/i, '');
if (html.length === before) console.warn('Warnung: Babel-CDN-Tag nicht gefunden/entfernt');

writeFileSync(file, html);
console.log(`Build OK: ${(src.length / 1024).toFixed(0)} KB JSX -> ${(code.length / 1024).toFixed(0)} KB JS`);
