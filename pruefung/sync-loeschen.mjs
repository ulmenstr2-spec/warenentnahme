// Prueft die Synchronisation zweier Geraete gegen einen echten kleinen
// Server. Der Server haelt — wie der echte — genau eine Nutzlast je
// Konto, die letzte gewinnt. Zwei Browser-Kontexte sind zwei Geraete mit
// getrenntem localStorage.
//
// Zwei Faelle:
//   1. Der laufende Abgleich. Was auf einem Geraet geloescht wurde, muss
//      auf dem anderen verschwinden — dafuer gibt es die Loeschmerker.
//      Kommt ein geloeschter Eintrag zurueck, versteuert er einen
//      geldwerten Vorteil, den es nie gab, und niemand merkt es.
//   2. "Jetzt herunterladen". Der Nutzer fordert ausdruecklich den Stand
//      des Servers an. Danach muss auf dem Geraet stehen, was auf dem
//      Server steht — auch dann, wenn das nichts ist.
import http from 'http'; import fs from 'fs';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const W=path.dirname(path.dirname(fileURLToPath(import.meta.url)))+'/';
const APP='/tmp/app-sync.html';
fs.copyFileSync(W+'app.html', APP);
const { execSync } = await import('child_process');
execSync(`node ${W}build.mjs ${APP}`, {stdio:'ignore'});
const REACT=fs.readFileSync(W+'node_modules/react/umd/react.production.min.js');
const REACTDOM=fs.readFileSync(W+'node_modules/react-dom/umd/react-dom.production.min.js');

const TOKEN='pruef-token';
let serverDaten=null;
// Die App laedt zwei Sekunden nach jeder Aenderung von selbst hoch. Ohne
// Sperre hat der Server beim Druck auf "Jetzt herunterladen" laengst
// wieder den Geraetestand — und die Pruefung misst nichts.
let pushSperre=false, pushZaehler=0;
// Was der Server tatsaechlich ausgeliefert hat. Belegt, dass wirklich
// die leere Liste ankam und nicht etwas anderes.
let ausgeliefert=[];

const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/app/lib/')){
    const f=W+'lib/'+req.url.replace('/app/lib/','').split('?')[0];
    if(!fs.existsSync(f)){res.statusCode=404;return res.end('404');}
    res.setHeader('Content-Type','application/javascript'); return res.end(fs.readFileSync(f));
  }
  if(req.url.startsWith('/app/api.php')){
    let roh=''; req.on('data',c=>roh+=c);
    return req.on('end',()=>{
      let a={}; try{a=JSON.parse(roh||'{}');}catch(e){}
      res.setHeader('Content-Type','application/json');
      if(a.token!==TOKEN) return res.end(JSON.stringify({ok:false,error:'Sitzung abgelaufen'}));
      if(a.action==='push'){ pushZaehler++; if(!pushSperre) serverDaten=a.data;
        return res.end(JSON.stringify({ok:true})); }
      if(a.action==='pull'){
        if(!serverDaten) return res.end(JSON.stringify({ok:false,empty:true}));
        ausgeliefert.push(JSON.parse(JSON.stringify(serverDaten)));
        return res.end(JSON.stringify({ok:true,data:serverDaten}));
      }
      return res.end(JSON.stringify({ok:true,status:'active'}));
    });
  }
  res.setHeader('Content-Type','text/html'); res.end(fs.readFileSync(APP));
});
await new Promise(r=>server.listen(8105,r));
const b=await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined});
const erg=[]; const p=(n,ok,d='')=>erg.push({n,ok,d});

const mahlzeiten=()=>['frueh','mittag','abend'].map((type,i)=>({
  id:'m'+i, type, datum:'2026-09-10', monat:'2026-09',
  wert:type==='frueh'?2.37:4.57,
  label:{frueh:'Frühstück',mittag:'Mittagessen',abend:'Abendessen'}[type],
}));

async function geraet(name, vorrat, gepushtAm='2026-09-14T10:00:00.000Z'){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  await page.clock.install({time:new Date('2026-09-15T10:00:00')});
  const js=[]; page.on('pageerror',e=>js.push(name+': '+e.message));
  await page.route('**cdnjs.cloudflare.com/**',r=>{
    const u=r.request().url();
    if(u.includes('/react/'))     return r.fulfill({contentType:'application/javascript',body:REACT});
    if(u.includes('/react-dom/')) return r.fulfill({contentType:'application/javascript',body:REACTDOM});
    return r.fulfill({contentType:'application/javascript',body:''});
  });
  await page.addInitScript(([tok,m,ts])=>{
    localStorage.setItem('gt_onb_done','1');
    localStorage.setItem('gt_auth_token',tok);
    localStorage.setItem('gt_auth_email','pruef@example.org');
    localStorage.setItem('gt_meals',JSON.stringify(m));
    // So tun, als sei schon einmal hochgeladen worden. Ohne diesen Merker
    // gilt das Geraet als frisch und zieht beim Start ohnehin alles.
    localStorage.setItem('gt_sync_pushed_at',ts);
  },[TOKEN,vorrat,gepushtAm]);
  await page.goto('http://localhost:8105/app/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>{const s=document.getElementById('splash');
    return !s||getComputedStyle(s).opacity==='0';},{timeout:15000}).catch(()=>{});
  await page.waitForTimeout(1200);
  return {ctx,page,js};
}

