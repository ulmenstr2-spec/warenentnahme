// Prueft im echten Browser, dass eine zweite gleiche Mahlzeit nachfragt
// und bei "Abbrechen" nicht gespeichert wird.
import http from 'http'; import fs from 'fs';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const W=path.dirname(path.dirname(fileURLToPath(import.meta.url)))+'/';
const APP='/tmp/app-dub.html';
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
await new Promise(r=>server.listen(8096,r));
const b=await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined});
const erg=[]; const p=(n,ok,d='')=>erg.push({n,ok,d});

async function start(rechtsform){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const js=[]; page.on('pageerror',e=>js.push(e.message));
  await page.route('**cdnjs.cloudflare.com/**',r=>{
    const u=r.request().url();
    if(u.includes('/react/'))     return r.fulfill({contentType:'application/javascript',body:REACT});
    if(u.includes('/react-dom/')) return r.fulfill({contentType:'application/javascript',body:REACTDOM});
    return r.fulfill({contentType:'application/javascript',body:''});
  });
  await page.goto('http://localhost:8096/app/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>{const s=document.getElementById('splash');
    return !s||getComputedStyle(s).opacity==='0';},{timeout:15000}).catch(()=>{});
  await page.waitForTimeout(600);
  const knopf=page.getByRole('button',{name:rechtsform}).first();
  if(await knopf.count()&&await knopf.isVisible().catch(()=>false)){await knopf.click();await page.waitForTimeout(600);}
  const ueber=page.getByRole('button',{name:/^Überspringen$/}).first();
  if(await ueber.count()&&await ueber.isVisible().catch(()=>false)){await ueber.click();await page.waitForTimeout(500);}
  return {ctx,page,js};
}

// Zaehlt, wie oft die Mahlzeit fuer den gewaehlten Tag erfasst ist (×N auf dem Knopf)
const anzahl=async page=>page.evaluate(()=>{
  const t=[...document.querySelectorAll('.mc2')].map(e=>e.textContent.trim());
  return t.join(' ') || 'keine';
});

for(const [modus,name] of [[/^Einzelunternehmen/,'Einzelunternehmen'],[/^GmbH/,'GmbH / UG']]){
  const {ctx,page,js}=await start(modus);
  p(`${name}: App startet ohne JS-Fehler`,js.length===0,js.join(' | '));

  // EIN dauerhafter Handler. Ein page.once() bliebe haengen, wenn kein
  // Dialog kommt, und wuerde den naechsten doppelt behandeln.
  let letzterText=null, antwort='dismiss';
  page.on('dialog', async d=>{ letzterText=d.message();
    if(antwort==='accept') await d.accept(); else await d.dismiss(); });

  await page.getByRole('button',{name:'Essen'}).first().click();
  await page.waitForTimeout(600);
  p(`${name}: Mahlzeiten-Knöpfe da`,await page.locator('button.mb2').count()===3);
  const abend=page.locator('button.mb2').nth(2);   // frueh, mittag, abend

  // 1. Antippen — darf NICHT fragen
  letzterText=null;
  await abend.click(); await page.waitForTimeout(500);
  p(`${name}: erstes Abendessen fragt nicht`,letzterText===null,letzterText||'');
  p(`${name}: erstes Abendessen ist erfasst`,(await anzahl(page)).includes('×1'),await anzahl(page));

  // 2. Antippen — MUSS fragen; wir lehnen ab
  letzterText=null; antwort='dismiss';
  await abend.click(); await page.waitForTimeout(500);
  p(`${name}: zweites Abendessen fragt nach`,!!letzterText&&letzterText.includes('schon erfasst'),letzterText||'(keine Rückfrage)');
  p(`${name}: nach Abbrechen weiterhin nur eines`,(await anzahl(page)).includes('×1'),await anzahl(page));

  // 3. Antippen — bestaetigen
  letzterText=null; antwort='accept';
  await abend.click(); await page.waitForTimeout(500);
  p(`${name}: nach Bestätigen sind es zwei`,(await anzahl(page)).includes('×2'),await anzahl(page));

  // Andere Mahlzeit am selben Tag — darf NICHT fragen
  letzterText=null; antwort='dismiss';
  await page.locator('button.mb2').nth(0).click(); await page.waitForTimeout(500);
  p(`${name}: Frühstück am selben Tag fragt nicht`,letzterText===null,letzterText||'');

  await ctx.close();
}
await b.close(); server.close();
const fehl=erg.filter(e=>!e.ok);
console.log(erg.map(e=>(e.ok?'  ok   ':'FEHLER')+' │ '+e.n+(e.d&&!e.ok?'   ← '+e.d:'')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length?1:0);
