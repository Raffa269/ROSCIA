import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const host='https://test-project.supabase.co';
const uidA='00000000-0000-4000-8000-000000000001',uidB='00000000-0000-4000-8000-000000000002';
function session(id){const user={id,aud:'authenticated',role:'authenticated',email:id===uidA?'a@example.test':'b@example.test',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-signature'].join('.');return {access_token:token,refresh_token:'refresh-'+id,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user};}
function fakeCloud(){
 const rows=new Map();const control={delayGet:null,delayPost:null,fail:false,updates:0};
 return {rows,control,async attach(context){
 await context.route('**/config.js',route=>route.fulfill({contentType:'application/javascript',body:`window.ROSCIA_CONFIG=${JSON.stringify({supabaseUrl:host,supabaseAnonKey:'sb_publishable_abcdefghijklmnopqrstuvwxyz0123456789'})};`}));
 await context.route(host+'/**',async route=>{
  const req=route.request(),url=new URL(req.url());const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(control.fail)return route.abort('internetdisconnected');
  if(url.pathname.endsWith('/token')){const data=req.postDataJSON();if(data.password==='wrong-password')return json({msg:'Invalid login credentials'},400);return json(session(data.email==='b@example.test'?uidB:uidA));}
  const bearer=req.headers().authorization?.replace('Bearer ','');let id;try{id=JSON.parse(Buffer.from(bearer.split('.')[1],'base64url')).sub;}catch{}
  if(url.pathname.endsWith('/user'))return json(session(id||uidA).user);
  if(url.pathname.endsWith('/logout'))return json({});
  if(url.pathname.endsWith('/signup'))return json({user:session(uidA).user,session:null});
  if(url.pathname.endsWith('/recover'))return json({});
  if(url.pathname.includes('/rest/v1/roscia_tracker_values')){
   if(!id)return json({message:'unauthorized'},401);
   if(req.method()==='GET'){
    const result=[...rows.values()].filter(r=>r.user_id===id).map(({field_key,value})=>({field_key,value}));
    if(control.delayGet){const promise=control.delayGet;control.delayGet=null;await promise;}
    return json(result);
   }
   if(req.method()==='POST'){
    if(control.delayPost){const promise=control.delayPost;control.delayPost=null;await promise;}
    const batch=req.postDataJSON();if(batch.some(r=>r.user_id!==id))return json({message:'RLS'},403);
    for(const row of batch)rows.set(row.user_id+'|'+row.field_key,row);control.updates++;
    return route.fulfill({status:201,body:''});
   }
  }
  return json({message:'Unexpected request '+url.pathname},404);
 });
 }};
}
async function login(page,email='a@example.test'){
 await page.goto('/');await page.locator('#cloudEmail').fill(email);await page.locator('#cloudPassword').fill('test-password-only');await page.locator('#cloudSignIn').click();await expect(page.locator('#cloudGate')).toBeHidden();
}
async function sync(page){await expect(page.locator('#storageInfo')).toHaveText('✓ Cloud sincronizzato');}
async function poll(page){await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));}
async function signOut(page){page.once('dialog',d=>d.accept());await page.locator('#cloudAccountBtn').click();await expect(page.locator('#cloudGate')).toBeVisible();}
async function nextLogin(page,email){await page.locator('#cloudEmail').fill(email);await page.locator('#cloudPassword').fill('test-password-only');await page.locator('#cloudSignIn').click();await expect(page.locator('#cloudGate')).toBeHidden();}

