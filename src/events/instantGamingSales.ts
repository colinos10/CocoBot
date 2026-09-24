// src/events/instantGamingSales.ts
import { Client, Events, Message } from 'discord.js';
import { sendTwitchMessage } from '../utils/twitchChat.js';
import { triggerSaleAnimation } from '../utils/overlayServer.js';

const IG_CHANNEL_ID = process.env.IG_SALES_CHANNEL_ID as string;

export function registerInstantGamingSalesEvent(client: Client) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.channelId !== IG_CHANNEL_ID || !message.author.bot) return;

    const content = message.content || message.embeds[0]?.description || 'Nouvelle vente !';

    console.log(`💰 Nouvelle vente Instant Gaming détectée : ${content}`);

    try {
      await sendTwitchMessage('🎉 Nouvelle vente Instant Gaming ! Merci pour le soutien !');
    } catch (err) {
      console.error('❌ Erreur envoi message Twitch :', err);
    }

    triggerSaleAnimation({ message: content });
  });
}