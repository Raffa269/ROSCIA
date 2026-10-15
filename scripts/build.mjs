import {mkdir, readFile, writeFile, copyFile, rm} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const fallback = {window:{}};
vm.runInNewContext(await readFile('config.js','utf8'), fallback);
const url = (process.env.SUPABASE_URL || fallback.window.ROSCIA_CONFIG.supabaseUrl || '').trim();
const key = (process.env.SUPABASE_PUBLISHABLE_KEY || fallback.window.ROSCIA_CONFIG.supabaseAnonKey || '').trim();
if (Boolean(url) !== Boolean(key)) throw Error('Servono entrambi SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.');
if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw Error('SUPABASE_URL non valido.');
if (key) {
  let publicKey = key.startsWith('sb_publishable_');
  if (key.startsWith('eyJ')) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; } catch {}
  }
  if (!publicKey) throw Error('Usare solo una chiave Supabase publishable oppure anon.');
}
if (!url) {
  if (process.env.VERCEL) throw Error('Configurare Supabase prima di pubblicare su Vercel.');
  console.warn('Build locale senza Supabase: disponibile soltanto anteprima locale.');
}
await rm('dist', {recursive:true,force:true});
await mkdir('dist/vendor', {recursive:true});
for (const name of ['index.html','cloud.js','offline.js']) await copyFile(name, 'dist/'+name);
await writeFile('dist/config.js', 'window.ROSCIA_CONFIG = '+JSON.stringify({supabaseUrl:url,supabaseAnonKey:key},null,2)+';\n');
await build({entryPoints:['node_modules/@supabase/supabase-js/dist/index.mjs'],bundle:true,format:'iife',globalName:'supabase',minify:true,outfile:'dist/vendor/supabase.js',legalComments:'eof'});
console.log('Build statica pronta in dist/. Nessun segreto incluso.');

const hash=createHash('sha256');
for(const file of ['index.html','config.js','cloud.js','offline.js','vendor/supabase.js']) hash.update(await readFile('dist/'+file));
await writeFile('dist/sw.js',(await readFile('scripts/sw-template.js','utf8')).replace('__VERSION__',hash.digest('hex').slice(0,16)));
