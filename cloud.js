/* ROSCIA Growth Tracker — Supabase authentication and field-level cloud sync.
   Auth and persistence are disabled unless a real Supabase project is configured.
   Public/anon key only. Server enforces per-account RLS policies from database.sql. */
(function () {
  'use strict';
  const cfg = window.ROSCIA_CONFIG || {};
  const gate = document.getElementById('cloudGate');
  const setup = document.getElementById('cloudSetup');
  const form = document.getElementById('cloudAuthForm');
  const email = document.getElementById('cloudEmail');
  const password = document.getElementById('cloudPassword');
  const signIn = document.getElementById('cloudSignIn');
  const signUp = document.getElementById('cloudSignUp');
  const forgot = document.getElementById('cloudForgot');
  const demo = document.getElementById('cloudDemo');
  const accountBtn = document.getElementById('cloudAccountBtn');
  const msg = document.getElementById('cloudMessage');
  const cloudLabel = document.getElementById('storageInfo');
  const saveLabel = document.getElementById('saveState');
  const NAMESPACE = 'roscia.cloud.v1.';
  const FIELDS = ['decision', 'notes', 'links', 'results'];
  const configured = /^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test((cfg.supabaseUrl || '').trim()) &&
    typeof cfg.supabaseAnonKey === 'string' && cfg.supabaseAnonKey.length > 30;
  let sb = null, userId = null, ready = false, demoMode = false;
  let pending = {}, lastSeen = {}, busy = false, sendingTimer = null, reloadTimer = null;
  let updateSeq = 0, dirtySince = 0, recoveringPassword = false;

  function setMessage(v, error = false) {
    msg.textContent = v || '';
    msg.style.color = error ? '#ffaaa7' : '#cbe6c7';
  }
  function label(t, online = false) {
    cloudLabel.textContent = t;
    saveLabel.textContent = t;
    accountBtn.textContent = userId ? '☁ Account · ' + (online ? 'connesso' : 'offline') : '☁ Connetti';
    accountBtn.classList.toggle('cloud-account-online', Boolean(userId && online));
    accountBtn.classList.toggle('cloud-account-offline', Boolean(userId && !online));
  }
  function localStoreKey() { return NAMESPACE + 'cache.' + userId; }
  function queueStoreKey() { return NAMESPACE + 'queue.' + userId; }
  function savePending() {
    if (!userId) return;
    try { localStorage.setItem(queueStoreKey(), JSON.stringify(pending)); }
    catch (_) { label('⚠ Memoria del browser non disponibile'); }
  }
  function asMap(s) {
    const result = {};
    for (let d = 1; d <= 30; d++) {
      const day = s.days[d] || {};
      for (const f of FIELDS) result['d:' + d + ':' + f] = String(day[f] || '');
      for (let i = 0; i < 5; i++) {
        const t = s.tasks[d + '_' + i] || {};
        result['t:' + d + ':' + i + ':status'] = ['todo', 'partial', 'done'].includes(t.status) ? t.status : 'todo';
        result['t:' + d + ':' + i + ':note'] = String(t.note || '');
      }
    }
    return result;
  }
  function toState(map) {
    const clean = initial();
    clean.selectedDay = state.selectedDay;
    for (let d = 1; d <= 30; d++) {
      const dd = {};
      for (const f of FIELDS) if (map['d:' + d + ':' + f]) dd[f] = String(map['d:' + d + ':' + f]);
      if (Object.keys(dd).length) clean.days[d] = dd;
      for (let i = 0; i < 5; i++) {
        const status = map['t:' + d + ':' + i + ':status'];
        const note = map['t:' + d + ':' + i + ':note'];
        if ((status && status !== 'todo') || note) clean.tasks[d + '_' + i] = {
          ...(status && status !== 'todo' ? {status} : {}), ...(note ? {note} : {})
        };
      }
    }
    return clean;
  }
  function rehydrate(map) {
    state = toState(map);
    renderAll();
    // Original save() persists local cache; suppress the cloud callback through lastSeen.
    lastSeen = asMap(state);
    try { localStorage.setItem(localStoreKey(), JSON.stringify(state)); }
    catch (_) { /* account can still use Supabase */ }
    save();
  }
  function onLocalSave() {
    if (!ready || !userId || demoMode) return;
    const current = asMap(state);
    let changed = 0;
    for (const key of Object.keys(current)) {
      if (current[key] !== lastSeen[key]) {
        pending[key] = current[key];
        changed++;
      }
    }
    lastSeen = current;
    if (changed) {
      dirtySince = Date.now();
      updateSeq++;
      savePending();
      try { localStorage.setItem(localStoreKey(), JSON.stringify(state)); } catch (_) {}
      label('● Modifiche in attesa di sincronizzazione');
      schedulePush();
    }
  }
  window.ROSCIA_CLOUD_ENGINE = { onLocalSave };

  function schedulePush(delay = 1000) {
    clearTimeout(sendingTimer);
    if (!Object.keys(pending).length || !userId) return;
    sendingTimer = setTimeout(push, delay);
  }
  async function push() {
    if (!ready || !sb || !userId || busy || !navigator.onLine) {
      if (ready && Object.keys(pending).length) label('● Modifiche conservate offline');
      return;
    }
    const uid = userId;
    const sent = {...pending};
    const keys = Object.keys(sent);
    if (!keys.length) { label('✓ Cloud sincronizzato', true); return; }
    busy = true;
    label('↻ Invio delle modifiche al cloud…', true);
    try {
      // Small batches: safer on mobile and avoids giant POST payloads for imports.
      for (let n = 0; n < keys.length; n += 60) {
        if (uid !== userId) throw new Error('Account cambiato durante il salvataggio.');
        const batch = keys.slice(n, n + 60).map(k => ({ user_id:uid, field_key:k, value:sent[k] }));
        const {error} = await sb.from('roscia_tracker_values').upsert(batch, { onConflict:'user_id,field_key' });
        if (error) throw error;
        // Do not remove newer changes made while this request was being sent.
        for (const k of keys.slice(n,n+60)) if (pending[k] === sent[k]) delete pending[k];
        savePending();
      }
      if (uid === userId) label(Object.keys(pending).length ? '● Nuove modifiche in attesa' : '✓ Cloud sincronizzato', true);
    } catch (err) {
      if (uid === userId) label('⚠ Cloud non raggiungibile · dati conservati sul PC');
      console.warn('ROSCIA sync failed:', err);
    } finally {
      busy = false;
      if (Object.keys(pending).length && navigator.onLine) schedulePush(4000);
    }
  }
  async function pull() {
    if (!sb || !userId || !navigator.onLine || busy) return;
    const uid = userId;
    const {data, error} = await sb.from('roscia_tracker_values').select('field_key,value').eq('user_id', uid).range(0,999);
    if (error) throw error;
    if (uid !== userId) return;
    const remote = {};
    for (const entry of data || []) remote[entry.field_key] = entry.value;
    const merged = {...asMap(initial()), ...remote, ...pending};
    // Avoid re-rendering and losing keyboard focus if state didn't change.
    const now = asMap(state);
    const different = Object.keys(merged).some(key => String(merged[key]) !== String(now[key]));
    if (different) rehydrate(merged);
    else lastSeen = now;
    return Object.keys(remote).length;
  }
  async function getSession() {
    const {data, error} = await sb.auth.getSession();
    if (error) throw error;
    return data.session;
  }
  function countLocalEdits(s) {
    const m = asMap(s);
    return Object.entries(m).filter(([k, v]) => (k.endsWith(':status') ? v !== 'todo' : v !== '')).length;
  }
  async function openAccount(session) {
    userId = session.user.id;
    ready = false;
    setMessage('Caricamento progressi…');
    gate.hidden = false;
    pending = {};
    try { pending = JSON.parse(localStorage.getItem(queueStoreKey()) || '{}') || {}; } catch (_) { pending = {}; }
    try {
      // Check cloud before adopting any local content: do not leak someone else's data.
      const {data, error} = await sb.from('roscia_tracker_values').select('field_key,value').eq('user_id',userId).range(0,999);
      if (error) throw error;
      const remote = {};
      for (const item of data || []) remote[item.field_key] = item.value;
      const currentActivity = countLocalEdits(state);
      const safeLocal = (() => { try { return JSON.parse(localStorage.getItem(localStoreKey()) || 'null'); } catch (_) { return null; } })();
      const accountLocal = safeLocal && safeLocal.version === 1 ? asMap(safeLocal) : {};
      // If first login on account and the user previously used offline tracker,
      // offer one-time import rather than silently uploading legacy data.
      if (!Object.keys(remote).length && !Object.keys(pending).length && !Object.keys(accountLocal).length && currentActivity) {
        const importOld = confirm('Ho trovato progressi salvati in questa dashboard. Vuoi importarli in questo nuovo account cloud?\n\nOK = importa nel cloud. Annulla = inizia con 0 progressi.');
        if (importOld) {
          const oldMap = asMap(state);
          for (const [k,v] of Object.entries(oldMap)) {
            if (k.endsWith(':status') ? v !== 'todo' : v !== '') pending[k] = v;
          }
          savePending();
        }
      }
      // Preserve unsent edits from this same account only.
      const merged = {...asMap(initial()), ...remote, ...accountLocal, ...pending};
      // Remote wins over old local cache for already synced fields.
      Object.assign(merged, remote, pending);
      rehydrate(merged);
      ready = true;
      demoMode = false;
      gate.hidden = true;
      setMessage('');
      label(Object.keys(pending).length ? '● Modifiche in attesa' : '✓ Cloud sincronizzato', true);
      schedulePush(100);
    } catch (err) {
      // Only permit offline editing with previously established cache for THIS user.
      const cached = (() => { try { return JSON.parse(localStorage.getItem(localStoreKey()) || 'null'); } catch (_) { return null; } })();
      if (cached && cached.version === 1 && typeof cached.tasks === 'object' && typeof cached.days === 'object') {
        const map = {...asMap(cached), ...pending};
        rehydrate(map);
        ready = true;
        gate.hidden = true;
        label('⚠ Offline: modifiche conservate sul PC');
      } else {
        ready = false;
        label('⚠ Impossibile accedere ai dati cloud');
        setMessage('Connessione al database non riuscita: '+(err.message || String(err))+'. Verifica di aver eseguito database.sql.', true);
      }
    }
  }
  async function signOut() {
    try {
      if (Object.keys(pending).length) await push();
      await sb.auth.signOut();
    } catch (e) { console.warn('Sign out:',e); }
    ready = false;
    userId = null;
    pending = {};
    lastSeen = {};
    state = initial();
    renderAll();
    save();
    gate.hidden = false;
    label('● Non connesso');
  }
  function allowDemo() {
    demoMode = true;
    ready = false;
    gate.hidden = true;
    label('⚠ Modalità locale · non sincronizzato');
  }
  function showAuthPanel() {
    gate.hidden = false;
    setMessage('');
  }
  demo.addEventListener('click', allowDemo);
  accountBtn.addEventListener('click', () => {
    if (userId && ready) {
      if (confirm('Disconnettere questo account? Prima di uscire verifica che il cloud sia sincronizzato.')) signOut();
    } else showAuthPanel();
  });
  if (!configured) {
    setup.hidden = false;
    setMessage('L’app non è ancora collegata a un database cloud. Segui la guida di installazione.');
    form.hidden = true;
    signUp.hidden = true;
    forgot.hidden = true;
    label('⚠ Cloud da configurare');
    return;
  }
  if (!window.supabase?.createClient) {
    setup.hidden = false;
    setup.textContent = 'Impossibile caricare la libreria Supabase. Controlla la connessione Internet o gli eventuali blocchi del browser.';
    form.hidden = true;
    signUp.hidden = true;
    forgot.hidden = true;
    label('⚠ Libreria cloud non caricata');
    return;
  }
  try {
    sb = window.supabase.createClient(cfg.supabaseUrl.trim().replace(/\/$/, ''), cfg.supabaseAnonKey.trim(), {
      auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
    });
  } catch (err) {
    setup.hidden = false;
    setup.textContent = 'Configurazione Supabase non valida: '+err.message;
    form.hidden = true;
    return;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    signIn.disabled = true;
    if (recoveringPassword) {
      try {
        const {error} = await sb.auth.updateUser({password:password.value});
        if (error) throw error;
        recoveringPassword = false;
        signIn.textContent = 'Accedi e sincronizza';
        setMessage('Password aggiornata. Puoi accedere normalmente.');
        const session = await getSession();
        if (session) await openAccount(session);
      } catch(err) { setMessage('Errore durante l’aggiornamento password: '+err.message, true); }
      finally { signIn.disabled = false; }
      return;
    }
    setMessage('Accesso in corso…');
    try {
      const {data, error} = await sb.auth.signInWithPassword({email:email.value.trim(), password:password.value});
      if (error) throw error;
      await openAccount(data.session);
    } catch (err) { setMessage('Accesso non riuscito: '+(err.message || err), true); }
    finally { signIn.disabled = false; }
  });
  signUp.addEventListener('click', async () => {
    if (!email.checkValidity() || password.value.length < 6) {
      setMessage('Inserisci una email valida e una password di almeno 6 caratteri.', true); return;
    }
    signUp.disabled = true;
    setMessage('Creazione account in corso…');
    try {
      const {data, error} = await sb.auth.signUp({email:email.value.trim(),password:password.value,options:{emailRedirectTo:location.origin+location.pathname}});
      if (error) throw error;
      if (data.session) await openAccount(data.session);
      else setMessage('Account creato. Controlla la tua email e conferma il link; poi torna qui e accedi.');
    } catch (err) { setMessage('Creazione account non riuscita: '+(err.message || err), true); }
    finally { signUp.disabled = false; }
  });
  forgot.addEventListener('click', async () => {
    if (!email.checkValidity()) {setMessage('Inserisci prima il tuo indirizzo email.',true);return;}
    try {
      const {error} = await sb.auth.resetPasswordForEmail(email.value.trim(), {redirectTo:location.origin+location.pathname});
      if (error) throw error;
      setMessage('Se l’indirizzo è registrato riceverai un’email con le istruzioni.');
    } catch (err) { setMessage('Ripristino password non disponibile: '+err.message, true); }
  });
  sb.auth.onAuthStateChange((_event, session) => {
    // Do not perform auth API calls inside this callback; handle normal login
    // explicitly and session recovery once at startup.
    if (_event === 'PASSWORD_RECOVERY') {
      recoveringPassword = true;
      gate.hidden = false;
      form.hidden = false;
      signIn.textContent = 'Salva nuova password';
      document.getElementById('cloudTitle').textContent = 'Imposta una nuova password';
      document.getElementById('cloudDescription').textContent = 'Inserisci la nuova password nel campo sottostante e conferma.';
      setMessage('Scegli una nuova password di almeno 6 caratteri.');
      password.focus();
    }
    if (!session && userId && _event === 'SIGNED_OUT') {
      ready = false;userId = null;gate.hidden = false;label('● Sessione terminata');
    }
  });
  window.addEventListener('online', () => { if (!ready) return; label('↻ Riconnessione…',true); schedulePush(100); setTimeout(() => pull().catch(console.warn), 3000); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ready) { push(); pull().catch(console.warn); }
  });
  window.addEventListener('beforeunload', () => {if (sendingTimer) clearTimeout(sendingTimer);});
  // Polling gives cross-device updates without needing database replication setup.
  setInterval(() => {if (ready && document.visibilityState === 'visible' && !busy) pull().catch(console.warn);}, 20000);
  getSession().then(session => {
    if (session && !recoveringPassword) return openAccount(session);
    label('● Accedi per sincronizzare');
  }).catch(err => setMessage('Impossibile verificare la sessione: '+err.message,true));
})();
