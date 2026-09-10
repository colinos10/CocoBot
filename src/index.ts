import { Client, Collection, Events, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Command } from './types.js';
import { handleVoiceStateUpdate } from './events/voiceStateUpdate.js';
import { registerLogsEvents } from './events/logsHandler.js';
import { registerWelcomeEvent } from './events/welcomeHandler.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,  // Détection des mouvements vocaux
    GatewayIntentBits.GuildMessages,     // Détection des messages créés/modifiés/supprimés
    GatewayIntentBits.MessageContent,    // Lecture du contenu des messages supprimés/modifiés
    GatewayIntentBits.GuildMembers       // Détection des arrivées/départs/expulsions/bans
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User
  ]
});

const commands = new Collection<string, Command>();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsPath = path.join(__dirname, 'commands');

// Fonction récursive pour charger tous les fichiers dans tous les sous-dossiers
function getCommandFiles(dir: string): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dir)) return files;

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

// Chargement de toutes les commandes
const commandFiles = getCommandFiles(commandsPath);

for (const filePath of commandFiles) {
  try {
    const module = await import(pathToFileURL(filePath).href);
    const command = module.command || module.default;

    if (command && 'data' in command && 'execute' in command) {
      commands.set(command.data.name, command);
      console.log(`✅ Commande chargée : /${command.data.name}`);
    } else {
      console.warn(`⚠️ Le fichier ${filePath} n'exporte pas une commande valide (data ou execute manquant).`);
    }
  } catch (err) {
    console.error(`❌ Erreur lors du chargement de ${filePath} :`, err);
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`🤖 Bot connecté en tant que ${readyClient.user.tag}`);
});

// Gestionnaire des interactions
client.on(Events.InteractionCreate, async (interaction) => {
  // ⚡ 1. Autocomplétion dynamique (filtre les rangs selon le jeu sélectionné)
  if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`❌ Erreur lors de l'autocomplétion de ${interaction.commandName}:`, error);
    }
    return;
  }

  // 💬 2. Commandes Slash (/commande)
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) {
      console.error(`Aucune commande correspondante à ${interaction.commandName} n'a été trouvée.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de ${interaction.commandName}:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Une erreur est survenue lors de l\'exécution de la commande !', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Une erreur est survenue lors de l\'exécution de la commande !', ephemeral: true });
      }
    }
    return;
  }

  // 🔘 3. Boutons & Menus déroulants (gérés par les collectors actifs)
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    return;
  }
});

// Écouteur pour les salons vocaux temporaires
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  await handleVoiceStateUpdate(oldState, newState);
});

// Enregistrement des écouteurs de logs (messages, membres, kicks, bans, vocal)
registerLogsEvents(client);

// Enregistrement de l'écouteur de bienvenue
registerWelcomeEvent(client);

client.login(process.env.DISCORD_TOKEN);