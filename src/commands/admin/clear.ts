import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChatInputCommandInteraction, 
  TextChannel 
} from 'discord.js';
import { Command } from '../../types.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime un nombre défini de messages dans le salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt => 
      opt.setName('nombre')
        .setDescription('Nombre de messages à supprimer (1 à 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(opt => 
      opt.setName('utilisateur')
        .setDescription('Supprimer uniquement les messages de cet utilisateur')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('nombre', true);
    const targetUser = interaction.options.getUser('utilisateur');
    const channel = interaction.channel as TextChannel;

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: '❌ Impossible de supprimer des messages ici.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await channel.messages.fetch({ limit: targetUser ? 100 : amount });
      
      let toDelete = messages;
      if (targetUser) {
        toDelete = messages.filter(m => m.author.id === targetUser.id);
        toDelete = new Map([...toDelete.entries()].slice(0, amount)) as any;
      }

      const deleted = await channel.bulkDelete(toDelete, true);

      await interaction.editReply({
        content: `🧹 **${deleted.size}** message(s) supprimé(s)${targetUser ? ` de ${targetUser.tag}` : ''}. *(Les messages datant de plus de 14 jours ne peuvent pas être supprimés)*`
      });
    } catch {
      await interaction.editReply({ content: '❌ Une erreur est survenue lors de la suppression des messages.' });
    }
  }
};