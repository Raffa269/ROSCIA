# ROSCIA Growth Tracker Cloud Edition

Dashboard originale: 30 giornate, 150 attività. Frontend statico, Supabase Auth/PostgreSQL, distribuzione Vercel. Grafica e contenuti editoriali preservati e verificati tramite hash del pacchetto originale.

Vedi [guida e stato effettivo della pubblicazione](GUIDA_INSTALLAZIONE.md).

```sh
npm ci
npm run build
npm run test:content
npm test
```

Il deployment remoto è ancora bloccato dagli accessi ai servizi. Nessun URL pubblico è stato generato o verificato. La configurazione di produzione impedisce la pubblicazione senza parametri Supabase pubblici validi.
