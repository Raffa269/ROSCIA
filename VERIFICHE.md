# Verifiche eseguite e limiti

## Esito locale

Build statica completata, installazione riproducibile `npm ci` riuscita. 5 test Node/PostgreSQL e 8 test Chromium superati.

- Integrità esatta di tutte le 30 giornate e 150 attività, del CSS originale e del logo.
- PostgreSQL embedded PGlite: schema ripetibile, utente B non vede/modifica A, INSERT e cambio proprietario vietati, DELETE negata, ruolo anonimo senza accesso.
- La build rifiuta chiavi segrete, JWT service_role e configurazione cloud assente su Vercel.
- Anteprima mobile a 390×844, tutti i giorni accessibili, nessun overflow orizzontale; screenshot ispezionato.
- Da fare, Parziale, Completa, note attività, decisioni, note giorno, link e risultati.
- Due contesti Chromium indipendenti, refresh, persistenza, modifiche in entrambe le direzioni.
- Cache separata per account e demo; niente importazione implicita di dati di un altro account.
- Backup JSON, ripristino con azzeramento dei campi precedenti e rifiuto di file malformati.
- Errore login e protezione da risposte di lettura tardive.
- Coda di scrittura conservata dopo refresh, riconnessione e invio successivo.
- Connessione browser realmente disattivata: riapertura della demo e persistenza usando la cache degli asset.

## Confini della verifica

Nei test Chromium cloud il vero SDK Supabase usa API simulate, con dati fittizi e senza chiavi reali. Le policy SQL sono eseguite in PostgreSQL locale, non in un progetto Supabase remoto. La vista mobile è emulata, non verificata su telefono fisico.

Non sono stati eseguiti deployment Vercel, creazione repository GitHub remoto, migrazione Supabase remota, autenticazione email reale, verifica RLS remota o test del sito HTTPS pubblico. Gli accessi operativi non sono disponibili nella sessione. La guida contiene le verifiche da eseguire prima di dichiarare conclusa la pubblicazione.

La configurazione dell'ambiente salvata è una bozza: non crea progetti, non contiene valori segreti e non prova che gli accessi siano stati applicati. Richiesti accesso GitHub con creazione/scrittura e accessi Supabase/Vercel tramite integrazioni operative o impostazioni sicure.
