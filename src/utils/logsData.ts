import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
const logsFilePath = path.join(dataDir, 'logs.json');

export type LogEventType = 
  | 'memberJoin'
  | 'memberLeave'
  | 'memberKick'
  | 'memberBan'
  | 'messageDelete'
  | 'messageUpdate'
  | 'voiceJoin'
  | 'voiceLeave'
  | 'voiceSwitch';

export interface LogConfig {
  channelId: string;
  customTemplates?: Partial<Record<LogEventType, string>>;
  enabledEvents?: Partial<Record<LogEventType, boolean>>; // true = activé, false = désactivé
}

export interface LogsDatabase {
  [guildId: string]: LogConfig;
}

// Modèles par défaut
export const DEFAULT_TEMPLATES: Record<LogEventType, string> = {
  memberJoin: '📥 {user} (**{user_name}**) a rejoint le serveur ! Nous sommes maintenant **{member_count}**.',
  memberLeave: '📤 {user_name} a quitté le serveur. Nous sommes désormais **{member_count}**.',
  memberKick: '🚪 {user_name} a été expulsé par **{moderator}**.\n**Raison :** {reason}',
  memberBan: '🔨 {user_name} a été banni par **{moderator}**.\n**Raison :** {reason}',
  messageDelete: '🗑️ Message de {user} supprimé dans {channel} :\n> {content}',
  messageUpdate: '✏️ Message de {user} modifié dans {channel} :\n**Avant :** {old_content}\n**Après :** {new_content}',
  voiceJoin: '🔊 {user_name} a rejoint le salon vocal {channel}.',
  voiceLeave: '🔇 {user_name} a quitté le salon vocal {channel}.',
  voiceSwitch: '🔀 {user_name} a changé de salon : {old_channel} ➔ {new_channel}.'
};

export function getLogsData(): LogsDatabase {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(logsFilePath)) {
    fs.writeFileSync(logsFilePath, JSON.stringify({}, null, 2), 'utf-8');
    return {};
  }

  try {
    const rawData = fs.readFileSync(logsFilePath, 'utf-8');
    return JSON.parse(rawData);
  } catch {
    return {};
  }
}

export function saveLogsData(data: LogsDatabase): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(logsFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function formatMessage(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, String(val));
  }
  return result;
}

/**
 * Vérifie si un log spécifique est activé sur le serveur (activé par défaut si non précisé)
 */
export function isLogEventEnabled(guildId: string, event: LogEventType): boolean {
  const db = getLogsData();
  const config = db[guildId];
  if (!config || !config.channelId) return false;
  
  return config.enabledEvents?.[event] ?? true;
}