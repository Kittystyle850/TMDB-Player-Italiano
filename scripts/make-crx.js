#!/usr/bin/env node
/**
 * Crea il ZIP e il CRX firmato dell'estensione.
 *
 * Uso: node scripts/make-crx.js <version> <outputDir> <keyPath>
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const crx3 = require('crx3');

const ROOT = path.resolve(__dirname, '..');

const INCLUDE = [
  'manifest.json',
  'content.js',
  'content.css',
  'background.js',
  'popup.html',
  'popup.js',
  'icons'
];

function log(msg) { console.log(msg); }
function fail(msg) { console.error('❌ ' + msg); process.exit(1); }

function createZip(outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️ ', err.message);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    let count = 0;
    INCLUDE.forEach((item) => {
      const fullPath = path.join(ROOT, item);
      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️  Skip "${item}" (non trovato)`);
        return;
      }
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        archive.directory(fullPath, item);
        log(`  + ${item}/ (cartella)`);
      } else {
        archive.file(fullPath, { name: item });
        log(`  + ${item}`);
      }
      count++;
    });

    if (count === 0) {
      return reject(new Error('Nessun file trovato da includere nello ZIP'));
    }

    archive.finalize();
  });
}

async function main() {
  const [version, outputDir, keyPath] = process.argv.slice(2);

  if (!version || !outputDir || !keyPath) {
    fail('Uso: node make-crx.js <version> <outputDir> <keyPath>');
  }

  log('🎬 TMDB Player – Build');
  log(`   Versione:   ${version}`);
  log(`   Output:     ${outputDir}`);
  log(`   Chiave:     ${keyPath}`);
  log('');

  if (!fs.existsSync(keyPath)) {
    fail(`Chiave privata non trovata: ${keyPath}`);
  }
  const keyStr = fs.readFileSync(keyPath, 'utf8');
  if (!keyStr.includes('BEGIN') || !keyStr.includes('PRIVATE KEY')) {
    fail('La chiave non è un PEM valido (manca BEGIN/END PRIVATE KEY)');
  }
  log('✅ Chiave privata valida');
  log('');

  fs.mkdirSync(outputDir, { recursive: true });

  const zipPath = path.join(outputDir, `tmdb-player-v${version}.zip`);
  const crxPath = path.join(outputDir, `tmdb-player-v${version}.crx`);

  // 1. Crea ZIP
  log('📦 Creo il ZIP...');
  try {
    const zipSize = await createZip(zipPath);
    log(`✅ ZIP creato: ${path.basename(zipPath)} (${(zipSize / 1024).toFixed(1)} KB)`);
  } catch (e) {
    fail(`Errore creando lo ZIP: ${e.message}`);
  }
  log('');

  // 2. Crea CRX
  // crx3 si aspetta un array di file da includere, non uno stream.
  // Gli passiamo i file dell'estensione e le opzioni per scrivere direttamente il .crx
  log('🔐 Creo il CRX firmato...');
  try {
    const files = INCLUDE.map(item => path.join(ROOT, item));

    await crx3(files, {
      keyPath: keyPath,
      crxPath: crxPath,
      zipPath: zipPath
    });

    const crxSize = fs.statSync(crxPath).size;
    log(`✅ CRX creato: ${path.basename(crxPath)} (${(crxSize / 1024).toFixed(1)} KB)`);
  } catch (e) {
    console.error('❌ Errore nella creazione del CRX:', e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }

  log('');
  log('🎉 Build completata!');
  log(`   📦 ${zipPath}`);
  log(`   📦 ${crxPath}`);
}

main().catch((e) => {
  console.error('❌ Errore fatale:', e);
  process.exit(1);
});
