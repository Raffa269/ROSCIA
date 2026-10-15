// Cache solo degli asset pubblici: nessuna risposta di autenticazione o dato utente.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Cache offline non disponibile:', err)));
}
