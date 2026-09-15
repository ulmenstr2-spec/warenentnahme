// Prueft, dass die App warnt, wenn das laufende Jahr nicht mehr das Jahr
// der hinterlegten BMF-Werte ist.
//
// Sachbezugswerte, Pauschbetraege und der Freibetrag nach § 8 Abs. 3 EStG
// stehen als feste Zahlen im Code. Das BMF setzt sie jaehrlich neu fest.
// Ohne Hinweis rechnet die App am 1. Januar stillschweigend mit den Werten
// des Vorjahres weiter — und schreibt die alte Jahreszahl auch noch auf
// den Beleg.
//
// Die Uhr des Browsers wird dafuer vorgestellt. Ein Test, der auf den
// Jahreswechsel wartet, ist kein Test.
import http from 'http'; import fs from 'fs';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const W=path.dirname(path.dirname(fileURLToPath(import.meta.url)))+'/';
const APP='/tmp/app-jahr.html';
fs.copyFileSync(W+'app.html', APP);
const { execSync } = await import('child_process');
execSync(`node ${W}build.mjs ${APP}`, {stdio:'ignore'});
const REACT=fs.readFileSync(W+'node_modules/react/umd/react.production.min.js');
const REACTDOM=fs.readFileSync(W+'node_modules/react-dom/umd/react-dom.production.min.js');

// Das Jahr, fuer das die Werte im Code hinterlegt sind.
const src=fs.readFileSync(W+'app.html','utf8');
const treffer=src.match(/const WERTE_JAHR\s*=\s*(\d{4})/);
if(!treffer) throw new Error('WERTE_JAHR nicht in app.html gefunden — heisst die Konstante noch so?');
const werteJahr=parseInt(treffer[1]);
const spaeter=`${werteJahr+1}-03-10T09:00:00`;

const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/app/lib/')){
    const f=W+'lib/'+req.url.replace('/app/lib/','').split('?')[0];
    if(!fs.existsSync(f)){res.statusCode=404;return res.end('404');}
    res.setHeader('Content-Type','application/javascript'); return res.end(fs.readFileSync(f));
  }
  if(req.url.startsWith('/app/api.php')){res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify({ok:false,error:'offline'}));}
  res.setHeader('Content-Type','text/html'); res.end(fs.readFileSync(APP));
});
await new Promise(r=>server.listen(8099,r));
const b=await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined});
const erg=[]; const p=(n,ok,d='')=>erg.push({n,ok,d});

async function start(rechtsform,zeitpunkt=spaeter){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  // Uhr stellen, bevor irgendein Skript laeuft.
  await page.clock.install({time:new Date(zeitpunkt)});
  const js=[]; page.on('pageerror',e=>js.push(e.message));
  await page.route('**cdnjs.cloudflare.com/**',r=>{
    const u=r.request().url();
    if(u.includes('/react/'))     return r.fulfill({contentType:'application/javascript',body:REACT});
    if(u.includes('/react-dom/')) return r.fulfill({contentType:'application/javascript',body:REACTDOM});
    return r.fulfill({contentType:'application/javascript',body:''});
  });
  // Kein gt_onb_done setzen: die Rechtsform wird im Einstieg gewaehlt.
  // Wer den Einstieg ueberspringt, bleibt beim Einzelunternehmen — dann
  // pruefte dieser Test zweimal denselben Modus.
  await page.goto('http://localhost:8099/app/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>{const s=document.getElementById('splash');
    return !s||getComputedStyle(s).opacity==='0';},{timeout:15000}).catch(()=>{});
  await page.waitForTimeout(600);
  const knopf=page.getByRole('button',{name:rechtsform}).first();
  if(await knopf.count()&&await knopf.isVisible().catch(()=>false)){await knopf.click();await page.waitForTimeout(600);}
  const ueber=page.getByRole('button',{name:/^Überspringen$/}).first();
  if(await ueber.count()&&await ueber.isVisible().catch(()=>false)){await ueber.click();await page.waitForTimeout(500);}
  return {ctx,page,js};
}

for(const [modus,name,reiter,belegt] of [
  [/^Einzelunternehmen/,'Einzelunternehmen',['Essen','Bericht'],'Personalessen'],
  [/^GmbH/,            'GmbH / UG',        ['Essen','Bericht'],'GmbH Sachbezug'],
]){
  const {ctx,page,js}=await start(modus);
  p(`${name}: App startet ohne JS-Fehler`,js.length===0,js.join(' | '));
  // Belegen, dass wirklich der gemeinte Modus laeuft. Wer den Einstieg
  // versehentlich ueberspringt, prueft sonst zweimal das Einzelunternehmen
  // und haelt das Ergebnis fuer zwei Messungen.
  {
    const k=page.getByRole('button',{name:'Essen'}).first();
    if(await k.count()){await k.click();await page.waitForTimeout(700);}
    const t=await page.evaluate(()=>document.body.innerText);
    p(`${name}: läuft wirklich im Modus ${name}`,t.includes(belegt),
      `erwartet "${belegt}" im Kopf, gefunden: ${t.split('\n')[0]}`);
  }
  for(const r of reiter){
    const k=page.getByRole('button',{name:r}).first();
    if(await k.count()){await k.click();await page.waitForTimeout(700);}
    const gewarnt=await page.evaluate(j=>{
      const t=document.body.innerText;
      return /Werte prüfen|veraltet/i.test(t) && t.includes(String(j));
    },werteJahr+1);
    p(`${name} · ${r}: warnt im Jahr ${werteJahr+1} vor den ${werteJahr}er Werten`,gewarnt,
      `kein Hinweis auf der Seite; die BMF-Werte für ${werteJahr} werden kommentarlos weiterverwendet`);
  }
  await ctx.close();
}

// Gegenprobe: im Jahr der hinterlegten Werte darf nichts warnen. Eine
// Warnung, die immer steht, wird weggeschaut — dann nuetzt sie nichts
// mehr, wenn sie einmal wirklich zutrifft.
for(const [modus,name] of [[/^Einzelunternehmen/,'Einzelunternehmen'],[/^GmbH/,'GmbH / UG']]){
  const {ctx,page}=await start(modus,`${werteJahr}-06-15T09:00:00`);
  let gewarnt=false;
  for(const r of ['Essen','Bericht']){
    const k=page.getByRole('button',{name:r}).first();
    if(await k.count()){await k.click();await page.waitForTimeout(700);}
    if(await page.evaluate(()=>/Werte prüfen|veraltet/i.test(document.body.innerText))) gewarnt=true;
  }
  p(`${name}: warnt im Jahr ${werteJahr} nicht`,!gewarnt,
    'Hinweis erscheint, obwohl die hinterlegten Werte für dieses Jahr gelten');
  await ctx.close();
}

await b.close(); server.close();
const fehl=erg.filter(e=>!e.ok);
console.log(erg.map(e=>(e.ok?'  ok   ':'FEHLER')+' │ '+e.n+(e.d&&!e.ok?'\n         ← '+e.d:'')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length?1:0);
