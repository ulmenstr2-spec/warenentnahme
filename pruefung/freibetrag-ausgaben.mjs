// Prueft im echten Browser, dass Bildschirm, PDF und Excel denselben
// lohnsteuerpflichtigen Betrag nennen — und dass die Aufteilung nach
// Steuersatz ueberall auftaucht.
//
// Drei Ausgabewege fuer dieselbe Zahl sind in diesem Projekt schon
// einmal auseinandergelaufen (Umsatzsteuersatz fuers Personalessen,
// 15.09.2026). Hier geht es um die Zahl, die auf den Lohnzettel wandert.
import http from 'http'; import fs from 'fs';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const W=path.dirname(path.dirname(fileURLToPath(import.meta.url)))+'/';
const APP='/tmp/app-freibetrag.html';
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
await new Promise(r=>server.listen(8122,r));
const b=await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined});
const erg=[]; const p=(n,ok,d='')=>erg.push({n,ok,d});

// Acht Monate zu 125 € = 1.000 € vor dem Zeitraum, im September 60 € zu
// 7 % und 40 € zu 19 %. Erwartet: 80 € im Freibetrag, 20 € steuerpflichtig.
const SOLL={vorher:1000, imZeitraum:100, frei:80, pflichtig:20, b7:60, b19:40};

const ctx=await b.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
await page.clock.install({time:new Date('2026-09-23T10:00:00')});
const js=[]; page.on('pageerror',e=>js.push(e.message));
await page.route('**cdnjs.cloudflare.com/**',r=>{
  const u=r.request().url();
  if(u.includes('/react/'))     return r.fulfill({contentType:'application/javascript',body:REACT});
  if(u.includes('/react-dom/')) return r.fulfill({contentType:'application/javascript',body:REACTDOM});
  return r.fulfill({contentType:'application/javascript',body:''});
});
await page.addInitScript(()=>{
  localStorage.setItem('gt_onb_done','1');
  localStorage.setItem('gt_rechtsform','"gmbh"');
  localStorage.setItem('gmbh_persons',JSON.stringify([{id:'gf1',name:'Josef Czerwinski',aktiv:true}]));
  localStorage.setItem('gmbh_firma','"Grüne Kombüse GmbH"');
  localStorage.setItem('gmbh_periodDay','1');
  localStorage.setItem('gmbh_meals','[]');
  const w=[];
  for(let i=1;i<=8;i++) w.push({id:'wv'+i,datum:`2026-0${i}-15`,person:'gf1',artikel:'Bio-Käse',
    methode:'rabatt',vorteil:125,mwst:7,menge:1,einheit:'kg',vk:20,mp:5});
  w.push({id:'w1',datum:'2026-09-05',person:'gf1',artikel:'Bio-Käse',methode:'rabatt',
    vorteil:60,mwst:7,menge:2,einheit:'kg',vk:40,mp:10});
  w.push({id:'w2',datum:'2026-09-12',person:'gf1',artikel:'Wein',methode:'rabatt',
    vorteil:40,mwst:19,menge:3,einheit:'Fl.',vk:25,mp:11.67});
  localStorage.setItem('gmbh_withdrawals',JSON.stringify(w));
});
await page.goto('http://localhost:8122/app/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const s=document.getElementById('splash');
  return !s||getComputedStyle(s).opacity==='0';},{timeout:15000}).catch(()=>{});
await page.waitForTimeout(900);
const g=page.getByRole('button',{name:/^GmbH/}).first();
if(await g.count()&&await g.isVisible().catch(()=>false)){await g.click();await page.waitForTimeout(700);}
const ue=page.getByRole('button',{name:/^Überspringen$/}).first();
if(await ue.count()&&await ue.isVisible().catch(()=>false)){await ue.click();await page.waitForTimeout(600);}
p('App startet ohne JS-Fehler',js.length===0,js.join(' | '));

// Ausgaben abfangen
await page.evaluate(()=>{
  window.__pdf=null; window.__mappe=null;
  window.triggerDownload=async(blob)=>{window.__pdf=new Uint8Array(await blob.arrayBuffer());};
  window.XLSX.writeFile=(wb)=>{window.__mappe=wb;};
});
await page.getByRole('button',{name:'Bericht'}).first().click();
await page.waitForTimeout(1200);

// ── Bildschirm
const schirm=await page.evaluate(()=>document.body.innerText);
const zahl=s=>parseFloat(String(s).replace(/\./g,'').replace(',','.'));
const ausSchirm=r=>{const m=schirm.match(r);return m?zahl(m[1]):null;};
p('Bildschirm · Der Block „lohnsteuerliche Behandlung" ist da',
  /lohnsteuerliche Behandlung/i.test(schirm),
  'nicht gefunden — die Zahl muss weiter von Hand ermittelt werden');
p(`Bildschirm · davon lohnsteuerpflichtig: ${SOLL.pflichtig},00 €`,
  ausSchirm(/davon lohnsteuerpflichtig\s*\n?\s*([\d.,]+)\s*€/)===SOLL.pflichtig,
  'abgelesen: '+ausSchirm(/davon lohnsteuerpflichtig\s*\n?\s*([\d.,]+)\s*€/));
