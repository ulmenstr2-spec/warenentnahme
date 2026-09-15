// Prueft im echten Browser, dass der Bericht genau die Eintraege des
// gewaehlten Zeitraums zeigt — und die davor und danach nicht.
//
// pruefung/perioden.mjs rechnet die Zeitraeume nach. Das belegt aber
// nicht, dass der Bericht sie auch benutzt. Hier werden vier Eintraege
// mit unterscheidbaren Betraegen um die Zeitraumgrenze herum abgelegt
// und die Summe auf dem Bildschirm abgelesen.
import http from 'http'; import fs from 'fs';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const W=path.dirname(path.dirname(fileURLToPath(import.meta.url)))+'/';
const APP='/tmp/app-periode.html';
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
  if(req.url.startsWith('/app/api.php')){res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify({ok:false,error:'offline'}));}
  res.setHeader('Content-Type','text/html'); res.end(fs.readFileSync(APP));
});
await new Promise(r=>server.listen(8103,r));
const b=await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined});
const erg=[]; const p=(n,ok,d='')=>erg.push({n,ok,d});

// Ein fester Zeitpunkt, damit die Pruefung nicht vom Kalender abhaengt.
// Der 20. Maerz 2026 liegt bei Stichtag 15 im Zeitraum 15.03.–14.04.
const JETZT='2026-03-20T10:00:00';
const STICHTAG=15;

// Vier Eintraege mit eindeutigen Betraegen: einer davor, zwei im
// Zeitraum (erster und letzter Tag), einer danach.
const EINTRAEGE=[
  ['2026-03-14',  1.00, 'davor'],
  ['2026-03-15', 10.00, 'erster Tag im Zeitraum'],
  ['2026-04-14',100.00, 'letzter Tag im Zeitraum'],
  ['2026-04-15',1000.00,'danach'],
];
const SOLL=110.00;   // 10 + 100

const ctx=await b.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
await page.clock.install({time:new Date(JETZT)});
const js=[]; page.on('pageerror',e=>js.push(e.message));
await page.route('**cdnjs.cloudflare.com/**',r=>{
  const u=r.request().url();
  if(u.includes('/react/'))     return r.fulfill({contentType:'application/javascript',body:REACT});
  if(u.includes('/react-dom/')) return r.fulfill({contentType:'application/javascript',body:REACTDOM});
  return r.fulfill({contentType:'application/javascript',body:''});
});
await page.addInitScript(([eintraege,stichtag])=>{
  localStorage.setItem('gt_periodDay', JSON.stringify(stichtag));
  localStorage.setItem('gt_ents', JSON.stringify(eintraege.map(([datum,wert],i)=>({
    id:'e'+i, datum, name:'Testware '+i, einheit:'kg', menge:1,
    preis:wert, mwst:7, wert,
  }))));
}, [EINTRAEGE, STICHTAG]);

await page.goto('http://localhost:8103/app/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const s=document.getElementById('splash');
  return !s||getComputedStyle(s).opacity==='0';},{timeout:15000}).catch(()=>{});
await page.waitForTimeout(600);
const knopf=page.getByRole('button',{name:/^Einzelunternehmen/}).first();
if(await knopf.count()&&await knopf.isVisible().catch(()=>false)){await knopf.click();await page.waitForTimeout(600);}
const ueber=page.getByRole('button',{name:/^Überspringen$/}).first();
if(await ueber.count()&&await ueber.isVisible().catch(()=>false)){await ueber.click();await page.waitForTimeout(500);}

p('App startet ohne JS-Fehler',js.length===0,js.join(' | '));

await page.getByRole('button',{name:'Bericht'}).first().click();
await page.waitForTimeout(900);

// Der angebotene Zeitraum
const beschriftungen=await page.evaluate(()=>[...document.querySelectorAll('button')]
  .map(b=>b.textContent.trim()).filter(t=>/^\d{2}\.\d{2}\.–\d{2}\.\d{2}\.\d{4}$/.test(t)));
p('Der laufende Zeitraum heißt 15.03.–14.04.2026',
  beschriftungen.includes('15.03.–14.04.2026'),
  'gefundene Zeiträume: '+(beschriftungen.join(', ')||'keine'));

// Kein Zeitraum darf laenger als 31 Tage sein.
const zuLang=beschriftungen.filter(t=>{
  const [a,b_]=t.split('–');
  const [t1,m1]=a.split('.').map(Number);
  const [t2,m2,j2]=b_.split('.').map(Number);
  const j1=m1>m2?j2-1:j2;
  return (Date.UTC(j2,m2-1,t2)-Date.UTC(j1,m1-1,t1))/86400000+1>31;
});
p('Kein Zeitraum ist länger als 31 Tage',zuLang.length===0,zuLang.join(', '));

// Den Zeitraum ausdruecklich anwaehlen. Der Bericht oeffnet von sich aus
// den neuesten Zeitraum, in dem Daten liegen — das ist gewollt, macht die
// Vorauswahl hier aber zum falschen Messpunkt.
// Fehlt die Schaltflaeche, ist der Zeitraum falsch berechnet. Dann soll
// hier eine lesbare Meldung stehen und kein Stapelauszug.
const zeitraumKnopf=page.getByRole('button',{name:'15.03.–14.04.2026',exact:true}).first();
const anwaehlbar=await zeitraumKnopf.count()>0;
if(anwaehlbar){ await zeitraumKnopf.click(); await page.waitForTimeout(700); }
else p('Der Zeitraum 15.03.–14.04.2026 lässt sich anwählen',false,
       'Schaltfläche nicht vorhanden. Angeboten wird: '+(beschriftungen.join(', ')||'nichts'));

// Die Summe der Warenentnahmen im gewaehlten Zeitraum
const text=await page.evaluate(()=>document.body.innerText);
const zahl=s=>parseFloat(String(s).replace(/\./g,'').replace(',','.'));
const m=text.match(/Warenentnahmen?\s*\n?\s*([\d.]+,\d{2})/);
p(`Der Bericht summiert ${SOLL.toFixed(2).replace('.',',')} € — nur die beiden Einträge im Zeitraum`,
  !!m && Math.abs(zahl(m[1])-SOLL)<0.005,
  m ? `abgelesen ${m[1]} €. 1,00 = Tag davor, 1.000,00 = Tag danach — beide gehören nicht hinein.`
    : 'keine Summe der Warenentnahmen auf der Seite gefunden');

await ctx.close(); await b.close(); server.close();
const fehl=erg.filter(e=>!e.ok);
console.log(erg.map(e=>(e.ok?'  ok   ':'FEHLER')+' │ '+e.n+(e.d&&!e.ok?'\n         ← '+e.d:'')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length?1:0);
