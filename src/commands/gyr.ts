import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  PermissionFlagsBits
} from 'discord.js';

// Configuration des émojis personnalisés de jeu
const GAME_EMOJIS = {
  paladins: '<:Paladins:542421899548819477>',
  overwatch_2: '<:Overwatch:1197576300009881712>',
  rocket_league: '<:ROCKET_LEAGUE:1204194030506868847>'
};

// Rangs principaux stricts par jeu (dynamiques selon le jeu choisi)
export const MAIN_RANKS_BY_GAME: Record<string, string[]> = {
  paladins: [
    'Bronze',
    'Silver',
    'Gold',
    'Platinum',
    'Diamond',
    'Master',
    'Grandmaster'
  ],
  rocket_league: [
    'Bronze',
    'Argent',
    'Or',
    'Platine',
    'Diamant',
    'Champion',
    'Grand Champion',
    'Supersonic Legend (SSL)'
  ],
  overwatch_2: [
    'Bronze',
    'Argent',
    'Or',
    'Platine',
    'Diamant',
    'Master',
    'Grandmaster',
    'Champion',
    'Top 500'
  ]
};

// Menus de vote pour les spectateurs
export const VOTING_TIERS_BY_GAME: Record<string, { label: string; emoji: string }[]> = {
  paladins: [
    { label: 'Bronze', emoji: '🥉' },
    { label: 'Silver', emoji: '🥈' },
    { label: 'Gold', emoji: '🥇' },
    { label: 'Platinum', emoji: '🔮' },
    { label: 'Diamond', emoji: '💎' },
    { label: 'Master', emoji: '🦅' },
    { label: 'Grandmaster', emoji: '👑' }
  ],
  rocket_league: [
    { label: 'Bronze', emoji: '🥉' },
    { label: 'Argent', emoji: '🥈' },
    { label: 'Or', emoji: '🥇' },
    { label: 'Platine', emoji: '💠' },
    { label: 'Diamant', emoji: '💎' },
    { label: 'Champion', emoji: '🟣' },
    { label: 'Grand Champion', emoji: '🔴' },
    { label: 'Supersonic Legend (SSL)', emoji: '⚪' }
  ],
  overwatch_2: [
    { label: 'Bronze', emoji: '🥉' },
    { label: 'Argent', emoji: '🥈' },
    { label: 'Or', emoji: '🥇' },
    { label: 'Platine', emoji: '💠' },
    { label: 'Diamant', emoji: '💎' },
    { label: 'Master', emoji: '🦅' },
    { label: 'Grandmaster', emoji: '👑' },
    { label: 'Champion', emoji: '🌌' },
    { label: 'Top 500', emoji: '⚡' }
  ]
};

const GAME_LABELS: Record<string, string> = {
  paladins: `${GAME_EMOJIS.paladins} Paladins`,
  rocket_league: `${GAME_EMOJIS.rocket_league} Rocket League`,
  overwatch_2: `${GAME_EMOJIS.overwatch_2} Overwatch 2`
};

