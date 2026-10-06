/**
 * TMDB Player – Service Worker
 * Imposta i default al primo avvio.
 */

const VERSION = '1.3.0';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      server: 'vixsrc',
      lang: 'it'
    });
    console.log(`[TMDB Player] v${VERSION} installato. Server: VixSrc, Lingua: Italiano.`);
  } else if (details.reason === 'update') {
    console.log(`[TMDB Player] Aggiornato a v${VERSION}`);
  }
});

// Log di avvio del service worker
console.log(`[TMDB Player] Service Worker v${VERSION} attivo`);
