// Prueft, dass alle Exportwege fuer dieselbe Mahlzeit denselben
// Umsatzsteuersatz ausweisen.
//
// Der Satz fuer Personalessen haengt am Datum: bis 31.12.2025 19 %,
// ab 01.01.2026 wieder 7 % (Gastronomiesatz). Die App kennt dafuer
// mealUstSatz(). Wenn ein Export den Satz stattdessen fest verdrahtet,
// weist dieselbe Mahlzeit in zwei Dateien zwei verschiedene Steuern aus —
// und der Buchhaltung faellt es erst beim Abgleich auf.
import http from 'http'; import fs from 'fs';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const W=path.dirname(path.dirname(fileURLToPath(import.meta.url)))+'/';
const APP='/tmp/app-ust.html';
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
await new Promise(r=>server.listen(8097,r));
const b=await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined});
const erg=[]; const p=(n,ok,d='')=>erg.push({n,ok,d});

// Heutiges Datum der App, damit der Bericht den laufenden Zeitraum zeigt.
const heute=new Date();
const monat=heute.getFullYear()+'-'+String(heute.getMonth()+1).padStart(2,'0');
const tag=monat+'-0'+Math.min(9,Math.max(1,heute.getDate()));
const sollSatz=monat>='2026-01'?7:19;

const ctx=await b.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
const js=[]; page.on('pageerror',e=>js.push(e.message));
await page.route('**cdnjs.cloudflare.com/**',r=>{
  const u=r.request().url();
  if(u.includes('/react/'))     return r.fulfill({contentType:'application/javascript',body:REACT});
  if(u.includes('/react-dom/')) return r.fulfill({contentType:'application/javascript',body:REACTDOM});
  return r.fulfill({contentType:'application/javascript',body:''});
});

// Daten vorlegen, bevor die App startet.
await page.addInitScript(([tag,monat])=>{
  localStorage.setItem('gt_onb_done','1');
  localStorage.setItem('gt_rechtsform','"eu"');
  localStorage.setItem('gt_meals', JSON.stringify([
    {id:'m1',type:'abend',datum:tag,monat,wert:4.57,label:'Abendessen'},
  ]));
  localStorage.setItem('gt_ents', JSON.stringify([
    {id:'e1',datum:tag,name:'Testware',einheit:'kg',menge:1,preis:5.75,mwst:7,wert:6.61},
  ]));
}, [tag,monat]);

await page.goto('http://localhost:8097/app/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const s=document.getElementById('splash');
  return !s||getComputedStyle(s).opacity==='0';},{timeout:15000}).catch(()=>{});
await page.waitForTimeout(600);
const knopf=page.getByRole('button',{name:/^Einzelunternehmen/}).first();
if(await knopf.count()&&await knopf.isVisible().catch(()=>false)){await knopf.click();await page.waitForTimeout(600);}
const ueber=page.getByRole('button',{name:/^Überspringen$/}).first();
if(await ueber.count()&&await ueber.isVisible().catch(()=>false)){await ueber.click();await page.waitForTimeout(500);}

p('App startet ohne JS-Fehler',js.length===0,js.join(' | '));

// Downloads abfangen, statt sie auf die Platte zu schreiben.
await page.evaluate(()=>{
  window.__dateien=[];
  const echt=window.triggerDownload;
  window.triggerDownload=async (blob,name)=>{
    // Beides mitnehmen: Text fuer CSV, Rohbytes fuer die Excel-Mappe.
    window.__dateien.push({name, text: await blob.text(),
                           __buf: new Uint8Array(await blob.arrayBuffer())});
  };
  window.__echtDownload=echt;
  // Excel laeuft nicht ueber triggerDownload, sondern ueber XLSX.writeFile.
  window.__mappe=null;
  window.XLSX.writeFile=(wb)=>{ window.__mappe=wb; };
});

await page.getByRole('button',{name:'Bericht'}).first().click();
await page.waitForTimeout(800);

