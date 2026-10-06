/**
 * TMDB Player – Service Worker
 * Imposta i default al primo avvio.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      server: 'vixsrc',
      lang: 'it'
    });
    console.log('[TMDB Player] Installato. Server: VixSrc, Lingua: Italiano.');
  } else if (details.reason === 'update') {
    console.log('[TMDB Player] Aggiornato a', chrome.runtime.getManifest().version);
  }
});