const anzahl=page=>page.evaluate(()=>{
  try{ return (JSON.parse(localStorage.getItem('gt_meals')||'[]')||[]).length; }catch(e){ return -1; }
});
// Den Sync-Dialog ueber die Kopfzeile oeffnen — dieselbe Schaltflaeche,
// die ein Nutzer antippt.
// Die Schaltflaeche in der Kopfzeile traegt den Namensteil der
// E-Mail-Adresse — hier "pruef".
async function syncDialog(page){
  await page.getByRole('button',{name:'pruef',exact:true}).first().click();
  await page.waitForTimeout(700);
}

// ── Fall 1: Loeschung wandert mit
{
  serverDaten={v:2, ts:'2026-09-15T09:00:00.000Z', meals:[], ents:[],
    deleted:Object.fromEntries(mahlzeiten().map(m=>[m.id,'2026-09-15T08:00:00.000Z']))};
  const A=await geraet('A',mahlzeiten());
  p('Fall 1 · App startet ohne JS-Fehler',A.js.length===0,A.js.join(' | '));
  const n=await anzahl(A.page);
  p('Fall 1 · Was ein anderes Gerät gelöscht hat, ist nach dem Abgleich auch hier weg',
    n===0, `noch ${n} Mahlzeiten auf dem Gerät — Gelöschtes ist zurückgekehrt`);
  await A.ctx.close();
}

// ── Fall 2: "Jetzt herunterladen" bei leerem Server
// Der Server hat keine Mahlzeiten und keine Loeschmerker — etwa, weil der
// Betrieb dort nie welche erfasst hat. Sein Stand ist aelter als der
// letzte Push dieses Geraets, der laufende Abgleich ruehrt also nichts an.
// Der Nutzer fordert den Serverstand ausdruecklich an.
{
  serverDaten={v:2, ts:'2026-09-13T10:00:00.000Z', meals:[], ents:[], deleted:{}};
  const B=await geraet('B',mahlzeiten());
  p('Fall 2 · App startet ohne JS-Fehler',B.js.length===0,B.js.join(' | '));
  const vorher=await anzahl(B.page);
  p('Fall 2 · Der laufende Abgleich lässt den Gerätestand in Ruhe',vorher===3,
    `erwartet 3, gefunden ${vorher}`);

  // Ab hier darf das Geraet den Serverstand nicht mehr veraendern.
  pushSperre=true;
  serverDaten={v:2, ts:'2026-09-13T10:00:00.000Z', meals:[], ents:[], deleted:{}};
  ausgeliefert=[];

  await syncDialog(B.page);
  const runter=B.page.getByRole('button',{name:/Jetzt herunterladen/}).first();
  const da=await runter.count()>0;
  p('Fall 2 · Die Schaltfläche „Jetzt herunterladen" ist erreichbar',da);
  let rueckfrage=null;
  if(da){
    // Eine Rueckfrage darf kommen; sie wird bejaht.
    B.page.on('dialog',d=>{rueckfrage=d.message();d.accept();});
    await runter.click();
    await B.page.waitForTimeout(2200);
  }
  p('Fall 2 · Es gab eine Rückfrage vor dem Ersetzen',!!rueckfrage,
    'kein Bestätigungsdialog — die Schaltfläche ersetzt den Gerätestand ohne Nachfrage');
  const geliefert=ausgeliefert[ausgeliefert.length-1];
  p('Fall 2 · Der Server hat wirklich die leere Liste geliefert',
    !!geliefert&&Array.isArray(geliefert.meals)&&geliefert.meals.length===0,
    'ausgeliefert wurde: '+JSON.stringify(geliefert?.meals));
  const nachher=await anzahl(B.page);
  p('Fall 2 · Nach „Jetzt herunterladen" steht auf dem Gerät der Serverstand',
    nachher===0,
    `Das Gerät hält noch ${nachher} Mahlzeiten. Der Nutzer hat den Serverstand ausdrücklich `+
    `angefordert und bekommt ihn nicht: eine geleerte Liste gilt als „nichts zu laden".`);
  await B.ctx.close();
}

// ── Fall 3: alte Nutzlast ohne den Schluessel "meals"
// Eine leere Liste heisst "der Server hat keine Mahlzeiten". Ein
// fehlender Schluessel heisst "der Server weiss von Mahlzeiten nichts" —
// etwa bei einer Nutzlast aus einer aelteren Fassung. Dann darf der
// Abruf das Geraet nicht leeren, sonst kostet ein Druck auf die
// Schaltflaeche alle Mahlzeiten.
{
  pushSperre=false;
  serverDaten={v:1, ts:'2026-09-13T10:00:00.000Z', ents:[], deleted:{}};   // kein meals
  const C=await geraet('C',mahlzeiten());
  p('Fall 3 · App startet ohne JS-Fehler',C.js.length===0,C.js.join(' | '));
  pushSperre=true;
  serverDaten={v:1, ts:'2026-09-13T10:00:00.000Z', ents:[], deleted:{}};
  await syncDialog(C.page);
  const r3=C.page.getByRole('button',{name:/Jetzt herunterladen/}).first();
  if(await r3.count()){
    C.page.on('dialog',d=>d.accept());
    await r3.click();
    await C.page.waitForTimeout(2200);
  }
  const n3=await anzahl(C.page);
  p('Fall 3 · Eine Nutzlast ohne die Liste lässt die Mahlzeiten stehen',n3===3,
    `nur noch ${n3} Mahlzeiten — ein fehlender Schlüssel wurde wie eine leere Liste behandelt`);
  await C.ctx.close();
}

await b.close(); server.close();
const fehl=erg.filter(e=>!e.ok);
console.log(erg.map(e=>(e.ok?'  ok   ':'FEHLER')+' │ '+e.n+(e.d&&!e.ok?'\n         ← '+e.d:'')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length?1:0);
