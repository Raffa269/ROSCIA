# Verifiche della pubblicazione ROSCIA

Sito HTTPS: https://roscia-livid.vercel.app
Repository: https://github.com/Raffa269/ROSCIA
Supabase: progetto ROSCIA `zpstpgsayhxlddvqzeeo`.
Vercel: progetto `roscia`, team Raffa, branch `main`.

## Eseguite

- Installazione riproducibile npm ci e build statica completate.
- 5 test Node/PostgreSQL e 8 test Chromium locali superati.
- Integrità esatta delle 30 giornate, 150 attività, CSS originale e logo.
- 2 test Chromium sul sito pubblico con il vero Supabase superati.
- Login reale corretto e password errata, sessione dopo refresh e logout.
- Da fare/Parziale/Completa, note attività, decisioni, note giorno, link e risultati.
- Due browser indipendenti, desktop e mobile emulato, modifiche sincronizzate nei due sensi.
- Backup JSON scaricato e ripristinato, anche azzerando stati prima valorizzati.
- Rete browser realmente disabilitata: modifiche, refresh offline e invio al ritorno online.
- Giorno 30 usato da mobile, nessun overflow orizzontale a 390×844, screenshot ispezionato.
- Nessun errore JavaScript nei flussi di test pubblici.
- RLS reale: B non legge righe di A, INSERT per A rifiutata con 403, UPDATE di A senza effetti, accesso anonimo negato. Flag RLS enabled/forced verificati nel database.
- Tutti gli asset verificati rispondono HTTP 200 via HTTPS; nella configurazione distribuita compare solo la chiave pubblica.
- Account di test e relativi progressi eliminati dopo ogni esecuzione.

## Credenziali e limiti

Token gestionali disponibili solo nelle impostazioni sicure dell'ambiente; nessuna password personale, service_role o chiave segreta salvata nel frontend o nel repository. La chiave amministrativa è usata solo in memoria dal runner dei test per utenti temporanei.

Il mobile è emulato, non un dispositivo fisico. La consegna delle email di conferma/recupero non è stata verificata tramite una casella reale. I test usano account temporanei confermati via API amministrativa e login email/password effettivo. La conferma email resta attiva; per destinatari esterni all'organizzazione Supabase può servire SMTP personalizzato.

Il progetto Vercel secondario `roscia-7zol` non è quello usato per la pubblicazione verificata e non è stato eliminato.

## Ripetibilità

Test locali: npm run test:content e npm test.
Test pubblici: python3 scripts/test-live.py (SUPABASE_ACCESS_TOKEN tramite impostazioni sicure). Il runner non stampa le credenziali e ripulisce gli utenti temporanei in finally. Chromium deve usare il proxy/CA fidati dell'ambiente, senza disattivare TLS.
