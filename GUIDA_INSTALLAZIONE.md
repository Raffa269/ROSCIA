# ROSCIA Growth Tracker — GitHub, Supabase, Vercel

Il progetto conserva la grafica, le 30 giornate e le 150 attività originali. Rimane un'app statica con Supabase Auth e database PostgreSQL. Il contenuto editoriale è pubblico; progressi e registri sono privati per account.

## Stato della consegna

**Sito pubblicato e verificato:** https://roscia-livid.vercel.app

**Repository:** https://github.com/Raffa269/ROSCIA (pubblico).

Supabase: progetto ROSCIA `zpstpgsayhxlddvqzeeo`, tabella e policy RLS applicate. Vercel: progetto `roscia` nel team Raffa, collegato al branch main. Variabili pubbliche configurate in Vercel; nessun token gestionale o service_role è incluso nella build. Login reale, salvataggi, refresh, due sessioni, backup/ripristino, offline e isolamento RLS sono stati verificati sul sito HTTPS.

## Sviluppo locale

Richiede Node >=22 (verificato con Node 24.19.0), npm e Python 3 per il server dei test. Per i test browser serve Chromium; `CHROMIUM_PATH` può indicarne il percorso (predefinito `/usr/bin/chromium`).

```sh
npm ci
npm run build
npm run test:content
npm test
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Senza configurazione cloud la build locale offre l'anteprima nel browser. La build su Vercel fallisce esplicitamente se manca Supabase. Non caricare la directory sorgente come sito statico: distribuire solo l'output dist/ generato dalla build.

## 1. Repository GitHub dedicato

Repository dedicato indicato dal proprietario: https://github.com/Raffa269/ROSCIA . Il branch main contiene l'importazione originale e le correzioni. Il repository è pubblico: i contenuti editoriali sono visibili; i progressi utente rimangono privati nel database quando Supabase è configurato. Non usare il repository IMMAGINI e non pubblicare file .env, credenziali, backup personali o tracce di test reali.

## 2. Supabase

Usare un progetto dedicato o quello indicato dal proprietario. Eseguire `database.sql` nel SQL Editor: lo script è ripetibile. Crea la tabella `roscia_tracker_values`, tre policy RLS (SELECT/INSERT/UPDATE), trigger del timestamp e privilegi minimi. Non c'è DELETE: il ripristino sovrascrive con valori vuoti o `todo` i campi da azzerare. L'account anonimo non può leggere/scrivere; il ruolo autenticato può operare solo dove `auth.uid() = user_id`, anche quando tenta di cambiare il proprietario.

Attivare Authentication → Email/password. Mantenere la conferma email abilitata salvo diversa scelta esplicita; verificare invio email e limiti del provider. Dopo aver ottenuto il dominio Vercel, impostarlo come Site URL e come URL di redirect consentito. Non autorizzare domini arbitrari. Per eventuali preview, autorizzare gli specifici URL effettivamente usati.

Servono soltanto due valori pubblici per la build:

- `SUPABASE_URL`: URL HTTPS del progetto, senza slash finale.
- `SUPABASE_PUBLISHABLE_KEY`: chiave `sb_publishable_...` oppure JWT legacy con ruolo `anon`.

In alternativa i medesimi valori pubblici possono essere inseriti in `config.js`. Le variabili di build hanno precedenza. Una chiave `sb_secret_...` o un JWT `service_role` fa fallire la build. Password, token gestionali e service_role non devono essere inseriti nel frontend, nel repository o nei log. I token gestionali eventualmente necessari all'automazione restano esclusivamente nelle impostazioni sicure e non vengono letti dalla build.

## 3. Vercel

Importare il repository dedicato. Preset framework: Other; comando installazione `npm ci`; build `npm run build`; output `dist`. La configurazione è inclusa in `vercel.json`; usare Node 24. Impostare i due valori pubblici di Supabase come variabili Vercel negli ambienti da distribuire. Eseguire la pubblicazione, verificare l'esito del build e ottenere il dominio HTTPS. Completare la configurazione URL di Supabase usando quel dominio esatto.

La libreria Supabase è installata dal lockfile e inclusa negli asset; non è caricata da CDN. La service worker conserva solo asset pubblici dello stesso sito, mai risposte Auth o database. La cache permette la riapertura offline dopo un primo caricamento completo. Le sessioni cloud offline richiedono una precedente autenticazione e cache dell'account sul dispositivo; non è possibile un primo accesso senza rete. Se la sessione scade, il rinnovo richiede connettività. La cache locale è una comodità per dispositivi fidati, non un archivio cifrato: i dati restano sul dispositivo e il backup rimane consigliato.

## 4. Entrare nella dashboard

Aprire il dominio HTTPS pubblicato, inserire email e password e scegliere **Crea account**. Confermare l'email se richiesto e poi usare **Accedi e sincronizza**. Sul secondo browser usare lo stesso indirizzo del sito e lo stesso account. Le modifiche sono inviate circa un secondo dopo la digitazione; attendere **✓ Cloud sincronizzato**. Gli aggiornamenti remoti arrivano tornando sulla pagina oppure con il controllo ogni 20 secondi. Sullo stesso campo prevale l'ultima modifica ricevuta dal server.

Per migrare progressi precedenti: scaricare **Backup JSON** nella vecchia dashboard, accedere al nuovo account e usare **Ripristina**. La demo non viene mai importata implicitamente in un account; il ripristino richiede conferma e sostituisce i progressi correnti. Note, decisioni, link e risultati restano testo, senza eseguire HTML.

## 5. Verifica prima di dichiarare concluso il deployment

Usare due account di prova separati e due sessioni browser indipendenti; non usare dati personali di produzione.

1. Nel sito HTTPS reale, provare creazione account/conferma email, login errato/corretto, logout e recupero password.
2. Nell'account A impostare ciascuno stato Da fare/Parziale/Completa; compilare nota attività, decisioni, note giorno, link e risultati. Attendere conferma e verificare refresh e riapertura browser.
3. Accedere ad A sul secondo browser: verificare gli stessi valori, modificarli e controllare il ritorno sul primo. Provare modifiche a campi diversi e descrivere il comportamento sullo stesso campo.
4. Esportare un backup JSON, cambiare alcuni dati, ripristinare e controllare anche i campi azzerati sul secondo browser. Provare file non valido senza perdere lo stato esistente.
5. Staccare davvero la connessione dopo un accesso valido, modificare e ricaricare; ripristinare la rete e verificare l'invio della coda e il secondo browser.
6. Con B verificare dashboard vuota. Usando la sessione autenticata B, tentare direttamente SELECT/INSERT/UPDATE su righe di A: lettura vuota e scritture negate o zero righe. Senza sessione, la tabella deve essere inaccessibile. Le sole verifiche visuali non bastano a provare RLS.
7. Verificare viewport mobile, selettore di tutti i 30 giorni, note, backup e login su browser mobile reale. L'emulazione Chromium locale non sostituisce un dispositivo fisico.
8. Controllare HTTPS, console, risposte di rete, assenza di segreti negli asset e configurazione Auth dei redirect. Ripulire gli account di prova attraverso gli strumenti amministrativi sicuri.

## Test eseguiti

- 5 test Node/PostgreSQL superati: integrità esatta dei contenuti/CSS/logo, RLS su PostgreSQL embedded, idempotenza SQL, rifiuto chiavi segrete e configurazione Vercel incompleta.
- 8 test Chromium locali superati: anteprima mobile, stati e campi, backup/ripristino, JSON malformato, login errato, due contesti browser, refresh, isolamento cache, offline e risposte tardive. Questi test locali usano API Supabase simulate.
- 2 test Chromium **sul sito pubblico reale** superati: login email/password (anche errato), tutti gli stati, note attività e quattro campi del giorno, refresh con sessione persistente, backup/ripristino, sincronizzazione nei due sensi fra browser desktop/mobile, giorno 30, rete browser realmente disattivata con refresh offline e successiva sincronizzazione.
- RLS **sul Supabase reale**: due account diversi; lettura di righe altrui vuota, INSERT negata (403), UPDATE di righe altrui senza effetti, accesso anonimo negato. RLS abilitata e forzata sulla tabella.
- Asset pubblici serviti via HTTPS con risposta 200, chiave publishable verificata senza segreti, nessun errore JavaScript nei flussi testati. Screenshot mobile ispezionato; nessun overflow orizzontale a 390×844.
- Due account temporanei confermati tramite API amministrativa sono stati creati per ciascuna esecuzione e poi eliminati insieme ai loro progressi. Nessun account di prova da usare per entrare nella dashboard.

### Limiti precisi

La vista mobile è emulata in Chromium: non è stato usato un telefono fisico. La consegna email di conferma/recupero non è stata verificata tramite una casella reale: i test hanno usato account temporanei già confermati e il login reale email/password. La conferma email è mantenuta attiva. Il provider email predefinito Supabase ha limiti di invio e destinatari; per utenti esterni all'organizzazione può essere necessario configurare un SMTP proprio in Supabase. Non sono state inserite credenziali SMTP inventate o disattivate le conferme.

### Ripetere i test pubblici

Con `SUPABASE_ACCESS_TOKEN` nelle impostazioni sicure, eseguire `python3 scripts/test-live.py`. Gli opzionali `ROSCIA_LIVE_URL` e `ROSCIA_PROJECT_REF` permettono di selezionare sito e progetto. Il token gestionale è usato solo verso api.supabase.com; la chiave amministrativa ottenuta resta in memoria per creare/eliminare gli utenti temporanei. Password e sessioni restano solo in memoria; trace browser disattivata nei test reali. Non registrare dump di ambiente o credenziali.

Nel cloud Codex Chromium usa il proxy HTTPS dell'ambiente e deve fidarsi della CA fornita dalla piattaforma, registrata nel suo database NSS. Non disabilitare mai la verifica TLS. Il test include modifiche e ripristini ma usa soltanto account temporanei dedicati.
