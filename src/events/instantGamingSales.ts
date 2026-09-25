import { Events, Message } from 'discord.js';
import tmi from 'tmi.js';
import fetch from 'node-fetch';

const SALES_CHANNEL_ID = process.env.IG_SALES_CHANNEL_ID!;
const IG_BOT_ID = process.env.IG_BOT_ID!;

const PC_RELAY_URL = process.env.PC_RELAY_URL; 
const PC_RELAY_SECRET = process.env.PC_RELAY_SECRET;

const twitchClient = new tmi.Client({
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  channels: [process.env.TWITCH_CHANNEL as string],
});

let twitchConnected = false;

export async function connectTwitch() {
  if (!twitchConnected) {
    try {
      await twitchClient.connect();
      twitchConnected = true;
      console.log('✅ CocoBot connecté au chat Twitch');
    } catch (err) {
      console.error('❌ Erreur connexion Twitch depuis CocoBot :', err);
    }
  }
}

/**
 * 🛠️ Fonction centralisée pour traiter et diffuser une vente (ou un test)
 */
export async function processInstantGamingSale(title: string, content: string, image: string | null) {
  console.log('💰 Traitement de la vente Instant Gaming :', title);

  // 1. Envoi direct sur le chat Twitch
  try {
    const twitchMessage = `🎉 ${title} — Merci pour le soutien !`;
    await twitchClient.say(process.env.TWITCH_CHANNEL as string, twitchMessage);
    console.log('✅ Message envoyé sur Twitch par CocoBot');
  } catch (err) {
    console.error('❌ Erreur envoi Twitch depuis CocoBot :', err);
  }

  // 2. Signal vers ton PC local pour Streamer.bot / OBS
  if (PC_RELAY_URL) {
    try {
      const res = await fetch(PC_RELAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PC_RELAY_SECRET}`,
        },
        body: JSON.stringify({ title, content, image }),
      });

      if (!res.ok) throw new Error(`Statut HTTP ${res.status}`);
      console.log('📡 Signal envoyé au PC pour Streamer.bot avec succès');
    } catch (err) {
      console.warn('⚠️ Impossible de joindre le PC (Streamer.bot éteint ou hors ligne) :', err);
    }
  }
}

export function registerInstantGamingSalesEvent(client: any) {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.channelId !== SALES_CHANNEL_ID) return;
    if (message.author.id !== IG_BOT_ID) return; // ✅ On accepte SEULEMENT le bot IG

    const title = message.embeds[0]?.title ?? 'Nouvelle vente';
    const content = message.embeds[0]?.description ?? message.content;
    const image = message.embeds[0]?.image?.url ?? null;

    await processInstantGamingSale(title, content, image);
  });
}