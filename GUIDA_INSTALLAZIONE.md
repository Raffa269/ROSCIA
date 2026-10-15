# ROSCIA Growth Tracker — GitHub, Supabase, Vercel

Il progetto conserva la grafica, le 30 giornate e le 150 attività originali. Rimane un'app statica con Supabase Auth e database PostgreSQL. Il contenuto editoriale è pubblico; progressi e registri sono privati per account.

## Stato della consegna

La preparazione e i test locali sono completati. **Non è stato effettuato un deployment**: a questa sessione non sono disponibili integrazioni operative Supabase/Vercel, l'API GitHub con l'autenticazione disponibile risponde Forbidden, la richiesta non autenticata a Supabase risponde 401 e quella a Vercel 403. Non esistono ancora un repository remoto dedicato o un URL pubblico verificato. Non considerare la cartella dist/ come una pubblicazione.

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

La cartella contiene già un repository Git locale, con importazione originale e modifiche separate. Quando l'integrazione GitHub dispone di permessi di creazione e scrittura, creare un repository dedicato preferibilmente privato, per esempio `roscia-growth-tracker`, e collegare il branch main. Non usare il repository IMMAGINI e non pubblicare file .env, credenziali, backup personali o tracce di test reali.

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

## Test eseguiti nella preparazione locale

- 5 test Node/PostgreSQL superati: integrità dei contenuti/CSS/logo; policy RLS effettivamente eseguite su PostgreSQL embedded PGlite con due utenti e ruolo anonimo; idempotenza SQL; rifiuto chiavi segrete e configurazione Vercel incompleta.
- 8 test Chromium superati: anteprima mobile, stati, campi, backup/ripristino, JSON non valido, login errato, due contesti browser, refresh, isolamento cache account, coda offline, risposte tardive e riapertura con rete realmente disattivata.
- I test cloud del browser usano il vero SDK Supabase con risposte API simulate. Il database locale verifica RLS su PostgreSQL, **non sul progetto Supabase di produzione**.
- Da eseguire: tutte le verifiche del sito pubblico, Auth/email e RLS Supabase reali, oltre a test su dispositivo mobile fisico.