test('anteprima: stati, 30 giorni, backup/ripristino e mobile senza overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('#cloudDemo').click();
 await expect(page.locator('#overviewGrid button')).toHaveCount(30);
 await page.locator('[data-step="0"][data-set="partial"]').click();await page.locator('[data-step="1"][data-set="done"]').click();
 await page.locator('#dayNotes').fill('Nota locale <script>alert(1)</script>');
 await page.reload();await page.locator('#cloudDemo').click();
 await expect(page.locator('[data-step="0"][data-set="partial"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#dayNotes')).toHaveValue('Nota locale <script>alert(1)</script>');
 const downloadPromise=page.waitForEvent('download');await page.locator('#exportJson').click();const download=await downloadPromise;const backup=JSON.parse(await readFile(await download.path(),'utf8'));
 expect(backup.tasks['0_0']).toBeUndefined();expect(backup.tasks['1_0'].status).toBe('partial');
 await page.locator('#dayNotes').fill('Modificata');page.once('dialog',d=>d.accept());
 await page.locator('#restoreFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await expect(page.locator('#dayNotes')).toHaveValue(backup.days['1'].notes);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/mobile-dashboard.png',fullPage:true});
});

test('cloud simulato: due browser, stati e tutti i campi, refresh e persistenza',async({browser})=>{
 const cloud=fakeCloud();const ca=await browser.newContext(),cb=await browser.newContext();await cloud.attach(ca);await cloud.attach(cb);const a=await ca.newPage(),b=await cb.newPage();
 await login(a);await login(b);
 for(const status of ['partial','done','todo']){
  await a.locator(`[data-step="0"][data-set="${status}"]`).click();await sync(a);await poll(b);await expect(b.locator(`[data-step="0"][data-set="${status}"]`)).toHaveAttribute('aria-pressed','true');
 }
 await a.locator('[data-note-toggle="0"]').click();await a.locator('#note_0').fill('Nota attività');
 for(const [id,value] of [['dayDecision','Decisione'],['dayNotes','Nota giorno'],['dayLinks','https://example.test/asset'],['dayResults','100 views']])await a.locator('#'+id).fill(value);
 await sync(a);await poll(b);await expect(b.locator('#dayNotes')).toHaveValue('Nota giorno');await expect(b.locator('#note_0')).toHaveValue('Nota attività');
 await b.reload();await expect(b.locator('#cloudGate')).toBeHidden();await expect(b.locator('#dayLinks')).toHaveValue('https://example.test/asset');await expect(b.locator('#dayResults')).toHaveValue('100 views');
 await b.locator('[data-step="1"][data-set="done"]').click();await sync(b);await poll(a);await expect(a.locator('[data-step="1"][data-set="done"]')).toHaveAttribute('aria-pressed','true');
 expect(cloud.rows.get(uidA+'|d:1:decision').value).toBe('Decisione');await ca.close();await cb.close();
});

test('offline: coda conservata dopo refresh e sincronizzazione alla riconnessione',async({browser})=>{
 const cloud=fakeCloud(),context=await browser.newContext();await cloud.attach(context);const p=await context.newPage();await login(p);
 cloud.control.fail=true;await p.evaluate(()=>window.dispatchEvent(new Event('offline')));
 await p.locator('#dayNotes').fill('Nota offline da recuperare');await p.locator('[data-step="2"][data-set="partial"]').click();
 await expect.poll(()=>p.evaluate(()=>JSON.parse(localStorage.getItem('roscia.cloud.v1.queue.'+'00000000-0000-4000-8000-000000000001'))['d:1:notes'])).toBe('Nota offline da recuperare');
 await p.reload();await expect(p.locator('#cloudGate')).toBeHidden();await expect(p.locator('#dayNotes')).toHaveValue('Nota offline da recuperare');
 cloud.control.fail=false;await p.evaluate(()=>window.dispatchEvent(new Event('online')));await sync(p);
 expect(cloud.rows.get(uidA+'|d:1:notes').value).toBe('Nota offline da recuperare');await context.close();
});

