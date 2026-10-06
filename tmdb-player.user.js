// ==UserScript==
// @name         TMDB Player Italiano – VixSrc (v4.6.2 – safe perf)
// @namespace    https://tampermonkey.net/
// @version      4.6.2
// @description  Popup in-page VixSrc italiano. Layout stabile + ottimizzazioni sicure.
// @author       TMDB Player
// @match        https://www.themoviedb.org/movie/*
// @match        https://www.themoviedb.org/tv/*
// @match        https://themoviedb.org/movie/*
// @match        https://themoviedb.org/tv/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
  'use strict';

  const VERSION      = '4.6.2';
  const PREFIX       = 'tmdb-it-v4';
  const STORAGE_KEY  = `${PREFIX}-settings-v3`;
  const HIJACK_CLASS = `${PREFIX}-play-btn`;

  /* ============================================================
     SORGENTE
     ============================================================ */

  const VIXSRC = {
    name: 'VixSrc 🇮🇹',
    movie: (id)     => `https://vixsrc.to/movie/${id}?lang=it&autoPlay=true`,
    tv:    (id,s,e) => `https://vixsrc.to/tv/${id}/${s}/${e}?lang=it&autoPlay=true`,
  };

  const DEFAULTS = { season: 1, episode: 1 };
  const state = { ...DEFAULTS, currentMedia: null };

  /* ============================================================
     CSS
     ============================================================ */

  const CSS = `
    /* ---- Pulsante hijackato ---- */
    a.${HIJACK_CLASS} {
      display:inline-flex !important; align-items:center !important; gap:8px !important;
      padding:9px 16px !important;
      background:linear-gradient(135deg,#01b4e4,#0d8ac4) !important;
      color:#fff !important; border-radius:999px !important; border:0 !important;
      box-shadow:0 4px 14px rgba(1,180,228,.4) !important;
      font-weight:800 !important; text-decoration:none !important;
      transition:transform .12s ease,box-shadow .12s ease,filter .12s ease !important;
      cursor:pointer !important;
    }
    a.${HIJACK_CLASS}:hover {
      transform:translateY(-1px) !important;
      box-shadow:0 6px 20px rgba(1,180,228,.6) !important;
      filter:brightness(1.06) !important;
      color:#fff !important; text-decoration:none !important;
    }
    a.${HIJACK_CLASS} .glyphicons { filter:invert(1) !important; }
    li.${PREFIX}-force-visible { display:flex !important; }

    /* ---- Fallback flottante ---- */
    #${PREFIX}-floating {
      position:fixed !important; right:18px !important; bottom:18px !important;
      display:flex !important; align-items:center !important; gap:8px !important;
      padding:12px 18px !important; border:0 !important; border-radius:999px !important;
      background:linear-gradient(135deg,#01b4e4,#0d8ac4) !important; color:#fff !important;
      cursor:pointer !important; font:800 14px/1 Arial,sans-serif !important;
      z-index:2147483000 !important;
      box-shadow:0 6px 25px rgba(0,0,0,.45) !important;
    }
    #${PREFIX}-floating:hover { filter:brightness(1.08); transform:translateY(-1px); }

    /* ---- Animazioni ---- */
    @keyframes ${PREFIX}-fade  { from { opacity:0 } to { opacity:1 } }
    @keyframes ${PREFIX}-slide { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
    @keyframes ${PREFIX}-spin  { to { transform:rotate(360deg) } }
    @keyframes ${PREFIX}-pulse { 0%,100% { opacity:.55 } 50% { opacity:1 } }

    /* ---- Modal ---- */
    #${PREFIX}-modal, #${PREFIX}-modal * { box-sizing:border-box; }
    #${PREFIX}-modal {
      position:fixed; inset:0; display:none;
      z-index:2147483646;
      font-family:Arial,Helvetica,sans-serif;
    }
    #${PREFIX}-modal.active { display:block; }

    /* Backdrop: niente blur, solo colore solido */
    #${PREFIX}-modal .backdrop {
      position:absolute; inset:0;
      background:rgba(0,0,0,.95);
    }

    /* Panel: flex normale, senza contain */
    #${PREFIX}-modal .panel {
      position:absolute; inset:3vh 3vw;
      display:flex; flex-direction:column;
      overflow:hidden;
      background:#08111b; color:#fff;
      border:1px solid rgba(255,255,255,.14);
      border-radius:16px;
      box-shadow:0 25px 80px rgba(0,0,0,.75);
      animation:${PREFIX}-slide .22s ease both;
    }

    #${PREFIX}-modal .topbar {
      display:flex; align-items:center; gap:10px; flex-wrap:wrap;
      padding:10px 14px;
      background:linear-gradient(180deg,#101c28,#0c1723);
      border-bottom:1px solid rgba(255,255,255,.08);
      flex: 0 0 auto;
    }
    #${PREFIX}-modal .title { font-weight:800; margin-right:auto; font-size:14px; }
    #${PREFIX}-modal .title small {
      display:block; font-weight:600; font-size:11px;
      color:#7d94a8; margin-top:2px;
    }
    #${PREFIX}-modal .badge {
      font-size:11px; padding:4px 9px; border-radius:99px;
      background:#162536; color:#a9d9ea;
      font-weight:700; letter-spacing:.3px;
    }
    #${PREFIX}-modal .toolbar { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
    #${PREFIX}-modal button,
    #${PREFIX}-modal input {
      border:1px solid rgba(255,255,255,.12);
      border-radius:8px; background:#142231; color:#fff;
      font:600 12px/1 Arial,sans-serif;
    }
    #${PREFIX}-modal button { padding:8px 11px; cursor:pointer; transition:background .12s, transform .1s; }
    #${PREFIX}-modal button:hover { background:#1b3046; }
    #${PREFIX}-modal button:active { transform:scale(.96); }
    #${PREFIX}-modal input { padding:8px 10px; min-height:34px; width:60px; text-align:center; }
    #${PREFIX}-modal .field { display:flex; align-items:center; gap:5px; }
    #${PREFIX}-modal .field span { color:#9bb0c2; font-size:11px; font-weight:700; }

    /* Player: layout flex normale, niente contain, iframe in flow */
    #${PREFIX}-modal .player {
      position:relative;
      flex: 1 1 auto;
      min-height: 0;
      background:#000;
    }
    #${PREFIX}-modal iframe {
      width:100%; height:100%; border:0; display:block; background:#000;
    }

    /* Loading overlay */
    #${PREFIX}-modal .loading {
      position:absolute; inset:0;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      background:radial-gradient(circle at center,#0a1b2a,#000);
      z-index:3; text-align:center; padding:24px;
      transition:opacity .3s ease;
    }
    #${PREFIX}-modal .loading.hidden { opacity:0; pointer-events:none; }
    #${PREFIX}-modal .spinner {
      width:44px; height:44px;
      border:4px solid #243340; border-top-color:#01b4e4;
      border-radius:50%; animation:${PREFIX}-spin .8s linear infinite;
    }
    #${PREFIX}-modal .loading strong { margin-top:14px; font-size:15px; }
    #${PREFIX}-modal .loading small { color:#8ea1b2; margin-top:6px; max-width:650px; line-height:1.45; }
    #${PREFIX}-modal .loading .hint {
      margin-top:14px; font-size:11px; color:#ffd166;
      animation:${PREFIX}-pulse 1.6s infinite;
    }

    #${PREFIX}-modal .footer {
      display:flex; gap:10px; align-items:center; justify-content:space-between;
      padding:9px 14px; background:#101c28; color:#91a4b4; font-size:11px;
      flex: 0 0 auto;
    }
    #${PREFIX}-modal .close { font-size:20px; line-height:1; padding:6px 12px; }
    #${PREFIX}-modal .ok   { color:#57d88b; }
    #${PREFIX}-modal .warn { color:#ffd166; }
    #${PREFIX}-modal .err  { color:#ff6b6b; }

    @media (max-width:900px) {
      #${PREFIX}-modal .panel { inset:0; border-radius:0; }
      #${PREFIX}-modal .title small { display:none; }
    }
  `;

  /* ============================================================
     UTILITY
     ============================================================ */

  const log  = (...a) => console.log(`%c[TMDB IT v${VERSION}]`, 'color:#01b4e4;font-weight:bold', ...a);
  const warn = (...a) => console.warn(`[TMDB IT v${VERSION}]`, ...a);

  function injectStyle() {
    if (document.getElementById(`${PREFIX}-style`)) return;
    const style = document.createElement('style');
    style.id = `${PREFIX}-style`;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function getTitleFromDom() {
    const h2 = document.querySelector('h2 a[href*="/movie/"], h2 a[href*="/tv/"], h2 a');
    return h2?.textContent?.trim() || document.title.split('—')[0].trim();
  }

  /* ============================================================
     SETTINGS
     ============================================================ */

  function loadSettings() {
    try {
      const saved = GM_getValue(STORAGE_KEY, DEFAULTS);
      if (saved && typeof saved === 'object') Object.assign(state, DEFAULTS, saved);
    } catch (e) {
      warn('Impossibile leggere preferenze', e);
      Object.assign(state, DEFAULTS);
    }
  }

  function saveSettings() {
    try {
      GM_setValue(STORAGE_KEY, { season: state.season, episode: state.episode });
    } catch (e) { warn('Impossibile salvare preferenze', e); }
  }

  /* ============================================================
     MEDIA
     ============================================================ */

  function mediaFromUrl() {
    const path = location.pathname;
    const movie = path.match(/^\/movie\/(\d+)/);
    if (movie) return { type: 'movie', id: movie[1] };
    const tv = path.match(/^\/tv\/(\d+)/);
    if (!tv) return null;
    const sm = path.match(/\/season\/(\d+)/);
    const em = path.match(/\/episode\/(\d+)/);
    return {
      type: 'tv',
      id: tv[1],
      season: Number(sm?.[1] || state.season || 1),
      episode: Number(em?.[1] || state.episode || 1),
    };
  }

  function currentMedia() {
    const base = mediaFromUrl();
    if (!base) return null;
    if (base.type === 'movie') return base;
    const seasonInput  = document.getElementById(`${PREFIX}-season`);
    const episodeInput = document.getElementById(`${PREFIX}-episode`);
    return {
      ...base,
      season:  Math.max(1, Number(seasonInput?.value  || state.season  || base.season)  || 1),
      episode: Math.max(1, Number(episodeInput?.value || state.episode || base.episode) || 1),
    };
  }

  function buildUrl(media) {
    return media.type === 'movie'
      ? VIXSRC.movie(media.id)
      : VIXSRC.tv(media.id, media.season, media.episode);
  }

  /* ============================================================
     HIJACK
     ============================================================ */

  function hijackTrailerButton() {
    if (document.querySelector(`a.${HIJACK_CLASS}`)) return true;
    const original = document.querySelector('a.play_trailer');
    if (!original) return false;

    const clone = original.cloneNode(true);
    clone.classList.remove('play_trailer');
    clone.classList.add(HIJACK_CLASS);
    clone.removeAttribute('data-site');
    clone.removeAttribute('data-id');
    clone.removeAttribute('data-title');
    clone.setAttribute('href', '#');
    clone.setAttribute('aria-label', 'Guarda in italiano');
    clone.setAttribute('title', `TMDB Player IT · ${VIXSRC.name}\nScorciatoia: P`);
    clone.innerHTML = '<span class="glyphicons play"></span> Guarda in Italiano';

    clone.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      openModal();
    }, true);

    original.parentNode.replaceChild(clone, original);

    const li = clone.closest('li');
    if (li) { li.classList.remove('none'); li.classList.add(`${PREFIX}-force-visible`); }

    log('Pulsante dirottato → popup VixSrc');
    return true;
  }

  /* ============================================================
     FALLBACK FLOTTANTE
     ============================================================ */

  function makeFloatingButton() {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = `${PREFIX}-floating`;
    b.dataset[`${PREFIX}Button`] = '1';
    b.innerHTML = '<span>▶</span><span>Guarda in Italiano</span>';
    b.title = `TMDB Player IT · ${VIXSRC.name}\n(Scorciatoia: P)`;
    b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      openModal();
    }, true);
    return b;
  }

  function ensureFloatingFallback() {
    if (!mediaFromUrl()) return;
    if (document.querySelector(`a.${HIJACK_CLASS}`)) return;
    if (document.getElementById(`${PREFIX}-floating`)) return;
    document.body.appendChild(makeFloatingButton());
  }
  function removeFloatingFallback() { document.getElementById(`${PREFIX}-floating`)?.remove(); }

  /* ============================================================
     MODAL
     ============================================================ */

  let loadTimeoutId = null;

  function createModal() {
    let modal = document.getElementById(`${PREFIX}-modal`);
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = `${PREFIX}-modal`;
    modal.innerHTML = `
      <div class="backdrop"></div>
      <div class="panel" role="dialog" aria-modal="true" aria-label="TMDB Player Italiano">
        <div class="topbar">
          <div class="title">🎬 TMDB Player Italiano<small id="${PREFIX}-subtitle"></small></div>
          <div class="badge" id="${PREFIX}-badge"></div>
          <div class="toolbar">
            <label class="field tv-only"><span>S</span><input id="${PREFIX}-season" type="number" min="1" value="1"></label>
            <label class="field tv-only"><span>E</span><input id="${PREFIX}-episode" type="number" min="1" value="1"></label>
            <button type="button" id="${PREFIX}-full"   title="Schermo intero (F)">⛶</button>
            <button type="button" id="${PREFIX}-tab"    title="Apri in nuova scheda">↗</button>
            <button type="button" id="${PREFIX}-reload" title="Ricarica">↻</button>
            <button type="button" id="${PREFIX}-close"  class="close" title="Chiudi (Esc)">×</button>
          </div>
        </div>
        <div class="player" id="${PREFIX}-player">
          <div class="loading" id="${PREFIX}-loading">
            <div class="spinner"></div>
            <strong>Avvio VixSrc…</strong>
            <small id="${PREFIX}-loadtext">Lingua: Italiano</small>
            <div class="hint" id="${PREFIX}-hint">Se il video non parte, ricarica (↻) o apri in nuova scheda (↗)</div>
          </div>
          <iframe id="${PREFIX}-iframe"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; accelerometer; gyroscope"
                  allowfullscreen
                  referrerpolicy="origin"></iframe>
        </div>
        <div class="footer">
          <span id="${PREFIX}-status" class="ok">Pronto</span>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector(`#${PREFIX}-tab`).addEventListener('click', openDirectInTab);
    modal.querySelector(`#${PREFIX}-reload`).addEventListener('click', () => loadIframe());
    modal.querySelector(`#${PREFIX}-close`).addEventListener('click', closeModal);
    modal.querySelector('.backdrop').addEventListener('click', closeModal);

    modal.querySelector(`#${PREFIX}-full`).addEventListener('click', () => {
      const player = modal.querySelector(`#${PREFIX}-player`);
      if (!document.fullscreenElement) {
        (player.requestFullscreen?.() || player.webkitRequestFullscreen?.());
      } else {
        document.exitFullscreen?.();
      }
    });

    const updateEpisode = () => {
      const m = mediaFromUrl();
      if (!m || m.type !== 'tv') return;
      state.season  = Math.max(1, Number(modal.querySelector(`#${PREFIX}-season`).value)  || 1);
      state.episode = Math.max(1, Number(modal.querySelector(`#${PREFIX}-episode`).value) || 1);
      saveSettings(); updateBadge(); loadIframe();
    };
    modal.querySelector(`#${PREFIX}-season`).addEventListener('change', updateEpisode);
    modal.querySelector(`#${PREFIX}-episode`).addEventListener('change', updateEpisode);

    // Log diagnostico sul load dell'iframe
    const iframe = modal.querySelector(`#${PREFIX}-iframe`);
    iframe.addEventListener('load', () => {
      const src = iframe.src || '';
      if (!src || src === 'about:blank') {
        log('iframe load: about:blank (ignorato)');
        return;
      }
      log('iframe load OK:', src);
      hideLoading();
      setStatus('Caricato VixSrc · IT', 'ok');
    });
    iframe.addEventListener('error', (e) => {
      warn('iframe error', e);
      setStatus('Errore nel caricamento iframe — prova ↗', 'err');
    });

    return modal;
  }

  function hideLoading() {
    const modal = document.getElementById(`${PREFIX}-modal`);
    if (!modal) return;
    modal.querySelector(`#${PREFIX}-loading`)?.classList.add('hidden');
    clearTimeout(loadTimeoutId);
  }
  function showLoading() {
    const modal = document.getElementById(`${PREFIX}-modal`);
    if (!modal) return;
    modal.querySelector(`#${PREFIX}-loading`)?.classList.remove('hidden');
  }

  function updateBadge() {
    const modal = document.getElementById(`${PREFIX}-modal`);
    if (!modal) return;
    const media = currentMedia() || mediaFromUrl();
    if (!media) return;
    modal.querySelector(`#${PREFIX}-badge`).textContent = media.type === 'movie'
      ? `FILM #${media.id}`
      : `TV #${media.id} · S${media.season}E${media.episode}`;
    const sub = modal.querySelector(`#${PREFIX}-subtitle`);
    if (sub) sub.textContent = getTitleFromDom();
    modal.querySelectorAll('.tv-only').forEach((x) => {
      x.style.display = media.type === 'tv' ? '' : 'none';
    });
    if (media.type === 'tv') {
      modal.querySelector(`#${PREFIX}-season`).value = media.season;
      modal.querySelector(`#${PREFIX}-episode`).value = media.episode;
    }
  }

  function setStatus(text, kind = 'ok') {
    const el = document.getElementById(`${PREFIX}-status`);
    if (!el) return;
    el.textContent = text;
    el.className = kind;
  }

  function loadIframe() {
    const media = currentMedia();
    if (!media) { warn('Media non riconosciuto'); return; }
    const iframe = document.getElementById(`${PREFIX}-iframe`);
    if (!iframe) return;
    const loadtext = document.getElementById(`${PREFIX}-loadtext`);
    if (loadtext) loadtext.textContent = `Lingua: Italiano · ${VIXSRC.name}`;
    setStatus('Apertura VixSrc…', 'ok');
    showLoading();
    updateBadge();

    // Reset + load nuovo URL (single rAF, come nella 4.5.0 che funzionava)
    iframe.src = 'about:blank';

    clearTimeout(loadTimeoutId);
    loadTimeoutId = setTimeout(() => {
      hideLoading();
      setStatus('Timeout VixSrc — prova ↻ o ↗', 'warn');
    }, 10000);

    requestAnimationFrame(() => {
      const url = buildUrl(media);
      log('loadIframe → src =', url);
      iframe.src = url;
    });
  }

  function openModal() {
    const media = currentMedia();
    if (!media) { warn('Media non riconosciuto'); return; }
    state.currentMedia = media;
    const modal = createModal();
    updateBadge();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Sospendi l'observer (unica ottimizzazione "pesante" tenuta)
    suspendObserver();
    loadIframe();
  }

  function closeModal() {
    const modal = document.getElementById(`${PREFIX}-modal`);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    clearTimeout(loadTimeoutId);
    const iframe = modal.querySelector(`#${PREFIX}-iframe`);
    if (iframe) iframe.src = 'about:blank';
    if (document.fullscreenElement) document.exitFullscreen?.();

    resumeObserver();
  }

  /* ============================================================
     AZIONI
     ============================================================ */

  function openDirectInTab() {
    const media = currentMedia();
    if (!media) { warn('Media non riconosciuto'); return; }
    const url = buildUrl(media);
    log('Apro in nuova scheda:', url);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /* ============================================================
     MENU
     ============================================================ */

  function registerMenu() {
    try {
      GM_registerMenuCommand('▶ Apri player VixSrc in popup', openModal);
      GM_registerMenuCommand('↗ Apri VixSrc in nuova scheda', openDirectInTab);
      GM_registerMenuCommand('🧹 Ripristina preferenze S/E', () => {
        Object.assign(state, DEFAULTS);
        saveSettings();
        alert('Preferenze stagione/episodio ripristinate.');
      });
    } catch (e) { warn('GM_registerMenuCommand non disponibile', e); }
  }

  /* ============================================================
     SPA OBSERVER
     ============================================================ */

  let lastUrl   = location.href;
  let scheduled = false;
  let observer  = null;

  function suspendObserver() { if (observer) observer.disconnect(); }
  function resumeObserver() {
    if (observer) observer.observe(document.body, { childList: true, subtree: true });
  }

  function refreshUi() {
    const modal = document.getElementById(`${PREFIX}-modal`);
    if (modal?.classList.contains('active')) return;
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        closeModal();
        state.currentMedia = null;
        removeFloatingFallback();
      }
      const ok = hijackTrailerButton();
      if (ok) removeFloatingFallback();
      else setTimeout(ensureFloatingFallback, 1200);
    }, 120);
  }

  /* ============================================================
     INIT
     ============================================================ */

  function init() {
    injectStyle();
    loadSettings();
    registerMenu();

    if (!hijackTrailerButton()) {
      setTimeout(hijackTrailerButton, 300);
      setTimeout(hijackTrailerButton, 800);
      setTimeout(hijackTrailerButton, 1500);
      setTimeout(ensureFloatingFallback, 2000);
    }

    document.addEventListener('keydown', (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        openModal();
      } else if (e.key === 'Escape') {
        const modal = document.getElementById(`${PREFIX}-modal`);
        if (modal?.classList.contains('active')) closeModal();
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const modal = document.getElementById(`${PREFIX}-modal`);
        if (modal?.classList.contains('active')) {
          document.getElementById(`${PREFIX}-full`)?.click();
        }
      }
    });

    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.target?.closest?.(`#${PREFIX}-modal`)) continue;
        if (m.target?.classList?.contains?.(HIJACK_CLASS)) continue;
        refreshUi();
        return;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', refreshUi);
    window.addEventListener('hashchange', refreshUi);

    log(`v${VERSION} attivo · VixSrc only · media:`, mediaFromUrl());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
