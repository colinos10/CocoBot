import { VoiceState, ChannelType, PermissionFlagsBits } from 'discord.js';
import { getTempVoiceData, saveTempVoiceData } from '../utils/tempVoiceData.js';

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  const guild = newState.guild || oldState.guild;
  if (!guild) return;

  const db = getTempVoiceData();
  const config = db[guild.id];

  if (!config) return;

  // 1. CRÉATION : Un membre rejoint le salon déclencheur
  if (newState.channelId === config.generatorChannelId) {
    const member = newState.member;
    if (!member) return;

    try {
      const channelName = `🔊 Salon de ${member.displayName}`;

      const tempChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: config.categoryId || undefined,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
              PermissionFlagsBits.MoveMembers
            ]
          }
        ]
      });

      config.activeChannels.push(tempChannel.id);
      saveTempVoiceData(db);

      await member.voice.setChannel(tempChannel);
    } catch (err) {
      console.error('Erreur lors de la création du salon temporaire :', err);
    }
  }

  // 2. SUPPRESSION : Un membre quitte un salon temporaire vide
  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    const oldChannel = oldState.channel;

    if (oldChannel && config.activeChannels.includes(oldChannel.id)) {
      if (oldChannel.members.size === 0) {
        try {
          await oldChannel.delete('Salon temporaire vide');
          config.activeChannels = config.activeChannels.filter(id => id !== oldChannel.id);
          saveTempVoiceData(db);
        } catch (err) {
          console.error('Erreur lors de la suppression du salon temporaire :', err);
        }
      }
    }
  }
}