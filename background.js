/**
 * TMDB Player – Service Worker
 * Gestisce l'installazione e log minimali.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Imposta i default al primo avvio
    chrome.storage.sync.set({
      server: 'vixsrc',
      lang: 'it',
      autoplay: true
    });
    console.log('[TMDB Player] Installato. Server di default: VixSrc, lingua: Italiano.');
  } else if (details.reason === 'update') {
    console.log('[TMDB Player] Aggiornato a', chrome.runtime.getManifest().version);
  }
});

// Log click sull'icona (utile per debug)
chrome.action?.onClicked?.addListener((tab) => {
  console.log('[TMDB Player] Click su', tab.url);
});