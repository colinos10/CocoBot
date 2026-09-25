import { Events, Message } from 'discord.js';
import tmi from 'tmi.js';
import express from 'express';
import { createServer } from 'http';
import fetch from 'node-fetch';

const SALES_CHANNEL_ID = process.env.IG_SALES_CHANNEL_ID!;
const IG_BOT_ID = process.env.IG_BOT_ID!;
const RELAY_SECRET = process.env.RELAY_SECRET!;

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

  // 2. Signal vers ton PC local pour Streamer.bot / OBS (si configuré)
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
  // Écoute des messages Discord (Ventes Instant Gaming réelles)
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.channelId !== SALES_CHANNEL_ID) return;
    if (message.author.id !== IG_BOT_ID) return; // ✅ On accepte SEULEMENT le bot IG

    const title = message.embeds[0]?.title ?? 'Nouvelle vente';
    const content = message.embeds[0]?.description ?? message.content;
    const image = message.embeds[0]?.image?.url ?? null;

    await processInstantGamingSale(title, content, image);
  });

  // 🌐 Lancement du serveur Express intégré pour écouter cocobot.ecloudserv.fr/webhook
  const app = express();
  app.use(express.json());

  app.post('/webhook', async (req: express.Request, res: express.Response) => {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${RELAY_SECRET}`) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { title, content, image } = req.body;
    console.log('💰 Webhook reçu sur ecloudserv :', title, content);

    await processInstantGamingSale(
      title || 'Nouvelle vente', 
      content || 'Test de vente', 
      image || null
    );

    res.json({ success: true });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Serveur Webhook Express lancé sur le port ${PORT}`);
  });
}