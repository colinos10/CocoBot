import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commands: unknown[] = [];
const commandsPath = path.join(__dirname, 'commands');

// Fonction récursive pour récupérer tous les fichiers (.ts ou .js) dans les sous-dossiers
function getCommandFiles(dir: string): string[] {
  let files: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(getCommandFiles(fullPath));
    } else if (
      (item.name.endsWith('.ts') || item.name.endsWith('.js')) &&
      !item.name.endsWith('.d.ts')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

const commandFiles = getCommandFiles(commandsPath);

for (const filePath of commandFiles) {
  // pathToFileURL gère les chemins absolus sous Windows et Linux (compatible ESM)
  const fileUrl = pathToFileURL(filePath).href;
  const module = await import(fileUrl);
  const command = module.command || module.default;

  if (command && 'data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`🔹 Chargée : /${command.data.name}`);
  } else {
    console.warn(`⚠️ Le fichier ${filePath} n'exporte pas une commande valide.`);
  }
}

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error('❌ Erreur : DISCORD_TOKEN, CLIENT_ID ou GUILD_ID manquant dans le fichier .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\n🔄 Enregistrement de ${commands.length} commandes sur le serveur...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
      { body: commands }
    );

    console.log('✅ Toutes les commandes Slash ont été enregistrées avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du déploiement :', error);
  }
})();