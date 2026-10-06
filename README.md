# 🎬 TMDB Player – Streaming Italiano

**Guarda film e serie TV in italiano direttamente da [TheMovieDB](https://www.themoviedb.org/).**

Aggiunge un pulsante **▶ Guarda in Italiano** sulle pagine TMDB e riproduce i contenuti tramite server embed pubblici, forzando `lang=it`.

[![Release](https://img.shields.io/github/v/release/TUO-UTENTE/TMDB-Player-Italiano?color=01b4e4)](https://github.com/TUO-UTENTE/TMDB-Player-Italiano/releases)
[![License](https://img.shields.io/github/license/TUO-UTENTE/TMDB-Player-Italiano?color=90cea1)](LICENSE)

---

## ✨ Funzionalità

- 🎯 Rilevamento automatico film/serie dalla URL
- 🇮🇹 Forzatura lingua italiana (`lang=it`)
- 📺 Supporto serie TV (stagione + episodio)
- 🔄 Selettore server + 6 lingue nel player
- 💾 Preferenze salvate
- ⌨️ Scorciatoia `P` per aprire il player
- 🔒 Nessuna raccolta dati

---

## 🎁 Due versioni

| | 🐵 Violentmonkey | 🧩 Estensione |
|---|---|---|
| Installazione | ✅ Click e via | ⚠️ Modalità sviluppatore |
| Avvisi | ✅ Nessuno | ⚠️ "Non nello store" |
| Aggiornamenti | ✅ Automatici | ⚠️ Manuali |
| Costo | 🆓 Gratis | 🆓 Gratis |
| **Consigliato** | ✅ Sì | Solo per distribuzione |

---

## 📥 Installazione

### 🐵 Violentmonkey (consigliato)

1. Installa [Violentmonkey](https://violentmonkey.github.io/get-it/)
2. Apri [`tmdb-player.user.js`](./tmdb-player.user.js) → clicca **Raw**
3. Violentmonkey chiede di installare → **Installa**

> ⚠️ Su Brave/Chrome **usa Violentmonkey, non Tampermonkey** (problemi di sandbox).

### 🧩 Estensione browser

**Chrome / Brave / Edge (unpacked):**
1. Scarica `tmdb-player-vX.Y.Z-folder.zip` dalla [release](../../releases)
2. Estrai in una cartella permanente (es. `C:\Estensioni\tmdb-player\`)
3. `chrome://extensions` → **Modalità sviluppatore** → **Carica estensione non pacchettizzata** → seleziona la cartella

**Firefox:**
1. Scarica `tmdb-player-vX.Y.Z.zip` (flat)
2. `about:debugging#/runtime/this-firefox` → **Carica componente temporanea** → `manifest.json`

---

## 🚀 Uso

1. Vai su `https://www.themoviedb.org/movie/550-fight-club` (o una pagina `/tv/...`)
2. Clicca **▶ Guarda in Italiano** (o premi `P`)
3. Cambia server/lingua dal menu nel player

**Scorciatoie:** `P` apri • `Esc` chiudi • `Ctrl+R` ricarica

---

## 🔧 Server supportati

| Server | Audio IT | Note |
|--------|:--------:|------|
| **🇮🇹 VixSrc** | ✅ | **Consigliato** |
| Embed.su | ✅ | Buona copertura |
| VidLink.pro | ✅ | Alternativa |
| VidSrc.net / .to | ⚠️ sub | Solo sottotitoli |
| 2Embed / MultiEmbed | ⚠️ sub | Backup |

---

## 🛠️ Problemi comuni

| Problema | Soluzione |
|----------|-----------|
| Pulsante non appare | Verifica URL (`/movie/` o `/tv/`) e ricarica |
| Video non parte | Cambia server • ↻ Ricarica • disattiva adblocker |
| Audio non italiano | Cambia server (VixSrc) • controlla menu Lingua |
| Script "X" su Violentmonkey | `chrome://extensions` → accesso sito → "Su tutti i siti" |
| "Non elencata nello store" | Normale su Brave/Chrome • ignora o usa Violentmonkey |

---

## 🔐 Privacy

Nessun dato raccolto o trasmesso. Solo preferenze locali (server + lingua). I player embed di terze parti hanno informative proprie.

## ⚖️ Disclaimer

Il progetto **non ospita contenuti** – incorpora solo player pubblici. L'utente è responsabile del rispetto delle leggi sul copyright.

---

## 🛠️ Sviluppo

```bash
git clone [https://github.com/Kittystyle850/TMDB-Player-Italiano]
cd TMDB-Player-Italiano
