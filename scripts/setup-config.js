#!/usr/bin/env node
/**
 * Copie les fichiers *.example.json vers *.json si ces derniers n'existent pas.
 * Les JSON de config sont exclus du versioning pour éviter d'écraser les modifs
 * faites via l'admin en production.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.join(__dirname, "..", "src", "config");

const configFiles = [
  "guide",
  "pokedex",
  "extradex",
  "downloads",
  "news",
  "patchnotes",
  "patchnotes-en",
  "patchnotesEN",
  "site",
  "patreon",
  "footer",
  "external",
  "sections",
  "sections-en",
  "translations",
];

let created = 0;
for (const name of configFiles) {
  const examplePath = path.join(configDir, `${name}.example.json`);
  const targetPath = path.join(configDir, `${name}.json`);
  if (fs.existsSync(examplePath) && !fs.existsSync(targetPath)) {
    fs.copyFileSync(examplePath, targetPath);
    console.log(`  ✓ ${name}.json créé depuis le template`);
    created++;
  }
}
if (created > 0) {
  console.log(`\n${created} fichier(s) de config initialisé(s).`);
}
