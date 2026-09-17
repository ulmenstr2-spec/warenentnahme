// Prueft PIN-Reset und Kontotrennung im echten Browser gegen einen
// kleinen Server, der sich wie api.php verhaelt.
//
// Beides sind Wege, die ein Nutzer genau einmal geht und die deshalb
// niemandem auffallen, solange sie nicht gebraucht werden:
//
//   1. Wer die PIN vergisst, bekommt eine Mail, landet ueber api.php auf
//      /app/?reset=CODE&email=… — und muss dort eine neue PIN setzen
//      koennen. Bis zum 17.09.2026 gab es fuer diesen Zustand keine
//      Ansicht. Der Nutzer sah ein leeres Fenster und war ausgesperrt.
//
//   2. Melden sich zwei Konten nacheinander auf demselben Geraet an,
//      duerfen die Eintraege des ersten nicht in das Konto des zweiten
//      wandern. Die Zahlen des einen Betriebs in der Steuerdokumentation
//      des anderen faenden beide erst beim Steuerberater.
import http from 'http'; import fs from 'fs';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const W=path.dirname(path.dirname(fileURLToPath(import.meta.url)))+'/';
const APP='/tmp/app-konto.html';
fs.copyFileSync(W+'app.html', APP);
const { execSync } = await import('child_process');
execSync(`node ${W}build.mjs ${APP}`, {stdio:'ignore'});
const REACT=fs.readFileSync(W+'node_modules/react/umd/react.production.min.js');
const REACTDOM=fs.readFileSync(W+'node_modules/react-dom/umd/react-dom.production.min.js');

const RESET_CODE='CODE123';
const KONTEN={
  'alt@example.org': {pin:'1111', token:'token-alt'},
  'neu@example.org': {pin:'2222', token:'token-neu'},
};
let daten={};              // Konto → Nutzlast
let gesetztePin=null;      // was reset_do gespeichert hat
let pushSperre=false;

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
      const kontoVonToken=()=>Object.keys(KONTEN).find(m=>KONTEN[m].token===a.token);
      if(a.action==='login'){
        const k=KONTEN[a.email];
        if(!k||k.pin!==a.pin) return res.end(JSON.stringify({ok:false,error:'PIN falsch'}));
        return res.end(JSON.stringify({ok:true,token:k.token,email:a.email}));
      }
      if(a.action==='reset_do'){
        if(a.code!==RESET_CODE) return res.end(JSON.stringify({ok:false,error:'Ungültiger oder abgelaufener Reset-Link'}));
        if(!a.pin||a.pin.length<4) return res.end(JSON.stringify({ok:false,error:'Neuer PIN mindestens 4 Zeichen'}));
        gesetztePin={email:a.email,pin:a.pin};
        KONTEN[a.email]=KONTEN[a.email]||{token:'token-'+a.email};
        KONTEN[a.email].pin=a.pin;
        return res.end(JSON.stringify({ok:true,token:KONTEN[a.email].token,email:a.email,message:'PIN erfolgreich geändert'}));
      }
      const konto=kontoVonToken();
      if(a.action==='push'){ if(konto&&!pushSperre) daten[konto]=a.data; return res.end(JSON.stringify({ok:true})); }
      if(a.action==='pull'){
        if(!konto||!daten[konto]) return res.end(JSON.stringify({ok:false,empty:true}));
        return res.end(JSON.stringify({ok:true,data:daten[konto]}));
      }
      return res.end(JSON.stringify({ok:true,status:'active'}));
    });
  }
  res.setHeader('Content-Type','text/html'); res.end(fs.readFileSync(APP));
});
await new Promise(r=>server.listen(8109,r));
const b=await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined});
const erg=[]; const p=(n,ok,d='')=>erg.push({n,ok,d});

const mahlzeit=(id,datum)=>({id,type:'abend',datum,monat:datum.slice(0,7),wert:4.57,label:'Abendessen'});
const anzahl=page=>page.evaluate(()=>{
  try{ return (JSON.parse(localStorage.getItem('gt_meals')||'[]')||[]).length; }catch(e){ return -1; }
});

async function starte(adresse, vorbereiten=()=>{}){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  await page.clock.install({time:new Date('2026-09-17T10:00:00')});
  const js=[]; page.on('pageerror',e=>js.push(e.message));
  await page.route('**cdnjs.cloudflare.com/**',r=>{
    const u=r.request().url();
    if(u.includes('/react/'))     return r.fulfill({contentType:'application/javascript',body:REACT});
    if(u.includes('/react-dom/')) return r.fulfill({contentType:'application/javascript',body:REACTDOM});
    return r.fulfill({contentType:'application/javascript',body:''});
  });
  await page.addInitScript(vorbereiten);
  await page.goto(adresse,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>{const s=document.getElementById('splash');
    return !s||getComputedStyle(s).opacity==='0';},{timeout:15000}).catch(()=>{});
  await page.waitForTimeout(1200);
  return {ctx,page,js};
}

