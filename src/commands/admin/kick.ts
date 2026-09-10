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
    .setName('kick')
    .setDescription('Expulse un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => 
      opt.setName('membre')
        .setDescription('Membre à expulser')
        .setRequired(true)
    )
    .addStringOption(opt => 
      opt.setName('raison')
        .setDescription('Sélectionne une raison prédéfinie')
        .setRequired(false)
        .addChoices(
          { name: '💬 Spam / Flood répété', value: 'Spam / Flood répété' },
          { name: '🤬 Comportement irrespectueux / Provocation', value: 'Comportement irrespectueux / Provocation' },
          { name: '📢 Publicité non autorisée', value: 'Publicité non autorisée' },
          { name: '🔞 Contenu inapproprié', value: 'Contenu inapproprié' },
          { name: '📜 Non-respect des avertissements / Règlement', value: 'Non-respect des avertissements / Règlement' },
          { name: '❓ Autre raison', value: 'Autre' }
        )
    )
    .addStringOption(opt => 
      opt.setName('details')
        .setDescription('Précision ou raison personnalisée supplémentaire')
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

    // Construction de la raison combinée
    let fullReason = chosenReason || 'Aucune raison spécifiée';
    if (customDetails) {
      fullReason = chosenReason ? `${chosenReason} — ${customDetails}` : customDetails;
    }

    // Sécurité auto-kick et ciblage du bot
    if (targetUser.id === interaction.user.id) {
      await interaction.reply({ content: '❌ Tu ne peux pas t\'expulser toi-même.', ephemeral: true });
      return;
    }

    if (targetUser.id === interaction.client.user.id) {
      await interaction.reply({ content: '❌ Je ne peux pas m\'expulser moi-même.', ephemeral: true });
      return;
    }

    // Récupération complète du membre
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const executorMember = interaction.member as GuildMember;

    if (!targetMember) {
      await interaction.reply({ content: '❌ Ce membre n\'est pas présent sur le serveur.', ephemeral: true });
      return;
    }

    if (!targetMember.kickable) {
      await interaction.reply({ content: '❌ Je ne peux pas expulser ce membre (rôle supérieur ou permissions manquantes).', ephemeral: true });
      return;
    }

    if (
      interaction.guild.ownerId !== interaction.user.id && 
      executorMember.roles.highest.position <= targetMember.roles.highest.position
    ) {
      await interaction.reply({ content: '❌ Tu ne peux pas expulser un membre ayant un rôle supérieur ou égal au tien.', ephemeral: true });
      return;
    }

    try {
      // Notification en MP avant l'expulsion
      await targetUser.send(`🚪 Tu as été expulsé de **${interaction.guild.name}** pour la raison : *${fullReason}*`).catch(() => {});

      await targetMember.kick(`${interaction.user.tag} : ${fullReason}`);

      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🚪 Membre expulsé')
        .addFields(
          { name: 'Cible', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: 'Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: 'Raison', value: `\`${fullReason}\``, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur lors de l\'expulsion :', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Impossible d\'expulser ce membre.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Impossible d\'expulser ce membre.', ephemeral: true });
      }
    }
  }
};