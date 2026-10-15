import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const required=['ROSCIA_TEST_EMAIL_A','ROSCIA_TEST_PASSWORD_A','ROSCIA_TEST_EMAIL_B','ROSCIA_TEST_PASSWORD_B','ROSCIA_SUPABASE_URL','ROSCIA_PUBLIC_KEY'];
for(const name of required)if(!process.env[name])throw Error('Manca variabile di test '+name);
async function login(p,account='A'){
 await p.goto('/');await expect(p.locator('#cloudSetup')).toBeHidden();
 await p.locator('#cloudEmail').fill(process.env['ROSCIA_TEST_EMAIL_'+account]);await p.locator('#cloudPassword').fill(process.env['ROSCIA_TEST_PASSWORD_'+account]);await p.locator('#cloudSignIn').click();await expect(p.locator('#cloudGate')).toBeHidden({timeout:20000});
}
async function sync(p){await expect(p.locator('#storageInfo')).toHaveText('✓ Cloud sincronizzato',{timeout:20000});}
async function pull(p){await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));}
async function restore(p,backup){p.once('dialog',d=>d.accept());await p.locator('#restoreFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await sync(p);}

test('sito HTTPS reale: login, due browser, autosave, backup, refresh, offline e mobile',async({browser})=>{
 const ca=await browser.newContext({serviceWorkers:'allow'}),cb=await browser.newContext({serviceWorkers:'allow',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const a=await ca.newPage(),b=await cb.newPage();const errors=[];a.on('pageerror',e=>errors.push(e.message));b.on('pageerror',e=>errors.push(e.message));
 const response=await a.goto('/');expect(response.status()).toBe(200);expect(new URL(a.url()).protocol).toBe('https:');expect(response.headers()['x-content-type-options']).toBe('nosniff');
 await a.locator('#cloudEmail').fill(process.env.ROSCIA_TEST_EMAIL_A);await a.locator('#cloudPassword').fill('invalid-password');await a.locator('#cloudSignIn').click();await expect(a.locator('#cloudMessage')).toContainText('Accesso non riuscito');
 await login(a);await login(b);await expect(a.locator('#overviewGrid button')).toHaveCount(30);
 for(const status of ['partial','done','todo']){
  await a.locator(`[data-step="0"][data-set="${status}"]`).click();await sync(a);await pull(b);await expect(b.locator(`[data-step="0"][data-set="${status}"]`)).toHaveAttribute('aria-pressed','true');
 }
 await a.locator('[data-note-toggle="0"]').click();await a.locator('#note_0').fill('Nota attività verificata ✓');
 for(const [id,value] of [['dayDecision','Decisione approvata'],['dayNotes','Nota di prova <script>throw 1</script>'],['dayLinks','https://example.com/asset'],['dayResults','150 visualizzazioni']])await a.locator('#'+id).fill(value);
 await sync(a);await pull(b);await expect(b.locator('#note_0')).toHaveValue('Nota attività verificata ✓');await expect(b.locator('#dayResults')).toHaveValue('150 visualizzazioni');
 await a.reload();await expect(a.locator('#cloudGate')).toBeHidden({timeout:20000});await expect(a.locator('#dayLinks')).toHaveValue('https://example.com/asset');
 const downloadP=a.waitForEvent('download');await a.locator('#exportJson').click();const download=await downloadP;const backup=JSON.parse(await readFile(await download.path(),'utf8'));expect(backup.days['1'].results).toBe('150 visualizzazioni');
 await a.locator('#dayNotes').fill('Da sostituire');await a.locator('[data-step="4"][data-set="done"]').click();await sync(a);await restore(a,backup);await pull(b);await expect(b.locator('#dayNotes')).toHaveValue(backup.days['1'].notes);await expect(b.locator('[data-step="4"][data-set="todo"]')).toHaveAttribute('aria-pressed','true');
 await a.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
 await ca.setOffline(true);await a.locator('#dayNotes').fill('Modifica senza rete');await a.locator('[data-step="2"][data-set="partial"]').click();await a.reload();await expect(a.locator('#cloudGate')).toBeHidden({timeout:15000});await expect(a.locator('#dayNotes')).toHaveValue('Modifica senza rete');
 await ca.setOffline(false);await sync(a);await pull(b);await expect(b.locator('#dayNotes')).toHaveValue('Modifica senza rete');await expect(b.locator('[data-step="2"][data-set="partial"]')).toHaveAttribute('aria-pressed','true');
 await b.locator('#dayResults').fill('Risultato scritto da mobile');await sync(b);await pull(a);await expect(a.locator('#dayResults')).toHaveValue('Risultato scritto da mobile');
 await b.locator('#overviewGrid [data-day="30"]').click();await expect(b.locator('#taskList article')).toHaveCount(5);await b.locator('#dayNotes').fill('Giorno 30 da mobile');await sync(b);await b.reload();await expect(b.locator('#cloudGate')).toBeHidden({timeout:20000});await expect(b.locator('#dayNotes')).toHaveValue('Giorno 30 da mobile');expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await b.screenshot({path:'test-results/live-mobile.png',fullPage:true});
 a.once('dialog',d=>d.accept());await a.locator('#cloudAccountBtn').click();await expect(a.locator('#cloudGate')).toBeVisible();await a.locator('#cloudDemo').click();await expect(a.locator('#dayNotes')).toHaveValue('');
 expect(errors).toEqual([]);await ca.close();await cb.close();
});

test('RLS Supabase reale: utenti separati e richieste dirette non autorizzate',async({browser})=>{
 const ca=await browser.newContext(),cb=await browser.newContext();const a=await ca.newPage(),b=await cb.newPage();await login(a);await a.locator('#dayNotes').fill('Sentinella privata A');await sync(a);await login(b,'B');await expect(b.locator('#dayNotes')).toHaveValue('');
 // I token rimangono nella memoria del browser. Nessun valore viene stampato.
 async function session(p){return p.evaluate(()=>{const k=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k));return JSON.parse(localStorage.getItem(k));});}
 const sa=await session(a),sb=await session(b);expect(sa.user.id).not.toBe(sb.user.id);
 const result=await b.evaluate(async({url,key,otherId})=>{
  const k=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k));const session=JSON.parse(localStorage.getItem(k));const root=url+'/rest/v1/roscia_tracker_values';
  const headers={apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',Prefer:'return=representation'};
  const read=await fetch(root+'?user_id=eq.'+otherId,{headers});const visible=await read.json();
  const insert=await fetch(root,{method:'POST',headers,body:JSON.stringify({user_id:otherId,field_key:'d:2:notes',value:'tentativo non autorizzato'})});
  const update=await fetch(root+'?user_id=eq.'+otherId,{method:'PATCH',headers,body:JSON.stringify({value:'tentativo non autorizzato'})});const updated=await update.json();
  const anon=await fetch(root,{headers:{apikey:key}});
  return {read:read.status,visible,insert:insert.status,update:update.status,updated,anonymous:anon.status};
 },{url:process.env.ROSCIA_SUPABASE_URL,key:process.env.ROSCIA_PUBLIC_KEY,otherId:sa.user.id});
 expect(result.read).toBe(200);expect(result.visible).toEqual([]);expect(result.insert).toBe(403);expect(result.update).toBe(200);expect(result.updated).toEqual([]);expect([401,403]).toContain(result.anonymous);
 await b.locator('#dayNotes').fill('Privato B');await sync(b);await a.reload();await expect(a.locator('#cloudGate')).toBeHidden({timeout:20000});await expect(a.locator('#dayNotes')).toHaveValue('Sentinella privata A');await ca.close();await cb.close();
});
