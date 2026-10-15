# ROSCIA Growth Tracker Cloud Edition

**Dashboard online:** https://roscia-livid.vercel.app

**Repository:** https://github.com/Raffa269/ROSCIA

30 giornate e 150 attività originali, con grafica e contenuti preservati. Frontend statico su Vercel, autenticazione email/password e database con Row Level Security su Supabase.

## Entrare

Apri il sito, inserisci email e password, scegli **Crea account** e conferma l'email. Poi usa **Accedi e sincronizza**. Sul secondo dispositivo apri lo stesso URL con lo stesso account. Attendi **✓ Cloud sincronizzato** prima di chiudere.

I vecchi progressi si trasferiscono con **Backup JSON** dalla vecchia dashboard e **Ripristina** nel nuovo account.

## Sviluppo e test

```sh
npm ci
npm run build
npm run test:content
npm test
```

Con il token gestionale Supabase nelle impostazioni sicure e il proxy/CA configurato per Chromium:

```sh
python3 scripts/test-live.py
```

Il test remoto crea due account temporanei, usa il sito HTTPS reale e li elimina al termine. Non salva password o service_role nei file.

Vedi [guida completa](GUIDA_INSTALLAZIONE.md) e [risultati verifiche](VERIFICHE.md).
