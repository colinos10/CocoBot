import { 
  Client, 
  Events, 
  EmbedBuilder, 
  GuildBasedChannel, 
  Message, 
  PartialMessage, 
  GuildMember, 
  PartialGuildMember, 
  GuildBan,
  VoiceState, 
  AuditLogEvent 
} from 'discord.js';
import { getLogsData, formatMessage, DEFAULT_TEMPLATES, LogEventType } from '../utils/logsData.js';

function getLogChannel(
  guildId: string, 
  eventType: LogEventType, 
  client: Client
): { channel: GuildBasedChannel | null; templates: Record<LogEventType, string> } {
  const db = getLogsData();
  const config = db[guildId];

  // Si pas de config ou pas de salon défini
  if (!config || !config.channelId) {
    return { channel: null, templates: DEFAULT_TEMPLATES };
  }

  // Vérification de l'état d'activation (par défaut: activé/true)
  const isEnabled = config.enabledEvents?.[eventType] ?? true;
  if (!isEnabled) {
    return { channel: null, templates: DEFAULT_TEMPLATES };
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { channel: null, templates: DEFAULT_TEMPLATES };

  const channel = guild.channels.cache.get(config.channelId) || null;
  const templates: Record<LogEventType, string> = {
    ...DEFAULT_TEMPLATES,
    ...(config.customTemplates || {})
  };

  return { channel, templates };
}

export function registerLogsEvents(client: Client) {
  // 📥 Arrivée d'un membre
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    const { channel, templates } = getLogChannel(member.guild.id, 'memberJoin', client);
    if (!channel || !channel.isTextBased()) return;

    const text = formatMessage(templates.memberJoin, {
      user: `<@${member.id}>`,
      user_name: member.displayName,
      user_tag: member.user.tag,
      user_id: member.id,
      server: member.guild.name,
      member_count: member.guild.memberCount
    });

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('📥 Arrivée d\'un membre')
      .setDescription(text)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  });

  // 📤 Départ OU 🚪 Expulsion (Kick)
  client.on(Events.GuildMemberRemove, async (member: GuildMember | PartialGuildMember) => {
    if (!member.guild) return;

    // Attente brève pour laisser le temps à l'audit log d'être écrit
    await new Promise((r) => setTimeout(r, 1000));

    let isKick = false;
    let moderator = 'Inconnu';
    let reason = 'Aucune raison spécifiée';

    try {
      const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberKick
      });
      const kickLog = fetchedLogs.entries.first();

      // Si le kick correspond à ce membre et a eu lieu il y a moins de 5 secondes
      if (kickLog && kickLog.targetId === member.id && Date.now() - kickLog.createdTimestamp < 5000) {
        isKick = true;
        moderator = kickLog.executor?.tag || kickLog.executor?.username || 'Inconnu';
        reason = kickLog.reason || 'Aucune raison spécifiée';
      }
    } catch {
      // Pas la permission de lire les Audit Logs
    }

    const eventType: LogEventType = isKick ? 'memberKick' : 'memberLeave';
    const { channel, templates } = getLogChannel(member.guild.id, eventType, client);
    if (!channel || !channel.isTextBased()) return;

    const displayName = member.displayName || member.user?.username || 'Membre inconnu';
    const tag = member.user?.tag || displayName;

    if (isKick) {
      const text = formatMessage(templates.memberKick, {
        user: `<@${member.id}>`,
        user_name: displayName,
        user_tag: tag,
        user_id: member.id,
        moderator,
        reason,
        server: member.guild.name,
        member_count: member.guild.memberCount
      });

      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🚪 Membre expulsé')
        .setDescription(text)
        .setThumbnail(member.user?.displayAvatarURL() || null)
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => null);
    } else {
      const text = formatMessage(templates.memberLeave, {
        user: `<@${member.id}>`,
        user_name: displayName,
        user_tag: tag,
        user_id: member.id,
        server: member.guild.name,
        member_count: member.guild.memberCount
      });

      const embed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle('📤 Départ d\'un membre')
        .setDescription(text)
        .setThumbnail(member.user?.displayAvatarURL() || null)
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => null);
    }
  });

  // 🔨 Bannissement (Ban)
  client.on(Events.GuildBanAdd, async (ban: GuildBan) => {
    const { channel, templates } = getLogChannel(ban.guild.id, 'memberBan', client);
    if (!channel || !channel.isTextBased()) return;

    await new Promise((r) => setTimeout(r, 1000));

    let moderator = 'Inconnu';
    let reason = ban.reason || 'Aucune raison spécifiée';

    try {
      const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd
      });
      const banLog = fetchedLogs.entries.first();

      if (banLog && banLog.targetId === ban.user.id) {
        moderator = banLog.executor?.tag || banLog.executor?.username || 'Inconnu';
        if (banLog.reason) reason = banLog.reason;
      }
    } catch {
      // Audit log non accessible
    }

    const text = formatMessage(templates.memberBan, {
      user: `<@${ban.user.id}>`,
      user_name: ban.user.username,
      user_tag: ban.user.tag,
      user_id: ban.user.id,
      moderator,
      reason,
      server: ban.guild.name,
      member_count: ban.guild.memberCount
    });

    const embed = new EmbedBuilder()
      .setColor(0xC0392B)
      .setTitle('🔨 Membre banni')
      .setDescription(text)
      .setThumbnail(ban.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  });

  // 🗑️ Message supprimé
  client.on(Events.MessageDelete, async (message: Message | PartialMessage) => {
    if (!message.guild || !message.author || message.author.bot) return;

    const { channel, templates } = getLogChannel(message.guild.id, 'messageDelete', client);
    if (!channel || !channel.isTextBased() || channel.id === message.channelId) return;

    const author = message.author;
    const text = formatMessage(templates.messageDelete, {
      user: `<@${author.id}>`,
      user_name: message.member?.displayName || author.username,
      user_tag: author.tag,
      user_id: author.id,
      channel: `<#${message.channelId}>`,
      server: message.guild.name,
      content: message.content || '*[Pièce jointe / Embed / Inconnu]*'
    });

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🗑️ Message supprimé')
      .setDescription(text)
      .setThumbnail(author.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  });

  // ✏️ Message modifié
  client.on(Events.MessageUpdate, async (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
    if (!oldMessage.guild || !oldMessage.author || oldMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const { channel, templates } = getLogChannel(oldMessage.guild.id, 'messageUpdate', client);
    if (!channel || !channel.isTextBased() || channel.id === oldMessage.channelId) return;

    const author = oldMessage.author;
    const text = formatMessage(templates.messageUpdate, {
      user: `<@${author.id}>`,
      user_name: oldMessage.member?.displayName || author.username,
      user_tag: author.tag,
      user_id: author.id,
      channel: `<#${oldMessage.channelId}>`,
      server: oldMessage.guild.name,
      old_content: oldMessage.content || '*[Vide]*',
      new_content: newMessage.content || '*[Vide]*'
    });

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('✏️ Message modifié')
      .setDescription(text)
      .setThumbnail(author.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  });

  // 🔊 Mouvements vocaux
  client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
    const member = newState.member || oldState.member;
    const guild = newState.guild || oldState.guild;
    if (!member || member.user.bot || !guild) return;

    let eventType: LogEventType | null = null;
    let title = '';
    let color = 0x3498DB;

    if (!oldState.channelId && newState.channelId) {
      eventType = 'voiceJoin';
      title = '🔊 Connexion Vocale';
      color = 0x2ECC71;
    } else if (oldState.channelId && !newState.channelId) {
      eventType = 'voiceLeave';
      title = '🔇 Déconnexion Vocale';
      color = 0x95A5A6;
    } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      eventType = 'voiceSwitch';
      title = '🔀 Changement de Salon Vocal';
      color = 0x3498DB;
    } else {
      return;
    }

    const { channel, templates } = getLogChannel(guild.id, eventType, client);
    if (!channel || !channel.isTextBased()) return;

    let text = '';
    if (eventType === 'voiceJoin') {
      text = formatMessage(templates.voiceJoin, {
        user: `<@${member.id}>`,
        user_name: member.displayName,
        channel: `<#${newState.channelId}>`,
        server: guild.name
      });
    } else if (eventType === 'voiceLeave') {
      text = formatMessage(templates.voiceLeave, {
        user: `<@${member.id}>`,
        user_name: member.displayName,
        channel: `<#${oldState.channelId}>`,
        server: guild.name
      });
    } else if (eventType === 'voiceSwitch') {
      text = formatMessage(templates.voiceSwitch, {
        user: `<@${member.id}>`,
        user_name: member.displayName,
        old_channel: `<#${oldState.channelId}>`,
        new_channel: `<#${newState.channelId}>`,
        server: guild.name
      });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(text)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  });
}