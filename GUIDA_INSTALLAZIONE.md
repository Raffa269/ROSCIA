# ROSCIA Growth Tracker — Pubblicazione online (circa 15–25 minuti)

Questo pacchetto contiene la **versione cloud** della dashboard esistente. Mantiene la grafica, le **30 giornate e tutte le 150 attività**; aggiunge account privato e sincronizzazione automatica tra PC.

**Importante:** lo ZIP è pronto da pubblicare, ma non è ancora un sito online: bisogna creare un progetto Supabase e pubblicare la cartella su un servizio di hosting. Non è necessario programmare.

## 1. Crea il database e l'accesso

1. Apri <https://supabase.com/dashboard>, registrati e scegli **New project**.
2. Dai al progetto un nome, per esempio `roscia-tracker`, imposta una password robusta per il database e scegli preferibilmente una regione europea.
3. Quando il progetto è pronto, apri **SQL Editor → New query**.
4. Apri il file `database.sql`, copiane tutto il contenuto, incollalo nell'editor ed esegui con **Run**. La tabella usa **Row Level Security**: ogni utente vede solo i propri dati.
5. Dal progetto Supabase apri **Project Settings → API Keys** oppure **Connect**, a seconda dell'interfaccia, e trova:
   - **Project URL**, nel formato `https://xxxxxxxx.supabase.co`.
   - **Publishable key** (`sb_publishable_...`) o **anon public key**.
6. Apri il file `config.js` in un editor di testo e sostituisci le due stringhe vuote con i valori precedenti, senza eliminare le virgolette:

```js
window.ROSCIA_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabaseAnonKey: "sb_publishable_XXXXXXXXXXXXXXXX"
};
```

**Non inserire mai chiavi `service_role`, `sb_secret_...`, password di database o password personali nel file `config.js`.** La publishable key è progettata per essere pubblica; la protezione dei dati è garantita da autenticazione + RLS.

## 2. Pubblica la dashboard su Internet

Il percorso più semplice è **Netlify Drop**, che permette di pubblicare direttamente una cartella di file statici:

1. Vai su <https://app.netlify.com/drop> e accedi.
2. Trascina la **cartella `ROSCIA_WEBAPP` estratta** (contenente `index.html`, `cloud.js` e `config.js`), non il PDF e non uno ZIP ancora compresso.
3. Netlify fornirà un indirizzo HTTPS pubblico, ad esempio `https://roscia-tracker-xyz.netlify.app`. Salvalo tra i preferiti su entrambi i PC.
4. Controlla che il sito mostri la schermata «Accedi e sincronizza». Se mostra «Cloud da configurare», hai caricato la versione precedente oppure il file `config.js` non è stato modificato.

### Autorizza l'URL per login e recupero password

1. Torna a **Supabase → Authentication → URL Configuration**.
2. Imposta **Site URL** uguale all'indirizzo HTTPS esatto ottenuto da Netlify.
3. Aggiungi a **Redirect URLs** l'indirizzo completo e, se necessario, una variante con `/**` per consentire la pagina di rientro dall'email. In questo progetto è sufficiente la pagina principale.
4. Per proteggere la registrazione, puoi creare il tuo account e poi disattivare nuove registrazioni pubbliche in **Authentication → Providers → Email** (opzioni disponibili possono variare).

## 3. Crea il tuo account

1. Apri la dashboard Netlify, inserisci email e password e fai clic **Crea account**.
2. Se il progetto Supabase richiede conferma email, apri il messaggio ricevuto e verifica l'indirizzo.
3. Torna alla dashboard e fai clic **Accedi e sincronizza**.
4. Da questo momento i cambiamenti si salvano sul database cloud senza premere un pulsante.
5. Sul secondo computer apri **la stessa URL** e accedi **con la stessa email e password**.

## 4. Se avevi già progressi nel vecchio tracker

