#!/usr/bin/env node
/**
 * Crea i ZIP (flat + con cartella) e il CRX firmato dell'estensione.
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

/**
 * Crea uno ZIP.
 * @param {string} outputPath - percorso del file .zip da creare
 * @param {string|null} rootFolder - nome cartella radice dentro lo zip (null = flat)
 */
function createZip(outputPath, rootFolder = null) {
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

      // Se rootFolder è specificato, prepend al path interno
      const archivePath = rootFolder ? `${rootFolder}/${item}` : item;

      if (stat.isDirectory()) {
        archive.directory(fullPath, archivePath);
        log(`  + ${archivePath}/ (cartella)`);
      } else {
        archive.file(fullPath, { name: archivePath });
        log(`  + ${archivePath}`);
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

  const zipFlatPath   = path.join(outputDir, `tmdb-player-v${version}.zip`);
  const zipFolderPath = path.join(outputDir, `tmdb-player-v${version}-folder.zip`);
  const crxPath       = path.join(outputDir, `tmdb-player-v${version}.crx`);
  const folderName    = `tmdb-player-v${version}`;

  // 1. ZIP flat (per AMO / Chrome Web Store)
  log('📦 Creo il ZIP (flat, per AMO/Chrome Web Store)...');
  try {
    const size = await createZip(zipFlatPath, null);
    log(`✅ ZIP flat creato: ${path.basename(zipFlatPath)} (${(size / 1024).toFixed(1)} KB)`);
  } catch (e) {
    fail(`Errore creando lo ZIP flat: ${e.message}`);
  }
  log('');

  // 2. ZIP con cartella (per estrazione manuale)
  log('📦 Creo il ZIP (con cartella, per estrazione manuale)...');
  try {
    const size = await createZip(zipFolderPath, folderName);
    log(`✅ ZIP cartella creato: ${path.basename(zipFolderPath)} (${(size / 1024).toFixed(1)} KB)`);
  } catch (e) {
    fail(`Errore creando lo ZIP con cartella: ${e.message}`);
  }
  log('');

  // 3. CRX firmato
  log('🔐 Creo il CRX firmato...');
  try {
    const files = INCLUDE.map(item => path.join(ROOT, item));
    await crx3(files, {
      keyPath: keyPath,
      crxPath: crxPath,
      zipPath: zipFlatPath
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
  log(`   📦 ${zipFlatPath}`);
  log(`   📦 ${zipFolderPath}`);
  log(`   📦 ${crxPath}`);
}

main().catch((e) => {
  console.error('❌ Errore fatale:', e);
  process.exit(1);
});
