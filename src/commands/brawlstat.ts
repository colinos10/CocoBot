import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFilePath = path.join(__dirname, '..', '..', 'data', 'users.json');

function getUserTag(userId: string): string | null {
  if (!fs.existsSync(dataFilePath)) return null;
  try {
    const users: Record<string, string> = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    return users[userId] || null;
  } catch {
    return null;
  }
}

function getRankedInfo(points?: number) {
  if (!points || points <= 0) return { name: 'Non classé', icon: '⚪' };

  // Bronze (250 pts / tier)
  if (points < 250)  return { name: `Bronze I (${points} pts)`, icon: '🥉' };
  if (points < 500)  return { name: `Bronze II (${points} pts)`, icon: '🥉' };
  if (points < 750)  return { name: `Bronze III (${points} pts)`, icon: '🥉' };

  // Argent (250 pts / tier)
  if (points < 1000) return { name: `Argent I (${points} pts)`, icon: '🥈' };
  if (points < 1250) return { name: `Argent II (${points} pts)`, icon: '🥈' };
  if (points < 1500) return { name: `Argent III (${points} pts)`, icon: '🥈' };

  // Or (500 pts / tier)
  if (points < 2000) return { name: `Or I (${points} pts)`, icon: '🥇' };
  if (points < 2500) return { name: `Or II (${points} pts)`, icon: '🥇' };
  if (points < 3000) return { name: `Or III (${points} pts)`, icon: '🥇' };

  // Diamant (500 pts / tier)
  if (points < 3500) return { name: `Diamant I (${points} pts)`, icon: '💎' };
  if (points < 4000) return { name: `Diamant II (${points} pts)`, icon: '💎' };
  if (points < 4500) return { name: `Diamant III (${points} pts)`, icon: '💎' };

  // Mythique (500 pts / tier)
  if (points < 5000) return { name: `Mythique I (${points} pts)`, icon: '🔮' };
  if (points < 5500) return { name: `Mythique II (${points} pts)`, icon: '🔮' };
  if (points < 6000) return { name: `Mythique III (${points} pts)`, icon: '🔮' };

  // Légendaire (750 pts / tier)
  if (points < 6750) return { name: `Légendaire I (${points} pts)`, icon: '🌟' };
  if (points < 7500) return { name: `Légendaire II (${points} pts)`, icon: '🌟' };
  if (points < 8250) return { name: `Légendaire III (${points} pts)`, icon: '🌟' };

  // Maîtres (1 000 pts / tier)
  if (points < 9250)  return { name: `Maîtres I (${points} pts)`, icon: '🔥' };
  if (points < 10250) return { name: `Maîtres II (${points} pts)`, icon: '🔥' };
  if (points < 11250) return { name: `Maîtres III (${points} pts)`, icon: '🔥' };

  // Pro (Au-delà de 11 250)
  return { name: `Pro (${points} pts)`, icon: '👑' };
}

