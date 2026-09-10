import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
const welcomeFilePath = path.join(dataDir, 'welcome.json');

export interface WelcomeConfig {
  enabled: boolean;
  channelId: string;
  message: string;
  embed: boolean; // Si true, envoyé sous forme de bel embed, sinon message texte simple
}

export interface WelcomeDatabase {
  [guildId: string]: WelcomeConfig;
}

export const DEFAULT_WELCOME_MESSAGE = '<:welcome:1196456671984226445> - New Member\nWelcome/Bienvenue {user} 😎';

export function getWelcomeData(): WelcomeDatabase {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(welcomeFilePath)) {
    fs.writeFileSync(welcomeFilePath, JSON.stringify({}, null, 2), 'utf-8');
    return {};
  }

  try {
    const raw = fs.readFileSync(welcomeFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveWelcomeData(data: WelcomeDatabase): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(welcomeFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function formatWelcomeMessage(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, String(val));
  }
  return result;
}