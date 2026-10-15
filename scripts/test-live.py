"""Test sito reale. Credenziali temporanee solo in memoria; cleanup in finally."""
import json
import os
import secrets
import subprocess
import sys
import urllib.request
from pathlib import Path

ref = os.environ.get('ROSCIA_PROJECT_REF', 'zpstpgsayhxlddvqzeeo')
site = os.environ.get('ROSCIA_LIVE_URL', 'https://roscia-livid.vercel.app')
token = os.environ.get('SUPABASE_ACCESS_TOKEN')
if not token:
    sys.exit('Configurare SUPABASE_ACCESS_TOKEN nelle impostazioni sicure, non nei file.')

def request(url, headers, method='GET', data=None):
    req = urllib.request.Request(url, headers={**headers, 'Content-Type':'application/json'}, method=method,
        data=json.dumps(data).encode() if data is not None else None)
    with urllib.request.urlopen(req, timeout=45) as response:
        return json.load(response)

keys = request('https://api.supabase.com/v1/projects/'+ref+'/api-keys', {'Authorization':'Bearer '+token})
admin = next(k['api_key'] for k in keys if k.get('name') == 'service_role')
public = next(k['api_key'] for k in keys if k.get('type') == 'publishable')
root = 'https://'+ref+'.supabase.co'
admin_headers = {'Authorization':'Bearer '+admin, 'apikey':admin}
users = []
env = os.environ.copy()
env.update(ROSCIA_LIVE_URL=site, ROSCIA_SUPABASE_URL=root, ROSCIA_PUBLIC_KEY=public)
code = 1
try:
    for tag in ['A', 'B']:
        email = 'roscia-check-'+tag.lower()+'-'+secrets.token_hex(6)+'@example.com'
        password = secrets.token_urlsafe(30)
        user = request(root+'/auth/v1/admin/users', admin_headers, 'POST', {
            'email':email, 'password':password, 'email_confirm':True,
            'user_metadata':{'purpose':'temporary ROSCIA deployment verification'}})
        users.append(user['id'])
        env['ROSCIA_TEST_EMAIL_'+tag] = email
        env['ROSCIA_TEST_PASSWORD_'+tag] = password
    print('Creati due account temporanei; password e token non vengono salvati.', flush=True)
    repo = Path(__file__).resolve().parent.parent
    code = subprocess.run([str(repo/'node_modules/.bin/playwright'), 'test', '--config', 'tests/live.config.mjs', *sys.argv[1:]], cwd=repo, env=env).returncode
finally:
    failures = 0
    for uid in users:
        try:
            request(root+'/auth/v1/admin/users/'+uid, admin_headers, 'DELETE')
        except Exception:
            failures += 1
    if failures:
        print('ATTENZIONE: cleanup incompleto per '+str(failures)+' account temporanei. Verificare Supabase Auth.', file=sys.stderr)
        code = 1
    else:
        print('Account temporanei e relativi progressi eliminati.', flush=True)
sys.exit(code)