// Nettoyage et conversion de la couleur ARGB -> RGB Discord
function parseColor(rawColor?: string): number {
  if (!rawColor) return 0xFFA500;
  const hexOnly = rawColor.replace(/^(0x|#)/i, '');
  const rgbPart = hexOnly.length >= 6 ? hexOnly.slice(-6) : hexOnly;
  const parsed = parseInt(rgbPart, 16);
  return isNaN(parsed) ? 0xFFA500 : parsed;
}

function createProfileEmbed(player: any) {
  const color = parseColor(player.nameColor);
  const ranked = getRankedInfo(player.rankedTrophies);

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🏆 Panel Joueur — ${player.name} (${player.tag})`)
    .setThumbnail(`https://cdn.brawlify.com/profile-icons/regular/${player.icon?.id || 28000000}.png`)
    .addFields(
      { name: '🏆 Trophées actuels', value: `\`${player.trophies?.toLocaleString('fr-FR') ?? 0}\``, inline: true },
      { name: '⭐ Record trophées', value: `\`${player.highestTrophies?.toLocaleString('fr-FR') ?? 0}\``, inline: true },
      { name: '🎖️ Niveau EXP', value: `\`${player.expLevel ?? 'N/A'}\``, inline: true },
      { name: `${ranked.icon} Rang Classé`, value: `**${ranked.name}**`, inline: true },
      { name: '🛡️ Club', value: player.club?.name ? `**${player.club.name}**` : '*Aucun*', inline: true },
      { name: '🦸 Brawlers', value: `\`${player.brawlers?.length ?? 0}\``, inline: true },
      { name: '⚔️ Victoires 3v3', value: `\`${player['3vs3Victories']?.toLocaleString('fr-FR') ?? 0}\``, inline: true },
      { name: '👑 Victoires Solo', value: `\`${player.soloVictories?.toLocaleString('fr-FR') ?? 0}\``, inline: true },
      { name: '🤝 Victoires Duo', value: `\`${player.duoVictories?.toLocaleString('fr-FR') ?? 0}\``, inline: true }
    )
    .setFooter({ text: 'Cliquez sur les boutons ci-dessous pour changer de vue' })
    .setTimestamp();
}

function createBrawlersEmbed(player: any) {
  const brawlers: any[] = [...(player.brawlers || [])];
  brawlers.sort((a, b) => b.trophies - a.trophies);
  const top8 = brawlers.slice(0, 8);

  const desc = top8.map((b, i) => {
    return `**#${i + 1} ${b.name}** (Niv. ${b.power}) ➔ 🏆 **${b.trophies}** *(Max: ${b.highestTrophies})* • Rang ${b.rank}`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(0x00AE86)
    .setTitle(`🦸 Meilleurs Brawlers de ${player.name}`)
    .setDescription(desc || 'Aucun brawler trouvé.')
    .setThumbnail(top8[0]?.id ? `https://cdn.brawlify.com/brawlers/borderless/${top8[0].id}.png` : null)
    .setFooter({ text: `Total débloqués : ${brawlers.length} | Vue détaillée` })
    .setTimestamp();
}

function createClubEmbed(club: any) {
  if (!club) {
    return new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🛡️ Club')
      .setDescription('Ce joueur n\'est actuellement dans aucun club.');
  }

  const president = club.members?.find((m: any) => m.role === 'president')?.name || 'Inconnu';

  return new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(`🛡️ Club : ${club.name} (${club.tag})`)
    .setDescription(club.description ? `*« ${club.description} »*` : '*Pas de description.*')
    .addFields(
      { name: '👑 Président', value: `**${president}**`, inline: true },
      { name: '👥 Membres', value: `\`${club.members?.length ?? 0}/30\``, inline: true },
      { name: '🏆 Trophées totaux', value: `\`${club.trophies?.toLocaleString('fr-FR') ?? 0}\``, inline: true },
      { name: '🚪 Type d\'accès', value: `\`${club.type || 'Inconnu'}\``, inline: true },
      { name: '🎯 Trophées requis', value: `\`${club.requiredTrophies?.toLocaleString('fr-FR') ?? 0}\``, inline: true }
    )
    .setFooter({ text: 'Informations du club' })
    .setTimestamp();
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('brawlstat')
    .setDescription('Affiche le panel de profil interactif complet Brawl Stars')
    .addStringOption(opt => opt.setName('tag').setDescription('Tag Brawl Stars (ex: #GVP8RL2R)').setRequired(false))
    .addUserOption(opt => opt.setName('membre').setDescription('Membre Discord').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const optionTag = interaction.options.getString('tag');
    const targetUser = interaction.options.getUser('membre');

    const rawTag = optionTag || (targetUser ? getUserTag(targetUser.id) : getUserTag(interaction.user.id));

    if (!rawTag) {
      await interaction.editReply('❌ Aucun tag trouvé. Utilise `/settag <tag>` ou précise un tag.');
      return;
    }

    const cleanTag = rawTag.toUpperCase().replace(/O/g, '0').replace(/^#/, '');

    async function fetchData() {
      try {
        const pRes = await fetch(`https://api.brawlstars.com/v1/players/${encodeURIComponent('#' + cleanTag)}`, {
          headers: { Authorization: `Bearer ${process.env.BRAWL_STARS_API_KEY}` }
        });
        if (!pRes.ok) return null;
        const playerData = await pRes.json();

        let clubData = null;
        if (playerData.club?.tag) {
          try {
            const cRes = await fetch(`https://api.brawlstars.com/v1/clubs/${encodeURIComponent(playerData.club.tag)}`, {
              headers: { Authorization: `Bearer ${process.env.BRAWL_STARS_API_KEY}` }
            });
            if (cRes.ok) clubData = await cRes.json();
          } catch {
            clubData = null;
          }
        }

        return { playerData, clubData };
      } catch {
        return null;
      }
    }

    const initialData = await fetchData();
    if (!initialData) {
      await interaction.editReply(`❌ Impossible de trouver le profil avec le tag \`#${cleanTag}\`.`);
      return;
    }

    let data = initialData;

    const getRow = (currentView: 'profile' | 'brawlers' | 'club') => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_profile')
          .setLabel('Profil')
          .setEmoji('🏆')
          .setStyle(currentView === 'profile' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('btn_brawlers')
          .setLabel('Top Brawlers')
          .setEmoji('🦸')
          .setStyle(currentView === 'brawlers' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('btn_club')
          .setLabel('Club')
          .setEmoji('🛡️')
          .setStyle(currentView === 'club' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('btn_refresh')
          .setLabel('Actualiser')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Success)
      );
    };

    let currentView: 'profile' | 'brawlers' | 'club' = 'profile';

    const getEmbedForView = (view: 'profile' | 'brawlers' | 'club') => {
      if (view === 'brawlers') return createBrawlersEmbed(data.playerData);
      if (view === 'club') return createClubEmbed(data.clubData);
      return createProfileEmbed(data.playerData);
    };

    const response = await interaction.editReply({
      embeds: [getEmbedForView(currentView)],
      components: [getRow(currentView)]
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 180_000
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        await btnInteraction.reply({ content: '❌ Seule la personne ayant lancé la commande peut naviguer sur ce panel.', ephemeral: true });
        return;
      }

      // Si le joueur clique sur "Actualiser" -> appel API réseau avec deferUpdate
      if (btnInteraction.customId === 'btn_refresh') {
        await btnInteraction.deferUpdate();
        const fresh = await fetchData();
        if (fresh) data = fresh;

        await btnInteraction.editReply({
          embeds: [getEmbedForView(currentView)],
          components: [getRow(currentView)]
        }).catch(() => {});
        return;
      }

      // Pour les onglets (Profil, Brawlers, Club) -> changement immédiat sans attente
      if (btnInteraction.customId === 'btn_profile') currentView = 'profile';
      if (btnInteraction.customId === 'btn_brawlers') currentView = 'brawlers';
      if (btnInteraction.customId === 'btn_club') currentView = 'club';

      await btnInteraction.update({
        embeds: [getEmbedForView(currentView)],
        components: [getRow(currentView)]
      }).catch(() => {});
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        getRow(currentView).components.map(b => ButtonBuilder.from(b).setDisabled(true))
      );
      await interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  }
};