Il vecchio HTML salvava le modifiche sul PC. Quei dati **non vengono trasferiti automaticamente** a un dominio Internet diverso.

1. Apri la vecchia dashboard sul PC dove avevi lavorato e premi **Backup JSON**.
2. Apri la nuova dashboard online e accedi.
3. Premi **Ripristina**, scegli il JSON appena esportato e conferma la sostituzione.
4. Attendi lo stato **«✓ Cloud sincronizzato»** prima di chiudere la pagina.
5. Apri la stessa dashboard sul secondo PC per verificare che il lavoro compaia.

## 5. Test della sincronizzazione (2 minuti)

- PC A: Giorno 1, attività 1, imposta **Parziale** e scrivi una nota di prova.
- Aspetta **«✓ Cloud sincronizzato»**.
- PC B: apri la stessa URL, accedi e controlla Giorno 1. Se era già aperta, ricarica o attendi fino a 20 secondi.
- PC B: imposta **Completa**, modifica una nota e attendi il simbolo di salvataggio.
- PC A: ricarica: lo stato deve essere **Completa**.

## Come funziona la sincronizzazione

- Salvataggio automatico per singolo campo, circa 1 secondo dopo la modifica.
- Il server riceve solo campi che sono cambiati, non l'intero documento a ogni battuta.
- Le modifiche offline vengono conservate sullo stesso dispositivo se la sessione era stata già aperta e il browser dispone della sua cache; sono inviate quando torna la connessione.
- Le modifiche su altri PC arrivano quando torni sulla pagina, con un controllo periodico di 20 secondi o dopo ricarica.
- **Se modifichi esattamente lo stesso campo contemporaneamente su due PC, l'ultima modifica arrivata al server prevale.** Non usare due PC simultaneamente per modificare la stessa nota.
- Il backup JSON resta consigliato periodicamente: non sostituisce il database cloud.

## Sicurezza e manutenzione

- Il tuo sito Netlify è raggiungibile via URL; i **dati** sono visibili solo all'account autenticato grazie alle policy RLS.
- Le **150 attività editoriali statiche** sono incluse nel codice e quindi non sono private: chiunque conosca l'URL può scaricare gli asset pubblici. Per proteggere anche il testo del piano occorre protezione aggiuntiva sull'hosting.
- La tua password non viene gestita dal codice del tracker ma dall'autenticazione Supabase.
- Usa il sito attraverso HTTPS; non usare account condivisi con terzi.
- Se devi aggiornare la dashboard, modifica i file e ridistribuiscili su Netlify. I progressi restano in Supabase.

## Risoluzione problemi

- **Schermata «Cloud da configurare»** → controlla `config.js` e ripubblica la cartella modificata.
- **Login funziona ma appare errore della tabella** → riesegui `database.sql` in Supabase, verifica nome tabella e RLS.
- **Non arriva la mail di conferma** → controlla spam, configurazione Authentication email e limiti del provider di posta Supabase.
- **Un PC non vede le modifiche** → controlla che gli account email corrispondano, che il primo indichi «✓ Cloud sincronizzato», poi ricarica il secondo.
- **Pagina bianca** → verifica di aver caricato l'intera cartella, non solo `index.html`; apri la console del browser (F12) per eventuali errori.
- **Errore caricamento Supabase** → la dashboard deve poter raggiungere la libreria JS remota e le API Supabase; estensioni ad-block possono impedirlo.

## File del progetto

- `index.html`: grafica e 150 attività originali.
- `cloud.js`: autenticazione, cache offline e sincronizzazione automatica.
- `config.js`: i due parametri pubblici del tuo progetto Supabase.
- `database.sql`: tabella e regole di accesso ai dati.
- `GUIDA_INSTALLAZIONE.md`: questa guida.

Il sito non contiene analytics o pubblicità e non richiede alcun piano di abbonamento software per il codice stesso; hosting e database possono avere limiti e costi in base ai piani scelti.