p(`Bildschirm · davon im Freibetrag: ${SOLL.frei},00 €`,
  ausSchirm(/davon im Freibetrag\s*\n?\s*([\d.,]+)\s*€/)===SOLL.frei,
  'abgelesen: '+ausSchirm(/davon im Freibetrag\s*\n?\s*([\d.,]+)\s*€/));
p('Bildschirm · Der Steuersatz der Positionen steht dabei',
  /7 %:\s*60,00 €/.test(schirm)&&/19 %:\s*40,00 €/.test(schirm),
  'die Aufteilung nach Steuersatz fehlt — genau danach wurde gefragt');
p('Bildschirm · Es steht dabei, dass die USt davon unberührt bleibt',
  /nicht die umsatzsteuerliche Bemessungsgrundlage/i.test(schirm));

// ── PDF
await page.getByRole('button',{name:/PDF/}).first().click();
await page.waitForTimeout(2500);
const pdfText=await page.evaluate(async()=>{
  if(!window.__pdf) return '';
  const lib=window.pdfjsLib||window['pdfjs-dist/build/pdf'];
  if(!lib) return '';
  lib.GlobalWorkerOptions.workerSrc='/app/lib/pdf.worker-3.11.174.min.js';
  const doc=await lib.getDocument({data:window.__pdf}).promise;
  let out='';
  for(let i=1;i<=doc.numPages;i++){
    const pg=await doc.getPage(i); const c=await pg.getTextContent(); let last=null;
    for(const it of c.items){const y=Math.round(it.transform[5]);
      if(last!==null&&Math.abs(y-last)>2) out+='\n'; out+=it.str+' '; last=y;}
  }
  return out;
});
p('PDF · wird erzeugt',pdfText.length>0,'kein Text aus dem PDF lesbar');
p('PDF · Der Abschnitt zur lohnsteuerlichen Behandlung ist da',
  /lohnsteuerliche Behandlung/i.test(pdfText));
const pdfZeile=(pdfText.split('\n').find(z=>/Josef Czerwinski\s+1000/.test(z))||'').trim();
p(`PDF · Die Zeile nennt ${SOLL.vorher} / ${SOLL.imZeitraum} / ${SOLL.frei} / ${SOLL.pflichtig}`,
  /1000,00/.test(pdfZeile)&&/100,00/.test(pdfZeile)&&/80,00/.test(pdfZeile)&&/20,00/.test(pdfZeile),
  'gefundene Zeile: '+(pdfZeile||'(keine)'));
p('PDF · Die Aufteilung nach Steuersatz steht drin',
  /7 % 60,00 EUR/.test(pdfText)&&/19 % 40,00 EUR/.test(pdfText),
  'nicht gefunden');
p('PDF · Auch die Zusammenfassung teilt den Warenrabatt nach Satz auf',
  /davon brutto\s+7 %: 60,00\s+·\s+19 %: 40,00/.test(pdfText),
  'in der Zusammenfassung fehlt die Aufteilung');
p('PDF · Der Hinweis zur Umsatzsteuer steht dabei',
  /mindert NICHT die umsatzsteuerliche Bemessungsgrundlage/i.test(pdfText));

// ── Excel
await page.evaluate(()=>{window.__mappe=null;});
await page.getByRole('button',{name:/Excel/}).first().click();
await page.waitForTimeout(1200);
const excel=await page.evaluate(()=>{
  const wb=window.__mappe; if(!wb) return null;
  const bl=wb.Sheets['Zusammenfassung']; if(!bl) return {keinBlatt:true};
  return window.XLSX.utils.sheet_to_json(bl,{header:1});
});
p('Excel · Das Blatt Zusammenfassung ist da',!!excel&&!excel.keinBlatt,
  excel?'Blatt fehlt':'keine Mappe erzeugt');
if(excel&&!excel.keinBlatt){
  const zeile=excel.find(r=>Array.isArray(r)&&r[0]==='Josef Czerwinski'&&r.length>=8);
  p('Excel · Die Zeile nennt dieselben Zahlen wie PDF und Bildschirm',
    !!zeile&&zeile[1]===SOLL.vorher&&zeile[2]===SOLL.imZeitraum
      &&zeile[3]===SOLL.frei&&zeile[4]===SOLL.pflichtig
      &&zeile[6]===SOLL.b7&&zeile[7]===SOLL.b19,
    'gefundene Zeile: '+JSON.stringify(zeile));
  p('Excel · Der Hinweis zur Umsatzsteuer steht dabei',
    excel.some(r=>Array.isArray(r)&&/nicht die umsatzsteuerliche Bemessungsgrundlage/i.test(String(r[0]||''))));
}

