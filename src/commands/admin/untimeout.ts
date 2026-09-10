import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChatInputCommandInteraction 
} from 'discord.js';
import { Command } from '../../types.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Retire le timeout d\'un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('membre').setDescription('Membre concerné').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('membre', true);
    const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
      return;
    }

    if (!targetMember.isCommunicationDisabled()) {
      await interaction.reply({ content: 'ℹ️ Ce membre n\'est pas sous le coup d\'un timeout.', ephemeral: true });
      return;
    }

    await targetMember.timeout(null, `Untimeout par ${interaction.user.tag}`);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('🔊 Timeout levé')
      .setDescription(`Le timeout de **${targetUser.tag}** a été retiré par **${interaction.user.tag}**.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};