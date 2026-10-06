/**
 * TMDB Player – Content Script
 * Inietta un pulsante "Guarda in Italiano" nelle pagine di themoviedb.org
 * e apre un player in overlay forzando la lingua italiana.
 */
(function () {
  'use strict';

  // ============ SERVER CONFIGURATI ============
  const SERVERS = {
    vixsrc: {
      name: '🇮🇹 VixSrc (consigliato)',
      supportsAudio: true,
      movie: (id, lang) => `https://vixsrc.to/movie/${id}?lang=${lang}&autoPlay=true`,
      tv: (id, s, e, lang) => `https://vixsrc.to/tv/${id}/${s}/${e}?lang=${lang}&autoPlay=true`
    },
    embed_su: {
      name: 'Embed.su',
      supportsAudio: true,
      movie: (id, lang) => `https://embed.su/embed/movie/${id}?lang=${lang}`,
      tv: (id, s, e, lang) => `https://embed.su/embed/tv/${id}/${s}/${e}?lang=${lang}`
    },
    vidlink: {
      name: 'VidLink.pro',
      supportsAudio: true,
      movie: (id, lang) => `https://vidlink.pro/movie/${id}?lang=${lang}`,
      tv: (id, s, e, lang) => `https://vidlink.pro/tv/${id}/${s}/${e}?lang=${lang}`
    },
    vidsrc_net: {
      name: 'VidSrc.net',
      supportsAudio: false,
      movie: (id, lang) => `https://vidsrc.net/embed/movie?tmdb=${id}&ds_lang=${lang}&lang=${lang}`,
      tv: (id, s, e, lang) => `https://vidsrc.net/embed/tv?tmdb=${id}&season=${s}&episode=${e}&ds_lang=${lang}&lang=${lang}`
    },
    vidsrc_to: {
      name: 'VidSrc.to',
      supportsAudio: false,
      movie: (id, lang) => `https://vidsrc.to/embed/movie/${id}?lang=${lang}`,
      tv: (id, s, e, lang) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}?lang=${lang}`
    },
    '2embed': {
      name: '2Embed',
      supportsAudio: false,
      movie: (id, lang) => `https://www.2embed.cc/embed/${id}?lang=${lang}`,
      tv: (id, s, e, lang) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}&lang=${lang}`
    },
    multiembed: {
      name: 'MultiEmbed',
      supportsAudio: false,
      movie: (id, lang) => `https://multiembed.mov/?video_id=${id}&tmdb=1&lang=${lang}`,
      tv: (id, s, e, lang) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}&lang=${lang}`
    }
  };

  const LANGS = {
    it: { flag: '🇮🇹', label: 'Italiano' },
    en: { flag: '🇬🇧', label: 'English' },
    es: { flag: '🇪🇸', label: 'Español' },
    fr: { flag: '🇫🇷', label: 'Français' },
    de: { flag: '🇩🇪', label: 'Deutsch' },
    pt: { flag: '🇵🇹', label: 'Português' }
  };

  // ============ STATO ============
  const state = {
    server: 'vixsrc',
    lang: 'it'
  };

  // ============ PREFERENZE ============
  chrome.storage?.sync?.get(['server', 'lang'], (r) => {
    if (r?.server && SERVERS[r.server]) state.server = r.server;
    if (r?.lang && LANGS[r.lang]) state.lang = r.lang;
    const sSel = document.getElementById('tmdb-player-server');
    const lSel = document.getElementById('tmdb-player-lang');
    if (sSel) sSel.value = state.server;
    if (lSel) lSel.value = state.lang;
  });

  // ============ MEDIA DETECTION ============
  function getMediaInfo() {
    const path = location.pathname;

    const movieMatch = path.match(/^\/movie\/(\d+)/);
    if (movieMatch) return { type: 'movie', tmdbId: movieMatch[1] };

    const tvMatch = path.match(/^\/tv\/(\d+)/);
    if (tvMatch) {
      const sMatch = path.match(/\/season\/(\d+)/);
      const eMatch = path.match(/\/episode\/(\d+)/);
      return {
        type: 'tv',
        tmdbId: tvMatch[1],
        season: sMatch ? sMatch[1] : '1',
        episode: eMatch ? eMatch[1] : '1'
      };
    }
    return null;
  }

  function buildPlayerUrl(media, serverKey, lang) {
    const srv = SERVERS[serverKey];
    if (!srv) return null;
    return media.type === 'movie'
      ? srv.movie(media.tmdbId, lang)
      : srv.tv(media.tmdbId, media.season, media.episode, lang);
  }

  // ============ MODAL ============
  function createModal() {
    if (document.getElementById('tmdb-player-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'tmdb-player-modal';
    modal.innerHTML = `
      <div class="tmdb-player-overlay"></div>
      <div class="tmdb-player-content">
        <div class="tmdb-player-header">
          <span class="tmdb-player-title">🎬 TMDB Player</span>
          <div class="tmdb-player-controls">
            <label class="tmdb-player-field">
              <span>Server</span>
              <select id="tmdb-player-server"></select>
            </label>
            <label class="tmdb-player-field">
              <span>Lingua</span>
              <select id="tmdb-player-lang"></select>
            </label>
          </div>
          <div class="tmdb-player-actions">
            <button id="tmdb-player-reload" title="Ricarica">↻</button>
            <button id="tmdb-player-external" title="Apri in nuova scheda">↗</button>
            <button id="tmdb-player-close" title="Chiudi (Esc)">×</button>
          </div>
        </div>
        <div class="tmdb-player-body">
          <div class="tmdb-player-loading" id="tmdb-player-loading">
            <div class="tmdb-player-spinner"></div>
            <p>Caricamento in corso…</p>
          </div>
          <iframe id="tmdb-player-iframe" allowfullscreen
                  referrerpolicy="origin"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>
        </div>
        <div class="tmdb-player-footer">
          <span id="tmdb-player-meta"></span>
          <span id="tmdb-player-hint"></span>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const serverSel = modal.querySelector('#tmdb-player-server');
    Object.entries(SERVERS).forEach(([k, v]) => {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = v.name;
      serverSel.appendChild(o);
    });
    serverSel.value = state.server;

    const langSel = modal.querySelector('#tmdb-player-lang');
    Object.entries(LANGS).forEach(([k, v]) => {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = `${v.flag} ${v.label}`;
      langSel.appendChild(o);
    });
    langSel.value = state.lang;

    serverSel.addEventListener('change', () => {
      state.server = serverSel.value;
      chrome.storage?.sync?.set({ server: state.server });
      loadVideo();
    });

    langSel.addEventListener('change', () => {
      state.lang = langSel.value;
      chrome.storage?.sync?.set({ lang: state.lang });
      loadVideo();
    });

    modal.querySelector('#tmdb-player-close').addEventListener('click', closeModal);
    modal.querySelector('#tmdb-player-reload').addEventListener('click', loadVideo);
    modal.querySelector('#tmdb-player-external').addEventListener('click', openExternal);
    modal.querySelector('.tmdb-player-overlay').addEventListener('click', closeModal);

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeModal();
      if (ev.key === 'r' && ev.ctrlKey) { ev.preventDefault(); loadVideo(); }
    });

    modal.querySelector('#tmdb-player-iframe').addEventListener('load', () => {
      const loader = modal.querySelector('#tmdb-player-loading');
      if (loader) loader.classList.add('hidden');
    });
  }

  function loadVideo() {
    const media = getMediaInfo();
    if (!media) return;

    const iframe = document.getElementById('tmdb-player-iframe');
    const loader = document.getElementById('tmdb-player-loading');
    const meta = document.getElementById('tmdb-player-meta');
    const hint = document.getElementById('tmdb-player-hint');

    if (loader) loader.classList.remove('hidden');

    const url = buildPlayerUrl(media, state.server, state.lang);
    if (iframe && url) iframe.src = url;

    if (meta) {
      const typeLabel = media.type === 'movie' ? 'Film' : 'Serie TV';
      const extra = media.type === 'tv' ? ` – S${media.season}E${media.episode}` : '';
      meta.textContent = `${typeLabel} #${media.tmdbId}${extra}`;
    }

    const srv = SERVERS[state.server];
    if (hint && srv) {
      if (state.lang === 'it' && srv.supportsAudio) {
        hint.textContent = '✅ Audio italiano supportato';
        hint.className = 'tmdb-player-hint-ok';
      } else if (state.lang === 'it' && !srv.supportsAudio) {
        hint.textContent = '⚠️ Sottotitoli IT (audio dipende dal server)';
        hint.className = 'tmdb-player-hint-warn';
      } else {
        hint.textContent = '';
        hint.className = '';
      }
    }
  }

  function openExternal() {
    const media = getMediaInfo();
    if (!media) return;
    const url = buildPlayerUrl(media, state.server, state.lang);
    if (url) window.open(url, '_blank', 'noopener');
  }

  function openModal() {
    createModal();
    loadVideo();
    document.getElementById('tmdb-player-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('tmdb-player-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    const iframe = document.getElementById('tmdb-player-iframe');
    if (iframe) iframe.src = 'about:blank';
  }

  // ============ PULSANTE ============
  function injectButton() {
    const media = getMediaInfo();
    if (!media) return;
    if (document.getElementById('tmdb-player-button')) return;

    const btn = document.createElement('button');
    btn.id = 'tmdb-player-button';
    btn.className = 'tmdb-player-button';
    btn.innerHTML = '<span class="tmdb-player-btn-icon">▶</span><span>Guarda in Italiano</span>';
    btn.title = 'Apri il player (P)';
    btn.addEventListener('click', openModal);

    const target =
      document.querySelector('.header .action_bar') ||
      document.querySelector('.header_info .action_bar') ||
      document.querySelector('.single_column .header') ||
      document.querySelector('.header');

    if (target) {
      target.appendChild(btn);
    } else {
      btn.classList.add('tmdb-player-button-floating');
      document.body.appendChild(btn);
    }

    document.addEventListener('keydown', (ev) => {
      const tag = (ev.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || ev.target.isContentEditable) return;
      if (ev.key === 'p' && !ev.ctrlKey && !ev.metaKey) {
        ev.preventDefault();
        openModal();
      }
    });
  }

  // ============ INIT ============
  function init() {
    injectButton();
  }

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document.getElementById('tmdb-player-button')?.remove();
      setTimeout(init, 400);
    }
  }).observe(document, { subtree: true, childList: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();