// ── Ein Zeitraum ganz ohne Warenrabatt
// Genau der Fall aus dem Bericht eines Kunden vom 23.09.2026: die
// laufende Periode enthielt nur Mahlzeiten. Der Block muss trotzdem
// erscheinen, weil der Jahresstand dazugehoert — aber die Ueberschrift
// "nach Steuersatz" darf nicht ohne Zeilen darunter dastehen.
//
// Eigener Kontext statt Neuladen: addInitScript laeuft bei jeder
// Navigation erneut und wuerde die Daten wieder ueberschreiben.
await ctx.close();
{
  const ctx2=await b.newContext({viewport:{width:390,height:844}});
  const page2=await ctx2.newPage();
  await page2.clock.install({time:new Date('2026-09-23T10:00:00')});
  await page2.route('**cdnjs.cloudflare.com/**',r=>{
    const u=r.request().url();
    if(u.includes('/react/'))     return r.fulfill({contentType:'application/javascript',body:REACT});
    if(u.includes('/react-dom/')) return r.fulfill({contentType:'application/javascript',body:REACTDOM});
    return r.fulfill({contentType:'application/javascript',body:''});
  });
  await page2.addInitScript(()=>{
    localStorage.setItem('gt_onb_done','1');
    localStorage.setItem('gt_rechtsform','"gmbh"');
    localStorage.setItem('gmbh_persons',JSON.stringify([{id:'gf1',name:'Josef Czerwinski',aktiv:true}]));
    localStorage.setItem('gmbh_firma','"Grüne Kombüse GmbH"');
    localStorage.setItem('gmbh_periodDay','1');
    // Vorverbrauch aus Januar bis August, im September kein Warenrabatt.
    const w=[]; for(let i=1;i<=8;i++) w.push({id:'wv'+i,datum:`2026-0${i}-15`,person:'gf1',
      artikel:'Bio-Käse',methode:'rabatt',vorteil:125,mwst:7,menge:1,einheit:'kg',vk:20,mp:5});
    localStorage.setItem('gmbh_withdrawals',JSON.stringify(w));
    localStorage.setItem('gmbh_meals',JSON.stringify([
      {id:'m1',type:'mittag',datum:'2026-09-22',monat:'2026-09',person:'gf1',vorteil:4.57,label:'Mittagessen'},
      {id:'m2',type:'mittag',datum:'2026-09-22',monat:'2026-09',person:'gf1',vorteil:4.57,label:'Mittagessen'},
    ]));
  });
  await page2.goto('http://localhost:8122/app/',{waitUntil:'networkidle'});
  await page2.waitForFunction(()=>{const s=document.getElementById('splash');
    return !s||getComputedStyle(s).opacity==='0';},{timeout:15000}).catch(()=>{});
  await page2.waitForTimeout(900);
  const g2=page2.getByRole('button',{name:/^GmbH/}).first();
  if(await g2.count()&&await g2.isVisible().catch(()=>false)){await g2.click();await page2.waitForTimeout(700);}
  const ue2=page2.getByRole('button',{name:/^Überspringen$/}).first();
  if(await ue2.count()&&await ue2.isVisible().catch(()=>false)){await ue2.click();await page2.waitForTimeout(600);}
  await page2.evaluate(()=>{window.__pdf=null;
    window.triggerDownload=async(blob)=>{window.__pdf=new Uint8Array(await blob.arrayBuffer());};});
  await page2.getByRole('button',{name:'Bericht'}).first().click();
  await page2.waitForTimeout(1200);
  await page2.getByRole('button',{name:/PDF/}).first().click();
  await page2.waitForTimeout(2500);
  const leerText=await page2.evaluate(async()=>{
    if(!window.__pdf) return '';
    const lib=window.pdfjsLib||window['pdfjs-dist/build/pdf'];
    if(!lib) return '';
    lib.GlobalWorkerOptions.workerSrc='/app/lib/pdf.worker-3.11.174.min.js';
    const doc=await lib.getDocument({data:window.__pdf}).promise;
    let out='';
    for(let i=1;i<=doc.numPages;i++){
      const pg=await doc.getPage(i); const c=await pg.getTextContent(); let last=null;
      for(const it of c.items){const y=Math.round(it.transform[5]);
        if(last!==null&&Math.abs(y-last)>2) out+='\n'; out+=it.str+' '; last=y;}
    }
    return out;
  });
  p('Ohne Warenrabatt · Der Jahresstand steht trotzdem im Bericht',
    /lohnsteuerliche Behandlung/i.test(leerText)&&/1000,00/.test(leerText),
    'der Block fehlt — der Vorverbrauch gehört auch in einen Zeitraum ohne neue Positionen');
  p('Ohne Warenrabatt · Die Überschrift „nach Steuersatz" steht nicht ohne Zeilen da',
    !/nach Steuersatz/.test(leerText),
    'die Überschrift ist da, aber es folgt keine Zeile — sie gehört weggelassen');
  await ctx2.close();
}

await b.close(); server.close();
const fehl=erg.filter(e=>!e.ok);
console.log(erg.map(e=>(e.ok?'  ok   ':'FEHLER')+' │ '+e.n+(e.d&&!e.ok?'\n         ← '+e.d:'')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length?1:0);
