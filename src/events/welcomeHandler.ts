import { Client, Events, GuildMember, EmbedBuilder } from 'discord.js';
import { getWelcomeData, formatWelcomeMessage, DEFAULT_WELCOME_MESSAGE } from '../utils/welcomeData.js';

export function registerWelcomeEvent(client: Client) {
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    // Si c'est un bot, optionnel : ne pas souhaiter la bienvenue
    if (member.user.bot) return;

    const db = getWelcomeData();
    const config = db[member.guild.id];

    if (!config || !config.enabled || !config.channelId) return;

    const channel = member.guild.channels.cache.get(config.channelId);
    if (!channel || !channel.isTextBased()) return;

    const template = config.message || DEFAULT_WELCOME_MESSAGE;
    const formatted = formatWelcomeMessage(template, {
      user: `<@${member.id}>`,
      user_name: member.displayName,
      user_tag: member.user.tag,
      user_id: member.id,
      server: member.guild.name,
      member_count: member.guild.memberCount
    });

    if (config.embed) {
      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle(`🎉 Bienvenue sur ${member.guild.name} !`)
        .setDescription(formatted)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `Membre #${member.guild.memberCount}` })
        .setTimestamp();

      await channel.send({ content: `<@${member.id}>`, embeds: [embed] }).catch(() => null);
    } else {
      await channel.send({ content: formatted }).catch(() => null);
    }
  });
}