export const data = new SlashCommandBuilder()
  .setName('gyr')
  .setDescription('Soumettre un clip pour Guess Your Rank')
  .addStringOption(option =>
    option
      .setName('jeu')
      .setDescription('Le jeu du clip')
      .setRequired(true)
      .addChoices(
        { name: 'Paladins', value: 'paladins' },
        { name: 'Rocket League', value: 'rocket_league' },
        { name: 'Overwatch 2', value: 'overwatch_2' }
      )
  )
  .addStringOption(option =>
    option
      .setName('clip')
      .setDescription('Lien vidéo du clip (Twitch, Medal, Streamable, YouTube...)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('rang')
      .setDescription('Ton rang principal')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption(option =>
    option
      .setName('division')
      .setDescription('Division (1, 2, 3, 4, 5 — Laisser vide pour Master, GM, SSL...)')
      .setRequired(false)
      .addChoices(
        { name: '1 / I', value: '1' },
        { name: '2 / II', value: '2' },
        { name: '3 / III', value: '3' },
        { name: '4 / IV', value: '4' },
        { name: '5 / V', value: '5' }
      )
  );

// Autocomplétion dynamique : affiche uniquement les rangs du jeu sélectionné
export async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === 'rang') {
    const selectedGame = interaction.options.getString('jeu') || 'paladins';
    const ranks = MAIN_RANKS_BY_GAME[selectedGame] || MAIN_RANKS_BY_GAME['paladins'];
    const typedValue = focusedOption.value.toLowerCase();

    const filtered = ranks.filter(rank =>
      rank.toLowerCase().includes(typedValue)
    );

    await interaction.respond(
      filtered.map(rank => ({ name: rank, value: rank }))
    );
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const gameKey = interaction.options.getString('jeu', true);
  const clipUrl = interaction.options.getString('clip', true);
  const baseRank = interaction.options.getString('rang', true);
  const division = interaction.options.getString('division');
  const author = interaction.user;

  // Formatage du rang final (ex: "Diamond 3" ou "Grandmaster")
  const secretRank = division ? `${baseRank} ${division}` : baseRank;

  // Options de pronostic pour les spectateurs
  const votingOptions = VOTING_TIERS_BY_GAME[gameKey] || VOTING_TIERS_BY_GAME['paladins'];

  // Map pour stocker les votes (userId -> rangChoisi)
  const votes = new Map<string, string>();

  const gameTitle = GAME_LABELS[gameKey] || 'Jeu';
  const embed = new EmbedBuilder()
    .setTitle(`🎯 Guess Your Rank — ${gameTitle}`)
    .setDescription(
      `**Joueur :** ${author}\n` +
      `**Regarder le clip :** [Cliquez ici pour voir la vidéo](${clipUrl})\n\n` +
      `> 🎬 *Regardez le clip et devinez le rang du joueur à l'aide du menu ci-dessous !*`
    )
    .setColor(0x5865F2)
    .setFooter({ text: 'Nombre de votes : 0' })
    .setTimestamp();

  // Menu déroulant de vote
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`gyr_vote_${interaction.id}`)
    .setPlaceholder('🎯 Choisis le rang selon toi...')
    .addOptions(
      votingOptions.map(opt => ({
        label: opt.label,
        value: opt.label,
        emoji: opt.emoji
      }))
    );

  // Bouton de révélation
  const revealButton = new ButtonBuilder()
    .setCustomId(`gyr_reveal_${interaction.id}`)
    .setLabel('🔓 Révéler le Rang')
    .setStyle(ButtonStyle.Success);

  const rowMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  const rowBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(revealButton);

  const response = await interaction.reply({
    content: `🎬 **Clip de ${author} :** ${clipUrl}`,
    embeds: [embed],
    components: [rowMenu, rowBtn],
    fetchReply: true
  });

  const collector = response.createMessageComponentCollector({
    time: 24 * 60 * 60 * 1000
  });

  collector.on('collect', async (i) => {
    // 1. ENREGISTREMENT DU VOTE
    if (i.isStringSelectMenu() && i.customId === `gyr_vote_${interaction.id}`) {
      const selectedRank = i.values[0];
      votes.set(i.user.id, selectedRank);

      embed.setFooter({ text: `Nombre de votes : ${votes.size}` });
      await interaction.editReply({ embeds: [embed] });

      await i.reply({
        content: `✅ Ton pronostic (**${selectedRank}**) a bien été enregistré !`,
        ephemeral: true
      });
    }

    // 2. RÉVÉLATION DU VRAI RANG
    if (i.isButton() && i.customId === `gyr_reveal_${interaction.id}`) {
      const member = i.member as GuildMember | null;
      const isStaff = member?.permissions?.has(PermissionFlagsBits.ManageMessages) ?? false;
      const isAuthor = i.user.id === author.id;

      if (!isAuthor && !isStaff) {
        await i.reply({
          content: '❌ Seul l\'auteur du clip ou un modérateur peut révéler le rang.',
          ephemeral: true
        });
        return;
      }

      collector.stop('revealed');

      const totalVotes = votes.size;
      let correctCount = 0;
      const winners: string[] = [];

      // Vérification du vote contre le vrai rang
      votes.forEach((votedTier, userId) => {
        const cleanVoted = votedTier.toLowerCase();
        const cleanSecret = secretRank.toLowerCase();

        const isMatch = cleanSecret.startsWith(cleanVoted) ||
                        cleanVoted.startsWith(cleanSecret) ||
                        (cleanVoted === 'or' && cleanSecret.includes('gold')) ||
                        (cleanVoted === 'gold' && cleanSecret.includes('or')) ||
                        (cleanVoted === 'argent' && cleanSecret.includes('silver')) ||
                        (cleanVoted === 'silver' && cleanSecret.includes('argent')) ||
                        (cleanVoted === 'platine' && cleanSecret.includes('platinum')) ||
                        (cleanVoted === 'platinum' && cleanSecret.includes('platine'));

        if (isMatch) {
          correctCount++;
          winners.push(`<@${userId}>`);
        }
      });

      const successRate = totalVotes > 0 ? Math.round((correctCount / totalVotes) * 100) : 0;

      const endEmbed = new EmbedBuilder()
        .setTitle(`🎉 Résultat Guess Your Rank — ${gameTitle}`)
        .setDescription(
          `**Joueur :** ${author}\n` +
          `**Clip :** [Lien vidéo](${clipUrl})\n\n` +
          `🏆 **VRAI RANG :** \`${secretRank}\`\n\n` +
          `📊 **Statistiques :**\n` +
          `• Total de votes : **${totalVotes}**\n` +
          `• Bonnes réponses : **${correctCount}** (${successRate}%)\n\n` +
          `✨ **Ils avaient vu juste :**\n${winners.length > 0 ? winners.join(', ') : '*Personne n\'a trouvé !*'}`
        )
        .setColor(0x57F287)
        .setTimestamp();

      await i.update({
        embeds: [endEmbed],
        components: []
      });
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason !== 'revealed') {
      await interaction.editReply({
        components: []
      }).catch(() => null);
    }
  });
}

export const command = {
  data,
  autocomplete,
  execute
};

export default command;