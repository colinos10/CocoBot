import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../types.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Affiche la latence du bot'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    await interaction.editReply(`🏓 Pong ! Latence : **${sent.createdTimestamp - interaction.createdTimestamp}ms**`);
  }
};