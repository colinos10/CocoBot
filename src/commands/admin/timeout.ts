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
    .setName('timeout')
    .setDescription('Exclut temporairement (mute) un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => 
      opt.setName('membre')
        .setDescription('Membre à exclure temporairement')
        .setRequired(true)
    )
    .addIntegerOption(opt => 
      opt.setName('duree')
        .setDescription('Durée de l\'exclusion')
        .setRequired(true)
        .addChoices(
          { name: '60 secondes', value: 60 * 1000 },
          { name: '5 minutes', value: 5 * 60 * 1000 },
          { name: '10 minutes', value: 10 * 60 * 1000 },
          { name: '1 heure', value: 60 * 60 * 1000 },
          { name: '1 jour', value: 24 * 60 * 60 * 1000 },
          { name: '1 semaine', value: 7 * 24 * 60 * 60 * 1000 }
        )
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
          { name: '📌 Hors-sujet répété', value: 'Hors-sujet répété' },
          { name: '📜 Non-respect du règlement', value: 'Non-respect du règlement' },
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
    const duration = interaction.options.getInteger('duree', true);
    const chosenReason = interaction.options.getString('raison');
    const customDetails = interaction.options.getString('details');

    // Construction de la raison combinée
    let fullReason = chosenReason || 'Aucune raison spécifiée';
    if (customDetails) {
      fullReason = chosenReason ? `${chosenReason} — ${customDetails}` : customDetails;
    }

    // Sécurités auto-sanction et cibles invalides
    if (targetUser.id === interaction.user.id) {
      await interaction.reply({ content: '❌ Tu ne peux pas te mettre en sourdine toi-même.', ephemeral: true });
      return;
    }

    if (targetUser.id === interaction.client.user.id) {
      await interaction.reply({ content: '❌ Je ne peux pas me mettre en sourdine moi-même.', ephemeral: true });
      return;
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const executorMember = interaction.member as GuildMember;

    if (!targetMember) {
      await interaction.reply({ content: '❌ Ce membre n\'est pas présent sur le serveur.', ephemeral: true });
      return;
    }

    if (!targetMember.moderatable) {
      await interaction.reply({ content: '❌ Je ne peux pas rendre muet ce membre (rôle supérieur ou permissions manquantes).', ephemeral: true });
      return;
    }

    if (
      interaction.guild.ownerId !== interaction.user.id && 
      executorMember.roles.highest.position <= targetMember.roles.highest.position
    ) {
      await interaction.reply({ content: '❌ Tu ne peux pas sanctionner un membre ayant un rôle supérieur ou égal au tien.', ephemeral: true });
      return;
    }

    try {
      // Notification en MP
      await targetUser.send(
        `⏳ Tu as été mis en sourdine sur **${interaction.guild.name}** jusqu'au <t:${Math.floor((Date.now() + duration) / 1000)}:F> pour la raison : *${fullReason}*`
      ).catch(() => {});

      await targetMember.timeout(duration, `${interaction.user.tag} : ${fullReason}`);

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('⏳ Membre mis en sourdine (Timeout)')
        .addFields(
          { name: 'Cible', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
          { name: 'Durée', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`, inline: true },
          { name: 'Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: 'Raison', value: `\`${fullReason}\``, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Erreur lors du timeout :', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Une erreur est survenue lors de la mise en sourdine.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Une erreur est survenue lors de la mise en sourdine.', ephemeral: true });
      }
    }
  }
};