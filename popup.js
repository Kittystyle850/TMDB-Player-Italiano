/**
 * TMDB Player – Popup Script
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

const DEFAULTS = { server: 'vixsrc', lang: 'it' };

const serverSel = document.getElementById('server');
Object.entries(SERVERS).forEach(([k, v]) => {
  const o = document.createElement('option');
  o.value = k;
  o.textContent = v;
  serverSel.appendChild(o);
});

const langSel = document.getElementById('lang');

chrome.storage.sync.get(DEFAULTS, (state) => {
  serverSel.value = state.server || DEFAULTS.server;
  langSel.value = state.lang || DEFAULTS.lang;
});

serverSel.addEventListener('change', () => {
  chrome.storage.sync.set({ server: serverSel.value });
});

langSel.addEventListener('change', () => {
  chrome.storage.sync.set({ lang: langSel.value });
});