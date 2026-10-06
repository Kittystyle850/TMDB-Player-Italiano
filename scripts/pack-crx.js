#!/usr/bin/env node
/**
 * pack-crx.js
 * Impacchetta l'estensione TMDB Player in .zip e .crx
 *
 * Uso:
 *   node scripts/pack-crx.js              # genera sia ZIP che CRX
 *   node scripts/pack-crx.js --zip-only   # solo ZIP
 *   node scripts/pack-crx.js --crx-only   # solo CRX
 *
 * Richiede:
 *   - CRX_PRIVATE_KEY (env) - contenuto della chiave .pem (per CRX)
 *   - opzionale: CRX_KEY_PATH - percorso del file .pem (alternativa)
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const crx3 = require('crx3');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const MANIFEST_PATH = path.join(ROOT, 'manifest.json');

const INCLUDE = [
  'manifest.json',
  'content.js',
  'content.css',
  'background.js',
  'popup.html',
  'popup.js',
  'icons'
];

// ---------- Utility ----------
function log(msg, type = 'info') {
  const icons = { info: 'ℹ️', ok: '✅', warn: '⚠️', err: '❌' };
  console.log(`${icons[type] || ''} ${msg}`);
}

function fail(msg) {
  log(msg, 'err');
  process.exit(1);
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) fail('manifest.json non trovato');
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`manifest.json non è JSON valido: ${e.message}`);
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanDist() {
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
    log('Cartella dist/ pulita');
  }
  ensureDir(DIST);
}

// ---------- ZIP ----------
function packZip(outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);

    archive.pipe(output);

    INCLUDE.forEach((item) => {
      const fullPath = path.join(ROOT, item);
      if (!fs.existsSync(fullPath)) {
        log(`Salto "${item}" (non trovato)`, 'warn');
        return;
      }
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        archive.directory(fullPath, item);
      } else {
        archive.file(fullPath, { name: item });
      }
    });

    // Esclude file di sviluppo
    archive.glob('**/*', {
      cwd: ROOT,
      ignore: [
        'node_modules/**',
        '.git/**',
        '.github/**',
        'dist/**',
        'scripts/**',
        '**/*.md',
        'package*.json',
        'icon-generator.html',
        'key.pem',
        '*.crx'
      ],
      dot: false,
      nodir: false
    });

    archive.finalize();
  });
}

// ---------- CRX ----------
async function packCrx(zipPath, outputPath, privateKeyBuffer) {
  const zipBuffer = fs.readFileSync(zipPath);
  const crxBuffer = await crx3(zipBuffer, {
    keyPath: null,
    crxPath: null,
    key: privateKeyBuffer,
    crxVersion: 3
  });
  fs.writeFileSync(outputPath, crxBuffer);
}

// ---------- MAIN ----------
async function main() {
  const args = process.argv.slice(2);
  const zipOnly = args.includes('--zip-only');
  const crxOnly = args.includes('--crx-only');

  log('🎬 TMDB Player – Build');

  const manifest = readManifest();
  const version = manifest.version;
  const slug = manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  log(`Nome: ${manifest.name}`);
  log(`Versione: ${version}`);

  cleanDist();

  const zipName = `${slug}-v${version}.zip`;
  const crxName = `${slug}-v${version}.crx`;
  const zipPath = path.join(DIST, zipName);
  const crxPath = path.join(DIST, crxName);

  // ZIP
  if (!crxOnly) {
    log('Creo il pacchetto ZIP...');
    const size = await packZip(zipPath);
    log(`ZIP creato: ${zipName} (${(size / 1024).toFixed(1)} KB)`, 'ok');
  }

  // CRX
  if (!zipOnly) {
    const keyPath = process.env.CRX_KEY_PATH;
    const keyEnv = process.env.CRX_PRIVATE_KEY;

    let keyBuffer = null;
    if (keyPath && fs.existsSync(keyPath)) {
      keyBuffer = fs.readFileSync(keyPath);
      log(`Chiave privata caricata da file: ${keyPath}`);
    } else if (keyEnv) {
      keyBuffer = Buffer.from(keyEnv.replace(/\\n/g, '\n'), 'utf8');
      log('Chiave privata caricata da variabile d\'ambiente');
    }

    if (!keyBuffer) {
      fail('Nessuna chiave privata trovata. Imposta CRX_PRIVATE_KEY o CRX_KEY_PATH.');
    }

    // Se il file PEM è passato in formato escapato, normalizza
    let keyStr = keyBuffer.toString('utf8');
    if (keyStr.includes('\\n')) {
      keyStr = keyStr.replace(/\\n/g, '\n');
    }
    if (!keyStr.includes('BEGIN') || !keyStr.includes('PRIVATE KEY')) {
      fail('La chiave privata non sembra un PEM valido (manca BEGIN/END PRIVATE KEY)');
    }
    keyBuffer = Buffer.from(keyStr, 'utf8');

    log('Creo il pacchetto CRX3...');
    try {
      await packCrx(zipPath, crxPath, keyBuffer);
      const stats = fs.statSync(crxPath);
      log(`CRX creato: ${crxName} (${(stats.size / 1024).toFixed(1)} KB)`, 'ok');
    } catch (e) {
      fail(`Errore nella creazione del CRX: ${e.message}`);
    }
  }

  log('Build completata!', 'ok');
  console.log(`\n📦 Output in ${DIST}`);
  fs.readdirSync(DIST).forEach(f => {
    const s = fs.statSync(path.join(DIST, f)).size;
    console.log(`   • ${f}  (${(s / 1024).toFixed(1)} KB)`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});