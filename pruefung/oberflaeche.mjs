// Drei Kleinigkeiten, die jede fuer sich unsichtbar sind und je einen
// eigenen Schaden anrichten.
//
//   1. Aufraeumen der Artikel. Eintraege des Einzelunternehmens speichern
//      den Artikelbezug als articleId, die Aufraeumfunktion suchte nach
//      artId. Damit galt jeder benutzte Artikel als unbenutzt und wurde
//      entfernt — genau die, die in Gebrauch sind.
//
//   2. Das PWA-Manifest. Die App baute eins aus einem Blob und haengte es
//      ein; es verdraengte die manifest.json daneben und hatte
//      "start_url": "/". Eine installierte App oeffnete die Werbeseite.
//
//   3. Die Navigationsleiste. Im CSS stand repeat(6,1fr), obwohl der
//      GmbH-Modus sieben Reiter hat. Das sah nach einem Fehler aus und
//      war keiner — das <nav>-Element setzt die Spalten inline aus
//      TABS.length. Die Messung unten haelt das fest, damit es nicht
//      beim naechsten Mal wieder als Fehler gemeldet wird.
import http from 'http'; import fs from 'fs';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const W=path.dirname(path.dirname(fileURLToPath(import.meta.url)))+'/';
const APP='/tmp/app-oberflaeche.html';
fs.copyFileSync(W+'app.html', APP);
const { execSync } = await import('child_process');
execSync(`node ${W}build.mjs ${APP}`, {stdio:'ignore'});
const REACT=fs.readFileSync(W+'node_modules/react/umd/react.production.min.js');
const REACTDOM=fs.readFileSync(W+'node_modules/react-dom/umd/react-dom.production.min.js');

const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/app/lib/')){
    const f=W+'lib/'+req.url.replace('/app/lib/','').split('?')[0];
    if(!fs.existsSync(f)){res.statusCode=404;return res.end('404');}
    res.setHeader('Content-Type','application/javascript'); return res.end(fs.readFileSync(f));
  }
  if(req.url.startsWith('/app/manifest.json')){
    res.setHeader('Content-Type','application/json');
    return res.end(fs.readFileSync(W+'manifest.json'));
  }
  if(req.url.startsWith('/app/api.php')){res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify({ok:false,error:'offline'}));}
  res.setHeader('Content-Type','text/html'); res.end(fs.readFileSync(APP));
});
await new Promise(r=>server.listen(8114,r));
const b=await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined});
const erg=[]; const p=(n,ok,d='')=>erg.push({n,ok,d});

async function starte(vorbereiten=()=>{}, rechtsform=/^Einzelunternehmen/){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const js=[]; page.on('pageerror',e=>js.push(e.message));
  await page.route('**cdnjs.cloudflare.com/**',r=>{
    const u=r.request().url();
    if(u.includes('/react/'))     return r.fulfill({contentType:'application/javascript',body:REACT});
    if(u.includes('/react-dom/')) return r.fulfill({contentType:'application/javascript',body:REACTDOM});
    return r.fulfill({contentType:'application/javascript',body:''});
  });
  await page.addInitScript(vorbereiten);
  await page.goto('http://localhost:8114/app/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>{const s=document.getElementById('splash');
    return !s||getComputedStyle(s).opacity==='0';},{timeout:15000}).catch(()=>{});
  await page.waitForTimeout(700);
  const k=page.getByRole('button',{name:rechtsform}).first();
  if(await k.count()&&await k.isVisible().catch(()=>false)){await k.click();await page.waitForTimeout(600);}
  const u=page.getByRole('button',{name:/^Überspringen$/}).first();
  if(await u.count()&&await u.isVisible().catch(()=>false)){await u.click();await page.waitForTimeout(500);}
  return {ctx,page,js};
}

