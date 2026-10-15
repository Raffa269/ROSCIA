import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
// Gli errori sono verificati prima di modificare dist/.
for(const [name,key] of [['secret','sb_secret_test-do-not-use'],['service_role',['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url'),'test'].join('.')]]){
 test('build rifiuta chiave '+name,()=>{
  const r=spawnSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,SUPABASE_URL:'https://test-project.supabase.co',SUPABASE_PUBLISHABLE_KEY:key},encoding:'utf8'});
  assert.notEqual(r.status,0);assert.match(r.stderr,/solo una chiave Supabase publishable oppure anon/);
 });
}
test('Vercel rifiuta deployment senza configurazione Supabase',()=>{
 const r=spawnSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,VERCEL:'1',SUPABASE_URL:'',SUPABASE_PUBLISHABLE_KEY:''},encoding:'utf8'});
 assert.notEqual(r.status,0);assert.match(r.stderr,/Configurare Supabase prima di pubblicare/);
});
