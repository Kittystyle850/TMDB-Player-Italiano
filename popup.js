/**
 * TMDB Player – Popup Script
 * Gestisce le preferenze: server, lingua, autoplay.
 */

const SERVERS = {
  vixsrc:    '🇮🇹 VixSrc (consigliato)',
  embed_su:  'Embed.su',
  vidlink:   'VidLink.pro',
  vidsrc_net:'VidSrc.net',
  vidsrc_to: 'VidSrc.to',
  '2embed':  '2Embed',
  multiembed:'MultiEmbed'
};

const DEFAULT_STATE = {
  server: 'vixsrc',
  lang: 'it',
  autoplay: true
};

// Popola select server
const serverSel = document.getElementById('server');
Object.entries(SERVERS).forEach(([k, v]) => {
  const o = document.createElement('option');
  o.value = k;
  o.textContent = v;
  serverSel.appendChild(o);
});

const langSel = document.getElementById('lang');
const autoplayToggle = document.getElementById('autoplayToggle');

// Carica stato salvato
chrome.storage.sync.get(DEFAULT_STATE, (state) => {
  serverSel.value = state.server || DEFAULT_STATE.server;
  langSel.value = state.lang || DEFAULT_STATE.lang;
  autoplayToggle.classList.toggle('on', state.autoplay !== false);
});

// Salva server
serverSel.addEventListener('change', () => {
  chrome.storage.sync.set({ server: serverSel.value });
});

// Salva lingua
langSel.addEventListener('change', () => {
  chrome.storage.sync.set({ lang: langSel.value });
});

// Toggle autoplay
autoplayToggle.addEventListener('click', () => {
  const isOn = autoplayToggle.classList.toggle('on');
  chrome.storage.sync.set({ autoplay: isOn });
});