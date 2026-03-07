#!/usr/bin/env node
/**
 * Vérifie que le dossier src/config existe (postinstall).
 * Les JSON sont versionnés ; les modifs admin sont écrites dans le volume et dans src/config puis poussées sur GitHub.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.join(__dirname, "..", "src", "config");
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
  console.log("  ✓ Dossier src/config créé.");
}