// ── 1. Aufraeumen darf benutzte Artikel nicht entfernen
{
  const {ctx,page,js}=await starte(()=>{
    localStorage.setItem('gt_onb_done','1');
    localStorage.setItem('gt_arts',JSON.stringify([
      {id:'benutzt', name:'Wird verwendet', preis:2.50, einheit:'kg', mwst:7, quelle:'CSV'},
      {id:'unbenutzt', name:'Liegt nur herum', preis:1.00, einheit:'kg', mwst:7, quelle:'CSV'},
    ]));
    // So legt die App einen Eintrag an: der Artikelbezug heisst articleId.
    localStorage.setItem('gt_ents',JSON.stringify([{
      id:'e1', articleId:'benutzt', name:'Wird verwendet', einheit:'kg',
      preis:2.50, mwst:7, menge:1, wert:2.50, datum:'2026-09-10', monat:'2026-09',
    }]));
  });
  p('Aufräumen · App startet ohne JS-Fehler',js.length===0,js.join(' | '));

  page.on('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Import'}).first().click();
  await page.waitForTimeout(700);
  const auf=page.getByRole('button',{name:/Aufräumen/}).first();
  p('Aufräumen · Die Schaltfläche ist erreichbar',await auf.count()>0);
  if(await auf.count()){ await auf.click(); await page.waitForTimeout(1200); }

  const uebrig=await page.evaluate(()=>{
    try{ return (JSON.parse(localStorage.getItem('gt_arts')||'[]')||[]).map(a=>a.id); }catch(e){ return ['?']; }
  });
  p('Aufräumen · Der verwendete Artikel bleibt erhalten',uebrig.includes('benutzt'),
    `übrig: ${uebrig.join(', ')||'nichts'} — der Artikel steht in einem Eintrag und wurde trotzdem entfernt`);
  await ctx.close();
}

// ── 2. Das Manifest kommt aus der Datei, nicht aus einem Blob
{
  const {ctx,page,js}=await starte(()=>localStorage.setItem('gt_onb_done','1'));
  const manifest=await page.evaluate(async()=>{
    const l=document.querySelector('link[rel=manifest]');
    if(!l) return {fehlt:true};
    const href=l.getAttribute('href')||'';
    if(href.startsWith('blob:')) return {blob:true,href};
    try{ return {href, inhalt: await (await fetch(l.href)).json()}; }
    catch(e){ return {href, fehler:String(e)}; }
  });
  p('Manifest · Es wird kein Manifest aus einem Blob eingehängt',
    !manifest.blob && !manifest.fehlt,
    manifest.fehlt?'gar kein <link rel=manifest>':'href ist '+manifest.href);
  p('Manifest · start_url zeigt auf /app/',
    manifest.inhalt?.start_url==='/app/',
    'start_url ist '+JSON.stringify(manifest.inhalt?.start_url)+
    ' — eine installierte App öffnet damit die Werbeseite statt der Anwendung');
  p('Manifest · Es hat einen scope',!!manifest.inhalt?.scope,
    'ohne scope verlässt die installierte App beim ersten Link die Anwendung');
  // Jedes genannte Symbol muss es auch geben. Vorher verwies das Manifest
  // auf icon-192.png und icon-512.png — beide gab es nirgends.
  const symbole=manifest.inhalt?.icons||[];
  const fehlende=[];
  for(const s of symbole){
    const r=await page.evaluate(async u=>{
      try{ const x=await fetch(u); return x.status; }catch(e){ return 0; }
    }, new URL(s.src,'http://localhost:8114/app/').href);
    if(r!==200) fehlende.push(`${s.src} → HTTP ${r}`);
  }
  p('Manifest · Jedes genannte Symbol ist auch vorhanden',
    symbole.length>0 && fehlende.length===0,
    symbole.length?fehlende.join(', '):'das Manifest nennt gar kein Symbol');
  await ctx.close();
}

// ── 3. Alle Reiter passen in eine Zeile, in beiden Modi
for(const [modus,name,soll] of [
  [/^Einzelunternehmen/,'Einzelunternehmen',6],
  [/^GmbH/,            'GmbH / UG',        7],
]){
  const {ctx,page}=await starte(()=>{},modus);
  const messung=await page.evaluate(()=>{
    const nav=document.querySelector('.nav');
    if(!nav) return {fehlt:true};
    const k=[...nav.querySelectorAll('button')];
    const zeilen=new Set(k.map(b=>Math.round(b.getBoundingClientRect().top)));
    return {anzahl:k.length, zeilen:zeilen.size,
            unten:Math.max(...k.map(b=>Math.round(b.getBoundingClientRect().bottom))),
            navUnten:Math.round(nav.getBoundingClientRect().bottom)};
  });
  p(`Navigation · ${name}: ${soll} Reiter`,messung.anzahl===soll,
    'gefunden: '+messung.anzahl);
  p(`Navigation · ${name}: alle Reiter stehen in einer Zeile`,messung.zeilen===1,
    `${messung.zeilen} Zeilen — der Rest wird aus der Leiste geschoben`);
  p(`Navigation · ${name}: nichts ragt unten heraus`,
    messung.unten<=messung.navUnten+1,
    `unterste Kante ${messung.unten}px, Leiste endet bei ${messung.navUnten}px`);
  await ctx.close();
}

await b.close(); server.close();
const fehl=erg.filter(e=>!e.ok);
console.log(erg.map(e=>(e.ok?'  ok   ':'FEHLER')+' │ '+e.n+(e.d&&!e.ok?'\n         ← '+e.d:'')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length?1:0);
