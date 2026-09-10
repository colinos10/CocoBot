import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFilePath = path.join(__dirname, '..', '..', 'data', 'tempvoice.json');

export interface GuildVoiceConfig {
  generatorChannelId: string; // L'ID du salon "➕ Créer un salon"
  categoryId?: string;        // La catégorie où créer les salons
  activeChannels: string[];   // Liste des IDs de salons temporaires actifs
}

export function getTempVoiceData(): Record<string, GuildVoiceConfig> {
  if (!fs.existsSync(dataFilePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveTempVoiceData(data: Record<string, GuildVoiceConfig>) {
  const dir = path.dirname(dataFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}