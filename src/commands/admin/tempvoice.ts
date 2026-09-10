import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  VoiceChannel
} from 'discord.js';
import { Command } from '../../types.js';
import { getTempVoiceData, saveTempVoiceData } from '../../utils/tempVoiceData.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription('Configuration des salons vocaux temporaires')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Définir le salon déclencheur pour les vocaux temporaires')
        .addChannelOption(opt => 
          opt.setName('salon_createur')
            .setDescription('Le salon vocal que les membres doivent rejoindre')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
        .addChannelOption(opt => 
          opt.setName('categorie')
            .setDescription('La catégorie où créer les salons temporaires (optionnel)')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Désactiver le système de vocaux temporaires')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({ content: '❌ Cette commande doit être exécutée dans un serveur.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const db = getTempVoiceData();

    if (sub === 'setup') {
      const channelOption = interaction.options.getChannel('salon_createur', true);
      const categoryOption = interaction.options.getChannel('categorie');

      // Récupérer le salon vocal complet depuis le cache/serveur pour avoir accès à parentId typé
      const voiceChannel = interaction.guild.channels.cache.get(channelOption.id) as VoiceChannel | undefined;
      const parentCategoryId = voiceChannel?.parentId ?? undefined;

      const targetCategoryId = categoryOption ? categoryOption.id : parentCategoryId;

      db[interaction.guildId] = {
        generatorChannelId: channelOption.id,
        categoryId: targetCategoryId,
        activeChannels: db[interaction.guildId]?.activeChannels || []
      };

      saveTempVoiceData(db);

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Configuration Vocaux Temporaires')
        .setDescription('Le système a été configuré avec succès !')
        .addFields(
          { name: 'Salon déclencheur', value: `<#${channelOption.id}>`, inline: true },
          { name: 'Catégorie parente', value: targetCategoryId ? `<#${targetCategoryId}>` : 'Aucune', inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (sub === 'disable') {
      if (db[interaction.guildId]) {
        delete db[interaction.guildId];
        saveTempVoiceData(db);
      }

      await interaction.reply({ content: '🧹 Système de vocaux temporaires désactivé avec succès.' });
    }
  }
};