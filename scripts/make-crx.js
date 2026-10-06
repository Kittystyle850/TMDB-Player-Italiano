#!/usr/bin/env node
/**
 * Genera il file .crx firmato a partire dallo ZIP dell'estensione.
 *
 * Uso: node scripts/make-crx.js <input.zip> <output.crx> <key.pem>
 */

const fs = require('fs');
const path = require('path');
const crx3 = require('crx3');

async function main() {
  const [zipPath, crxPath, keyPath] = process.argv.slice(2);

  if (!zipPath || !crxPath || !keyPath) {
    console.error('❌ Uso: node make-crx.js <input.zip> <output.crx> <key.pem>');
    process.exit(1);
  }
  if (!fs.existsSync(zipPath)) {
    console.error(`❌ ZIP non trovato: ${zipPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(keyPath)) {
    console.error(`❌ Chiave non trovata: ${keyPath}`);
    process.exit(1);
  }

  try {
    const zipBuffer = fs.readFileSync(zipPath);
    const crxBuffer = await crx3(zipBuffer, { keyPath });
    fs.mkdirSync(path.dirname(crxPath), { recursive: true });
    fs.writeFileSync(crxPath, crxBuffer);
    const size = (fs.statSync(crxPath).size / 1024).toFixed(1);
    console.log(`✅ CRX creato: ${crxPath} (${size} KB)`);
  } catch (e) {
    console.error('❌ Errore nella creazione del CRX:', e.message);
    process.exit(1);
  }
}

main();