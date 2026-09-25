import { Client, Collection, Events, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Command } from './types.js';
import { handleVoiceStateUpdate } from './events/voiceStateUpdate.js';
import { registerLogsEvents } from './events/logsHandler.js';
import { registerWelcomeEvent } from './events/welcomeHandler.js';
import { registerInstantGamingSalesEvent, connectTwitch } from './events/instantGamingSales.js'; // ⬅️ Importe connectTwitch ici

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User,
  ],
});

const commands = new Collection<string, Command>();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsPath = path.join(__dirname, 'commands');

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

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`🤖 Bot connecté en tant que ${readyClient.user.tag}`);

  // 🚀 Connexion au chat Twitch au démarrage de CocoBot
  try {
    await connectTwitch();
  } catch (err) {
    console.error('❌ Erreur lors de la connexion Twitch initiale :', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
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

  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    return;
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  await handleVoiceStateUpdate(oldState, newState);
});

registerLogsEvents(client);
registerWelcomeEvent(client);
registerInstantGamingSalesEvent(client);

client.login(process.env.DISCORD_TOKEN);