// ── 1. PIN-Reset ueber den Link aus der Mail
{
  const {ctx,page,js}=await starte(
    `http://localhost:8109/app/?reset=${RESET_CODE}&email=alt%40example.org`,
    ()=>localStorage.setItem('gt_onb_done','1'));
  p('Reset · App startet ohne JS-Fehler',js.length===0,js.join(' | '));

  // Die Adresse darf den Pfad behalten. Mit '/' fuehrt ein Neuladen aus
  // der App heraus auf die Werbeseite.
  const pfad=new URL(page.url()).pathname;
  p('Reset · Die Adresse bleibt bei /app/',pfad==='/app/',
    `Adresse ist jetzt ${page.url()} — ein Neuladen landet auf der Werbeseite`);
  p('Reset · Der Code steht nicht mehr in der Adresse',
    !page.url().includes(RESET_CODE),page.url());

  const pinFelder=page.locator('input[type=password]');
  const anzFelder=await pinFelder.count();
  p('Reset · Es gibt Felder für die neue PIN',anzFelder>=2,
    `${anzFelder} Passwortfelder gefunden — ohne Formular kann niemand seine PIN ändern`);

  if(anzFelder>=2){
    // Erst absichtlich ungleich, die Rueckfrage muss kommen.
    await pinFelder.nth(0).fill('9999');
    await pinFelder.nth(1).fill('8888');
    await page.getByRole('button',{name:/PIN speichern/}).first().click();
    await page.waitForTimeout(600);
    const txt=await page.evaluate(()=>document.body.innerText);
    p('Reset · Zwei verschiedene PINs werden abgewiesen',
      /nicht überein/i.test(txt) && gesetztePin===null,
      gesetztePin?'die PIN wurde trotzdem gespeichert':'kein Hinweis auf die Abweichung');

    await pinFelder.nth(1).fill('9999');
    await page.getByRole('button',{name:/PIN speichern/}).first().click();
    await page.waitForTimeout(1600);
    p('Reset · Die neue PIN kommt beim Server an',
      gesetztePin?.email==='alt@example.org'&&gesetztePin?.pin==='9999',
      'Server hat empfangen: '+JSON.stringify(gesetztePin));
    p('Reset · Der Nutzer ist danach angemeldet',
      await page.evaluate(()=>localStorage.getItem('gt_auth_token'))==='token-alt',
      'Token im Gerät: '+await page.evaluate(()=>localStorage.getItem('gt_auth_token')));
    p('Reset · Der verbrauchte Code ist gelöscht',
      !await page.evaluate(()=>localStorage.getItem('gt_pending_reset_code')));
  }
  await ctx.close();
}

// ── 2. Kontowechsel auf demselben Geraet
{
  daten={}; gesetztePin=null;
  // Das Geraet gehoert zu alt@, hat drei Mahlzeiten und ist abgemeldet.
  const {ctx,page,js}=await starte('http://localhost:8109/app/',()=>{
    localStorage.setItem('gt_onb_done','1');
    localStorage.setItem('gt_daten_konto','alt@example.org');
    localStorage.setItem('gt_meals',JSON.stringify(
      ['a1','a2','a3'].map((id,i)=>({id,type:'abend',datum:'2026-09-1'+i,monat:'2026-09',wert:4.57,label:'Abendessen'}))));
  });
  p('Kontowechsel · App startet ohne JS-Fehler',js.length===0,js.join(' | '));
  p('Kontowechsel · Das Gerät hält die drei Einträge des alten Kontos',await anzahl(page)===3);

  // Jetzt meldet sich das zweite Konto an. Die Rueckfrage wird bejaht:
  // "OK = entfernen".
  let gefragt=null;
  page.on('dialog',d=>{gefragt=d.message();d.accept();});
  // Der Weg, den ein Nutzer geht: Reiter Import, dann die Kontokarte.
  await page.getByRole('button',{name:'Import'}).first().click();
  await page.waitForTimeout(700);
  await page.getByRole('button',{name:/Konto erstellen/}).first().click();
  await page.waitForTimeout(800);
  await page.locator('input[type=email]').first().fill('neu@example.org');
  await page.locator('input[type=password]').first().fill('2222');
  // "Einloggen" steht zweimal auf der Seite: einmal als Umschaltung
  // zwischen Anmelden und Registrieren, einmal als Absendeknopf. Der
  // Absendeknopf ist der letzte — mit .first() wurde nur die Ansicht
  // umgeschaltet und gar nicht angemeldet.
  await page.getByRole('button',{name:/Einloggen/}).last().click();
  await page.waitForTimeout(2500);

  p('Kontowechsel · Es wird nach den fremden Einträgen gefragt',
    !!gefragt && /alt@example\.org/.test(gefragt||''),
    gefragt?('Rückfrage lautete: '+gefragt.split('\n')[0]):'keine Rückfrage — die Einträge wandern kommentarlos mit');
  p('Kontowechsel · Nach dem Bestätigen sind sie vom Gerät verschwunden',
    await anzahl(page)===0, `noch ${await anzahl(page)} Einträge`);
  p('Kontowechsel · Das neue Konto hat sie nicht auf dem Server',
    !daten['neu@example.org']?.meals?.length,
    `Server von neu@example.org hält ${daten['neu@example.org']?.meals?.length} Mahlzeiten — `+
    `die Entnahmen des anderen Betriebs sind in dessen Steuerdokumentation gelandet`);
  p('Kontowechsel · Das Gerät gehört jetzt zum neuen Konto',
    await page.evaluate(()=>localStorage.getItem('gt_daten_konto'))==='neu@example.org');

  await ctx.close();
}

await b.close(); server.close();
const fehl=erg.filter(e=>!e.ok);
console.log(erg.map(e=>(e.ok?'  ok   ':'FEHLER')+' │ '+e.n+(e.d&&!e.ok?'\n         ← '+e.d:'')).join('\n'));
console.log(`\n${erg.length} Prüfungen, ${fehl.length} fehlgeschlagen`);
process.exit(fehl.length?1:0);
