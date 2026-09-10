import { SlashCommandBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFilePath = path.join(dataDir, 'users.json');

// Fonction utilitaire pour charger/sauvegarder
function saveUserTag(userId: string, tag: string) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let users: Record<string, string> = {};
  if (fs.existsSync(dataFilePath)) {
    try {
      users = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    } catch {
      users = {};
    }
  }

  users[userId] = tag;
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2), 'utf-8');
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('settag')
    .setDescription('Associe ton compte Discord à ton tag Brawl Stars')
    .addStringOption(option =>
      option
        .setName('tag')
        .setDescription('Ton tag Brawl Stars (ex: #2Y20CGR88)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const rawTag = interaction.options.getString('tag', true);
    const cleanTag = rawTag.replace('#', '').trim().toUpperCase();

    // Vérification de base du format du tag
    if (cleanTag.length < 3) {
      await interaction.reply({ 
        content: '❌ Le tag renseigné semble invalide.', 
        ephemeral: true 
      });
      return;
    }

    // Sauvegarde
    saveUserTag(interaction.user.id, cleanTag);

    await interaction.reply({
      content: `✅ Ton compte a bien été associé au tag **#${cleanTag}** ! Tu peux désormais utiliser \`/brawlrank\` sans préciser de tag.`,
      ephemeral: true
    });
  }
};