const hatBericht=await page.getByRole('button',{name:'↓ CSV'}).count()>0;
p('Berichtsseite mit Export-Schaltflächen erreicht',hatBericht);

// Die Zeile des Personalessens aus einer CSV holen und den Satz lesen.
const saetze={};
for(const [knopfName,feldIndex,label] of [
  ['Neutral', 6,  'Neutral'],     // typ;datum;beschreibung;menge;einheit;ekPreisNetto;ustSatz;…
  ['sevDesk', 4,  'sevDesk'],     // Datum;Kategorie;Beschreibung;Nettobetrag;Steuersatz;Bemerkung
  ['Lexware', 5,  'Lexware'],     // Datum;Umsatz;Buchungstext;Konto;Gegenkonto;Steuersatz
]){
  await page.getByRole('button',{name:knopfName,exact:true}).first().click();
  await page.waitForTimeout(200);
  await page.evaluate(()=>{window.__dateien=[];});
  await page.getByRole('button',{name:'↓ CSV'}).first().click();
  await page.waitForTimeout(500);
  const dateien=await page.evaluate(()=>window.__dateien);
  const zeile=(dateien[0]?.text||'').split(/\r?\n/).find(z=>/Sachbezug|Personalessen/i.test(z));
  saetze[label]=zeile?zeile.split(';')[feldIndex]:'(keine Zeile)';
}

// DATEV weist den Satz nicht als Zahl aus, sondern ueber das Gegenkonto:
// SKR03 8910 = 19 %, 8915 = 7 %.
await page.getByRole('button',{name:'DATEV',exact:true}).first().click();
await page.waitForTimeout(200);
await page.evaluate(()=>{window.__dateien=[];});
await page.getByRole('button',{name:'↓ CSV'}).first().click();
await page.waitForTimeout(500);
const datevZeile=(await page.evaluate(()=>window.__dateien))[0]?.text
  .split(/\r?\n/).find(z=>/Sachbezug/i.test(z))||'';
const konto=datevZeile.split(';')[2];
saetze['DATEV (Konto)']=konto==='8915'?'7':konto==='8910'?'19':'(Konto '+konto+')';

// Excel: die Mappe wird im Browser mit derselben Bibliothek wieder
// geoeffnet, mit der die App sie schreibt. So steht hier der Wert, den
// der Empfaenger in der Zelle sieht, und keine nachgebaute Annahme.
await page.evaluate(()=>{window.__mappe=null;});
await page.getByRole('button',{name:'↓ Excel'}).first().click();
await page.waitForTimeout(800);
saetze['Excel']=await page.evaluate(()=>{
  const wb=window.__mappe; if(!wb) return '(keine Mappe)';
  const bl=wb.Sheets['Personalessen']; if(!bl) return '(kein Blatt Personalessen)';
  const zeilen=window.XLSX.utils.sheet_to_json(bl,{header:1});
  const z=zeilen.find(r=>/Abendessen|Frühstück|Mittagessen/.test(String(r[1]||'')));
  return z?String(z[2]):'(keine Zeile)';
});

const gelesen=Object.entries(saetze).map(([k,v])=>`${k}=${v}`).join('  ');
const werte=[...new Set(Object.values(saetze).map(v=>String(v).replace(/[^0-9]/g,'')))];
p(`Alle Exporte nennen denselben USt-Satz für Personalessen`,werte.length===1,gelesen);
p(`Der genannte Satz ist der gesetzliche (${sollSatz} % ab ${tag})`,
  werte.length===1&&werte[0]===String(sollSatz),gelesen);

await ctx.close(); await b.close(); server.close();
const fehl=erg.filter(e=>!e.ok);
console.log(erg.map(e=>(e.ok?'  ok   ':'FEHLER')+' │ '+e.n+(e.d&&!e.ok?'\n         ← '+e.d:'')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length?1:0);
