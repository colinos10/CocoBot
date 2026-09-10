import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChatInputCommandInteraction, 
  GuildMember 
} from 'discord.js';
import { Command } from '../../types.js';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => 
      opt.setName('membre')
        .setDescription('Membre à bannir')
        .setRequired(true)
    )
    .addStringOption(opt => 
      opt.setName('raison')
        .setDescription('Sélectionne une raison prédéfinie')
        .setRequired(false)
        .addChoices(
          { name: '💬 Spam / Publicité non autorisée', value: 'Spam / Publicité non autorisée' },
          { name: '🤬 Insultes / Harcèlement / Comportement toxique', value: 'Insultes / Harcèlement / Comportement toxique' },
          { name: '🔞 Contenu NSFW / Inapproprié', value: 'Contenu NSFW / Inapproprié' },
          { name: '💣 Tentative de Raid / Hack / Phishing', value: 'Tentative de Raid / Hack / Phishing' },
          { name: '📜 Non-respect des règles du serveur', value: 'Non-respect des règles du serveur' },
          { name: '❓ Autre raison', value: 'Autre' }
        )
    )
    .addStringOption(opt => 
      opt.setName('details')
        .setDescription('Précision ou raison personnalisée supplémentaire')
        .setRequired(false)
    )
    .addIntegerOption(opt => 
      opt.setName('supprimer_jours')
        .setDescription('Nombre de jours de messages à supprimer (0 à 7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ Cette commande doit être exécutée dans un serveur.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('membre', true);
    const chosenReason = interaction.options.getString('raison');
    const customDetails = interaction.options.getString('details');
    const deleteDays = interaction.options.getInteger('supprimer_jours') || 0;

    // Construction de la raison finale
    let fullReason = 'Aucune raison spécifiée';
    if (chosenReason && customDetails) {
      fullReason = `${chosenReason} — ${customDetails}`;
    } else if (chosenReason) {
      fullReason = chosenReason;
    } else if (customDetails) {
      fullReason = customDetails;
    }

    // Sécurité auto-ban et bot
    if (targetUser.id === interaction.user.id) {
      await interaction.reply({ content: '❌ Tu ne peux pas te bannir toi-même.', ephemeral: true });
      return;
    }

    if (targetUser.id === interaction.client.user.id) {
      await interaction.reply({ content: '❌ Je ne peux pas me bannir moi-même.', ephemeral: true });
      return;
    }

    // Vérification de la hiérarchie des rôles
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const executorMember = interaction.member as GuildMember;

    if (targetMember) {
      if (!targetMember.bannable) {
        await interaction.reply({ content: '❌ Je n\'ai pas la permission de bannir ce membre (rôle trop haut).', ephemeral: true });
        return;
      }

      if (
        interaction.guild.ownerId !== interaction.user.id && 
        executorMember.roles.highest.position <= targetMember.roles.highest.position
      ) {
        await interaction.reply({ content: '❌ Tu ne peux pas bannir un membre ayant un rôle supérieur ou égal au tien.', ephemeral: true });
        return;
      }
    }

    try {
      // Notification en MP avant le bannissement
      await targetUser.send(`🔨 Tu as été banni de **${interaction.guild.name}** pour la raison : *${fullReason}*`).catch(() => {});

      await interaction.guild.members.ban(targetUser.id, {
        reason: `${interaction.user.tag} : ${fullReason}`,
        deleteMessageSeconds: deleteDays * 86400
      });

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🔨 Membre banni')
        .addFields(
          { name: 'Cible', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: 'Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: 'Messages supprimés', value: `\`${deleteDays} jour(s)\``, inline: true },
          { name: 'Raison', value: `\`${fullReason}\``, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur lors du bannissement :', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Une erreur est survenue lors du bannissement.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Une erreur est survenue lors du bannissement.', ephemeral: true });
      }
    }
  }
};