test('isolamento locale: logout, altro account e demo non ereditano dati privati',async({browser})=>{
 const cloud=fakeCloud(),context=await browser.newContext();await cloud.attach(context);const p=await context.newPage();await login(p);
 await p.locator('#dayNotes').fill('Privato A');await sync(p);await signOut(p);
 await p.locator('#cloudDemo').click();await expect(p.locator('#dayNotes')).toHaveValue('');await p.locator('#cloudAccountBtn').click();
 await nextLogin(p,'b@example.test');await expect(p.locator('#dayNotes')).toHaveValue('');
 await p.locator('#dayNotes').fill('Privato B');await sync(p);expect(cloud.rows.get(uidA+'|d:1:notes').value).toBe('Privato A');expect(cloud.rows.get(uidB+'|d:1:notes').value).toBe('Privato B');
 await signOut(p);await nextLogin(p,'a@example.test');await expect(p.locator('#dayNotes')).toHaveValue('Privato A');await context.close();
});

test('risposta di lettura tardiva non sovrascrive una modifica appena salvata',async({browser})=>{
 const cloud=fakeCloud(),context=await browser.newContext();await cloud.attach(context);const p=await context.newPage();await login(p);
 let release;cloud.control.delayGet=new Promise(r=>release=r);const request=p.waitForRequest(r=>r.url().includes('/rest/')&&r.method()==='GET');await poll(p);await request;
 await p.locator('#dayNotes').fill('Ultima modifica');await sync(p);release();await p.waitForTimeout(300);await expect(p.locator('#dayNotes')).toHaveValue('Ultima modifica');await context.close();
});

test('ripristino JSON cloud: sostituisce anche stati precedenti e resiste al refresh',async({browser})=>{
 const cloud=fakeCloud(),context=await browser.newContext();await cloud.attach(context);const p=await context.newPage();await login(p);
 await p.locator('[data-step="4"][data-set="done"]').click();await p.locator('#dayLinks').fill('Vecchio link');await sync(p);
 const backup={version:1,tasks:{'30_4':{status:'partial',note:'Ultima attività'}},days:{30:{results:'Risultato importato'}},selectedDay:30};p.once('dialog',d=>d.accept());await p.locator('#restoreFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await sync(p);
 expect(cloud.rows.get(uidA+'|t:1:4:status').value).toBe('todo');expect(cloud.rows.get(uidA+'|d:1:links').value).toBe('');await p.reload();await expect(p.locator('#cloudGate')).toBeHidden();await expect(p.locator('#dayResults')).toHaveValue('Risultato importato');await context.close();
});

test('rete realmente interrotta: pagina demo riaperta dalla cache offline',async({browser})=>{
 const c=await browser.newContext({serviceWorkers:'allow'}),p=await c.newPage();await p.goto('/');await p.locator('#cloudDemo').click();await p.locator('#dayNotes').fill('Nota prima della disconnessione');
 await p.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
 await c.setOffline(true);await p.reload();await p.locator('#cloudDemo').click();await expect(p.locator('#dayNotes')).toHaveValue('Nota prima della disconnessione');await p.locator('#dayResults').fill('Risultato senza rete');await p.reload();await p.locator('#cloudDemo').click();await expect(p.locator('#dayResults')).toHaveValue('Risultato senza rete');await c.close();
});

test('login errato e ripristino JSON malformato mostrano errori senza perdere dati',async({browser})=>{
 const cloud=fakeCloud(),c=await browser.newContext();await cloud.attach(c);const p=await c.newPage();await p.goto('/');await p.locator('#cloudEmail').fill('a@example.test');await p.locator('#cloudPassword').fill('wrong-password');await p.locator('#cloudSignIn').click();await expect(p.locator('#cloudMessage')).toContainText('Accesso non riuscito');await expect(p.locator('#cloudGate')).toBeVisible();
 await nextLogin(p,'a@example.test');await p.locator('#dayNotes').fill('Conservare');await sync(p);
 const dialog=p.waitForEvent('dialog');await p.locator('#restoreFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"tasks":[],"days":{}}')});const d=await dialog;expect(d.message()).toContain('Formato non riconosciuto');await d.accept();await expect(p.locator('#dayNotes')).toHaveValue('Conservare');await c.close();
});
